import { TezosToolkit, TransactionWalletOperation } from "@taquito/taquito";
import BigNumber from "bignumber.js";

export class Youves {
  constructor(private readonly tezos: TezosToolkit) {}

  public async getBalance(address: string): Promise<BigNumber> {
    return this.tezos.tz.getBalance(address);
  }

  public async transfer(address: string, amount: number): Promise<string> {
    return new Promise((resolve) => {
      this.tezos.contract
        .transfer({ to: address, amount: amount })
        .then((op) => {
          console.log(`Waiting for ${op.hash} to be confirmed...`);
          return op.confirmation(1).then(() => op.hash);
        })
        .then((hash) => resolve(hash));
    });
  }

  public async createVault(): Promise<BigNumber | TransactionWalletOperation> {
    return this.tezos.wallet
      .at("KT1FyaDqiMQWg7Exo7VUiXAgZbd2kCzo3d4s")
      .then(async (contract) =>
        contract.methods
          .transfer([
            {
              from_: await this.tezos.wallet.pkh(),
              txs: [
                {
                  to_: "KT1FyaDqiMQWg7Exo7VUiXAgZbd2kCzo3d4s",
                  token_id: 1, // token_id
                  amount: 1, // token_amount (always 1)
                },
              ],
            },
          ])
          .send()
      );
  }
}
