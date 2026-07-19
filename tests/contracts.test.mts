import assert from 'node:assert/strict';
import test from 'node:test';

import {
  PublicMemberProfileSchema,
  SearchRequestSchema,
} from '../packages/contracts/src/index.ts';
import {
  createVerificationToken,
  verifyVerificationToken,
} from '../apps/gdg-id/src/lib/verification-token.ts';
import { validatePassword } from '../apps/gdg-hub/lib/password.ts';

test('public member profiles expose only card and verification fields', () => {
  const profile = PublicMemberProfileSchema.parse({
    gdgId: 'GDG-HAU-26-0001',
    fullName: 'Example Member',
    program: 'BS Computer Science',
    email: 'private@example.com',
    department: 'SOC',
    studentId: '12345678',
  });

  assert.deepEqual(profile, {
    gdgId: 'GDG-HAU-26-0001',
    fullName: 'Example Member',
    program: 'BS Computer Science',
    email: 'private@example.com',
  });
});

test('search requests accept only supported lookup types', () => {
  assert.equal(
    SearchRequestSchema.safeParse({ type: 'email', value: 'member@example.com' }).success,
    true,
  );
  assert.equal(
    SearchRequestSchema.safeParse({ type: 'name', value: 'Example Member' }).success,
    false,
  );
  assert.equal(SearchRequestSchema.safeParse({ type: 'barcode', value: '' }).success, false);
  assert.equal(SearchRequestSchema.safeParse({ type: 'email', value: 'not-an-email' }).success, false);
  assert.equal(SearchRequestSchema.safeParse({ type: 'barcode', value: 'x'.repeat(129) }).success, false);
});

test('verification tokens are signed, expire, and reject tampering', () => {
  const secret = 'test-secret-that-is-at-least-32-characters-long';
  const now = Date.parse('2026-07-19T00:00:00.000Z');
  const issued = createVerificationToken('Member@Example.com', secret, now, 60);

  assert.equal(verifyVerificationToken(issued.token, secret, now)?.email, 'member@example.com');
  assert.equal(verifyVerificationToken(`${issued.token}tampered`, secret, now), null);
  assert.equal(verifyVerificationToken(issued.token, secret, now + 61_000), null);
});

test('password policy rejects weak or oversized passwords', () => {
  assert.equal(validatePassword('StrongPass1'), null);
  assert.match(validatePassword('short') ?? '', /at least 8/);
  assert.match(validatePassword('alllowercase1') ?? '', /upper- and lowercase/);
  assert.match(validatePassword('NoNumbersHere') ?? '', /number/);
  assert.match(validatePassword(`Aa1${'x'.repeat(126)}`) ?? '', /no more than 128/);
});
