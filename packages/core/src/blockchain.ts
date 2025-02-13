import {
  UserWalletDTOBlockchainEnum,
  Blockchain as EthBlockchain,
  Blockchain,
} from "./__generate__/eth";
import { Blockchain as AccountsBlockchain } from "./__generate__/accounts";

export const transformBlockchainType = (
  blockchain:
    | EthBlockchain
    | AccountsBlockchain
    | UserWalletDTOBlockchainEnum
    | Blockchain
) => {
  const byBlockchain: Record<
    EthBlockchain | AccountsBlockchain | UserWalletDTOBlockchainEnum,
    BlockchainType
  > = {
    ETHEREUM: BlockchainType.ETHEREUM,
    KLAYTN: BlockchainType.KLAYTN,
    BITCOIN: BlockchainType.BITCOIN,
  };
  return byBlockchain[blockchain];
};

export enum BlockchainType {
  ETHEREUM = "ETHEREUM",
  KLAYTN = "KLAYTN",
  BITCOIN = "BITCOIN",
}
