import { ContractAbstraction, TezosToolkit, Wallet } from '@taquito/taquito'
import BigNumber from 'bignumber.js'
import { DexType, NetworkConstants } from '../networks.base'
import { Token } from '../tokens/token'
import { cacheFactory, round } from '../utils'
import { Exchange } from './exchange'

const promiseCache = new Map<string, Promise<unknown>>()

const cache = cacheFactory(promiseCache, (obj: PlentyExchange): [string, string] => {
  return [obj.token1.symbol, obj.token2.symbol]
})

export class PlentyExchange extends Exchange {
  public exchangeUrl: string = 'https://plentydefi.com'
  public exchangeId: string = ``
  public name: string = 'Plenty'
  public logo: string = 'plenty_logo.svg'

  public readonly dexType: DexType = DexType.PLENTY

  public TOKEN_DECIMALS = 12

  public fee: number = 0.9965 //0.35% exchange fee

  constructor(tezos: TezosToolkit, dexAddress: string, token1: Token, token2: Token, networkConstants: NetworkConstants) {
    super(tezos, dexAddress, token1, token2, networkConstants)
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
    const res = new BigNumber(storage['token1_pool'])
      .dividedBy(10 ** this.TOKEN_DECIMALS)
      .dividedBy(new BigNumber(storage['token2_pool']).dividedBy(10 ** this.TOKEN_DECIMALS))
    return new BigNumber(1).div(res)
  }

  //gets exchange rate given two token pools
  public async getNewExchangeRate(newPool1: BigNumber, newPool2: BigNumber): Promise<BigNumber> {
    const res = newPool1.dividedBy(10 ** this.TOKEN_DECIMALS).dividedBy(newPool2.dividedBy(10 ** this.TOKEN_DECIMALS))
    return new BigNumber(1).div(res)
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

  public async getPriceImpact(tokenIn: BigNumber, tokenInNumber: 1 | 2): Promise<BigNumber> {
    const dexContract = await this.getContractWalletAbstraction(this.dexAddress)
    const storage = (await this.getStorageOfContract(dexContract)) as any

    const exchangeRate = await this.getExchangeRate()

    const tokenReceived =
      tokenInNumber == 1
        ? await this.getExpectedMinimumReceivedToken2ForToken1(tokenIn)
        : await this.getExpectedMinimumReceivedToken1ForToken2(tokenIn)

    const currentToken1Pool = new BigNumber(storage.token1_pool)
    const currentToken2Pool = new BigNumber(storage.token2_pool)

    let newToken1Pool, newToken2Pool
    if (tokenInNumber == 1) {
      newToken1Pool = new BigNumber(currentToken1Pool).plus(tokenIn)
      newToken2Pool = new BigNumber(currentToken2Pool).minus(tokenReceived)
    } else {
      newToken1Pool = new BigNumber(currentToken1Pool).minus(tokenReceived)
      newToken2Pool = new BigNumber(currentToken2Pool).plus(tokenIn)
    }

    const newExchangeRate = await this.getNewExchangeRate(newToken1Pool, newToken2Pool)

    console.log('======')
    console.log('In: ', tokenIn.toNumber())
    console.log('Token received: ', tokenReceived.toNumber())
    console.log('Current Tez Pool: ', currentToken1Pool.toNumber(), ' Current Token Pool: ', currentToken2Pool.toNumber())
    console.log('New Tez Pool: ', newToken1Pool.toNumber(), ' New Token Pool: ', newToken2Pool.toNumber())
    console.log('Exchange rate: ', exchangeRate.toNumber())
    console.log('New exchange rate: ', newExchangeRate.toNumber())
    console.log('Res :', exchangeRate.minus(newExchangeRate).div(exchangeRate).abs().toNumber())

    return exchangeRate.minus(newExchangeRate).div(exchangeRate).abs()
  }

  @cache()
  public async getLiquidityPoolInfo(): Promise<any> {
    const dexContract = await this.getContractWalletAbstraction(this.dexAddress)
    const storage = (await this.getStorageOfContract(dexContract)) as any
    return storage
  }

  public async getExchangeUrl(): Promise<string> {
    return `https://www.plentydefi.com/swap?from=${this.token1.symbol}&to=${this.token2.symbol}`
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
