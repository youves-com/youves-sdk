import { ContractAbstraction, TezosToolkit, Wallet } from '@taquito/taquito'
import BigNumber from 'bignumber.js'
import { DexType, NetworkConstants } from '../networks.base'
import { Token } from '../tokens/token'
import { cacheFactory, round } from '../utils'
import { Exchange } from './exchange'

const promiseCache = new Map<string, Promise<unknown>>()

const cache = cacheFactory(promiseCache, (obj: QuipuswapExchange): [string, string] => {
  return [obj.token1.symbol, obj.token2.symbol]
})

export class QuipuswapExchange extends Exchange {
  public exchangeUrl: string = 'https://quipuswap.com'
  public exchangeId: string = ``
  public name: string = 'Quipuswap'
  public logo: string = 'quipuswap_logo.svg'

  public readonly dexType: DexType = DexType.QUIPUSWAP

  public TOKEN_DECIMALS = 12
  public TEZ_DECIMALS = 6

  public fee: number = 0.997

  constructor(tezos: TezosToolkit, dexAddress: string, token1: Token, token2: Token, networkConstants: NetworkConstants) {
    super(tezos, dexAddress, token1, token2, networkConstants)
  }

  public async token1ToToken2(tokenAmount: BigNumber, minimumReceived: BigNumber): Promise<string> {
    if (this.token1.symbol === 'tez') {
      return this.tezToTokenSwap(tokenAmount, minimumReceived)
    } else {
      return this.tokenToTezSwap(tokenAmount, minimumReceived)
    }
  }

  public async token2ToToken1(tokenAmount: BigNumber, minimumReceived: BigNumber): Promise<string> {
    if (this.token2.symbol === 'tez') {
      return this.tezToTokenSwap(tokenAmount, minimumReceived)
    } else {
      return this.tokenToTezSwap(tokenAmount, minimumReceived)
    }
  }

  public async getToken1MaximumExchangeAmount(): Promise<BigNumber> {
    if (this.token1.symbol === 'tez') {
      return this.getExchangeMaximumTezAmount()
    }
    return this.getExchangeMaximumTokenAmount()
  }

  public async getToken2MaximumExchangeAmount(): Promise<BigNumber> {
    if (this.token2.symbol === 'tez') {
      return this.getExchangeMaximumTezAmount()
    }
    return this.getExchangeMaximumTokenAmount()
  }

  public async getExchangeRate(): Promise<BigNumber> {
    const dexContract = await this.getContractWalletAbstraction(this.dexAddress)
    const storage = (await this.getStorageOfContract(dexContract)) as any
    return new BigNumber(storage['storage']['token_pool'])
      .dividedBy(10 ** (this.token1.symbol === 'tez' ? this.token2.decimals : this.token1.decimals))
      .dividedBy(new BigNumber(storage['storage']['tez_pool']).dividedBy(10 ** this.TEZ_DECIMALS))
  }

  //gets exchange rate given two token pools
  public async getNewExchangeRate(newTezPool: BigNumber, newTokenPool: BigNumber): Promise<BigNumber> {
    return newTokenPool
      .dividedBy(10 ** (this.token1.symbol === 'tez' ? this.token2.decimals : this.token1.decimals))
      .dividedBy(newTezPool.dividedBy(10 ** this.TEZ_DECIMALS))
  }

  public async getToken1Balance(): Promise<BigNumber> {
    if (this.token1.symbol === 'tez') {
      return this.getTezBalance()
    }
    return this.getTokenAmount(this.token1, await this.getOwnAddress())
  }

  public async getToken2Balance(): Promise<BigNumber> {
    if (this.token2.symbol === 'tez') {
      return this.getTezBalance()
    }
    return this.getTokenAmount(this.token2, await this.getOwnAddress())
  }

  public async getExpectedMinimumReceivedToken1ForToken2(token2Amount: BigNumber): Promise<BigNumber> {
    if (this.token1.symbol === 'tez') {
      return this.getExpectedMinimumReceivedTez(token2Amount)
    }
    return this.getExpectedMinimumReceivedToken(token2Amount)
  }

  public async getExpectedMinimumReceivedToken2ForToken1(token1Amount: BigNumber): Promise<BigNumber> {
    if (this.token2.symbol === 'tez') {
      return this.getExpectedMinimumReceivedTez(token1Amount)
    }
    return this.getExpectedMinimumReceivedToken(token1Amount)
  }

  private async getTezBalance(): Promise<BigNumber> {
    return this.tezos.tz.getBalance(await this.getOwnAddress())
  }

  private async getExchangeMaximumTokenAmount(): Promise<BigNumber> {
    const dexContract = await this.getContractWalletAbstraction(this.dexAddress)
    const storage = (await this.getStorageOfContract(dexContract)) as any
    const currentTokenPool = new BigNumber(storage['storage']['token_pool'])
    return currentTokenPool.dividedBy(3)
  }

  private async getExchangeMaximumTezAmount(): Promise<BigNumber> {
    const dexContract = await this.getContractWalletAbstraction(this.dexAddress)
    const storage = (await this.getStorageOfContract(dexContract)) as any
    const currentTezPool = new BigNumber(storage['storage']['tez_pool'])
    return currentTezPool.dividedBy(3)
  }

