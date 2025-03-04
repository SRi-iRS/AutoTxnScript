require("dotenv").config();

const WALLET_COUNT = parseInt(process.env.WALLET_COUNT);
const RPC_URL = process.env.RPC_URL;
const RPC_USERNAME = process.env.RPC_USERNAME;
const RPC_PASSWORD = process.env.RPC_PASSWORD;
const FAUCET_URL = process.env.FAUCET_URL;
const FAUCET_USERNAME = process.env.FAUCET_USERNAME;
const FAUCET_PASSWORD = process.env.FAUCET_PASSWORD;
const FAUCET_WALLET = process.env.FAUCET_WALLET;
const FUND_AMOUNT = parseInt(process.env.FUND_AMOUNT);
const MINIMUM_BALANCE = parseInt(process.env.MINIMUM_BALANCE);
const TRANSFER_AMOUNT_LIMIT = parseFloat(process.env.TRANSFER_AMOUNT_LIMIT);
const NO_OF_TXN = parseInt(process.env.NO_OF_TXN);
const TIME_OUT = parseInt(process.env.TIME_OUT);
const TXNS_PER_MIN = parseInt(process.env.TXNS_PER_MIN);
const MEMPOOL_LIMIT = parseInt(process.env.MEMPOOL_LIMIT);

module.exports = {
  WALLET_COUNT,
  RPC_URL,
  RPC_USERNAME,
  RPC_PASSWORD,
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
  MEMPOOL_LIMIT
};
