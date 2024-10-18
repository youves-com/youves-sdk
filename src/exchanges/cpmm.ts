import { TezosToolkit } from '@taquito/taquito'
import BigNumber from 'bignumber.js'
import { CpmmExchangeInfo, NetworkConstants } from '../networks.base'
import { Token, TokenType } from '../tokens/token'
import { cacheFactory, getMillisFromMinutes, round } from '../utils'
import { Exchange, LiquidityPoolInfo } from './exchange'
import { AddLiquidityInfo, getLiquidityAddCash, getLiquidityAddToken } from './flat-youves-utils'

export interface CpmmStorage {
  tokenAddress: string
  tokenId: number
  tokenPool: BigNumber
  tokenMultiplier: BigNumber
  cashPool: BigNumber
  cashMultiplier: BigNumber
  lqtTotal: BigNumber
  lqtAddress: string
  rewardRecipient: string
  cashFeeRatio: {
    numerator: number
    denominator: number
  }
  tokenFeeRatio: {
    numerator: number
    denominator: number
  }
}

const promiseCache = new Map<string, Promise<unknown>>()

const cache = cacheFactory(promiseCache, (obj: CpmmExchange): [string, string, string] => {
  return [obj.token1.symbol, obj.token2.symbol, obj.dexType]
})

export class CpmmExchange extends Exchange {
  public exchangeUrl: string = 'https://youves.com/swap'
  public exchangeId: string = ``
  public name: string = 'FlatYouves'
  public logo: string = 'youves.svg'

  public fee: number = 0 // This will be calculated from storage

  protected liquidityToken: Token

  constructor(tezos: TezosToolkit, contractAddress: string, dexInfo: CpmmExchangeInfo, networkConstants: NetworkConstants) {
    super(tezos, contractAddress, dexInfo.token1, dexInfo.token2, dexInfo.dexType, networkConstants)
    this.liquidityToken = dexInfo.liquidityToken
  }

  @cache()
  public async getExchangeFee(direction: 'token_to_cash' | 'cash_to_token'): Promise<BigNumber> {
    const storage: CpmmStorage = await this.getContractStorage()
    if (direction === 'token_to_cash') {
      return new BigNumber(storage.cashFeeRatio.numerator).div(storage.cashFeeRatio.denominator)
    } else {
      return new BigNumber(storage.tokenFeeRatio.numerator).div(storage.tokenFeeRatio.denominator)
    }
  }

  @cache()
  public async getContractStorage(): Promise<CpmmStorage> {
    const dexContract = await this.getContractWalletAbstraction(this.dexAddress)
    const dexStorage: any = await this.getStorageOfContract(dexContract)

    const storage: CpmmStorage = {
      tokenAddress: dexStorage.tokenAddress,
      tokenId: dexStorage.tokenId,
      tokenPool: new BigNumber(dexStorage.tokenPool),
      tokenMultiplier: new BigNumber(dexStorage.tokenMultiplier),
      cashPool: new BigNumber(dexStorage.cashPool),
      cashMultiplier: new BigNumber(dexStorage.cashMultiplier),
      lqtTotal: new BigNumber(dexStorage.lqtTotal),
      lqtAddress: dexStorage.lqtAddress,
      rewardRecipient: dexStorage.rewardRecipient,
      cashFeeRatio: dexStorage.cashFeeRatio,
      tokenFeeRatio: dexStorage.tokenFeeRatio
    }

    return storage
  }

  public async token1ToToken2(tokenAmount: BigNumber, minimumReceived: BigNumber): Promise<string> {
    return this.tokenSwap(this.token1, tokenAmount, minimumReceived)
  }

  public async token2ToToken1(tokenAmount: BigNumber, minimumReceived: BigNumber): Promise<string> {
    return this.tokenSwap(this.token2, tokenAmount, minimumReceived)
  }

  public async getToken1MaximumExchangeAmount(): Promise<BigNumber> {
    return this.getExchangeMaximumTokenAmount(1)
  }

  public async getToken2MaximumExchangeAmount(): Promise<BigNumber> {
    return this.getExchangeMaximumTokenAmount(2)
  }

