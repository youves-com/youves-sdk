import { TezosToolkit } from '@taquito/taquito'
import BigNumber from 'bignumber.js'
import { Token } from '../tokens/token'
import { Exchange, Log } from './exchange'

export class PlentyExchange extends Exchange {
  public exchangeUrl: string = 'https://plentydefi.com'
  public exchangeId: string = ``
  public name: string = 'Plenty'
  public logo: string = 'plenty_logo.svg'

  public TOKEN_DECIMALS = 12
  public TEZ_DECIMALS = 6

  public PLENTY_FEE: number = 0.997

  constructor(tezos: TezosToolkit, dexAddress: string, token1: Token, token2: Token) {
    super(tezos, dexAddress, token1, token2)
  }

  @Log()
  public async token1ToToken2(tokenAmount: number, minimumReceived: number): Promise<string> {
    return this.token1ToToken2Swap(tokenAmount, minimumReceived)
  }

  @Log()
  public async token2ToToken1(tokenAmount: number, minimumReceived: number): Promise<string> {
    return this.token2ToToken1Swap(tokenAmount, minimumReceived)
  }

  @Log()
  public async getToken1MaximumExchangeAmount(): Promise<BigNumber> {
    return this.getExchangeMaximumTokenAmount(1)
  }

  @Log()
  public async getToken2MaximumExchangeAmount(): Promise<BigNumber> {
    return this.getExchangeMaximumTokenAmount(2)
  }

  @Log()
  public async getExchangeRate(): Promise<BigNumber> {
    const dexContract = await this.getContractWalletAbstraction(this.dexAddress)
    const storage = (await this.getStorageOfContract(dexContract)) as any
    return new BigNumber(storage['token1_pool'])
      .dividedBy(10 ** this.TOKEN_DECIMALS)
      .dividedBy(new BigNumber(storage['token2_pool']).dividedBy(10 ** this.TEZ_DECIMALS))
  }

  @Log()
  public async getToken1Balance(): Promise<BigNumber> {
    return this.getTokenAmount(this.token1.contractAddress, await this.getOwnAddress(), Number(this.token1.tokenId))
  }

  @Log()
  public async getToken2Balance(): Promise<BigNumber> {
    return this.getTokenAmount(this.token2.contractAddress, await this.getOwnAddress(), Number(this.token2.tokenId))
  }

  @Log()
  public async getExpectedMinimumReceivedToken1(amountInMutez: number): Promise<BigNumber> {
    const dexContract = await this.getContractWalletAbstraction(this.dexAddress)
    const storage = (await this.getStorageOfContract(dexContract)) as any
    const currentTokenPool = new BigNumber(storage['token1_pool'])
    const currentTezPool = new BigNumber(storage['token2_pool'])
    const constantProduct = currentTokenPool.multipliedBy(currentTezPool)
    const remainingTokenPoolAmount = constantProduct.dividedBy(currentTezPool.plus(amountInMutez * this.PLENTY_FEE))
    return currentTokenPool.minus(remainingTokenPoolAmount)
  }

  @Log()
  public async getExpectedMinimumReceivedToken2(tokenAmount: number): Promise<BigNumber> {
    const dexContract = await this.getContractWalletAbstraction(this.dexAddress)
    const storage = (await this.getStorageOfContract(dexContract)) as any
    const currentTokenPool = new BigNumber(storage['token1_pool'])
    const currentTezPool = new BigNumber(storage['token2_pool'])
    const constantProduct = currentTokenPool.multipliedBy(currentTezPool)
    const remainingTezPoolAmount = constantProduct.dividedBy(currentTokenPool.plus(tokenAmount * this.PLENTY_FEE))
    return currentTezPool.minus(remainingTezPoolAmount)
  }

  @Log()
  private async getExchangeMaximumTokenAmount(tokenNumber: 1 | 2): Promise<BigNumber> {
    const dexContract = await this.getContractWalletAbstraction(this.dexAddress)
    const storage = (await this.getStorageOfContract(dexContract)) as any
    const currentTokenPool = new BigNumber(storage[`token${tokenNumber}_pool`])
    return currentTokenPool.dividedBy(3)
  }

  @Log()
  public async token1ToToken2Swap(tokenAmount: number, minimumReceived: number): Promise<string> {
    const source = await this.getOwnAddress()
    const dexContract = await this.getContractWalletAbstraction(this.dexAddress)
    const dexStorage = (await this.getStorageOfContract(dexContract)) as any

    const tokenAddress = dexStorage['token1Address']
    const tokenId = dexStorage['token1Id']
    const tokenIdAlt = dexStorage['token2Id']

    return this.sendAndAwait(
      this.tezos.wallet
        .batch()
        .withContractCall(await this.prepareAddTokenOperator(tokenAddress, this.dexAddress, tokenId))
        .withContractCall(dexContract.methods.Swap(minimumReceived, source, tokenAddress, Number(tokenIdAlt), tokenAmount))
        // .withContractCall(
        //   dexContract.methods.Swap([
        //     {
        //       parameter: {
        //         MinimumTokenOut: minimumReceived,
        //         recipient: source,
        //         requiredTokenAddress: tokenAddress,
        //         requiredTokenId: tokenId,
        //         tokenAmountIn: tokenAmount
        //       }
        //     }
        //   ])
        // )
        .withContractCall(await this.prepareRemoveTokenOperator(tokenAddress, this.dexAddress, tokenId))
    )
  }

  @Log()
  public async token2ToToken1Swap(tokenAmount: number, minimumReceived: number): Promise<string> {
    const source = await this.getOwnAddress()
    const dexContract = await this.getContractWalletAbstraction(this.dexAddress)
    const dexStorage = (await this.getStorageOfContract(dexContract)) as any

    const tokenAddress = dexStorage['token2Address']
    const tokenId = dexStorage['token2Id']
    const tokenIdAlt = dexStorage['token1Id']

    return this.sendAndAwait(
      this.tezos.wallet
        .batch()
        .withContractCall(await this.prepareAddTokenOperator(tokenAddress, this.dexAddress, tokenId))
        .withContractCall(dexContract.methods.Swap(minimumReceived, source, tokenAddress, Number(tokenIdAlt), tokenAmount))
        // .withContractCall(
        //   dexContract.methods.Swap([
        //     {
        //       parameter: {
        //         MinimumTokenOut: minimumReceived,
        //         recipient: source,
        //         requiredTokenAddress: tokenAddress,
        //         requiredTokenId: tokenId,
        //         tokenAmountIn: tokenAmount
        //       }
        //     }
        //   ])
        // )

        .withContractCall(await this.prepareRemoveTokenOperator(tokenAddress, this.dexAddress, tokenId))
    )
  }

  public async getExchangeUrl(): Promise<string> {
    return `https://www.plentydefi.com/swap?from=${this.token1.symbol}&to=${this.token2.symbol}`
  }
}