  public async tezToTokenSwap(amountInMutez: BigNumber, minimumReceived: BigNumber): Promise<string> {
    const source = await this.getOwnAddress()
    const dexContract = await this.getContractWalletAbstraction(this.dexAddress)
    return this.sendAndAwait(
      this.tezos.wallet
        .batch()
        .withTransfer(
          dexContract.methods
            .tezToTokenPayment(round(minimumReceived), source)
            .toTransferParams({ amount: amountInMutez.toNumber(), mutez: true })
        )
    )
  }

  public async tokenToTezSwap(tokenAmount: BigNumber, minimumReceived: BigNumber): Promise<string> {
    const source = await this.getOwnAddress()
    const dexContract = await this.getContractWalletAbstraction(this.dexAddress)
    const dexStorage = (await this.getStorageOfContract(dexContract)) as any

    const tokenAddress = dexStorage['storage']['token_address']
    const tokenId = dexStorage['storage']['token_id']

    return this.sendAndAwait(
      this.tezos.wallet
        .batch()
        .withContractCall(await this.prepareAddTokenOperator(tokenAddress, this.dexAddress, tokenId))
        .withContractCall(dexContract.methods.tokenToTezPayment(round(tokenAmount), round(minimumReceived), source))
        .withContractCall(await this.prepareRemoveTokenOperator(tokenAddress, this.dexAddress, tokenId))
    )
  }

  public async getExpectedMinimumReceivedToken(amountInMutez: BigNumber): Promise<BigNumber> {
    const dexContract = await this.getContractWalletAbstraction(this.dexAddress)
    const storage = (await this.getStorageOfContract(dexContract)) as any
    const currentTokenPool = new BigNumber(storage['storage']['token_pool'])
    const currentTezPool = new BigNumber(storage['storage']['tez_pool'])
    const constantProduct = currentTokenPool.multipliedBy(currentTezPool)
    const remainingTokenPoolAmount = constantProduct.dividedBy(currentTezPool.plus(amountInMutez.times(this.fee)))
    return currentTokenPool.minus(remainingTokenPoolAmount)
  }

  public async getExpectedMinimumReceivedTez(tokenAmount: BigNumber): Promise<BigNumber> {
    const dexContract = await this.getContractWalletAbstraction(this.dexAddress)
    const storage = (await this.getStorageOfContract(dexContract)) as any
    const currentTokenPool = new BigNumber(storage['storage']['token_pool'])
    const currentTezPool = new BigNumber(storage['storage']['tez_pool'])
    const constantProduct = currentTokenPool.multipliedBy(currentTezPool)
    const remainingTezPoolAmount = constantProduct.dividedBy(currentTokenPool.plus(tokenAmount.times(this.fee)))
    return currentTezPool.minus(remainingTezPoolAmount)
  }

  public async getPriceImpactTezIn(mutezIn: BigNumber): Promise<BigNumber> {
    const dexContract = await this.getContractWalletAbstraction(this.dexAddress)
    const storage = (await this.getStorageOfContract(dexContract)) as any

    const exchangeRate = await this.getExchangeRate()

    const tokenReceived = await this.getExpectedMinimumReceivedToken(mutezIn)

    const currentTezPool = new BigNumber(storage['storage']['tez_pool'])
    const currentTokenPool = new BigNumber(storage['storage']['token_pool'])

    const newTezPool = new BigNumber(currentTezPool).plus(mutezIn)
    const newTokenPool = new BigNumber(currentTokenPool).minus(tokenReceived)

    const newExchangeRate = await this.getNewExchangeRate(newTezPool, newTokenPool)

    return exchangeRate.minus(newExchangeRate).div(exchangeRate).abs()
  }

  public async getPriceImpactTokenIn(tokenIn: BigNumber): Promise<BigNumber> {
    const dexContract = await this.getContractWalletAbstraction(this.dexAddress)
    const storage = (await this.getStorageOfContract(dexContract)) as any

    const exchangeRate = await this.getExchangeRate()

    const tezReceived = await this.getExpectedMinimumReceivedTez(tokenIn)

    const currentTezPool = new BigNumber(storage['storage']['tez_pool'])
    const currentTokenPool = new BigNumber(storage['storage']['token_pool'])

    const newTezPool = new BigNumber(currentTezPool).minus(tezReceived)
    const newTokenPool = new BigNumber(currentTokenPool).plus(tokenIn)

    const newExchangeRate = await this.getNewExchangeRate(newTezPool, newTokenPool)

    return exchangeRate.minus(newExchangeRate).div(exchangeRate).abs()
  }

  @cache()
  public async getLiquidityPoolInfo(): Promise<any> {
    const dexContract = await this.getContractWalletAbstraction(this.dexAddress)
    const storage = (await this.getStorageOfContract(dexContract)) as any
    return storage.storage
  }

  public async getExchangeUrl(): Promise<string> {
    const from = this.token1.symbol === 'tez' ? 'tez' : `${this.token1.contractAddress}_${this.token1.tokenId}`
    const to = this.token2.symbol === 'tez' ? 'tez' : `${this.token2.contractAddress}_${this.token2.tokenId}`
    return `https://quipuswap.com/swap?from=${from}&to=${to}`
  }

  public async clearCache() {
    promiseCache.clear()
  }

  @cache()
  protected async getContractWalletAbstraction(address: string): Promise<ContractAbstraction<Wallet>> {
    return this.tezos.wallet.at(address)
  }

  @cache()
  protected async getStorageOfContract(contract: ContractAbstraction<Wallet>) {
    return contract.storage()
  }
}
