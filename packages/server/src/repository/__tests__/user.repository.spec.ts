import { PGlite } from '@electric-sql/pglite';
import { createTestDb, cleanupTestDb } from '../../db/test-utils';
import type { DrizzleDB } from '../../db/drizzle.types';
import { UserRepository } from '../user.repository';

describe('UserRepository', () => {
  let db: DrizzleDB;
  let client: PGlite;
  let userRepo: UserRepository;

  beforeAll(async () => {
    ({ db, client } = await createTestDb());
    userRepo = new UserRepository(db);
  });

  afterAll(async () => {
    await cleanupTestDb(client);
  });

  it('should create a user', async () => {
    const user = await userRepo.create({
      name: 'Alice',
      email: 'alice@example.com',
      password: 'hashed_pw_123',
    });

    expect(user).toBeDefined();
    expect(user.id).toBeDefined();
    expect(user.name).toBe('Alice');
    expect(user.email).toBe('alice@example.com');
    expect(user.password).toBe('hashed_pw_123');
    expect(user.createdAt).toBeInstanceOf(Date);
    expect(user.updatedAt).toBeInstanceOf(Date);
  });

  it('should find user by id', async () => {
    const created = await userRepo.create({
      name: 'Bob',
      email: 'bob@example.com',
      password: 'hashed_pw_456',
    });

    const found = await userRepo.findById(created.id);
    expect(found).not.toBeNull();
    expect(found!.id).toBe(created.id);
    expect(found!.name).toBe('Bob');
    expect(found!.email).toBe('bob@example.com');
  });

  it('should find user by email', async () => {
    const created = await userRepo.create({
      name: 'Charlie',
      email: 'charlie@example.com',
      password: 'hashed_pw_789',
    });

    const found = await userRepo.findByEmail('charlie@example.com');
    expect(found).not.toBeNull();
    expect(found!.id).toBe(created.id);
    expect(found!.name).toBe('Charlie');
  });

  it('should return null for non-existent id', async () => {
    const found = await userRepo.findById(
      '00000000-0000-0000-0000-000000000000',
    );
    expect(found).toBeNull();
  });

  it('should update a user', async () => {
    const created = await userRepo.create({
      name: 'Dave',
      email: 'dave@example.com',
      password: 'hashed_pw_abc',
    });

    const updated = await userRepo.update(created.id, { name: 'David' });
    expect(updated).not.toBeNull();
    expect(updated!.name).toBe('David');
    expect(updated!.email).toBe('dave@example.com');
    expect(updated!.updatedAt.getTime()).toBeGreaterThanOrEqual(
      created.updatedAt.getTime(),
    );
  });

  it('should delete a user', async () => {
    const created = await userRepo.create({
      name: 'Eve',
      email: 'eve@example.com',
      password: 'hashed_pw_def',
    });

    await userRepo.delete(created.id);

    const found = await userRepo.findById(created.id);
    expect(found).toBeNull();
  });

  it('should enforce unique email', async () => {
    await userRepo.create({
      name: 'Frank',
      email: 'unique_test@example.com',
      password: 'pw1',
    });

    await expect(
      userRepo.create({
        name: 'Frank2',
        email: 'unique_test@example.com',
        password: 'pw2',
      }),
    ).rejects.toThrow();
  });
});
