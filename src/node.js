const RPCHelper = require("./rpc");
const Wallet = require("./wallet");

const {
  WALLET_COUNT,
  FAUCET_URL,
  FAUCET_USERNAME,
  FAUCET_PASSWORD,
  FAUCET_WALLET,
  FUND_AMOUNT,
  MINIMUM_BALANCE,
  TRANSFER_AMOUNT_LIMIT,
  NO_OF_TXN,
  TIME_OUT,
  TXNS_PER_MIN,
  MEMPOOL_LIMIT,
} = require("./config");

class Node {
  constructor(url, uname, pwd) {
    this.url = url;
    this.username = uname;
    this.password = pwd;
    this.rpc = new RPCHelper(url, uname, pwd);
    this.wallets = [];
    this.total_allowed_txns = TXNS_PER_MIN;
    this.lastTime = new Date();
    console.log(
      `${new Date().toUTCString()} --- ⏲️  Timer updated, Txn Sent=${
        TXNS_PER_MIN - this.total_allowed_txns
      }`
    );
    this.addOneMin();
  }

  async addOneMin() {
    try {
      await new Promise((resolve) => setTimeout(resolve, 60 * 1000));
      this.lastTime = new Date();
      console.log(
        `${new Date().toUTCString()} --- ⏲️  Timer updated, Txn Sent=${
          TXNS_PER_MIN - this.total_allowed_txns
        }`
      );
      this.total_allowed_txns = TXNS_PER_MIN;
      this.addOneMin();
    } catch (e) {
      console.error(e);
      throw Error(e);
    }
  }

  async createAndFundWallets() {
    try {
      console.log(`${new Date().toUTCString()} --- initiate wallets...`);
      this.wallets = await this.initiateWallets();
      await new Promise((resolve) => setTimeout(resolve, TIME_OUT));
      console.log(`${new Date().toUTCString()} --- funding wallets...`);
      await this.fundWallets();
      await new Promise((resolve) => setTimeout(resolve, TIME_OUT));
      console.log(`${new Date().toUTCString()} --- init traffic creation...`);
      await this.init();
      await new Promise((resolve) => setTimeout(resolve, TIME_OUT));
    } catch (e) {
      console.error(e);
      throw Error(e);
    }
  }

  async initiateWallets() {
    try {
      const wallet_list = await this.getWallets();

      if (this.wallets.length >= WALLET_COUNT) {
        console.log(
          `${new Date().toUTCString()} --- Wallets available: ${
            this.wallets.length
          }`
        );
        return this.wallets;
      }

      if (wallet_list.length > 0) {
        console.log(`${new Date().toUTCString()} --- Existing wallet initialization...`);
        for (let walletName of wallet_list) {
          const wallet = new Wallet(
            walletName,
            this.url,
            this.username,
            this.password
          );
          await wallet.getNewAddress();
          await wallet.getNewAddress();

          this.wallets.push(wallet);
        }
      }

      if (this.wallets.length <= 0) {
        console.log(
          `${new Date().toUTCString()} --- No wallets available. Creating ${WALLET_COUNT} new wallets`
        );
      } else if (WALLET_COUNT - this.wallets.length > 0) {
        console.log(
          `${new Date().toUTCString()} --- Wallets available ${
            this.wallets.length
          }. Creating ${WALLET_COUNT - this.wallets.length} new wallets`
        );
      }
      let idx =
        this.wallets.length < WALLET_COUNT ? this.wallets.length : WALLET_COUNT;
      for (let i = idx; i < WALLET_COUNT; i++) {
        const wallet = new Wallet(
          `wallet_${i + 1}`,
          this.url,
          this.username,
          this.password
        );
        await wallet.createWallet();

        await wallet.getNewAddress();
        await wallet.getNewAddress();

        console.log(
          `${new Date().toUTCString()} --- Created wallet: wallet_${
            i + 1
          } wallet=${JSON.stringify(wallet)}`
        );
        this.wallets.push(wallet);
        await new Promise((resolve) => setTimeout(resolve, TIME_OUT));
      }

      console.log(
        `${new Date().toUTCString()} --- Checking for wallets one more time...`
      );
      return this.initiateWallets();
    } catch (e) {
      console.error(e);
      throw Error(e);
    }
  }

  async fundWallets() {
    try {
      for (let wallet of this.wallets) {
        await this.fund(wallet);
      }
    } catch (e) {
      console.error(e);
      throw Error(e);
    }
  }

