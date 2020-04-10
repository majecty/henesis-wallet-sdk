import { Contract } from 'web3-eth-contract';
import Web3 from 'web3';
import { AbiItem } from 'web3-utils';
import BN from 'bn.js';
import CryptoJS from 'crypto-js';
import { Client } from './sdk';
import {
  PaginationOptions, Pagination, Key, KeyWithPriv, Balance,
} from './types';
import { Coin, MultiSigPayload } from './coin';
import { Keychains } from './keychains';
import { Blockchain } from './blockchain';
import { Factory, GlobalCoinFactoryGenerator } from './factory';
import wallet from './contracts/MasterWallet.json';
import { Converter } from './utils';

const Bytes = require('./vendor/eth-lib/bytes');
const { keccak256 } = require('./vendor/eth-lib/hash');

export interface Nonce {
  nonce: BN;
}

export enum WalletStatus {
  Inactive = 'INACTIVE',
  Active = 'ACTIVE'
}

export interface Transaction {
  id: string;
  blockchain: Blockchain;
  walletId: string;
  accountId: string;
  hash: string;
  status: string;
}

export interface WalletData {
  id: string;
  name: string;
  address: string;
  blockchain: Blockchain;
  createdAt: string;
  status: WalletStatus;
}

export interface MasterWalletData extends WalletData {
  backupKey: Key;
  accountKey: Key;
  encryptionKey: string;
}

export interface UserWalletData extends WalletData {

}

export interface UserWalletPaginationOptions extends PaginationOptions{
  name?: string;
  id?: string;
  address?: string;
}

function convertMultiSigPayloadToDTO(multiSigPayload: MultiSigPayload) {
  return {
    hexData: multiSigPayload.hexData,
    walletNonce: multiSigPayload.walletNonce.toString(10),
    value: multiSigPayload.value.toString(10),
    toAddress: multiSigPayload.toAddress,
    walletAddress: multiSigPayload.walletAddress,
  };
}

export abstract class Wallet {
  protected readonly client: Client;

  protected readonly baseUrl = '/wallets';

  protected readonly keychains: Keychains;

  protected readonly coinFactory: Factory<Coin>;

  protected constructor(
    client: Client,
    keychains: Keychains,
    coinFactory: Factory<Coin>,
  ) {
    this.client = client;
    this.keychains = keychains;
    this.coinFactory = coinFactory;
  }

  abstract getChain(): Blockchain;

  abstract verifyAddress(address: string): boolean;

  abstract isValidAddress(address: string): boolean;

  abstract transfer(
    ticker: string,
    to: string,
    amount: BN,
    passphrase: string,
    otpCode?: string
  ): Promise<Transaction>;

  abstract contractCall(
    contractAddress: string,
    value: BN,
    data: string,
    passphrase: string,
    otpCode?: string
  ): Promise<Transaction>;

  abstract getBalance(): Promise<Balance[]>;

  abstract getAddress(): string;
}

export abstract class EthLikeWallet extends Wallet {
  protected masterWalletData: MasterWalletData;

  protected constructor(
    client: Client,
    masterWalletData: MasterWalletData,
    keychains: Keychains,
  ) {
    super(client, keychains, GlobalCoinFactoryGenerator.get(masterWalletData.blockchain));
    this.masterWalletData = masterWalletData;
  }

  verifyAddress(address: string): boolean {
    return false;
  }

  getChain(): Blockchain {
    return this.masterWalletData.blockchain;
  }

  isValidAddress(address: string): boolean {
    return false;
  }

  async contractCall(
    contractAddress: string,
    value: BN,
    data: string,
    passphrase: string,
    otpCode?: string,
  ): Promise<Transaction> {
    const nonce = await this.getNonce();
    const multiSigPayload: MultiSigPayload = {
      hexData: data,
      walletNonce: nonce,
      value,
      toAddress: contractAddress,
      walletAddress: this.getAddress(),
    };

    const signature = this.signPayload(
      multiSigPayload,
      passphrase,
    );
    return this.sendTransaction(
      signature,
      this.getChain(),
      multiSigPayload,
      this.masterWalletData.id,
      otpCode,
    );
  }

