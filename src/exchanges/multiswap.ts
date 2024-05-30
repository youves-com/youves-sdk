import { TezosToolkit } from '@taquito/taquito'
import BigNumber from 'bignumber.js'
import { MultiswapExchangeInfo, NetworkConstants } from '../networks.base'
import { Token, TokenType } from '../tokens/token'
import { cacheFactory, getMillisFromMinutes, round } from '../utils'
import { Exchange, LiquidityPoolInfo } from './exchange'
import { cashBought, CurveExponent, marginalPrice, tokensBought } from './flat-cfmm-utils'
import { FlatYouvesExchange } from './flat-youves-swap'
import {
  AddLiquidityInfo,
  getLiquidityAddCash,
  getLiquidityAddToken,
  getSingleSideTradeAmount,
  SingleSideLiquidityInfo
} from './flat-youves-utils'

//TODO rework the whole thing

export interface SwapFeeRatio {
  numerator: BigNumber
  denominator: BigNumber
}

export interface TokensInfoKey {
  fa12?: string
  fa2?: {
    1: string
    2: BigNumber
  }
  tez?: null
}

export interface TokensInfoValue {
  funds: BigNumber
  multiplier: BigNumber
}

export interface MultiStorage {
  lqtTotal: BigNumber
  lqtAddress: string
  swapFeeRatio: SwapFeeRatio
  partialSwapFeeReceiver: string
  bakingRewardsReceiver: string
  tokensInfo: Map<string, TokensInfoValue>
  tokensKeys: Map<string, TokensInfoKey>
  targetOracle: string
  curveExponent: CurveExponent
  cashPool: BigNumber
  tokenPool: BigNumber
  cashMultiplier: BigNumber
  tokenMultiplier: BigNumber
}

const promiseCache = new Map<string, Promise<unknown>>()

const cache = cacheFactory(promiseCache, (obj: FlatYouvesExchange): [string] => {
  return [obj.dexAddress]
})

export class MultiSwapExchange extends Exchange {
  public exchangeUrl: string = 'https://youves.com/swap'
  public exchangeId: string = ``
  public name: string = 'FlatYouves'
  public logo: string = 'youves.svg'

  public fee: number = 0.9985 //TODO

  public token1: Token
  public token2: Token
  public token1Key: string
  public token2Key: string
  protected liquidityToken: Token

  constructor(tezos: TezosToolkit, contractAddress: string, dexInfo: MultiswapExchangeInfo, networkConstants: NetworkConstants) {
    super(tezos, contractAddress, dexInfo.token1, dexInfo.token2, dexInfo.dexType, networkConstants)
    this.liquidityToken = dexInfo.liquidityToken
    this.token1 = dexInfo.token1
    this.token2 = dexInfo.token2

    this.token1Key = JSON.stringify(this.getTokenKey(this.token1))
    this.token2Key = JSON.stringify(this.getTokenKey(this.token2))
  }

  public getTokenKey(token: Token): TokensInfoKey {
    if (token.type === TokenType.FA1p2) {
      return { fa12: token.contractAddress }
    } else if (token.type === TokenType.FA2) {
      return { fa2: { 1: token.contractAddress, 2: new BigNumber(token.tokenId) } }
    } else {
      return { tez: null }
    }
  }