  @cache()
  public async getExchangeRate(): Promise<BigNumber> {
    const storage: CpmmStorage = await this.getContractStorage()

    const cashPool = new BigNumber(storage.cashPool)
    const tokenPool = new BigNumber(storage.tokenPool)
    const cashMultiplier = new BigNumber(storage.cashMultiplier)
    const tokenMultiplier = new BigNumber(storage.tokenMultiplier)

    // Calculate the exchange rate using CPMM formula
    const exchangeRate = tokenPool.times(tokenMultiplier).div(cashPool.times(cashMultiplier))

    return exchangeRate
  }

  public async getToken1Balance(): Promise<BigNumber> {
    return this.getTokenAmount(this.token1, await this.getOwnAddress())
  }

  public async getToken2Balance(): Promise<BigNumber> {
    return this.getTokenAmount(this.token2, await this.getOwnAddress())
  }

  public async getExpectedMinimumReceivedToken1ForToken2(tokenAmount: BigNumber): Promise<BigNumber> {
    return this.getMinReceivedCashForToken(tokenAmount)
  }

  public async getExpectedMinimumReceivedToken2ForToken1(cashAmount: BigNumber): Promise<BigNumber> {
    return this.getMinReceivedTokenForCash(cashAmount)
  }

  private async getExchangeMaximumTokenAmount(tokenNumber: 1 | 2): Promise<BigNumber> {
    const poolInfo: CpmmStorage = await this.getContractStorage()
    if (tokenNumber === 1) {
      return new BigNumber(poolInfo.cashPool)
    } else {
      return new BigNumber(poolInfo.tokenPool)
    }
  }

  public async tokenSwap(srcToken: Token, tokenAmount: BigNumber, minimumReceived: BigNumber): Promise<string> {
    const receiver = await this.getOwnAddress()
    const dexContract = await this.getContractWalletAbstraction(this.dexAddress)
    const deadline: string = this.getDeadline()

    const amountSold = round(tokenAmount)
    const minAmountBought = round(minimumReceived)

    if (srcToken.symbol === this.token2.symbol) {
      // token_to_cash
      const swapParams = {
        to: receiver,
        tokensSold: amountSold,
        minCashBought: minAmountBought,
        deadline: deadline
      }

      console.log('swapParams', swapParams)

      if (srcToken.type === TokenType.NATIVE) {
        return this.sendAndAwait(
          this.tezos.wallet
            .batch()
            .withTransfer(
              dexContract.methodsObject.token_to_cash(swapParams).toTransferParams({ amount: amountSold.toNumber(), mutez: true })
            )
        )
      } else if (srcToken.type === TokenType.FA2) {
        return this.sendAndAwait(
          this.tezos.wallet
            .batch()
            .withContractCall(await this.prepareAddTokenOperator(srcToken.contractAddress, this.dexAddress, srcToken.tokenId))
            .withContractCall(dexContract.methodsObject.token_to_cash(swapParams))
            .withContractCall(await this.prepareRemoveTokenOperator(srcToken.contractAddress, this.dexAddress, srcToken.tokenId))
        )
      } else {
        const tokenContract = await this.getContractWalletAbstraction(srcToken.contractAddress)
        return this.sendAndAwait(
          this.tezos.wallet
            .batch()
            .withContractCall(tokenContract.methods.approve(this.dexAddress, amountSold))
            .withContractCall(dexContract.methodsObject.token_to_cash(swapParams))
            .withContractCall(tokenContract.methods.approve(this.dexAddress, 0))
        )
      }
    } else {
      // cash_to_token
      const swapParams = {
        to: receiver,
        minTokensBought: minAmountBought,
        deadline: deadline
      }

      console.log('swapParams', swapParams)

      if (srcToken.type === TokenType.NATIVE) {
        return this.sendAndAwait(
          this.tezos.wallet
            .batch()
            .withTransfer(
              dexContract.methodsObject.cash_to_token(swapParams).toTransferParams({ amount: amountSold.toNumber(), mutez: true })
            )
        )
      } else if (srcToken.type === TokenType.FA2) {
        return this.sendAndAwait(
          this.tezos.wallet
            .batch()
            .withContractCall(await this.prepareAddTokenOperator(srcToken.contractAddress, this.dexAddress, srcToken.tokenId))
            .withContractCall(dexContract.methodsObject.cash_to_token(swapParams))
            .withContractCall(await this.prepareRemoveTokenOperator(srcToken.contractAddress, this.dexAddress, srcToken.tokenId))
        )
      } else {
        const tokenContract = await this.getContractWalletAbstraction(srcToken.contractAddress)
        return this.sendAndAwait(
          this.tezos.wallet
            .batch()
            .withContractCall(tokenContract.methods.approve(this.dexAddress, amountSold))
            .withContractCall(dexContract.methodsObject.cash_to_token(swapParams))
            .withContractCall(tokenContract.methods.approve(this.dexAddress, 0))
        )
      }
    }
  }