  async init() {
    try {
      for (let sender of this.wallets) {
        for (let receiver of this.wallets) {
          if (
            sender.name === receiver.name ||
            !sender.name.startsWith("wallet") ||
            !receiver.name.startsWith("wallet")
          )
            continue;
          let i = 0;
          let no_fund = 0;
          while (i < NO_OF_TXN) {
            const balances = await sender.getBalances();
            if (balances.mine) {
              if (balances.mine.trusted < MINIMUM_BALANCE) {
                console.log(
                  `${new Date().toUTCString()} --- ⛔ Sender: ${
                    sender.name
                  } balance is less than ${MINIMUM_BALANCE} QRN. Skipping transaction...`
                );
                await this.fund(sender);
                no_fund = 1;
                break;
              }
              console.log(
                `${new Date().toUTCString()} --- Sender ${
                  sender.name
                } balance: ${balances.mine.trusted}`
              );
              const receiverAddress = receiver.getAddress();
              console.log(
                `${new Date().toUTCString()} --- Receiver ${
                  receiver.name
                } address: ${receiverAddress}`
              );

              this.total_allowed_txns--;
              if (
                new Date() - this.lastTime < 60000 &&
                this.total_allowed_txns <= 0
              ) {
                console.log(
                  `${new Date().toUTCString()} --- Waiting for the next minute to allow more transactions...`
                );
                await new Promise((resolve) =>
                  setTimeout(resolve, 60000 - (new Date() - this.lastTime))
                );
              }
              const amount = this.getRandomValue();
              const fund_transfered = await sender.sendToAddress(
                receiverAddress,
                amount.toString(),
                this.fund
              );

              if (fund_transfered !== undefined) {
                console.log(
                  `${new Date().toUTCString()} --- ✅ txid: `,
                  fund_transfered
                );
              } else {
                console.log(
                  `${new Date().toUTCString()} --- ❌ Transaction failed`
                );
              }
              await new Promise((resolve) => setTimeout(resolve, TIME_OUT));
            }
            i++;
          }
          if (no_fund == 1) break;
        }
      }
    } catch (e) {
      console.error(e);
      throw Error(e);
    }
  }

  async fund(wallet) {
    try {
      const mempool = await wallet.getMempoolInfo();
      if (mempool.size >= MEMPOOL_LIMIT) {
        console.error(
          `${new Date().toUTCString()} --- Mempool limit reached... Waiting for miners to pick transactions`
        );
        return;
      }
      console.log(
        `${new Date().toUTCString()} --- Checking wallet for funding: ${
          wallet.name
        }`
      );
      const balances = await wallet.getBalances(); //await this.getWalletBalances(wallet);
      if (balances.mine) {
        if (
          balances.mine.trusted <= MINIMUM_BALANCE &&
          balances.mine.untrusted_pending <= MINIMUM_BALANCE &&
          balances.mine.immature <= MINIMUM_BALANCE
        ) {
          console.error(
            `${new Date().toUTCString()} --- 💰💸 Funding ${
              wallet.name
            } due to insufficient funds. ⚠️ Balance: ${balances.mine.trusted}`
          );
          const address = await wallet.getAddress();
          await this.refillFromFacuet(address, FUND_AMOUNT);
        } else {
          if (balances.mine.trusted > MINIMUM_BALANCE) {
            console.log(
              `${new Date().toUTCString()} --- 💰💸 Wallet ${
                wallet.name
              } has sufficient funds. 🤑 Balance: ${balances.mine.trusted}`
            );
          }
          if (balances.mine.untrusted_pending > MINIMUM_BALANCE) {
            console.log(
              `${new Date().toUTCString()} --- 💰💸 Wallet ${
                wallet.name
              } has untrusted pending funds. 🤑 Balance: ${
                balances.mine.untrusted_pending
              }`
            );
          }
          if (balances.mine.immature > MINIMUM_BALANCE) {
            console.log(
              `${new Date().toUTCString()} --- 💰💸 Wallet ${
                wallet.name
              } has immature funds. 🤑 Balance: ${balances.mine.immature}`
            );
          }
        }
      }
    } catch (e) {
      console.error(e);
      throw Error(e);
    }
  }

  async refillFromFacuet(address, amount) {
    try {
      const rpc = new RPCHelper(FAUCET_URL, FAUCET_USERNAME, FAUCET_PASSWORD);

      const faucet_balance = await rpc.call("getbalance", [], FAUCET_WALLET);
      if (faucet_balance <= amount) {
        console.log(
          `${new Date().toUTCString()} --- Low faucet balance: ${faucet_balance} QRN`
        );
        throw new Error("Low faucet balance");
      }
      const response = await rpc.call(
        "sendtoaddress",
        [address, amount, "from script"],
        FAUCET_WALLET
      );
      console.log(
        `${new Date().toUTCString()} --- Refilled wallet: ${address} with ${amount} QRN`
      );
      return response.result;
    } catch (e) {
      console.error(e);
      throw Error(e);
    }
  }

  async start() {
    while (true) {
      try {
        await this.createAndFundWallets();
      } catch (e) {
        console.log(e);
      }
    }
  }

  getRandomValue() {
    return (
      Math.random() * (TRANSFER_AMOUNT_LIMIT - MINIMUM_BALANCE) +
      MINIMUM_BALANCE
    ).toFixed(8);
  }

  async getWallets() {
    try {
      const wallets = await this.rpc.call("listwallets");
      return wallets.result;
    } catch (e) {
      console.log(e);
    }
  }
}

module.exports = Node;
