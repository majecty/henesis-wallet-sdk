import express from "express";
import { Pagination } from "@haechi-labs/henesis-wallet-core/lib/types";
import { Transaction } from "@haechi-labs/henesis-wallet-core";

import AbstractController from "../controller";
import { Controller } from "../../types";

export default class TransactionsController extends AbstractController
  implements Controller {
  private path = "/api/v2/klay/transactions";

  constructor() {
    super();
    this.initRoutes();
  }

  public initRoutes() {
    this.router.get(
      `${this.path}`,
      this.promiseWrapper(this.getAllTransactions)
    );

    this.router.get(
      `${this.path}/:transactionId`,
      this.promiseWrapper(this.getTransaction)
    );
  }

  private async getAllTransactions(
    req: express.Request
  ): Promise<Pagination<Transaction>> {
    return await req.sdk.klay.transactions.getTransactions(req.query);
  }

  private async getTransaction(req: express.Request): Promise<Transaction> {
    return await req.sdk.klay.transactions.getTransaction(
      req.params.transactionId
    );
  }
}
