import { SDK } from "../src";
import "dotenv/config";

async function main() {
  const sdk = new SDK({
    accessToken: process.env.ACCESS_TOKEN,
    secret: process.env.SECRET,
    url: "http://localhost:8080/api/v1"
  });

  console.log(await sdk.events.getCallEvents({
    walletId: "3be5351bd52626108326f9ec44b7b633",
    transactionHash: "0x123"
  }));
}

main().catch((e) => console.error(e));
