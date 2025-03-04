const { initializeDatabase } = require("./lib/setup");
const Node = require("./src/node");
const { RPC_URL, RPC_USERNAME, RPC_PASSWORD } = require("./src/config");

initializeDatabase();
const node = new Node(RPC_URL, RPC_USERNAME, RPC_PASSWORD);
node.start();
