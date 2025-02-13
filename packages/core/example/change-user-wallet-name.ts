/// <reference path="../src/typings/index.d.ts" />
import { SDK, Env } from "../src";
import { EthMasterWallet } from "../src/eth/wallet";
import "dotenv/config";

async function main() {
  const sdk = new SDK({
    accessToken: process.env.ACCESS_TOKEN,
    secret: process.env.SECRET,
    url: process.env.URL,
    env: Env.Local,
  });

  const wallet: EthMasterWallet = await sdk.eth.wallets.getMasterWallet(
    "9efbb37b3cc2e78c389ad389ce9d05ef"
  );
  await wallet.changeName("name-changed");
  console.log(wallet.getData());
}

main();
