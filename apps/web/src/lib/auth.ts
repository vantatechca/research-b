import { SignJWT, jwtVerify } from 'jose';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/db';
import { NextRequest } from 'next/server';

const SALT_ROUNDS = 12;

function getJwtSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is not set');
  }
  return new TextEncoder().encode(secret);
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function createToken(userId: string): Promise<string> {
  const secret = getJwtSecret();
  return new SignJWT({ userId })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(secret);
}

export async function verifyToken(token: string): Promise<{ userId: string } | null> {
  try {
    const secret = getJwtSecret();
    const { payload } = await jwtVerify(token, secret);
    if (typeof payload.userId === 'string') {
      return { userId: payload.userId };
    }
    return null;
  } catch {
    return null;
  }
}

export async function getSession(request: NextRequest): Promise<{ userId: string } | null> {
  // Try cookie first
  const cookieToken = request.cookies.get('token')?.value;
  if (cookieToken) {
    const session = await verifyToken(cookieToken);
    if (session) return session;
  }

  // Try Authorization header
  const authHeader = request.headers.get('Authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    const session = await verifyToken(token);
    if (session) return session;
  }

  return null;
}

export async function getCurrentUser(request: NextRequest) {
  const session = await getSession(request);
  if (!session) return null;

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: {
      id: true,
      email: true,
      name: true,
      createdAt: true,
      settings: true,
    },
  });

  return user;
}
