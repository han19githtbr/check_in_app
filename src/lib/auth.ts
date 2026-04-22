import { cookies } from "next/headers";

import { AppError } from "@/lib/errors";
import { readDb, writeDb } from "@/lib/db";
import type { SessionResponse, SessionUser, UserRecord, UserRole } from "@/types/domain";

const SESSION_COOKIE = "passin_session";
const OAUTH_STATE_COOKIE = "passin_oauth_state";
const SESSION_DURATION_IN_DAYS = 7;

type GoogleProfile = {
  name: string;
  email: string;
  picture?: string;
  email_verified?: boolean;
  nonce?: string;
};

type GoogleAuthState = {
  role: UserRole;
  nonce: string;
};

function parseAdminEmails() {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
}

function parseJwtPayload(token: string) {
  const [, payload] = token.split(".");

  if (!payload) {
    throw new AppError("Token do Google invalido.", 401);
  }

  return JSON.parse(Buffer.from(payload, "base64url").toString("utf-8")) as GoogleProfile;
}

function requireGoogleConfig() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;

  if (!clientId || !clientSecret || !appUrl) {
    throw new AppError(
      "Configure GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET e NEXT_PUBLIC_APP_URL para habilitar login Google.",
      500
    );
  }

  return {
    clientId,
    clientSecret,
    redirectUri: `${appUrl}/api/auth/google/callback`
  };
}

function buildSessionUser(user: UserRecord): SessionUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    avatarUrl: user.avatarUrl
  };
}

async function getSessionRecord() {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get(SESSION_COOKIE)?.value;

  if (!sessionId) {
    return null;
  }

  const database = await readDb();
  const session = database.sessions.find((item) => item.id === sessionId);

  if (!session) {
    cookieStore.delete(SESSION_COOKIE);
    return null;
  }

  if (new Date(session.expiresAt).getTime() <= Date.now()) {
    database.sessions = database.sessions.filter((item) => item.id !== session.id);
    await writeDb(database);
    cookieStore.delete(SESSION_COOKIE);
    return null;
  }

  const user = database.users.find((item) => item.id === session.userId);

  if (!user) {
    cookieStore.delete(SESSION_COOKIE);
    return null;
  }

  return { session, user };
}

export async function getSession(): Promise<SessionResponse> {
  const activeSession = await getSessionRecord();

  if (!activeSession) {
    return {
      authenticated: false,
      user: null
    };
  }

  return {
    authenticated: true,
    user: buildSessionUser(activeSession.user)
  };
}

export async function requireUserSession() {
  const activeSession = await getSessionRecord();

  if (!activeSession) {
    throw new AppError("Autenticacao obrigatoria.", 401);
  }

  return {
    session: activeSession.session,
    user: activeSession.user
  };
}

export async function requireAdminSession() {
  const activeSession = await requireUserSession();

  if (activeSession.user.role !== "admin") {
    throw new AppError("Acesso restrito ao administrador.", 403);
  }

  return activeSession;
}

export async function createGoogleAuthorizationUrl(role: UserRole) {
  const { clientId, redirectUri } = requireGoogleConfig();
  const nonce = crypto.randomUUID();
  const state = crypto.randomUUID();
  const cookieStore = await cookies();

  cookieStore.set(
    OAUTH_STATE_COOKIE,
    JSON.stringify({
      role,
      nonce,
      state
    }),
    {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 10
    }
  );

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "openid email profile",
    access_type: "offline",
    prompt: "select_account",
    nonce,
    state
  });

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

export async function resolveGoogleLogin(code: string, state: string) {
  const { clientId, clientSecret, redirectUri } = requireGoogleConfig();
  const cookieStore = await cookies();
  const rawState = cookieStore.get(OAUTH_STATE_COOKIE)?.value;

  if (!rawState) {
    throw new AppError("Estado da autenticacao expirou. Tente entrar novamente.", 400);
  }

  cookieStore.delete(OAUTH_STATE_COOKIE);

  const parsedState = JSON.parse(rawState) as GoogleAuthState & { state: string };

  if (parsedState.state !== state) {
    throw new AppError("Estado da autenticacao invalido.", 400);
  }

  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code"
    })
  });

  if (!tokenResponse.ok) {
    throw new AppError("Nao foi possivel concluir o login com Google.", 401);
  }

  const tokenData = (await tokenResponse.json()) as { id_token?: string };

  if (!tokenData.id_token) {
    throw new AppError("Resposta do Google sem id_token.", 401);
  }

  const profile = parseJwtPayload(tokenData.id_token);

  if (!profile.email || !profile.name || !profile.email_verified) {
    throw new AppError("Conta Google sem dados suficientes para login.", 401);
  }

  if (profile.nonce !== parsedState.nonce) {
    throw new AppError("Nonce da autenticacao invalido.", 401);
  }

  const normalizedEmail = profile.email.trim().toLowerCase();

  if (!normalizedEmail.endsWith("@gmail.com")) {
    throw new AppError("A plataforma aceita apenas logins com conta Gmail.", 403);
  }

  const adminEmails = parseAdminEmails();
  const resolvedRole: UserRole =
    parsedState.role === "admin" && adminEmails.includes(normalizedEmail) ? "admin" : "participant";

  if (parsedState.role === "admin" && resolvedRole !== "admin") {
    throw new AppError("Este Gmail nao esta autorizado como administrador.", 403);
  }

  const database = await readDb();
  const now = new Date().toISOString();
  const existingUser = database.users.find((item) => item.email === normalizedEmail);
  const user: UserRecord = existingUser
    ? {
        ...existingUser,
        name: profile.name.trim(),
        avatarUrl: profile.picture ?? existingUser.avatarUrl,
        role: resolvedRole,
        updatedAt: now
      }
    : {
        id: crypto.randomUUID(),
        name: profile.name.trim(),
        email: normalizedEmail,
        role: resolvedRole,
        avatarUrl: profile.picture ?? null,
        provider: "google",
        createdAt: now,
        updatedAt: now
      };

  database.users = [...database.users.filter((item) => item.id !== user.id), user];

  const sessionId = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + SESSION_DURATION_IN_DAYS * 24 * 60 * 60 * 1000).toISOString();

  database.sessions = [
    ...database.sessions.filter((item) => item.userId !== user.id),
    {
      id: sessionId,
      userId: user.id,
      role: user.role,
      createdAt: now,
      expiresAt
    }
  ];

  await writeDb(database);

  cookieStore.set(SESSION_COOKIE, sessionId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: new Date(expiresAt)
  });

  return buildSessionUser(user);
}

export async function logout() {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get(SESSION_COOKIE)?.value;

  if (sessionId) {
    const database = await readDb();
    database.sessions = database.sessions.filter((item) => item.id !== sessionId);
    await writeDb(database);
  }

  cookieStore.delete(SESSION_COOKIE);
}
