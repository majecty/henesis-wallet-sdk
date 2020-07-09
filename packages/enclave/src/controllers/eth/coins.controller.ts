import express from "express";
import { CoinDTO } from "@haechi-labs/henesis-wallet-core";

import AbstractController from "../controller";
import { Controller } from "../../types";

export default class CoinsController extends AbstractController
  implements Controller {
  private path = "/api/v2/eth/coins";

  constructor() {
    super();
    this.initRoutes();
  }

  public initRoutes() {
    this.router.get(`${this.path}/:ticker`, this.promiseWrapper(this.getCoin));

    this.router.get(`${this.path}`, this.promiseWrapper(this.getAllCoins));
  }

  private async getCoin(req: express.Request): Promise<CoinDTO> {
    return (await req.sdk.eth.coins.getCoin(req.params.ticker)).getCoinData();
  }

  private async getAllCoins(req: express.Request): Promise<CoinDTO[]> {
    return (
      await req.sdk.eth.coins.getCoins(req.query.flag === "true")
    ).map((c) => c.getCoinData());
  }
}
