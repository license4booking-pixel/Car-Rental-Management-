
import admin from 'firebase-admin';

// Initialize with environment default credentials
// This works in AI Studio environments for provisioned projects
if (admin.apps.length === 0) {
  admin.initializeApp();
}

const db = admin.firestore();
const auth = admin.auth();

async function setupAdmin() {
  const email = 'license4booking@gmail.com';
  const password = 'license4B1';
  const role = 'super_admin';

  console.log(`Setting up user: ${email}`);

  try {
    let user;
    try {
      user = await auth.getUserByEmail(email);
      console.log('User already exists, updating password...');
      await auth.updateUser(user.uid, { password });
    } catch (e: any) {
      if (e.code === 'auth/user-not-found') {
        console.log('User not found, creating new user...');
        user = await auth.createUser({
          email,
          password,
          emailVerified: true
        });
      } else {
        throw e;
      }
    }

    console.log(`User ID: ${user.uid}`);

    // Add to admins collection
    await db.collection('admins').doc(user.uid).set({
      email,
      role,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });

    console.log('Firestore record created/updated.');

    // Remove bootstrap check so it doesn't interfere
    await db.collection('admins').doc('bootstrap_check').delete();
    console.log('Bootstrap check removed.');

    process.exit(0);
  } catch (err) {
    console.error('Error setting up admin:', err);
    process.exit(1);
  }
}

setupAdmin();
