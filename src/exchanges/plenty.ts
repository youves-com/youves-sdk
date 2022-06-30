import { ContractAbstraction, TezosToolkit, Wallet } from '@taquito/taquito'
import BigNumber from 'bignumber.js'
import { DexType } from '../networks.base'
import { Token } from '../tokens/token'
import { round } from '../utils'
import { Exchange } from './exchange'

const globalPromiseCache = new Map<string, Promise<unknown>>()

const simpleHash = (s: string) => {
  let h = 0
  for (let i = 0; i < s.length; i++) {
    h = (Math.imul(31, h) + s.charCodeAt(i)) | 0
  }

  return h
}

export const cache = () => {
  return (_target: Object, propertyKey: string, descriptor: PropertyDescriptor) => {
    const originalMethod = descriptor.value

    const constructKey = (symbol: string, collateralSymbol: string, input: any[]) => {
      const processedInput = input.map((value) => {
        if (value instanceof ContractAbstraction) {
          return value.address
        } else if (value instanceof BigNumber) {
          return value.toString(10)
        } else if (typeof value === 'object') {
          return simpleHash(JSON.stringify(value))
        } else {
          return value
        }
      })
      return `${symbol}-${collateralSymbol}-${propertyKey}-${processedInput.join('-')}`
    }

    descriptor.value = async function (...args: any[]) {
      const exchange = this as PlentyExchange
      const constructedKey = constructKey(exchange?.token1.symbol, exchange?.token2.symbol, args)
      const promise = globalPromiseCache.get(constructedKey)
      if (promise) {
        // log with constructedKey --> goes into cache
        // console.log(constructedKey, await promise)
        return promise
      } else {
        const newPromise = originalMethod.apply(this, args)
        globalPromiseCache.set(constructedKey, newPromise)
        return newPromise
      }
    }

    return descriptor
  }
}

export class PlentyExchange extends Exchange {
  public exchangeUrl: string = 'https://plentydefi.com'
  public exchangeId: string = ``
  public name: string = 'Plenty'
  public logo: string = 'plenty_logo.svg'

  public readonly dexType: DexType = DexType.PLENTY

  public TOKEN_DECIMALS = 12

  public fee: number = 0.997

  constructor(tezos: TezosToolkit, dexAddress: string, token1: Token, token2: Token) {
    super(tezos, dexAddress, token1, token2)
  }

  public async token1ToToken2(tokenAmount: BigNumber, minimumReceived: BigNumber): Promise<string> {
    return this.token1ToToken2Swap(tokenAmount, minimumReceived)
  }

  public async token2ToToken1(tokenAmount: BigNumber, minimumReceived: BigNumber): Promise<string> {
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
    return this.getTokenAmount(this.token1, await this.getOwnAddress())
  }

  public async getToken2Balance(): Promise<BigNumber> {
    return this.getTokenAmount(this.token2, await this.getOwnAddress())
  }

  public async getExpectedMinimumReceivedToken1ForToken2(amountInMutez: BigNumber): Promise<BigNumber> {
    const dexContract = await this.getContractWalletAbstraction(this.dexAddress)
    const storage = (await this.getStorageOfContract(dexContract)) as any
    const currentTokenPool = new BigNumber(storage['token1_pool'])
    const currentTezPool = new BigNumber(storage['token2_pool'])
    const constantProduct = currentTokenPool.multipliedBy(currentTezPool)
    const remainingTokenPoolAmount = constantProduct.dividedBy(currentTezPool.plus(amountInMutez.times(this.fee)))
    return currentTokenPool.minus(remainingTokenPoolAmount)
  }

  public async getExpectedMinimumReceivedToken2ForToken1(tokenAmount: BigNumber): Promise<BigNumber> {
    const dexContract = await this.getContractWalletAbstraction(this.dexAddress)
    const storage = (await this.getStorageOfContract(dexContract)) as any
    const currentTokenPool = new BigNumber(storage['token1_pool'])
    const currentTezPool = new BigNumber(storage['token2_pool'])
    const constantProduct = currentTokenPool.multipliedBy(currentTezPool)
    const remainingTezPoolAmount = constantProduct.dividedBy(currentTokenPool.plus(tokenAmount.times(this.fee)))
    return currentTezPool.minus(remainingTezPoolAmount)
  }

  private async getExchangeMaximumTokenAmount(tokenNumber: 1 | 2): Promise<BigNumber> {
    const dexContract = await this.getContractWalletAbstraction(this.dexAddress)
    const storage = (await this.getStorageOfContract(dexContract)) as any
    const currentTokenPool = new BigNumber(storage[`token${tokenNumber}_pool`])
    return currentTokenPool.dividedBy(3)
  }

  public async token1ToToken2Swap(tokenAmount: BigNumber, minimumReceived: BigNumber): Promise<string> {
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
        .withContractCall(dexContract.methods.Swap(round(minimumReceived), source, token2Address, Number(token2Id), round(tokenAmount)))
        .withContractCall(await this.prepareRemoveTokenOperator(token1Address, this.dexAddress, token1Id))
    )
  }

  public async token2ToToken1Swap(tokenAmount: BigNumber, minimumReceived: BigNumber): Promise<string> {
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
        .withContractCall(dexContract.methods.Swap(round(minimumReceived), source, token1Address, Number(token1Id), round(tokenAmount)))
        .withContractCall(await this.prepareRemoveTokenOperator(token2Address, this.dexAddress, token2Id))
    )
  }

  public async getExchangeUrl(): Promise<string> {
    return `https://www.plentydefi.com/swap?from=${this.token1.symbol}&to=${this.token2.symbol}`
  }

  public async clearCache() {
    globalPromiseCache.clear()
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
