require("dotenv").config();
const { initializeDatabase } = require("./lib/setup");
const fetch = (...args) =>
  import("node-fetch").then(({ default: fetch }) => fetch(...args));

const WALLET_COUNT = parseInt(process.env.WALLET_COUNT);
const FAUCET_URL = process.env.FAUCET_URL;
const FAUCET_USERNAME = process.env.FAUCET_USERNAME;
const FAUCET_PASSWORD = process.env.FAUCET_PASSWORD;
const FUND_AMOUNT = parseInt(process.env.FUND_AMOUNT);
const MINIMUM_BALANCE = parseInt(process.env.MINIMUM_BALANCE);
const TRANSFER_AMOUNT_LIMIT = parseFloat(process.env.TRANSFER_AMOUNT_LIMIT);
const NO_OF_TXN = parseInt(process.env.NO_OF_TXN);
const TIME_OUT = parseInt(process.env.TIME_OUT);
const TXNS_PER_MIN = parseInt(process.env.TXNS_PER_MIN);


function getRandomValue() {
  return (
    ((Math.random() * MINIMUM_BALANCE) + TRANSFER_AMOUNT_LIMIT).toFixed(8)
  );
}

class TxnFloader {
  wallets = [];
  total_allowed_txns;
  lastTime;


  constructor() {
    this.total_allowed_txns = TXNS_PER_MIN;
    this.lastTime = new Date();
    console.log(`${new Date().toUTCString()} --- ⏲️  Timer updated, Txn Sent=${TXNS_PER_MIN - this.total_allowed_txns}`);
    this.addOneMin();
  }

  async addOneMin() {
    await new Promise((resolve) => setTimeout(resolve, 60 * 1000));
    this.lastTime = new Date();
    console.log(`${new Date().toUTCString()} --- ⏲️  Timer updated, Txn Sent=${TXNS_PER_MIN - this.total_allowed_txns}`);
    this.total_allowed_txns = TXNS_PER_MIN;
    this.addOneMin();
  }

  async callRpc(
    method,
    params,
    wallet = null,
    url = null,
    uname = null,
    pwd = null
  ) {
    try {
      let rpcUrl = url ? url : FAUCET_URL;
      const username = uname ? uname : FAUCET_USERNAME;
      const password = pwd ? pwd : FAUCET_PASSWORD;

      if (wallet !== undefined && wallet !== null && wallet !== "") {
        rpcUrl = rpcUrl + "wallet/" + wallet;
      }

      const body = JSON.stringify({
        jsonrpc: "2.0",
        method: method,
        params: params,
        id: 1,
      });

      const response = await fetch(rpcUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization:
            "Basic " +
            Buffer.from(username + ":" + password).toString("base64"),
        },
        body: body,
      });