  protected signPayload(multiSigPayload: MultiSigPayload, passphrase: string) {
    const payload = `0x${
      multiSigPayload.walletAddress.toLowerCase().slice(2)
    }${multiSigPayload.toAddress.toLowerCase().slice(2)
    }${Bytes.pad(32, Bytes.fromNat(`0x${multiSigPayload.value.toString(16)}`)).slice(2)
    }${Bytes.pad(32, Bytes.fromNat(`0x${multiSigPayload.walletNonce.toString(16)}`)).slice(2)
    }${multiSigPayload.hexData.slice(2)}`;

    return this.keychains.signPayload(
      this.masterWalletData.blockchain,
      payload,
      this.masterWalletData.accountKey.keyFile,
      passphrase,
    );
  }

  protected sendTransaction(
    signature: string,
    blockchain: string,
    multiSigPayload: MultiSigPayload,
    walletId: string,
    otpCode?: string,
    gasPrice?: BN,
    gasLimit?: BN,
  ) {
    return this.client
      .post<Transaction>(
        `${this.baseUrl}/transactions`,
        {
          walletId,
          blockchain,
          signature,
          multiSigPayload: convertMultiSigPayloadToDTO(multiSigPayload),
          gasPrice,
          gasLimit,
          otpCode,
        },
      );
  }

  async transfer(
    ticker: string,
    to: string,
    amount: BN,
    passphrase: string,
    otpCode?: string,
  ): Promise<Transaction> {
    const coin: Coin = this.coinFactory.get(ticker);
    const hexData = coin.buildData(to, amount);
    const nonce = await this.getNonce();
    const multiSigPayload: MultiSigPayload = {
      hexData,
      walletNonce: nonce,
      value: new BN(0),
      toAddress: this.getAddress(),
      walletAddress: this.getAddress(),
    };

    const signature = this.signPayload(
      multiSigPayload,
      passphrase,
    );

    return this.sendTransaction(
      signature,
      this.getChain(),
      multiSigPayload,
      this.masterWalletData.id,
      otpCode,
    );
  }

  async getNonce(): Promise<BN> {
    const nonce: Nonce = await this.client
      .get<Nonce>(`${this.baseUrl}/${this.masterWalletData.id}/nonce`);
    return new BN(`${nonce.nonce}`);
  }
}

export class MasterWallet extends EthLikeWallet {
  private wallet: Contract;

  public constructor(
    client: Client,
    walletData: MasterWalletData,
    keychains: Keychains,
  ) {
    super(client, walletData, keychains);
    this.wallet = new new Web3().eth.Contract((wallet as AbiItem[]));
  }

  async restorePassphrase(encryptedPassphrase: string, newPassphrase: string, otpCode?: string): Promise<void>{
    const encryptionKey = this.masterWalletData.encryptionKey;
    const decrypted = CryptoJS.AES.decrypt(encryptedPassphrase, encryptionKey);
    const passphrase = this.hex2a(decrypted.toString());
    await this.changePassphrase(passphrase, newPassphrase, otpCode);
  }

  hex2a(hex) {
    let str = '';
    for (let i = 0; i < hex.length; i += 2)
      str += String.fromCharCode(parseInt(hex.substr(i, 2), 16));
    return str;
  }

  async changePassphrase(passphrase: string, newPassphrase: string, otpCode?: string): Promise<void> {
    const newKey: KeyWithPriv = this.keychains.changePassword(
      this.masterWalletData.accountKey.keyFile,
      passphrase,
      newPassphrase,
    );

    this.masterWalletData.accountKey = await this.client.patch<Key>(
      `${this.baseUrl}/${this.masterWalletData.id}/account-key`,
      {
        keyFile: newKey.keyFile,
        otpCode,
      },
    );
  }

