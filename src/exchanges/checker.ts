import { ContractAbstraction, TezosToolkit } from '@taquito/taquito'
import BigNumber from 'bignumber.js'
import { CheckerState } from '../engines/CheckerV1Engine'
import { CheckerExchangeInfo, DexType } from '../networks.base'
import { ithacanetNetworkConstants } from '../networks.ghostnet'
import { Token } from '../tokens/token'
import { getFA2Balance, round } from '../utils'
import { Exchange } from './exchange'
import { AddLiquidityInfo, getLiquidityAddCash, getLiquidityAddToken } from './flat-youves-utils'

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
      const exchange = this as CheckerExchange
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

export class CheckerExchange extends Exchange {
  public exchangeUrl: string = 'https://app.youves.com/swap'
  public exchangeId: string = ``
  public name: string = 'Youves (Checker)'
  public logo: string = 'youves-logo.svg'

  public TOKEN_DECIMALS = 12
  public TEZ_DECIMALS = 6

  public readonly dexType: DexType = DexType.CHECKER

  public fee: number = 0.998

  private liquidityToken: Token

  constructor(tezos: TezosToolkit, contractAddress: string, dexInfo: CheckerExchangeInfo) {
    super(tezos, contractAddress, dexInfo.token1, dexInfo.token2)
    this.liquidityToken = dexInfo.liquidityToken
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

  public async addLiquidity(minLiquidityMinted: BigNumber, maxTokenDeposit: BigNumber, cashDeposit: BigNumber) {
    const dexContract = await this.getContractWalletAbstraction(this.dexAddress)
    const deadline = this.getDeadline()
    if (this.token1.tokenId) {
      return this.sendAndAwait(
        this.tezos.wallet
          .batch()
          .withContractCall(await this.prepareAddTokenOperator(this.token1.contractAddress, this.dexAddress, this.token1.tokenId))
          .withContractCall(await this.prepareAddTokenOperator(this.token2.contractAddress, this.dexAddress, this.token2.tokenId))
          .withContractCall(
            dexContract.methods.add_liquidity(round(cashDeposit), round(maxTokenDeposit), round(minLiquidityMinted), deadline)
          )
          .withContractCall(await this.prepareRemoveTokenOperator(this.token1.contractAddress, this.dexAddress, this.token1.tokenId))
          .withContractCall(await this.prepareRemoveTokenOperator(this.token2.contractAddress, this.dexAddress, this.token2.tokenId))
      )
    } else {
      const tokenContract = await this.getContractWalletAbstraction(this.token1.contractAddress)
      return this.sendAndAwait(
        this.tezos.wallet
          .batch()
          .withContractCall(tokenContract.methods.approve(this.dexAddress, 0)) // To make sure we don't get a "unsafe allowance change" error
          .withContractCall(tokenContract.methods.approve(this.dexAddress, round(cashDeposit)))
          .withContractCall(await this.prepareAddTokenOperator(this.token2.contractAddress, this.dexAddress, this.token2.tokenId))
          .withContractCall(
            dexContract.methods.add_liquidity(round(cashDeposit), round(maxTokenDeposit), round(minLiquidityMinted), deadline)
          )
          .withContractCall(tokenContract.methods.approve(this.dexAddress, 0))
          .withContractCall(await this.prepareRemoveTokenOperator(this.token2.contractAddress, this.dexAddress, this.token2.tokenId))
      )
    }
  }

  public async removeLiquidity(liquidityToBurn: BigNumber, minCashWithdrawn: BigNumber, minTokensWithdrawn: BigNumber) {
    const deadline = this.getDeadline()
    const dexContract = await this.getContractWalletAbstraction(this.dexAddress)

    return this.sendAndAwait(
      this.tezos.wallet
        .batch()
        .withContractCall(
          dexContract.methods.remove_liquidity(round(liquidityToBurn), round(minCashWithdrawn), round(minTokensWithdrawn), deadline)
        )
    )
  }

  @cache()
  public async getExchangeRate(): Promise<BigNumber> {
    const storage: CheckerState = await this.getLiquidityPoolState()

    const cfmm = storage['deployment_state']['sealed']['cfmm']

    return new BigNumber(cfmm['ctez'])
      .dividedBy(10 ** this.TEZ_DECIMALS)
      .dividedBy(new BigNumber(cfmm['kit']).dividedBy(10 ** this.TOKEN_DECIMALS))
  }

  public async getToken1Balance(): Promise<BigNumber> {
    return this.getTokenAmount(this.token1, await this.getOwnAddress())
  }

  public async getToken2Balance(): Promise<BigNumber> {
    return this.getTokenAmount(this.token2, await this.getOwnAddress())
  }

  public async getExpectedMinimumReceivedToken1ForToken2(cashAmount: BigNumber): Promise<BigNumber> {
    const dexContract = await this.getContractWalletAbstraction(this.dexAddress)
    const storage: CheckerState = (await this.getStorageOfContract(dexContract)) as any
    const currentTokenPool = new BigNumber(storage['deployment_state']['sealed']['cfmm'].ctez)
    const currentTezPool = new BigNumber(storage['deployment_state']['sealed']['cfmm'].kit)
    const constantProduct = currentTokenPool.multipliedBy(currentTezPool)
    const remainingTokenPoolAmount = constantProduct.dividedBy(currentTezPool.plus(cashAmount.times(this.fee)))
    return currentTokenPool.minus(remainingTokenPoolAmount)
  }

  public async getExpectedMinimumReceivedToken2ForToken1(tokenAmount: BigNumber): Promise<BigNumber> {
    const dexContract = await this.getContractWalletAbstraction(this.dexAddress)
    const storage: CheckerState = (await this.getStorageOfContract(dexContract)) as any
    const currentTokenPool = new BigNumber(storage['deployment_state']['sealed']['cfmm'].ctez)
    const currentTezPool = new BigNumber(storage['deployment_state']['sealed']['cfmm'].kit)
    const constantProduct = currentTokenPool.multipliedBy(currentTezPool)
    const remainingTezPoolAmount = constantProduct.dividedBy(currentTokenPool.plus(tokenAmount.times(this.fee)))
    return currentTezPool.minus(remainingTezPoolAmount)
  }

  private async getExchangeMaximumTokenAmount(tokenNumber: 1 | 2): Promise<BigNumber> {
    console.log('getExchangeMaximumTokenAmount')
    const poolInfo: CheckerState = await this.getLiquidityPoolState()
    if (tokenNumber === 1) {
      return new BigNumber(poolInfo.deployment_state.sealed.cfmm.ctez)
    } else {
      return new BigNumber(poolInfo.deployment_state.sealed.cfmm.kit)
    }
  }

  public async token1ToToken2Swap(tokenAmount: BigNumber, minimumReceived: BigNumber): Promise<string> {
    const dexContract = await this.getContractWalletAbstraction(this.dexAddress)

    const cashAddress = this.token1.contractAddress
    const cashId = this.token1.tokenId

    const deadline: string = this.getDeadline()

    if (cashId) {
      // If we have a cashId, it's FA2
      return this.sendAndAwait(
        this.tezos.wallet
          .batch()
          .withContractCall(await this.prepareAddTokenOperator(cashAddress.toString(), this.dexAddress, cashId))
          .withContractCall(dexContract.methods.buy_kit(round(tokenAmount), round(minimumReceived), deadline))
          .withContractCall(await this.prepareRemoveTokenOperator(cashAddress.toString(), this.dexAddress, cashId))
      )
    } else {
      const tokenContract = await this.getContractWalletAbstraction(cashAddress.toString())
      return this.sendAndAwait(
        this.tezos.wallet
          .batch()
          .withContractCall(tokenContract.methods.approve(this.dexAddress, 0)) // To make sure we don't get a "unsafe allowance change" error
          .withContractCall(tokenContract.methods.approve(this.dexAddress, round(tokenAmount)))
          .withContractCall(dexContract.methods.buy_kit(round(tokenAmount), round(minimumReceived), deadline))
          .withContractCall(tokenContract.methods.approve(this.dexAddress, 0))
      )
    }
  }

  public async token2ToToken1Swap(tokenAmount: BigNumber, minimumReceived: BigNumber): Promise<string> {
    const dexContract = await this.getContractWalletAbstraction(this.dexAddress)

    const tokenAddress = this.token2.contractAddress
    const tokenId = this.token2.tokenId

    const deadline: string = this.getDeadline()

    return this.sendAndAwait(
      this.tezos.wallet
        .batch()
        .withContractCall(await this.prepareAddTokenOperator(tokenAddress, this.dexAddress, tokenId))
        .withContractCall(dexContract.methods.sell_kit(round(tokenAmount), round(minimumReceived), deadline))
        .withContractCall(await this.prepareRemoveTokenOperator(tokenAddress, this.dexAddress, tokenId))
    )
  }

  private getDeadline(): string {
    return new Date(new Date().getTime() + 15 * 60 * 1000).toISOString()
  }

  @cache()
  public async getLiquidityPoolState(): Promise<CheckerState> {
    const dexContract = await this.getContractWalletAbstraction(this.dexAddress)
    const storage: CheckerState = (await this.getStorageOfContract(dexContract)) as any

    return storage
  }

  @cache()
  public async getLiquidityPoolInfo(): Promise<{
    cashPool: BigNumber
    tokenPool: BigNumber
    lqtTotal: BigNumber
  }> {
    const dexContract = await this.getContractWalletAbstraction(this.dexAddress)
    const storage: CheckerState = (await this.getStorageOfContract(dexContract)) as any

    return {
      cashPool: storage.deployment_state.sealed.cfmm.ctez,
      tokenPool: storage.deployment_state.sealed.cfmm.kit,
      lqtTotal: storage.deployment_state.sealed.cfmm.lqt
    }
  }

  @cache()
  public async getOwnLiquidityPoolTokens(): Promise<BigNumber> {
    const source = await this.getOwnAddress()

    const tokenAmount = await getFA2Balance(
      source,
      this.liquidityToken.contractAddress,
      this.liquidityToken.tokenId,
      this.tezos,
      ithacanetNetworkConstants.fakeAddress,
      ithacanetNetworkConstants.balanceOfViewerCallback
    )

    return new BigNumber(tokenAmount ? tokenAmount : 0)
  }

  @cache()
  public async getLiquidityForCash(cash: BigNumber): Promise<AddLiquidityInfo> {
    const poolInfo: CheckerState = await this.getLiquidityPoolState()

    return getLiquidityAddCash(
      cash,
      new BigNumber(poolInfo['deployment_state']['sealed']['cfmm'].ctez).shiftedBy(-1 * this.token1.decimals),
      new BigNumber(poolInfo['deployment_state']['sealed']['cfmm'].kit).shiftedBy(-1 * this.token2.decimals),
      new BigNumber(poolInfo['deployment_state']['sealed']['cfmm'].lqt).shiftedBy(-1 * this.liquidityToken.decimals)
    )
  }

  @cache()
  public async getLiquidityForToken(token: BigNumber): Promise<AddLiquidityInfo> {
    const poolInfo: CheckerState = await this.getLiquidityPoolState()

    return getLiquidityAddToken(
      token,
      new BigNumber(poolInfo['deployment_state']['sealed']['cfmm'].ctez).shiftedBy(-1 * this.token1.decimals),
      new BigNumber(poolInfo['deployment_state']['sealed']['cfmm'].kit).shiftedBy(-1 * this.token2.decimals),
      new BigNumber(poolInfo['deployment_state']['sealed']['cfmm'].lqt).shiftedBy(-1 * this.liquidityToken.decimals)
    )
  }

  @cache()
  public async getLiquidityPoolReturn(
    ownPoolTokens: BigNumber,
    slippage: number
  ): Promise<{ cashAmount: BigNumber; tokenAmount: BigNumber }> {
    const dexStorage: CheckerState = await this.getLiquidityPoolState()

    const poolShare = ownPoolTokens.div(dexStorage.deployment_state.sealed.cfmm.lqt)

    const adjustedSlippage = 1 - slippage / 100

    const cashAmount = poolShare.times(dexStorage.deployment_state.sealed.cfmm.ctez).times(adjustedSlippage)
    const tokenAmount = poolShare.times(dexStorage.deployment_state.sealed.cfmm.kit).times(adjustedSlippage)

    return { cashAmount, tokenAmount }
  }
  async getPriceImpactTokenIn(_tokenIn: BigNumber) {
    return new BigNumber(1)
  }

  public async getExchangeUrl(): Promise<string> {
    return `https://youves.com/swap?from=${this.token1.symbol}&to=${this.token2.symbol}`
  }

  public async clearCache() {
    globalPromiseCache.clear()
  }
}
