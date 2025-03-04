const clientPromise = require("../lib/mongodb");
const RPCHelper = require("./rpc");
const { MEMPOOL_LIMIT } = require("./config");

class Wallet {
  constructor(name, url, uname, pwd) {
    this.rpc = new RPCHelper(url, uname, pwd);
    this.name = name;
    this.addresses = [];
  }

  async createWallet() {
    try {
      const response = await this.rpc.call(
        "createwallet",
        [this.name, false, false, "", false, false, true],
        null
      );
      return response.result;
    } catch (e) {
      console.error(e);
      throw Error(e);
    }
  }

  async sendToAddress(address, amount, fund) {
    try {
      const mempool = await this.getMempoolInfo();
      if (mempool.size >= MEMPOOL_LIMIT) {
        console.error(
          `${new Date().toUTCString()} --- Mempool limit reached... Waiting for miners to pick transactions`
        );
        return undefined;
      }

      const client = await clientPromise;
      const db = client.db("auto-txn-floader");

      const response = await this.rpc.call(
        "sendtoaddress",
        [address, amount],
        this.name
      );
      console.log(
        `${new Date().toUTCString()} --- 💸 ${
          this.name
        } transferred 🤑 [${amount}]QRN to address ${address}, txid: ${
          response.result
        }`
      );
      if (response.error) {
        console.error(
          `${new Date().toUTCString()} --- 💸 ${
            this.name
          } failed to transfer 🤑 [${amount}]QRN to address ${address}, error: ${
            response.error.message
          }`
        );
        if (response.error.code === -6) {
          await fund(this);
        }
      }

      const insertResult = await db.collection("transactions").insertOne({
        txid: response.result,
        recipient: address,
        amount: amount,
        timestamp: new Date(),
      });

      if (!insertResult.acknowledged) {
        console.error(
          `${new Date().toUTCString()} --- Failed to log transaction for txid: ${
            response.result
          }`
        );
      }

      console.log(
        `${new Date().toUTCString()} --- Transaction logged for txid: ${
          response.result
        }`
      );
      return response.result;
    } catch (e) {
      console.error(e);
      throw Error(e);
    }
  }

  async getNewAddress() {
    try {
      const response = await this.rpc.call("getnewaddress", [], this.name);
      this.addresses.push(response.result);
      return response.result;
    } catch (e) {
      console.error(e);
      throw Error(e);
    }
  }

  async getBalance() {
    try {
      const response = await this.rpc.call("getbalance", [], this.name);
      return response.result;
    } catch (e) {
      console.error(e);
      throw Error(e);
    }
  }

  async getBalances() {
    try {
      const response = await this.rpc.call("getbalances", [], this.name);
      return response.result;
    } catch (e) {
      console.error(e);
      throw Error(e);
    }
  }

  getAddress() {
    try {
      const randomIndex = Math.floor(Math.random() * this.addresses.length);
      return this.addresses[randomIndex];
    } catch (e) {
      console.error(e);
      throw Error(e);
    }
  }

  async getMempoolInfo() {
    try {
      const response = await this.rpc.call("getmempoolinfo", [], this.name);
      return response.result;
    } catch (e) {
      console.error(e);
      throw Error(e);
    }
  }
}

module.exports = Wallet;
