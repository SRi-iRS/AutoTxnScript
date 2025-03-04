#!/bin/bash

QURANIUM_CORE_PATH="$HOME/Vlinder/Quranium/Quranium_Core/gui-Dev/src"
cd $QURANIUM_CORE_PATH
echo "Entering Quranium Core path: $QURANIUM_CORE_PATH"

./quraniumd -datadir=/home/mahir/Vlinder/Quranium/AutoTxnFloader/testnet/ -daemon
echo "Quranium Core started..."

node index.js