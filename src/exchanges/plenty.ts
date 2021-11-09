import { TezosToolkit } from '@taquito/taquito'
import BigNumber from 'bignumber.js'
import { Token } from '../tokens/token'
import { Exchange } from './exchange'

export class PlentyExchange extends Exchange {
  public exchangeUrl: string = 'https://plentydefi.com'
  public exchangeId: string = ``
  public name: string = 'Plenty'
  public logo: string = 'plenty_logo.svg'

  public TOKEN_DECIMALS = 12

  public PLENTY_FEE: number = 0.997

  constructor(tezos: TezosToolkit, dexAddress: string, token1: Token, token2: Token) {
    super(tezos, dexAddress, token1, token2)
  }

  public async token1ToToken2(tokenAmount: number, minimumReceived: number): Promise<string> {
    return this.token1ToToken2Swap(tokenAmount, minimumReceived)
  }

  public async token2ToToken1(tokenAmount: number, minimumReceived: number): Promise<string> {
    return this.token2ToToken1Swap(tokenAmount, minimumReceived)
  }

  public async getToken1MaximumExchangeAmount(): Promise<BigNumber> {
    return this.getExchangeMaximumTokenAmount(1)
  }

  public async getToken2MaximumExchangeAmount(): Promise<BigNumber> {
    return this.getExchangeMaximumTokenAmount(2)
  }

  public async getExchangeRate(): Promise<BigNumber> {
    const dexContract = await this.getContractWalletAbstraction(this.dexAddress)
    const storage = (await this.getStorageOfContract(dexContract)) as any
    return new BigNumber(storage['token1_pool'])
      .dividedBy(10 ** this.TOKEN_DECIMALS)
      .dividedBy(new BigNumber(storage['token2_pool']).dividedBy(10 ** this.TOKEN_DECIMALS))
  }

  public async getToken1Balance(): Promise<BigNumber> {
    return this.getTokenAmount(this.token1.contractAddress, await this.getOwnAddress(), Number(this.token1.tokenId))
  }

  public async getToken2Balance(): Promise<BigNumber> {
    return this.getTokenAmount(this.token2.contractAddress, await this.getOwnAddress(), Number(this.token2.tokenId))
  }

  public async getExpectedMinimumReceivedToken1(amountInMutez: number): Promise<BigNumber> {
    const dexContract = await this.getContractWalletAbstraction(this.dexAddress)
    const storage = (await this.getStorageOfContract(dexContract)) as any
    const currentTokenPool = new BigNumber(storage['token1_pool'])
    const currentTezPool = new BigNumber(storage['token2_pool'])
    const constantProduct = currentTokenPool.multipliedBy(currentTezPool)
    const remainingTokenPoolAmount = constantProduct.dividedBy(currentTezPool.plus(amountInMutez * this.PLENTY_FEE))
    return currentTokenPool.minus(remainingTokenPoolAmount)
  }

  public async getExpectedMinimumReceivedToken2(tokenAmount: number): Promise<BigNumber> {
    const dexContract = await this.getContractWalletAbstraction(this.dexAddress)
    const storage = (await this.getStorageOfContract(dexContract)) as any
    const currentTokenPool = new BigNumber(storage['token1_pool'])
    const currentTezPool = new BigNumber(storage['token2_pool'])
    const constantProduct = currentTokenPool.multipliedBy(currentTezPool)
    const remainingTezPoolAmount = constantProduct.dividedBy(currentTokenPool.plus(tokenAmount * this.PLENTY_FEE))
    return currentTezPool.minus(remainingTezPoolAmount)
  }

  private async getExchangeMaximumTokenAmount(tokenNumber: 1 | 2): Promise<BigNumber> {
    const dexContract = await this.getContractWalletAbstraction(this.dexAddress)
    const storage = (await this.getStorageOfContract(dexContract)) as any
    const currentTokenPool = new BigNumber(storage[`token${tokenNumber}_pool`])
    return currentTokenPool.dividedBy(3)
  }

  public async token1ToToken2Swap(tokenAmount: number, minimumReceived: number): Promise<string> {
    const source = await this.getOwnAddress()
    const dexContract = await this.getContractWalletAbstraction(this.dexAddress)
    const dexStorage = (await this.getStorageOfContract(dexContract)) as any

    const token1Address = dexStorage['token1Address']
    const token1Id = dexStorage['token1Id']
    const token2Address = dexStorage['token2Address']
    const token2Id = dexStorage['token2Id']

    return this.sendAndAwait(
      this.tezos.wallet
        .batch()
        .withContractCall(await this.prepareAddTokenOperator(token1Address, this.dexAddress, token1Id))
        .withContractCall(dexContract.methods.Swap(minimumReceived, source, token2Address, Number(token2Id), tokenAmount))
        .withContractCall(await this.prepareRemoveTokenOperator(token1Address, this.dexAddress, token1Id))
    )
  }

  public async token2ToToken1Swap(tokenAmount: number, minimumReceived: number): Promise<string> {
    const source = await this.getOwnAddress()
    const dexContract = await this.getContractWalletAbstraction(this.dexAddress)
    const dexStorage = (await this.getStorageOfContract(dexContract)) as any

    const token1Address = dexStorage['token1Address']
    const token1Id = dexStorage['token1Id']
    const token2Address = dexStorage['token2Address']
    const token2Id = dexStorage['token2Id']

    return this.sendAndAwait(
      this.tezos.wallet
        .batch()
        .withContractCall(await this.prepareAddTokenOperator(token2Address, this.dexAddress, token2Id))
        .withContractCall(dexContract.methods.Swap(minimumReceived, source, token1Address, Number(token1Id), tokenAmount))
        .withContractCall(await this.prepareRemoveTokenOperator(token2Address, this.dexAddress, token2Id))
    )
  }

  public async getExchangeUrl(): Promise<string> {
    return `https://www.plentydefi.com/swap?from=${this.token1.symbol}&to=${this.token2.symbol}`
  }
}
