/// <reference path="../src/typings/index.d.ts" />
import { SDK, Env } from "../src";
import { EthMasterWallet, EthUserWallet } from "../src/eth/wallet";
import "dotenv/config";

async function main() {
  const sdk = new SDK({
    accessToken: process.env.ACCESS_TOKEN,
    secret: process.env.SECRET,
    url: process.env.URL,
    env: Env.Local,
  });

  const wallet: EthMasterWallet = await sdk.eth.wallets.getMasterWallet(
    "4b0945c3e21d6fba4703d56c94a786de"
  );
  const userWallet: EthUserWallet = await wallet.createUserWallet(
    "wallet",
    "passphrase"
  );

  console.log(userWallet.getData());
}

main();
