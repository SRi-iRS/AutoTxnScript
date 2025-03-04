require("dotenv").config();
const { MongoClient } = require('mongodb');

const uri = process.env.MONGODB_URI;
const options = {};

let client;
let clientPromise;

if (!uri) {
    throw new Error('Please add your MongoDB URI to .env');
}


if (process.env.NODE_ENV === 'development') {
    // @ Dev
    if (!global._mongoClientPromise) {
        client = new MongoClient(uri, options);
        global._mongoClientPromise = client.connect();
    }
    clientPromise = global._mongoClientPromise;
} else {
    // @Prod
    client = new MongoClient(uri, options);
    clientPromise = client.connect();
}

module.exports = clientPromise;
