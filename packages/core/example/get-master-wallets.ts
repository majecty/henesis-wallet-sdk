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

  const ethWallets: EthMasterWallet[] = await sdk.eth.wallets.getMasterWallets();
  const klayWallets: EthMasterWallet[] = await sdk.klay.wallets.getMasterWallets();
  console.log(ethWallets, klayWallets);
}

main();