  @cache()
  public async getContractStorage(): Promise<MultiStorage> {
    const dexContract = await this.getContractWalletAbstraction(this.dexAddress)
    const dexStorage: any = (await this.getStorageOfContract(dexContract)) as any

    // const tokensInfo = new Map<string, TokensInfoValue>()
    // for (const key of dexStorage.tokens_info.keyMap) {
    //   const value: TokensInfoValue = dexStorage.tokens_info.valueMap.get(key[0])
    //   if (value) {
    //     console.log('setting with key ', key[1])
    //     tokensInfo.set(JSON.stringify(key[1]), value)
    //   }
    // }

    const tokensInfo = dexStorage.tokens_info.valueMap
    const tokensKeys = dexStorage.tokens_info.keyMap

    console.log('😶‍🌫️😶‍🌫️😶‍🌫️😶‍🌫️', tokensInfo)

    const cashPool = new BigNumber(tokensInfo.get(this.token1Key).funds)
    const tokenPool = new BigNumber(tokensInfo.get(this.token2Key).funds)
    const cashMultiplier = new BigNumber(tokensInfo.get(this.token1Key).multiplier)
    const tokenMultiplier = new BigNumber(tokensInfo.get(this.token2Key).multiplier)

    const curveExponent = dexStorage.curve_exponent.exponent8
      ? CurveExponent.EIGHT
      : dexStorage.curve_exponent.exponent6
      ? CurveExponent.SIX
      : CurveExponent.FOUR

    return {
      lqtTotal: new BigNumber(dexStorage.lqt_total),
      lqtAddress: dexStorage.lqt_address,
      swapFeeRatio: {
        numerator: new BigNumber(dexStorage.swap_fee_ratio.numerator),
        denominator: new BigNumber(dexStorage.swap_fee_ratio.denominator)
      },
      partialSwapFeeReceiver: dexStorage.partial_swap_fee_receiver,
      bakingRewardsReceiver: dexStorage.baking_rewards_receiver,
      tokensInfo,
      tokensKeys,
      targetOracle: dexStorage.target_oracle,
      curveExponent,
      cashPool,
      tokenPool,
      cashMultiplier,
      tokenMultiplier
    } as MultiStorage
  }

  public async token1ToToken2(tokenAmount: BigNumber, minimumReceived: BigNumber): Promise<string> {
    return this.tokenSwap(this.token1, this.token2, tokenAmount, minimumReceived)
  }

  public async token2ToToken1(tokenAmount: BigNumber, minimumReceived: BigNumber): Promise<string> {
    return this.tokenSwap(this.token2, this.token1, tokenAmount, minimumReceived)
  }

  public async getToken1MaximumExchangeAmount(): Promise<BigNumber> {
    return this.getExchangeMaximumTokenAmount(1)
  }

  public async getToken2MaximumExchangeAmount(): Promise<BigNumber> {
    return this.getExchangeMaximumTokenAmount(2)
  }

  @cache()
  public async getExchangeRate(): Promise<BigNumber> {
    const storage: MultiStorage = await this.getContractStorage()

    const tokenPriceInCash = await this.getTokenPriceInCash()
    console.log('🚀', tokenPriceInCash.toString())
    const tokenMultiplier = storage.tokenMultiplier.times(tokenPriceInCash)

    const marginal = marginalPrice(
      new BigNumber(storage.cashPool),
      new BigNumber(storage.tokenPool),
      new BigNumber(storage.cashMultiplier),
      new BigNumber(tokenMultiplier),
      storage.curveExponent
    )

    const res = new BigNumber(1).div(marginal[0].div(marginal[1]))
    return res.div(tokenMultiplier)
  }

