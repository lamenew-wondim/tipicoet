const { adminDb } = require('../lib/firebase-admin');

async function testFirestore() {
  try {
    console.log('Attempting to write to Firestore...');
    await adminDb.collection('users').doc('test_user').set({
      email: 'test@example.com',
      role: 'test',
      createdAt: new Date().toISOString()
    });
    console.log('Successfully wrote to Firestore!');
    
    console.log('Reading back from Firestore...');
    const doc = await adminDb.collection('users').doc('test_user').get();
    console.log('Data:', doc.data());
    
    // Cleanup
    await adminDb.collection('users').doc('test_user').delete();
    console.log('Cleanup successful!');
    process.exit(0);
  } catch (error) {
    console.error('Firestore Test Failed:', error);
    process.exit(1);
  }
}

testFirestore();