  async createUserWallet(name: string, passphrase: string, salt?: BN): Promise<UserWallet> {
    const nonce = await this.getNonce();
    // generates 32byte(256 bit) randoma hex string and converts to BN when salt is not defined
    if (salt === undefined) {
      salt = Web3.utils.toBN(Web3.utils.randomHex(32));
    }
    const data = this.wallet.methods.createUserWallet(salt).encodeABI();
    const multiSigPayload: MultiSigPayload = {
      hexData: data,
      walletNonce: nonce,
      value: new BN(0),
      toAddress: this.getAddress(),
      walletAddress: this.getAddress(),
    };

    const signature = this.signPayload(
      multiSigPayload,
      passphrase,
    );

    const userWalletData = await this.client
      .post<UserWalletData>(
        `${this.baseUrl}/${this.masterWalletData.id}/user-wallets`,
        {
          name,
          salt: salt.toString(10),
          signature,
          blockchain: this.getChain(),
          multiSigPayload: convertMultiSigPayloadToDTO(multiSigPayload),
        },
      );

    return new UserWallet(
      this.client,
      this.masterWalletData,
      this.keychains,
      userWalletData,
    );
  }

  async getUserWallet(walletId: string): Promise<UserWallet> {
    const userWalletData = await this.client
      .get<UserWalletData>(`${this.baseUrl}/${this.masterWalletData.id}/user-wallets/${walletId}`);
    return new UserWallet(
      this.client,
      this.masterWalletData,
      this.keychains,
      userWalletData,
    );
  }

  async getBalance(): Promise<Balance[]> {
    const balances: {
      coinType: string;
      amount: number;
      name: string;
      symbol: string;
    }[] = await this.client
      .get(`${this.baseUrl}/${this.masterWalletData.id}/balance`);

    return balances.map((balance) => ({
      symbol: balance.symbol,
      amount: new BN(`${balance.amount}`),
      coinType: balance.coinType,
      name: balance.name,
    }));
  }

  getAddress(): string {
    return this.masterWalletData.address;
  }

  getData(): MasterWalletData {
    return this.masterWalletData;
  }

  async getUserWallets(options?: UserWalletPaginationOptions): Promise<Pagination<UserWallet>> {
    const queryString: string = options ? Object.keys(Converter.toSnakeCase(options))
      .map((key) => `${key}=${Converter.toSnakeCase(options)[key]}`).join('&') : '';

    const data: Pagination<UserWalletData> = await this.client
      .get<Pagination<UserWalletData>>(`${this.baseUrl}/${this.masterWalletData.id}/user-wallets?${queryString}`);

    return {
      pagination: data.pagination,
      results: data.results.map((data) => new UserWallet(
        this.client,
        this.masterWalletData,
        this.keychains,
        data,
      )),
    } as Pagination<UserWallet>;
  }
}

export class UserWallet extends EthLikeWallet {
  private readonly userWalletData: UserWalletData;

  public constructor(
    client: Client,
    walletData: MasterWalletData,
    keychains: Keychains,
    userWalletData: UserWalletData,
  ) {
    super(client, walletData, keychains);
    this.userWalletData = userWalletData;
  }

  async getNonce(): Promise<BN> {
    const nonce: Nonce = await this.client
      .get<Nonce>(`${this.baseUrl}/${this.masterWalletData.id}/user-wallets/${this.userWalletData.id}/nonce`);
    return new BN(`${nonce.nonce}`);
  }

  async getBalance(): Promise<Balance[]> {
    const balances: {
      coinType: string;
      amount: number;
      name: string;
      symbol: string;
    }[] = await this.client
      .get(`${this.baseUrl}/${this.masterWalletData.id}/user-wallets/${this.userWalletData.id}/balance`);

    return balances.map((balance) => ({
      symbol: balance.symbol,
      amount: new BN(`${balance.amount}`),
      coinType: balance.coinType,
      name: balance.name,
    }));
  }

  getAddress(): string {
    return this.userWalletData.address;
  }

  getData(): UserWalletData {
    return this.userWalletData;
  }
}