  @cache()
  public async getTokenPriceInCash(): Promise<BigNumber> {
    const storage: MultiStorage = await this.getContractStorage()
    const targetPriceOracle = await this.getContractWalletAbstraction(storage.targetOracle)
    console.log('🚀', [storage.tokensKeys.get(this.token1Key), storage.tokensKeys.get(this.token2Key)])

    //Parameters need to follow this format
    // const parameters = {
    //   "0": {  "fa2": { "1": "KT1CrNkK2jpdMycfBdPpvTLSLCokRBhZtMq7", "2": 0 } },
    //   "1": {  "fa2": { "2": "KT1CrNkK2jpdMycfBdPpvTLSLCokRBhZtMq7", "3": 3 } }
    // }

    type ParameterValue = { fa2: { [key: number]: string | BigNumber } } | { fa12: string } | { tez: null }
    type Parameters = { [key: number]: ParameterValue }

    const parameters: Parameters = {}
    const a = [JSON.parse(this.token1Key), JSON.parse(this.token2Key)]
    a.forEach((value, index) => {
      if (value.fa2) {
        index === 0
          ? (parameters[index] = { fa2: { 1: value.fa2[1], 2: value.fa2[2] } })
          : (parameters[index] = { fa2: { 2: value.fa2[1], 3: value.fa2[2] } })
      } else if (value.fa12) {
        parameters[index] = { fa12: value.fa12 }
      } else if (value.tez !== undefined) {
        parameters[index] = { tez: value.tez }
      }
    })

    const tokenPriceInCash: BigNumber[] = await targetPriceOracle.contractViews
      .get_token_price(parameters)
      .executeView({ viewCaller: this.dexAddress })
      .then((res) => {
        //TODO
        if (res !== undefined && this.dexAddress === 'KT1PkygK9CqgNLyuJ9iMFcgx1651BrTjN1Q9') {
          // tooOldError$.next(false)
        }
        return res
      })
      .catch((e: any) => {
        console.error(this.dexAddress, e)
        if (e.message.includes('OldPrice') && this.dexAddress === 'KT1PkygK9CqgNLyuJ9iMFcgx1651BrTjN1Q9') {
          // tooOldError$.next(true)
        }
      })

    return tokenPriceInCash[1].div(tokenPriceInCash[0]).shiftedBy(-this.token1.decimals)
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
    const poolInfo: MultiStorage = await this.getContractStorage()
    if (tokenNumber === 1) {
      return new BigNumber(poolInfo.cashPool)
    } else {
      return new BigNumber(poolInfo.tokenPool)
    }
  }

  public async tokenSwap(srcToken: Token, dstToken: Token, tokenAmount: BigNumber, minimumReceived: BigNumber): Promise<string> {
    const receiver = await this.getOwnAddress()
    const dexContract = await this.getContractWalletAbstraction(this.dexAddress)
    const deadline: string = this.getDeadline()

    const amountSold = tokenAmount.toNumber()
    const minAmountBought = minimumReceived.toNumber()

    let srcTokenParam
    let dstTokenParam

    if (srcToken.type === TokenType.FA1p2) {
      srcTokenParam = { fa12: srcToken.contractAddress }
    } else if (srcToken.type === TokenType.FA2) {
      srcTokenParam = { fa2: { address_25: srcToken.contractAddress, nat_26: srcToken.tokenId } }
    } else {
      srcTokenParam = { tez: null }
    }

    if (dstToken.type === TokenType.FA1p2) {
      dstTokenParam = { fa12: dstToken.contractAddress }
    } else if (dstToken.type === TokenType.FA2) {
      dstTokenParam = { fa2: { address_25: dstToken.contractAddress, nat_26: dstToken.tokenId } }
    } else {
      dstTokenParam = { tez: null }
    }

    if (srcToken.type === TokenType.NATIVE) {
      return this.sendAndAwait(
        this.tezos.wallet
          .batch()
          .withTransfer(
            dexContract.methods
              .tokenSwap(srcTokenParam, dstTokenParam, amountSold, minAmountBought, receiver, deadline)
              .toTransferParams({ amount: amountSold, mutez: true })
          )
      )
    } else if (srcToken.type === TokenType.FA2) {
      return this.sendAndAwait(
        this.tezos.wallet
          .batch()
          .withContractCall(await this.prepareAddTokenOperator(srcToken.contractAddress, this.dexAddress, srcToken.tokenId))
          .withContractCall(dexContract.methods.tokenSwap(srcTokenParam, dstTokenParam, amountSold, minAmountBought, receiver, deadline))
          .withContractCall(await this.prepareRemoveTokenOperator(srcToken.contractAddress, this.dexAddress, srcToken.tokenId))
      )
    } else {
      const tokenContract = await this.getContractWalletAbstraction(srcToken.contractAddress)
      return this.sendAndAwait(
        this.tezos.wallet
          .batch()
          .withContractCall(tokenContract.methods.approve(this.dexAddress, amountSold))
          .withContractCall(dexContract.methods.tokenSwap(srcTokenParam, dstTokenParam, amountSold, minAmountBought, receiver, deadline))
          .withContractCall(tokenContract.methods.approve(this.dexAddress, 0))
      )
    }
  }

