require("dotenv").config();
const fetch = (...args) =>
  import("node-fetch").then(({ default: fetch }) => fetch(...args));

const {
  RPC_URL,
  RPC_USERNAME,
  RPC_PASSWORD
} = require("./config");

class RPCHelper {
  constructor(url = RPC_URL, uname = RPC_USERNAME, pwd = RPC_PASSWORD) {
    this._url = url;
    this._username = uname;
    this._password = pwd;
  }

  // Getters
  get url() {
    return this._url;
  }

  get username() {
    return this._username;
  }

  get password() {
    return this._password;
  }

  // Setters
  set url(newUrl) {
    this._url = newUrl;
  }

  set username(newUsername) {
    this._username = newUsername;
  }

  set password(newPassword) {
    this._password = newPassword;
  }

  async call(method, params, wallet = null) {
    try {
      let rpcUrl = this._url;
      if (wallet) {
        rpcUrl = `${rpcUrl}wallet/${wallet}`;
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
            Buffer.from(`${this._username}:${this._password}`).toString(
              "base64"
            ),
        },
        body: body,
      });

      console.log(
        `${new Date().toUTCString()} --- ⏮️  method=${method} body=${JSON.stringify(body)}`
      );
      const result = await response.json();
      console.log(
        `${new Date().toUTCString()} --- ⏭️  method=${method} result=${JSON.stringify(
          result
        )}`
      );
      return result;
    } catch (e) {
      console.log(e);
    }
  }
}

module.exports = RPCHelper;