  private getDeadline(): string {
    return new Date(new Date().getTime() + getMillisFromMinutes(15)).toISOString()
  }

  @cache()
  protected async getMinReceivedTokenForCash(amount: BigNumber) {
    const storage: CpmmStorage = await this.getContractStorage()
    const fee = await this.getExchangeFee('cash_to_token')

    const cashPool = storage.cashPool
    const tokenPool = storage.tokenPool

    const expectedOut = tokenPool.minus(cashPool.times(tokenPool).div(cashPool.plus(amount))).integerValue(BigNumber.ROUND_DOWN)

    return expectedOut.times(fee)
  }

  @cache()
  protected async getMinReceivedCashForToken(amount: BigNumber) {
    const storage: CpmmStorage = await this.getContractStorage()
    const fee = await this.getExchangeFee('token_to_cash')

    const cashPool = storage.cashPool
    const tokenPool = storage.tokenPool

    const expectedOut = cashPool.minus(cashPool.times(tokenPool).div(tokenPool.plus(amount))).integerValue(BigNumber.ROUND_DOWN)

    return expectedOut.times(fee)
  }

  @cache()
  public async getLiquidityPoolInfo(): Promise<LiquidityPoolInfo> {
    const storage = await this.getContractStorage()

    const poolInfo: LiquidityPoolInfo = {
      cashPool: storage.cashPool,
      tokenPool: storage.tokenPool,
      lqtTotal: storage.lqtTotal
    }

    return poolInfo
  }

  @cache()
  public async getOwnLiquidityPoolTokens(): Promise<BigNumber> {
    const source = await this.getOwnAddress()

    const tokenContract = await this.tezos.wallet.at(this.liquidityToken.contractAddress)
    const tokenStorage = (await this.getStorageOfContract(tokenContract)) as any
    const entry = await tokenStorage['ledger'].get(source)
    console.log('entry', entry)
    const tokenAmount = entry !== undefined ? entry[0] : undefined
    return new BigNumber(tokenAmount ? tokenAmount : 0)
  }

  public async getPriceImpact(amount: BigNumber, reverse: boolean): Promise<BigNumber> {
    const storage: CpmmStorage = await this.getContractStorage()
    const exchangeRate = await this.getExchangeRate()

    const tokenReceived = reverse ? await this.getMinReceivedCashForToken(amount) : await this.getMinReceivedTokenForCash(amount)

    let newCashPool, newTokenPool
    if (reverse) {
      newCashPool = storage.cashPool.minus(tokenReceived)
      newTokenPool = storage.tokenPool.plus(amount)
    } else {
      newCashPool = storage.cashPool.plus(amount)
      newTokenPool = storage.tokenPool.minus(tokenReceived)
    }

    const newExchangeRate = newCashPool.times(storage.cashMultiplier).div(newTokenPool.times(storage.tokenMultiplier))

    return exchangeRate.minus(newExchangeRate).div(exchangeRate).abs()
  }

