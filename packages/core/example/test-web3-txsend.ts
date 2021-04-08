import Web3 from "web3";
import Common from "@ethereumjs/common";
import { TransactionFactory } from "@ethereumjs/tx";

async function main() {
  sendEthToOwn();
}

main().catch(console.error);

async function sendEthToOwn() {
  const web3 = new Web3(
    "http://tn.henesis.io/ethereum/ropsten?clientId=a481485a958f1b82ac310ec4eea27943"
  );
  // Is ropsten right?
  // https://web3js.readthedocs.io/en/v1.2.4/web3-eth.html#id18
  const common = new Common({ chain: "ropsten" });
  const address = "0x7667f0085E853a53f4227703aa6710f526176d0E";
  const nonce = await web3.eth.getTransactionCount(address);
  console.log({ nonce });
  const txData = {
    nonce,
    to: address,
    value: 10,
    gasLimit: 100000,
    gasPrice: web3.utils.toWei(web3.utils.toBN("50"), "gwei"),
  };
  const tx = TransactionFactory.fromTxData(txData, { common });
  console.log("create tx");
  const privKey = new Buffer(
    "485d7cce2696ebe4af8d99aeb5e95644ee9ce920166a3ebfbf42a4454bb952b6",
    "hex"
  );
  const signedTx = tx.sign(privKey);
  console.log("sign tx " + signedTx.hash().toString("hex"));
  const serializedTx = signedTx.serialize();
  console.log("serialize tx");

  const transactionReceipt = await web3.eth.sendSignedTransaction(
    "0x" + serializedTx.toString("hex")
  );
  console.log(transactionReceipt);
}
