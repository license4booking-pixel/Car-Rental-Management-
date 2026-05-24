import { readFileSync } from 'fs';
import { 
  initializeTestEnvironment, 
  RulesTestEnvironment, 
  assertFails, 
  assertSucceeds 
} from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { describe, it, beforeAll, afterAll, beforeEach } from 'vitest';

let testEnv: RulesTestEnvironment;

describe('Philly Rental System Firestore Rules', () => {
  beforeAll(async () => {
    testEnv = await initializeTestEnvironment({
      projectId: 'phillyrental-test',
      firestore: {
        rules: readFileSync('DRAFT_firestore.rules', 'utf8'),
        host: '127.0.0.1',
        port: 8080,
      },
    });
  });

  afterAll(async () => {
    await testEnv.cleanup();
  });

  beforeEach(async () => {
    await testEnv.clearFirestore();
  });

  it('Denies read to non-authenticated users by default', async () => {
    const unauthedDb = testEnv.unauthenticatedContext().firestore();
    await assertFails(getDoc(doc(unauthedDb, 'customers/123')));
  });

  it('Allows owner to read their own profile', async () => {
    const ownerDb = testEnv.authenticatedContext('user123').firestore();
    await assertSucceeds(getDoc(doc(ownerDb, 'customers/user123')));
  });

  it('Denies user A from reading user B profile', async () => {
    const userADb = testEnv.authenticatedContext('userA').firestore();
    await assertFails(getDoc(doc(userADb, 'customers/userB')));
  });

  it('Forbids self-assignment of VIP tags', async () => {
    const userDb = testEnv.authenticatedContext('user123').firestore();
    await assertFails(setDoc(doc(userDb, 'customers/user123'), {
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@example.com',
      tags: ['VIP']
    }));
  });

  it('Allows admin to manage vehicles', async () => {
    // Setup admin
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), 'admins/admin123'), { role: 'admin' });
    });

    const adminDb = testEnv.authenticatedContext('admin123').firestore();
    await assertSucceeds(setDoc(doc(adminDb, 'vehicles/v1'), {
      plateNumber: 'BCD 4567',
      make: 'Tesla',
      model: 'Model 3',
      status: 'available',
      year: 2023
    }));
  });

  it('Denies unauthorized vehicle creation', async () => {
    const userDb = testEnv.authenticatedContext('user123').firestore();
    await assertFails(setDoc(doc(userDb, 'vehicles/v1'), {
      plateNumber: 'HACK',
      make: 'Fake',
      model: 'Car',
      status: 'available'
    }));
  });
});
