import Web3 from "web3";

async function main() {
  const web3 = new Web3(
    "http://tn.henesis.io/ethereum/ropsten?clientId=a481485a958f1b82ac310ec4eea27943"
  );
  const blockNumber = await web3.eth.getBlockNumber();
  console.log(blockNumber);
}

main().catch(console.error);
