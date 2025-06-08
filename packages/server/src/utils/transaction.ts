import { ClientSession, Connection } from "mongoose";

export async function withTransaction<T>(conn: Connection, fn: (session: ClientSession) => Promise<T>): Promise<T> {
  const session = await conn.startSession();
  try {
    let result: T;
    await session.withTransaction(async () => {
      result = await fn(session);
    });
    return result!;
  } finally {
    await session.endSession();
  }
}