  private getDeadline(): string {
    return new Date(new Date().getTime() + getMillisFromMinutes(15)).toISOString()
  }

  @cache()
  protected async getMinReceivedTokenForCash(amount: BigNumber) {
    const poolInfo: MultiStorage = await this.getContractStorage()

    return tokensBought(
      new BigNumber(poolInfo.cashPool),
      new BigNumber(poolInfo.tokenPool),
      amount,
      new BigNumber(poolInfo.cashMultiplier),
      new BigNumber(poolInfo.tokenMultiplier),
      poolInfo.curveExponent
    ).times(this.fee)
  }

  @cache()
  protected async getMinReceivedCashForToken(amount: BigNumber) {
    const poolInfo: MultiStorage = await this.getContractStorage()

    return cashBought(
      new BigNumber(poolInfo.cashPool),
      new BigNumber(poolInfo.tokenPool),
      amount,
      new BigNumber(poolInfo.cashMultiplier),
      new BigNumber(poolInfo.tokenMultiplier),
      poolInfo.curveExponent
    ).times(this.fee)
  }

  @cache()
  public async getLiquidityPoolInfo(): Promise<LiquidityPoolInfo> {
    const storage: MultiStorage = await this.getContractStorage()

    const poolInfo: LiquidityPoolInfo = {
      cashPool: new BigNumber(storage.cashPool),
      tokenPool: new BigNumber(storage.tokenPool),
      lqtTotal: new BigNumber(storage.lqtTotal)
    }

    return poolInfo
  }

  @cache()
  public async getOwnLiquidityPoolTokens(): Promise<BigNumber> {
    const source = await this.getOwnAddress()

    const tokenContract = await this.tezos.wallet.at(this.liquidityToken.contractAddress)
    const tokenStorage = (await this.getStorageOfContract(tokenContract)) as any
    const tokenAmount = await tokenStorage['tokens'].get(source)
    return new BigNumber(tokenAmount ? tokenAmount : 0)
  }

