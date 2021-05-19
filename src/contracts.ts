import {
  ContractAbstraction,
  TezosToolkit,
  Wallet,
  WalletContract,
} from '@taquito/taquito'

import BigNumber from "bignumber.js";

export class Youves {
  public TARGET_ORACLE_ADDRESS = 'KT1FH13JSKxnFa6tkd42C2xrxrHAtjz1AvVM'
  public OBSERVED_ORACLE_ADDRESS = 'KT1HtKPoTj5zUiUS2MWdqH2M1JSawP42KmaL'
  public TOKEN_ADDRESS ='KT1F9Hdnk2GPQ64RXjESdeFwJ65JPSV2Axj2'
  public ENGINE_ADDRESS ='KT1BqMAKynQCHqtpQkK7CeEU9kWGPirC3xo4'
  public GOVERNANCE_TOKEN_ADDRESS = 'KT1Kiv3qQwkX6oZe9xR1Yv8g2J8SGVUpqvj1'
  public OPTIONS_LISTING_ADDRESS = 'KT1LqNZFikusx5dExWdpfUJkiLpJKkr2STdC'
  public REWARD_POOL_ADDRESS = 'KT1AjYwKPh2Y1CCxnGhHBb3S6Dy9ioQCkzbs'
  public SAVINGS_POOL_ADDRESS = 'KT1J25Xz9Ne6grSoW5fjL7GREhYY1muzFDGk'
  public VIEWER_CALLBACK_ADDRESS = 'KT1NLqgDPbtdvhbR44YWVk8jFZ37v6QBhh6W%set_address'
  
  
  public tokenContractPromise: Promise<ContractAbstraction<Wallet>>
  public governanceTokenContractPromise: Promise<ContractAbstraction<Wallet>>
  public rewardsPoolContractPromise: Promise<ContractAbstraction<Wallet>>
  public savingsPoolContractPromise: Promise<ContractAbstraction<Wallet>>
  public optionsListingContractPromise: Promise<ContractAbstraction<Wallet>>
  public engineContractPromise: Promise<ContractAbstraction<Wallet>>
  public targetOracleContractPromise: Promise<ContractAbstraction<Wallet>>
  public observedOracleContractPromise: Promise<ContractAbstraction<Wallet>>

  constructor(private readonly tezos: TezosToolkit) {
    this.tokenContractPromise = this.tezos.wallet.at(this.TOKEN_ADDRESS)
    this.governanceTokenContractPromise = this.tezos.wallet.at(this.GOVERNANCE_TOKEN_ADDRESS)
    this.rewardsPoolContractPromise = this.tezos.wallet.at(this.REWARD_POOL_ADDRESS)
    this.savingsPoolContractPromise = this.tezos.wallet.at(this.SAVINGS_POOL_ADDRESS)
    this.optionsListingContractPromise = this.tezos.wallet.at(this.OPTIONS_LISTING_ADDRESS)
    this.engineContractPromise = this.tezos.wallet.at(this.ENGINE_ADDRESS)
    this.targetOracleContractPromise = this.tezos.wallet.at(this.TARGET_ORACLE_ADDRESS)
    this.observedOracleContractPromise = this.tezos.wallet.at(this.OBSERVED_ORACLE_ADDRESS)
  }

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

  async sendAndAwait(walletOperation: any): Promise<string> {
    const batchOp = await walletOperation.send()
    await batchOp.confirmation()
    return batchOp.opHash
  }

  public async createVault(amountInMutez: number, mintAmountInyUSD: number, baker?: string): Promise<string> {
    const engineContract =  await this.engineContractPromise
    return this.sendAndAwait(
      this.tezos.wallet
        .batch()
        .withTransfer(
          engineContract.methods
            .create_vault(
              baker ? baker : null,
              this.VIEWER_CALLBACK_ADDRESS
            )
            .toTransferParams({ amount: amountInMutez, mutez: true })
        )
        .withContractCall(
          engineContract.methods.mint(mintAmountInyUSD)
        )
    )
  }
  
  public async transferToken(tokenAddress:string, recipient:string, tokenAmount: number, tokenId: number): Promise<string> {
    const source = await this.tezos.wallet.pkh()
    const tokenContract =  await this.tezos.wallet.at(tokenAddress)
    return this.sendAndAwait(tokenContract.methods
      .transfer([{
        from_: source,
        txs: [
          {
            to_: recipient,
            token_id: tokenId,
            amount: tokenAmount
          },
        ],
      }]))
  }
  
  public async transferSyntheticToken(recipient:string, tokenAmount: number): Promise<string> {
    return this.transferToken(this.TOKEN_ADDRESS, recipient, tokenAmount, 0)
  }
  
  public async transferGovernanceToken(recipient:string, tokenAmount: number): Promise<string> {
    return this.transferToken(this.GOVERNANCE_TOKEN_ADDRESS, recipient, tokenAmount, 0)
  }

  public async addTokenOperator(tokenAddress:string, operator:string, tokenId: number): Promise<string> {
    const source = await this.tezos.wallet.pkh()
    const tokenContract =  await this.tezos.wallet.at(tokenAddress)
    return this.sendAndAwait(tokenContract.methods
      .update_operators([
        {'add_operator': 
        {'owner':source, 'operator':operator, 'token_id':tokenId}}
      ]))
  }

  public async addSynthenticTokenOperator(operator:string): Promise<string> {
    return this.addTokenOperator(this.TOKEN_ADDRESS, operator, 0)
  }
  
  public async addGovernanceTokenOperator(operator:string): Promise<string> {
    return this.addTokenOperator(this.GOVERNANCE_TOKEN_ADDRESS, operator, 0)
  }
  
  public async claimGovernanceToken(): Promise<string> {
    const governanceTokenContract =  await this.governanceTokenContractPromise
    return this.sendAndAwait(governanceTokenContract.methods
      .claim(null))
  }

  public async depositToRewardsPool(tokenAmount: number): Promise<string> {
    const rewardsPoolContract =  await this.rewardsPoolContractPromise
    return this.sendAndAwait(rewardsPoolContract.methods
      .deposit(tokenAmount))
  }

  public async claimRewards(): Promise<string> {
    const rewardsPoolContract =  await this.rewardsPoolContractPromise
    return this.sendAndAwait(rewardsPoolContract.methods
      .claim(null))
  }

  public async withdrawFromRewardsPool(): Promise<string> {
    const rewardsPoolContract =  await this.rewardsPoolContractPromise
    return this.sendAndAwait(rewardsPoolContract.methods
      .withdraw(null))
  }

  public async depositToSavingsPool(tokenAmount: number): Promise<string> {
    const savingsPoolContract =  await this.savingsPoolContractPromise
    return this.sendAndAwait(savingsPoolContract.methods
      .deposit(tokenAmount))
  }

  public async withdrawFromSavingsPool(): Promise<string> {
    const savingsPoolContract =  await this.savingsPoolContractPromise
    return this.sendAndAwait(savingsPoolContract.methods
      .withdraw(null))
  }
}
