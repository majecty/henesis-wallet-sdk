import {SDK} from "../src";
import {WalletStatus} from "../src/wallet";
import {EthMasterWallet, EthUserWallet} from "../src/eth/wallet";
import Web3 from "web3";
import {TransactionFactory} from "@ethereumjs/tx";
import Common from "@ethereumjs/common";
import BN from "bn.js";
import {toBN, toWei} from "web3-utils";
import "dotenv/config";

async function main() {
  console.log("start main");
  const config = {
    accessToken: process.env.ACCESS_TOKEN,
    secret: process.env.SECRET,
    url: process.env.URL,
  };
  console.log(config);
  const sdk = new SDK(config);

  console.log("Generate random name");
  const randomName = createRandomName();

  const ethMasterWallet = await createMasterWallets(sdk, randomName);
  const depositAddresses = await createDepositAddresses(sdk, ethMasterWallet);

  // give ETH to deposit addresses
  await sendETHToDepositAddresses(depositAddresses);

  console.log("We need to call flush");
  // create deposit addresses
}

main().catch((error) => {
  console.log("In main catch");
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
    console.error(error);
  }
  console.log(error.config);
});

function createRandomName() {
  const randomNumber = Math.floor(Math.random() * Number.MAX_SAFE_INTEGER);
  const randomStr = randomNumber.toString(16).substr(0, 16);
  return {
    randomStr,
    eth: `borre-${randomStr}-eth`,
  };
}

async function createMasterWallets(
  sdk: SDK,
  {
    eth: ethName,
  }: {
    eth: string;
  }
): Promise<EthMasterWallet> {
  console.log("create master wallet");
  const wallet = await sdk.eth.wallets.createMasterWallet(
    ethName,
    "passphrase"
  );

  console.log("Request master wallet creation");
  console.log(wallet);

  while (true) {
    const masterWallet = await sdk.eth.wallets.getMasterWallet(wallet.getId());
    switch (masterWallet.getData().status) {
      case WalletStatus.ACTIVE:
        return masterWallet;
      case WalletStatus.CREATING:
        console.log("Creating master wallet");
        break;
      case WalletStatus.FAILED:
        throw new Error("Failed to create master wallet");
      case WalletStatus.INACTIVE:
        throw new Error("Invalid status INACTIVE in creating master wallet");
    }
    await delay(3000);
  }
}

async function delay(ms: number) {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve();
    }, ms);
  });
}

async function createDepositAddresses(
  sdk: SDK,
  masterWallet: EthMasterWallet
): Promise<EthUserWallet[]> {
  const result = [];
  for (let i = 0; i < 5; i++) {
    const depositAddressName = `borre-DA-${createRandomName().randomStr}`;
    const ethUserWallet = await masterWallet.createUserWallet(
      depositAddressName,
      "passphrase"
    );
    result.push(ethUserWallet);
    console.log(
      `Create deposit address ${depositAddressName} status ${ethUserWallet}`
    );
  }

  // 처음 flush할 때까지 contract를 배포하지 않는다.
  return result;
}

async function sendETHToDepositAddresses(depositAddresses: EthUserWallet[]) {
  for (let depositAddress of depositAddresses) {
    await sendETH(depositAddress.getAddress(), toWei(toBN("10"), "gwei"));
  }
}

async function sendETH(to: string, value: BN) {
  const web3 = new Web3(
    "http://tn.henesis.io/ethereum/ropsten?clientId=a481485a958f1b82ac310ec4eea27943"
  );
  // https://web3js.readthedocs.io/en/v1.2.4/web3-eth.html#id18
  const common = new Common({ chain: "ropsten" });
  const address = "0x7667f0085E853a53f4227703aa6710f526176d0E";
  const nonce = await web3.eth.getTransactionCount(address);
  console.log({ nonce });
  const txData = {
    nonce,
    to,
    value,
    gasLimit: 100000,
    gasPrice: web3.utils.toWei(web3.utils.toBN("50"), "gwei"),
  };
  console.log(txData);
  const tx = TransactionFactory.fromTxData(txData, { common });
  const privKey = new Buffer(
    "485d7cce2696ebe4af8d99aeb5e95644ee9ce920166a3ebfbf42a4454bb952b6",
    "hex"
  );
  const signedTx = tx.sign(privKey);
  console.log("sign tx " + signedTx.hash().toString("hex"));
  const serializedTx = signedTx.serialize();

  const transactionReceipt = await web3.eth.sendSignedTransaction(
    "0x" + serializedTx.toString("hex")
  );
  console.log(transactionReceipt);
}
