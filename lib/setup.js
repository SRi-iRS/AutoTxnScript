const clientPromise = require('./mongodb'); // Your MongoDB connection helper

async function initializeDatabase() {
  try {
    const client = await clientPromise;
    const db = client.db("auto-txn-floader");

    let collections = await db.listCollections({ name: 'transactions' }).toArray();
    if (collections.length === 0) {
      await db.createCollection('transactions');
      console.log(`${new Date().toUTCString()} --- Collection "transactions" created.`);

      await db.collection('transactions').insertOne({
        txid: "example_id",
        recipient: "example_recipient",
        amount: 100,
        timestamp: new Date()
      });
      console.log(`${new Date().toUTCString()} --- Default transaction data inserted.`);
    } else {
      console.log(`${new Date().toUTCString()} --- Collection "transactions" already exists.`);
    }
  } catch (error) {
    console.error('Error during database initialization:', error);
  }
}

module.exports = {
  initializeDatabase
};