      const result = await response.json();
      console.log(`${new Date().toUTCString()} --- method=${method} result=${JSON.stringify(result)}`);
      return result;
    } catch (e) {
      console.log(e);
    }
  }

  async createAndFundWallets() {
    this.wallets = await this.initiateWallets();
    await new Promise((resolve) => setTimeout(resolve, TIME_OUT));
    await this.fundWallets();
    await new Promise((resolve) => setTimeout(resolve, TIME_OUT));
    await this.floadTransactions();
    await new Promise((resolve) => setTimeout(resolve, TIME_OUT));
  }

  async floadTransactions() {
    for (let sender of this.wallets) {
      for (let receiver of this.wallets) {
        if (sender === receiver || !sender.startsWith('wallet') || !receiver.startsWith('wallet')) continue;
        let i = 0;
        let no_fund = 0;
        while (i < NO_OF_TXN) {
          const balances = await this.getWalletBalances(sender);
          if (balances.mine) {
            if (balances.mine.trusted < MINIMUM_BALANCE) {
              console.log(
                `${new Date().toUTCString()} --- Sender: ${sender} balance is less than MINIMUM_BALANCE QRN. Skipping transaction...`
              );
              await this.fund();
              no_fund = 1;
              break;
            }
            console.log(`${new Date().toUTCString()} --- Sender ${sender} balance: ${balances.mine.trusted}`);
            const receiverAddress = await this.getWalletAddress(receiver);
            console.log(`${new Date().toUTCString()} --- Receiver ${receiver} address: ${receiverAddress}`);

            const amount = getRandomValue();
            const fund_transfered = await this.transferFunds(
              sender,
              receiverAddress,
              amount.toString()
            );
            if (fund_transfered !== undefined)
              console.log(`${new Date().toUTCString()} --- ✅ txid: `, fund_transfered);
            else console.log(`${new Date().toUTCString()} --- ❌ Transaction failed`);
            await new Promise((resolve) => setTimeout(resolve, TIME_OUT));
          }
          i++;
        }
        if (no_fund == 1) break;
      }
    }
  }

  async fundWallets() {
    for (let wallet of this.wallets) {
      const balance = await this.getWalletBalance(wallet);
      console.log(`${new Date().toUTCString()} --- Wallet: ${wallet}, Balance: ${balance}`);
      if (balance < MINIMUM_BALANCE) {
        console.log(`${new Date().toUTCString()} --- Funding wallet: ${wallet}`);
        const address = await this.getWalletAddress(wallet);
        console.log(`${new Date().toUTCString()} --- Generated address: ${address}`);
        console.log(await this.fundWalletAddress(address, FUND_AMOUNT));
      }
    }
  }

  async fund(wallet) {
    const balances = await this.getWalletBalances(wallet);
    if (balances.mine) {
      if (!(balances.mine.trusted < MINIMUM_BALANCE || balances.mine.untrusted_pending < MINIMUM_BALANCE || balances.mine.immature < MINIMUM_BALANCE)) {
        console.error(
          `💰💸 Funding ${wallet} due to insufficient funds. ⚠️ Balance: ${balances.mine.trusted}`
        );
        if (balances.mine.untrusted_pending === 0) {
          const address = await this.getWalletAddress(wallet);
          await this.transferFunds(address, FUND_AMOUNT);
        } else {
          console.log(
            `${new Date().toUTCString()} --- ${wallet}: waiting for ${balances.mine.untrusted_pending} QRN to be confirmed...`
          );
        }
      }
    }
  }

  async fundWalletAddress(address, amount) {
    const fund = await this.callRpc(
      "sendtoaddress",
      [address, amount],
      'faucet',
      FAUCET_URL,
      FAUCET_USERNAME,
      FAUCET_PASSWORD
    );
    console.log(`${new Date().toUTCString()} --- Funded wallet: ${address} with ${amount} QRN`);
    return fund;
  }

  async transferFunds(sender, address, amount) {
    try {
      this.total_allowed_txns--;
      if ((new Date() - this.lastTime) < 60000 && this.total_allowed_txns <= 0) {
        console.log(`${new Date().toUTCString()} --- Waiting for the next minute to allow more transactions...`);
        await new Promise((resolve) => setTimeout(resolve, 60000 - (new Date() - this.lastTime)));
      }
      const res = await this.callRpc(
        "sendtoaddress",
        [address, amount],
        sender
      );
      console.log(
        `${new Date().toUTCString()} --- 💸 ${sender} transferred 🤑 [${amount}]QRN to address ${address}, txid: ${res.result}`
      );
      if (res.error) {
        console.error(
          `${new Date().toUTCString()} --- 💸 ${sender} failed to transfer 🤑 [${amount}]QRN to address ${address}, error: ${res.error.message}`
        );
        if (res.error.code === -6) {
          await this.fund(sender);
        }
      }
      return res.result;
    } catch (e) {
      console.log(e);
    }
  }

  async getWalletAddress(wallet) {
    const res = await this.callRpc("getnewaddress", [], wallet);
    return res.result;
  }

  async initiateWallets() {
    const result = await txnFloader.getWallets();
    if (result && result.length >= WALLET_COUNT) {
      console.log(`${new Date().toUTCString()} --- Available Wallets:, ${JSON.stringify(result)}`);
      return result;
    } else {
      console.log(`${new Date().toUTCString()} --- No wallets available. Creating ${WALLET_COUNT} new wallets`);
      let idx = result.length < WALLET_COUNT ? result.length : WALLET_COUNT;
      for (let i = idx; i < WALLET_COUNT; i++) {
        const wallet = await this.createNewWallet(`wallet_${i + 1}`);
        console.log(`${new Date().toUTCString()} --- Created wallet: wallet_${i + 1} wallet=${JSON.stringify(wallet)}`);
        await new Promise((resolve) => setTimeout(resolve, TIME_OUT));
      }
      console.log(`${new Date().toUTCString()} --- Checking for wallets one more time...`);
      return this.initiateWallets();
    }
  }

  async getWalletBalance(walletName) {
    const res = await this.callRpc("getbalance", [], walletName);
    return res.result;
  }

  async getWalletBalances(walletName) {
    const res = await this.callRpc("getbalances", [], walletName);
    return res.result;
  }

  async createNewWallet(walletName) {
    const res = await this.callRpc(
      "createwallet",
      [walletName, false, false, "", false, false, true],
      null
    );
    const balance = await this.getWalletBalance(walletName);
    console.log(`${new Date().toUTCString()} --- ${walletName} balance: `, balance);
    return res.result;
  }

  async getWallets() {
    try {
      const res = await this.callRpc("listwallets", [], null);
      return res.result;
    } catch (err) {
      console.log(err);
    }
  }

  async start() {
    while (true) {
      await this.createAndFundWallets();
    }
  }
}

throw new Error(`
  Deprecated Error:
  This script has been deprecated Please run node app.js
`);

const txnFloader = new TxnFloader();
initializeDatabase();
txnFloader.start();