  public async addLiquidity(minLiquidityMinted: BigNumber, maxTokenDeposit: BigNumber, cashDeposit: BigNumber) {
    const source = await this.getOwnAddress()
    const dexContract = await this.getContractWalletAbstraction(this.dexAddress)
    const deadline = this.getDeadline()

    let batchCall = this.tezos.wallet.batch()

    //add approvals
    if (this.token2.type === TokenType.FA2) {
      batchCall = batchCall.withContractCall(
        await this.prepareAddTokenOperator(this.token2.contractAddress, this.dexAddress, this.token2.tokenId)
      )
    } else if (this.token2.type === TokenType.FA1p2) {
      const tokenContract = await this.getContractWalletAbstraction(this.token2.contractAddress)
      batchCall = batchCall.withContractCall(tokenContract.methods.approve(this.dexAddress, round(maxTokenDeposit)))
    }

    //add liquidity
    if (this.token1.symbol === 'tez') {
      batchCall = batchCall.withTransfer(
        dexContract.methods
          .add_liquidity(source, round(minLiquidityMinted), round(maxTokenDeposit), deadline)
          .toTransferParams({ amount: round(cashDeposit).toNumber(), mutez: true })
      )
    } else {
      batchCall = batchCall.withContractCall(
        dexContract.methods.add_liquidity(source, round(minLiquidityMinted), round(maxTokenDeposit), deadline)
      )
    }

    //remove approvals
    if (this.token2.type === TokenType.FA2) {
      batchCall = batchCall.withContractCall(
        await this.prepareRemoveTokenOperator(this.token2.contractAddress, this.dexAddress, this.token2.tokenId)
      )
    } else if (this.token2.type === TokenType.FA1p2) {
      const tokenContract = await this.getContractWalletAbstraction(this.token2.contractAddress)
      batchCall = batchCall.withContractCall(tokenContract.methods.approve(this.dexAddress, 0))
    }

    return this.sendAndAwait(batchCall)
  }

  public async removeLiquidity(liquidityToBurn: BigNumber, minCashWithdrawn: BigNumber, minTokensWithdrawn: BigNumber) {
    const source = await this.getOwnAddress()
    const deadline = this.getDeadline()
    const dexContract = await this.getContractWalletAbstraction(this.dexAddress)

    return this.sendAndAwait(
      this.tezos.wallet
        .batch()
        .withContractCall(
          dexContract.methods.remove_liquidity(source, round(liquidityToBurn), round(minCashWithdrawn), round(minTokensWithdrawn), deadline)
        )
    )
  }

  @cache()
  public async getLiquidityForCash(cash: BigNumber): Promise<AddLiquidityInfo> {
    const storage: CpmmStorage = await this.getContractStorage()

    return getLiquidityAddCash(
      cash,
      new BigNumber(storage.cashPool).shiftedBy(-1 * this.token1.decimals),
      new BigNumber(storage.tokenPool).shiftedBy(-1 * this.token2.decimals),
      new BigNumber(storage.lqtTotal).shiftedBy(-1 * this.token1.decimals)
    )
  }

  @cache()
  public async getLiquidityForToken(token: BigNumber): Promise<AddLiquidityInfo> {
    const storage: CpmmStorage = await this.getContractStorage()

    return getLiquidityAddToken(
      token,
      new BigNumber(storage.cashPool).shiftedBy(-1 * this.token1.decimals),
      new BigNumber(storage.tokenPool).shiftedBy(-1 * this.token2.decimals),
      new BigNumber(storage.lqtTotal).shiftedBy(-1 * this.token2.decimals)
    )
  }

  @cache()
  public async getLiquidityPoolReturn(
    ownPoolTokens: BigNumber,
    slippage: number
  ): Promise<{ cashAmount: BigNumber; tokenAmount: BigNumber }> {
    const storage: CpmmStorage = await this.getContractStorage()

    const poolShare = ownPoolTokens.div(storage.lqtTotal)
    const adjustedSlippage = 1 - slippage / 100

    const cashAmount = poolShare.times(storage.cashPool).times(adjustedSlippage)
    const tokenAmount = poolShare.times(storage.tokenPool).times(adjustedSlippage)

    return { cashAmount, tokenAmount }
  }

  public async getExchangeUrl(): Promise<string> {
    return this.exchangeUrl
  }

  public async clearCache() {
    promiseCache.clear()
  }
}
