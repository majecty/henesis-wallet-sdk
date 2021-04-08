import { SDK } from "../src";
import "dotenv/config";
import BN from "bn.js";
import { EthMasterWallet } from "../src/eth/wallet";

function createRandomName() {
  const randomNumber = Math.floor(Math.random() * Number.MAX_SAFE_INTEGER);
  const randomStr = randomNumber.toString(16).substr(0, 16);
  return randomStr;
}

async function sendTxToFail(ethMasterWallet: EthMasterWallet) {
  const ethTx = await ethMasterWallet.transfer(
    "ETH",
    ethMasterWallet.getAddress(),
    new BN(1),
    "passphrase"
  );

  console.log(ethTx);
}

async function sendTxToFailKlay(klayMasterWallet: EthMasterWallet) {
  const tx = await klayMasterWallet.transfer(
    "KLAY",
    klayMasterWallet.getAddress(),
    new BN(1),
    "passphrase"
  );

  console.log(tx);
}

async function main() {
  const sdk = new SDK({
    accessToken: process.env.ACCESS_TOKEN,
    secret: process.env.SECRET,
    url: process.env.URL,
  });
  // await createMasterWallets(sdk);

  const ethWalletName = "borre-wallet-6-eth";
  const klayWalletName = "borre-wallet-6-klay";

  const klayWalletId = "48fcfd28a8fa61a6f74b7616688ac362";
  const ethWalletId = "cb8741d1c91d0012d65f9d782c55eddb";

  const ethMasterWallet = await sdk.eth.wallets.getMasterWallet(ethWalletId);
  const klayMasterWallet = await sdk.klay.wallets.getMasterWallet(klayWalletId);
  await sendTxToFail(ethMasterWallet);
  // await sendTxToFailKlay(klayMasterWallet);

  // const txId = "10c2e99e77874f08659ea24a81b21020";
  // const txId = "cc2b1a812c3af9589b5b9628f269bbe2";
  // const resendTx = await klayMasterWallet.resendTransaction(txId);
  // console.log(resendTx);
}

main().catch((error) => {
  if (error.response) {
    // The request was made and the server responded with a status code
    // that falls out of the range of 2xx
    console.log(error.response.data);
    console.log(error.response.status);
    console.log(error.response.headers);
  } else if (error.request) {
    // The request was made but no response was received
    // `error.request` is an instance of XMLHttpRequest in the browser and an instance of
    // http.ClientRequest in node.js
    console.log(error.request);
  } else {
    // Something happened in setting up the request that triggered an Error
    console.log("Error", error.message);
  }
  console.log(error.config);
});

async function createMasterWallets(sdk: SDK) {
  const walletName = "borre-wallet-6";

  const wallet = await sdk.eth.wallets.createMasterWallet(
    `${walletName}-eth`,
    "passphrase"
  );

  console.log(wallet);

  const wallet_klay = await sdk.klay.wallets.createMasterWallet(
    `${walletName}-klay`,
    "passphrase"
  );

  console.log(wallet_klay);
}
