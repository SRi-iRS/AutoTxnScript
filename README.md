# Auto Transaction Floader for Quranium Testnet
### (under development)
----
To install necassary npm packages
```
$ npm install
```

To run the floader, first you have to run quraniumd (or) quranium-qt with server enabled. Then start the script.

#### NOTE: 
I recommend run it on a new datadir to avoid confusion. 


```
$ node index.js
```


## Global Constant Variables
 
| Variable Name | Description |
|---------------|-------------|
| `WALLET_COUNT`     | The number wallets to be created and send funds among them. |
| `FAUCET_URL` | The URL of faucet quranium node. |
| `FAUCET_USERNAME`| The username used for rpc connection to the of faucet quranium node. |
| `FAUCET_PASSWORD` | The password used for rpc connection to the of faucet quranium node. |
| `MINIMUM_BALANCE` | The minimum balance limit to request funds from faucet. |
| `FUND_AMOUNT` | The fund amount each of the wallets should receive from faucet, when their balances get below minimum. |
| `TRANSFER_AMOUNT_LIMIT` | The max transfer amount each transaction will have. |
| `NO_OF_TXN` | The number of transactions for each wallet for one full floading cycle. |
| `TIME_OUT` | The timeout duration for each transaction in milliseconds. |
----

## Logic
The floader will initiate some `WALLET_COUNT` number of wallets. And will get funded some `FUND_AMOUNT` by the faucet RPC. Once required `MINIMUM_BALANCE` is acheived, the floader will initiate `NO_OF_TXN` transactions for each wallets among them.