  //TODO
  public async addLiquidity(minLiquidityMinted: BigNumber, maxTokenDeposit: BigNumber, cashDeposit: BigNumber) {
    const source = await this.getOwnAddress()
    const dexContract = await this.getContractWalletAbstraction(this.dexAddress)
    const deadline = await this.getDeadline()

    let batchCall = this.tezos.wallet.batch()

    // batchCall = batchCall.withContractCall(
    //   tokenContract.methods.update_operators([
    //     { add_operator: { owner: source, operator: this.SAVINGS_V2_POOL_ADDRESS, token_id: this.token.tokenId } }
    //   ])
    // )

    //add approvals
    if (this.token1.type === TokenType.FA2) {
      batchCall = batchCall.withContractCall(
        await this.prepareAddTokenOperator(this.token1.contractAddress, this.dexAddress, this.token1.tokenId)
      )
    } else if (this.token1.type === TokenType.FA1p2) {
      const tokenContract = await this.getContractWalletAbstraction(this.token1.contractAddress)
      batchCall = batchCall.withContractCall(tokenContract.methods.approve(this.dexAddress, round(cashDeposit)))
    }

    if (this.token2.type === TokenType.FA2) {
      batchCall = batchCall.withContractCall(
        await this.prepareAddTokenOperator(this.token2.contractAddress, this.dexAddress, this.token2.tokenId)
      )
    } else if (this.token2.type === TokenType.FA1p2) {
      const tokenContract = await this.getContractWalletAbstraction(this.token2.contractAddress)
      batchCall = batchCall.withContractCall(tokenContract.methods.approve(this.dexAddress, round(cashDeposit)))
    }

    //add liquidity
    if (this.token1.symbol === 'tez') {
      batchCall = batchCall.withTransfer(
        //TODO
        dexContract.methods
          .addLiquidity(source, round(minLiquidityMinted), round(maxTokenDeposit), deadline)
          .toTransferParams({ amount: round(cashDeposit).toNumber(), mutez: true })
      )
    } else {
      //TODO
      batchCall = batchCall.withContractCall(
        dexContract.methods.addLiquidity(source, round(minLiquidityMinted), round(maxTokenDeposit), round(cashDeposit), deadline)
      )
    }

    //remove approvals
    if (this.token1.type === TokenType.FA2) {
      batchCall = batchCall.withContractCall(
        await this.prepareRemoveTokenOperator(this.token1.contractAddress, this.dexAddress, this.token1.tokenId)
      )
    } else if (this.token1.type === TokenType.FA1p2) {
      const tokenContract = await this.getContractWalletAbstraction(this.token1.contractAddress)
      batchCall = batchCall.withContractCall(tokenContract.methods.approve(this.dexAddress, 0))
    }

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

  //TODO single side disabled for now
  public async addSingleSideLiquidity(
    _swapAmount: BigNumber,
    _swapMinReceived: BigNumber,
    _minLiquidityMinted: BigNumber,
    _maxTokenDeposit: BigNumber,
    _cashDeposit: BigNumber,
    _isReverse: boolean = false
  ) {}

  //TODO rework
  public async removeLiquidity(liquidityToBurn: BigNumber, minCashWithdrawn: BigNumber, minTokensWithdrawn: BigNumber) {
    const source = await this.getOwnAddress()
    const deadline = await this.getDeadline()
    const dexContract = await this.getContractWalletAbstraction(this.dexAddress)

    return this.sendAndAwait(
      this.tezos.wallet
        .batch()
        .withContractCall(
          dexContract.methods.removeLiquidity(source, round(liquidityToBurn), round(minCashWithdrawn), round(minTokensWithdrawn), deadline)
        )
    )
  }

  @cache()
  public async getLiquidityForCash(cash: BigNumber): Promise<AddLiquidityInfo> {
    const poolInfo: MultiStorage = await this.getContractStorage()

    return getLiquidityAddCash(
      cash,
      new BigNumber(poolInfo.cashPool).shiftedBy(-1 * this.token1.decimals),
      new BigNumber(poolInfo.tokenPool).shiftedBy(-1 * this.token2.decimals),
      new BigNumber(poolInfo.lqtTotal).shiftedBy(-1 * this.token1.decimals)
    )
  }

  //new implementation using wener single side liquidity calculations
  @cache()
  public async getSingleSideLiquidity(amount: BigNumber, isReverse: boolean = false): Promise<SingleSideLiquidityInfo | undefined> {
    const poolInfo: MultiStorage = await this.getContractStorage()
    const cashPool = new BigNumber(poolInfo.cashPool).shiftedBy(-1 * this.token1.decimals)
    const tokenPool = new BigNumber(poolInfo.tokenPool).shiftedBy(-1 * this.token2.decimals)
    const shiftedAmount = isReverse ? amount.shiftedBy(-1 * this.token2.decimals) : amount.shiftedBy(-1 * this.token1.decimals)
    const singleSideTrade = getSingleSideTradeAmount(
      isReverse ? new BigNumber(0) : shiftedAmount,
      isReverse ? shiftedAmount : new BigNumber(0),
      cashPool,
      tokenPool,
      new BigNumber(1),
      new BigNumber(1)
    )

    const swapAmountShifted = singleSideTrade != undefined ? new BigNumber(singleSideTrade.sell_amt_gross) : undefined
    if (!swapAmountShifted) return undefined

    const swapAmount = isReverse
      ? swapAmountShifted.shiftedBy(1 * this.token2.decimals)
      : swapAmountShifted.shiftedBy(1 * this.token1.decimals)
    const minimumReceived = isReverse
      ? await this.getMinReceivedCashForToken(swapAmount)
      : await this.getMinReceivedTokenForCash(swapAmount)

    const singleSideCashAmount = isReverse ? minimumReceived : amount.minus(swapAmount)
    const singleSideTokenAmount = isReverse ? amount.minus(swapAmount) : minimumReceived

    const cashShare = isReverse ? singleSideTokenAmount.div(tokenPool) : singleSideCashAmount.div(cashPool)
    const lqtPool = new BigNumber(poolInfo.lqtTotal).shiftedBy(-1 * (isReverse ? this.token2.decimals : this.token1.decimals))
    return {
      amount: amount.decimalPlaces(0, BigNumber.ROUND_HALF_UP),
      swapAmount: swapAmount.decimalPlaces(0, BigNumber.ROUND_HALF_UP),
      swapMinReceived: minimumReceived.decimalPlaces(0, BigNumber.ROUND_HALF_DOWN),
      singleSideToken1Amount: isReverse
        ? singleSideTokenAmount.decimalPlaces(0, BigNumber.ROUND_HALF_DOWN)
        : singleSideCashAmount.decimalPlaces(0, BigNumber.ROUND_HALF_UP),
      singleSideToken2Amount: isReverse
        ? singleSideCashAmount.decimalPlaces(0, BigNumber.ROUND_HALF_UP)
        : singleSideTokenAmount.decimalPlaces(0, BigNumber.ROUND_HALF_DOWN),
      liqReceived: lqtPool.times(cashShare).decimalPlaces(0, BigNumber.ROUND_HALF_UP)
    }
  }

  @cache()
  public async getLiquidityForToken(token: BigNumber): Promise<AddLiquidityInfo> {
    const poolInfo: MultiStorage = await this.getContractStorage()

    return getLiquidityAddToken(
      token,
      new BigNumber(poolInfo.cashPool).shiftedBy(-1 * this.token1.decimals),
      new BigNumber(poolInfo.tokenPool).shiftedBy(-1 * this.token2.decimals),
      new BigNumber(poolInfo.lqtTotal).shiftedBy(-1 * this.token2.decimals)
    )
  }

  @cache()
  public async getLiquidityPoolReturn(
    ownPoolTokens: BigNumber,
    slippage: number
  ): Promise<{ cashAmount: BigNumber; tokenAmount: BigNumber }> {
    const dexStorage: MultiStorage = await this.getContractStorage()

    const poolShare = ownPoolTokens.div(dexStorage.lqtTotal)

    const adjustedSlippage = 1 - slippage / 100

    const cashAmount = poolShare.times(dexStorage.cashPool).times(adjustedSlippage)
    const tokenAmount = poolShare.times(dexStorage.tokenPool).times(adjustedSlippage)

    return { cashAmount, tokenAmount }
  }

  public async getPriceImpact(amount: BigNumber, reverse: boolean): Promise<BigNumber> {
    const storage: MultiStorage = await this.getContractStorage()

    const exchangeRate = await this.getExchangeRate()

    const tokenReceived = !reverse
      ? await this.getExpectedMinimumReceivedToken2ForToken1(amount)
      : await this.getExpectedMinimumReceivedToken1ForToken2(amount)

    const cashPool = new BigNumber(storage.cashPool)
    const tokenPool = new BigNumber(storage.tokenPool)
    const cashMultiplier = new BigNumber(storage.cashMultiplier)
    const tokenMultiplier = new BigNumber(storage.tokenMultiplier)

    const currentToken1Pool = new BigNumber(cashPool)
    const currentToken2Pool = new BigNumber(tokenPool)

    let newToken1Pool, newToken2Pool
    if (!reverse) {
      newToken1Pool = new BigNumber(currentToken1Pool).plus(amount)
      newToken2Pool = new BigNumber(currentToken2Pool).minus(tokenReceived)
    } else {
      newToken1Pool = new BigNumber(currentToken1Pool).minus(tokenReceived)
      newToken2Pool = new BigNumber(currentToken2Pool).plus(amount)
    }

    const res = marginalPrice(
      newToken1Pool,
      newToken2Pool,
      new BigNumber(cashMultiplier),
      new BigNumber(tokenMultiplier),
      storage.curveExponent
    )
    const newExchangeRate = new BigNumber(1).div(res[0].div(res[1]))

    return exchangeRate.minus(newExchangeRate).div(exchangeRate).abs()
  }

  public async getExchangeUrl(): Promise<string> {
    return `https://youves.com/swap?from=${this.token1.symbol}&to=${this.token2.symbol}`
  }

  public async clearCache() {
    promiseCache.clear()
  }
}
