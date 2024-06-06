import { MichelsonMap, TezosToolkit, UnitValue } from '@taquito/taquito'
import BigNumber from 'bignumber.js'
import { MultiswapExchangeInfo, NetworkConstants } from '../networks.base'
import { Token, TokenType } from '../tokens/token'
import { cacheFactory, getMillisFromMinutes, round } from '../utils'
import { Exchange, LiquidityPoolInfo } from './exchange'
import { cashBought, CurveExponent, marginalPrice, tokensBought } from './flat-cfmm-utils'
import { FlatYouvesExchange } from './flat-youves-swap'
import { AddLiquidityInfo, getLiquidityAddToken, getSingleSideTradeAmount, SingleSideLiquidityInfo } from './flat-youves-utils'

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
  thirdTokenPool: BigNumber
  cashMultiplier: BigNumber
  tokenMultiplier: BigNumber
  thirdTokenMultiplier: BigNumber
}

export type TokenParameterValue = { fa2: { [key: number]: string | BigNumber } } | { fa12: string } | { tez: any }
export type Parameters = { [key: number]: TokenParameterValue }

const promiseCache = new Map<string, Promise<unknown>>()

const cache = cacheFactory(promiseCache, (obj: FlatYouvesExchange): [string] => {
  return [obj.dexAddress]
})

export class MultiSwapExchange extends Exchange {
  public exchangeUrl: string = 'https://youves.com/swap'
  public exchangeId: string = ``
  public name: string = 'FlatYouves'
  public logo: string = 'youves.svg'

  public fee: number = 0.99 //TODO

  public token1: Token
  public token2: Token
  public token3: Token
  public token1Key: string
  public token2Key: string
  public token3Key: string
  protected liquidityToken: Token

  constructor(tezos: TezosToolkit, contractAddress: string, dexInfo: MultiswapExchangeInfo, networkConstants: NetworkConstants) {
    super(tezos, contractAddress, dexInfo.token1, dexInfo.token2, dexInfo.dexType, networkConstants)
    this.liquidityToken = dexInfo.liquidityToken
    this.token1 = dexInfo.token1
    this.token2 = dexInfo.token2
    this.token3 = dexInfo.token3

    this.token1Key = JSON.stringify(this.getTokenKey(this.token1))
    this.token2Key = JSON.stringify(this.getTokenKey(this.token2))
    this.token3Key = JSON.stringify(this.getTokenKey(this.token3))
  }

  public getTokenKey(token: Token): TokensInfoKey {
    if (token.type === TokenType.FA1p2) {
      return { fa12: token.contractAddress }
    } else if (token.type === TokenType.FA2) {
      return { fa2: { 1: token.contractAddress, 2: new BigNumber(token.tokenId) } }
    } else {
      return {}
    }
  }

  public getTokenParameter(tokenKey: TokensInfoKey): TokenParameterValue {
    if (tokenKey.fa2) {
      return { fa2: { 1: tokenKey.fa2[1], 2: tokenKey.fa2[2] } }
    } else if (tokenKey.fa12) {
      return { fa12: tokenKey.fa12 }
    } else {
      return { tez: UnitValue }
    }
  }

  public getTokenParameters(tokensKeys: TokensInfoKey[]): Parameters {
    const parameters: Parameters = {}
    tokensKeys.forEach((value, index) => {
      if (value.fa2) {
        index === 0
          ? (parameters[index] = { fa2: { 1: value.fa2[1], 2: value.fa2[2] } })
          : (parameters[index] = { fa2: { 2: value.fa2[1], 3: value.fa2[2] } })
      } else if (value.fa12) {
        parameters[index] = { fa12: value.fa12 }
      } else {
        parameters[index] = { tez: null }
      }
    })

    return parameters
  }

  @cache()
  public async getExchangeFee(): Promise<BigNumber> {
    const storage: MultiStorage = await this.getContractStorage()
    return new BigNumber(1).minus(storage.swapFeeRatio.numerator.div(storage.swapFeeRatio.denominator))
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

    const cashPool = new BigNumber(tokensInfo.get(this.token1Key).funds)
    const tokenPool = new BigNumber(tokensInfo.get(this.token2Key).funds)
    const thirdTokenPool = new BigNumber(tokensInfo.get(this.token3Key).funds)
    const cashMultiplier = new BigNumber(tokensInfo.get(this.token1Key).multiplier)
    const tokenMultiplier = new BigNumber(tokensInfo.get(this.token2Key).multiplier)
    const thirdTokenMultiplier = new BigNumber(tokensInfo.get(this.token3Key).multiplier)

    const curveExponent = dexStorage.curve_exponent.exponent8
      ? CurveExponent.EIGHT
      : dexStorage.curve_exponent.exponent6
      ? CurveExponent.SIX
      : CurveExponent.FOUR

    const storage: MultiStorage = {
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
      thirdTokenPool,
      cashMultiplier,
      tokenMultiplier,
      thirdTokenMultiplier
    }

    console.log('STORAGE', storage)
    console.log(JSON.parse(JSON.stringify(storage)))
    return storage
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
    const tokenMultiplier = storage.tokenMultiplier.times(tokenPriceInCash)

    const marginal = marginalPrice(
      new BigNumber(storage.cashPool),
      new BigNumber(storage.tokenPool),
      new BigNumber(storage.cashMultiplier),
      new BigNumber(tokenMultiplier),
      storage.curveExponent
    )

    const res = new BigNumber(1).div(marginal[0].div(marginal[1]))
    const exchangeRate = res.times(tokenPriceInCash)
    console.log('EXCHANGE RATE', exchangeRate.toNumber())
    return exchangeRate
  }

  @cache()
  public async getTokenPriceInCash(): Promise<BigNumber> {
    const storage: MultiStorage = await this.getContractStorage()
    const targetPriceOracle = await this.getContractWalletAbstraction(storage.targetOracle)

    //Parameters need to follow this format
    // const parameters = {
    //   "0": {  "fa2": { "1": "KT1CrNkK2jpdMycfBdPpvTLSLCokRBhZtMq7", "2": 0 } },
    //   "1": {  "fa2": { "2": "KT1CrNkK2jpdMycfBdPpvTLSLCokRBhZtMq7", "3": 3 } }
    // }

    const parameters = this.getTokenParameters([JSON.parse(this.token2Key), JSON.parse(this.token1Key)])

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

    const price = tokenPriceInCash[0].div(tokenPriceInCash[1])
    console.log('TOKEN PRICE IN CASH', price.toNumber())
    return price
  }

  public async getToken1Balance(): Promise<BigNumber> {
    return this.getTokenAmount(this.token1, await this.getOwnAddress())
  }

  public async getToken2Balance(): Promise<BigNumber> {
    return this.getTokenAmount(this.token2, await this.getOwnAddress())
  }

  public async getToken3Balance(): Promise<BigNumber> {
    return this.getTokenAmount(this.token3, await this.getOwnAddress())
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

    const amountSold = round(tokenAmount)
    const minAmountBought = round(minimumReceived)

    const tokenParameters = this.getTokenParameters([this.getTokenKey(srcToken), this.getTokenKey(dstToken)])
    let srcTokenParam = tokenParameters[0]
    let dstTokenParam = tokenParameters[1]

    const swapObject = {
      src_token: srcTokenParam,
      dst_token: dstTokenParam,
      amount_sold: amountSold,
      min_amount_bought: minAmountBought,
      receiver: receiver,
      deadline: deadline
    }

    console.log('TOKEN SWAP', swapObject)
    console.log(JSON.parse(JSON.stringify(swapObject)))

    if (srcToken.type === TokenType.NATIVE) {
      return this.sendAndAwait(
        this.tezos.wallet
          .batch()
          .withTransfer(dexContract.methodsObject.tokenSwap(swapObject).toTransferParams({ amount: amountSold.toNumber(), mutez: true }))
      )
    } else if (srcToken.type === TokenType.FA2) {
      return this.sendAndAwait(
        this.tezos.wallet
          .batch()
          .withContractCall(await this.prepareAddTokenOperator(srcToken.contractAddress, this.dexAddress, srcToken.tokenId))
          .withContractCall(dexContract.methodsObject.tokenSwap(swapObject))
          .withContractCall(await this.prepareRemoveTokenOperator(srcToken.contractAddress, this.dexAddress, srcToken.tokenId))
      )
    } else {
      const tokenContract = await this.getContractWalletAbstraction(srcToken.contractAddress)
      return this.sendAndAwait(
        this.tezos.wallet
          .batch()
          .withContractCall(tokenContract.methods.approve(this.dexAddress, amountSold))
          .withContractCall(dexContract.methodsObject.tokenSwap(swapObject))
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

    const tokenPriceInCash: BigNumber = await this.getTokenPriceInCash()
    const tokenMultiplier = poolInfo.tokenMultiplier.times(tokenPriceInCash)

    const fee = await this.getExchangeFee()

    return tokensBought(
      new BigNumber(poolInfo.cashPool),
      new BigNumber(poolInfo.tokenPool),
      amount,
      new BigNumber(poolInfo.cashMultiplier),
      new BigNumber(tokenMultiplier),
      poolInfo.curveExponent
    ).times(fee)
  }

  @cache()
  protected async getMinReceivedCashForToken(amount: BigNumber) {
    const poolInfo: MultiStorage = await this.getContractStorage()

    const tokenPriceInCash: BigNumber = await this.getTokenPriceInCash()
    const tokenMultiplier = poolInfo.tokenMultiplier.times(tokenPriceInCash)

    const fee = await this.getExchangeFee()

    return cashBought(
      new BigNumber(poolInfo.cashPool),
      new BigNumber(poolInfo.tokenPool),
      amount,
      new BigNumber(poolInfo.cashMultiplier),
      new BigNumber(tokenMultiplier),
      poolInfo.curveExponent
    ).times(fee)
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
  public async addLiquidity(
    minLiquidityMinted: BigNumber,
    maxTokenDeposit: BigNumber,
    cashDeposit: BigNumber,
    maxThirdTokenDeposit: BigNumber
  ) {
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

    // const srcToken = this.getTokenParameter(JSON.parse(this.token1Key))
    // const dstToken = this.getTokenParameter(JSON.parse(this.token2Key))
    // const thirdToken = this.getTokenParameter(JSON.parse(this.token3Key))
    // const remainingTokensMaxDeposited = new MichelsonMap()
    // remainingTokensMaxDeposited.set(dstToken, round(maxTokenDeposit))
    // remainingTokensMaxDeposited.set(thirdToken, round(maxThirdTokenDeposit))

    const tokenParameters = this.getTokenParameters([this.getTokenKey(this.token2), this.getTokenKey(this.token3)])
    const srcToken = this.getTokenParameter(this.getTokenKey(this.token1))
    const dstToken = tokenParameters[0]
    const thirdToken = tokenParameters[1]
    const remainingTokensMaxDeposited = new MichelsonMap()
    remainingTokensMaxDeposited.set(dstToken, round(maxTokenDeposit))
    remainingTokensMaxDeposited.set(thirdToken, round(maxThirdTokenDeposit))
    
    const addLiquidtyObject = {
      owner: source,
      min_lqt_minted: round(minLiquidityMinted),
      src_token: srcToken,
      src_token_amount: round(cashDeposit),
      remaining_tokens_max_deposited: remainingTokensMaxDeposited,
      deadline: deadline
    }

    console.log('ADD LIQUIDITY', addLiquidtyObject)
    console.log(JSON.parse(JSON.stringify(addLiquidtyObject)))
    if (this.token1.symbol === 'tez' || this.token2.symbol === 'tez' || this.token3.symbol === 'tez') {
      batchCall = batchCall.withTransfer(
        //TODO
        dexContract.methodsObject.addLiquidity(addLiquidtyObject).toTransferParams({ amount: cashDeposit.toNumber(), mutez: true })
      )
    } else {
      //TODO
      batchCall = batchCall.withContractCall(dexContract.methodsObject.addLiquidity(addLiquidtyObject))
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
  public async removeLiquidity(
    liquidityToBurn: BigNumber,
    minCashWithdrawn: BigNumber,
    minTokensWithdrawn: BigNumber,
    minThirdTokenWithdrawn: BigNumber
  ) {
    const source = await this.getOwnAddress()
    const deadline = await this.getDeadline()
    const dexContract = await this.getContractWalletAbstraction(this.dexAddress)

    const srcToken = JSON.parse(this.token1Key)
    const dstToken = JSON.parse(this.token2Key)
    const thirdToken = JSON.parse(this.token3Key)
    const minTokensMap = new Map<any, BigNumber>()
    minTokensMap.set(srcToken, round(minCashWithdrawn))
    minTokensMap.set(dstToken, round(minTokensWithdrawn))
    minTokensMap.set(thirdToken, round(minThirdTokenWithdrawn))

    return this.sendAndAwait(
      this.tezos.wallet
        .batch()
        .withContractCall(dexContract.methods.removeLiquidity(source, round(liquidityToBurn), minTokensMap, deadline))
    )
  }

  public async getLiquidityAddMulti(amountIn: BigNumber, origin: 'token1' | 'token2' | 'token3') {
    const poolInfo: MultiStorage = await this.getContractStorage()

    const cashPool = new BigNumber(poolInfo.cashPool).shiftedBy(-this.token1.decimals)
    const tokenPool = new BigNumber(poolInfo.tokenPool).shiftedBy(-this.token2.decimals)
    const thirdTokenPool = new BigNumber(poolInfo.thirdTokenPool).shiftedBy(-this.token3.decimals)
    const lqtPool = new BigNumber(poolInfo.lqtTotal).shiftedBy(-this.liquidityToken.decimals)

    const share = amountIn
      .shiftedBy(origin === 'token1' ? -this.token1.decimals : origin === 'token2' ? -this.token2.decimals : -this.token3.decimals)
      .div(origin === 'token1' ? cashPool : origin === 'token2' ? tokenPool : thirdTokenPool)

    console.log(
      'GET LIQUIDITY ADD MULTI',
      cashPool.toNumber(),
      tokenPool.toNumber(),
      thirdTokenPool.toNumber(),
      lqtPool.toNumber(),
      share.toNumber()
    )
    if (origin === 'token1') {
      return {
        cashAmount: amountIn,
        tokenAmount: tokenPool.times(share),
        thirdTokenAmount: thirdTokenPool.times(share),
        liqReceived: lqtPool.times(share)
      }
    } else if (origin === 'token2') {
      return {
        cashAmount: cashPool.times(share),
        tokenAmount: amountIn,
        thirdTokenAmount: thirdTokenPool.times(share),
        liqReceived: lqtPool.times(share)
      }
    } else {
      return {
        cashAmount: cashPool.times(share),
        tokenAmount: tokenPool.times(share),
        thirdTokenAmount: amountIn,
        liqReceived: lqtPool.times(share)
      }
    }
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
  ): Promise<{ cashAmount: BigNumber; tokenAmount: BigNumber; thirdTokenAmount: BigNumber }> {
    const dexStorage: MultiStorage = await this.getContractStorage()

    const poolShare = ownPoolTokens.div(dexStorage.lqtTotal)

    const adjustedSlippage = 1 - slippage / 100

    const cashAmount = poolShare.times(dexStorage.cashPool).times(adjustedSlippage)
    const tokenAmount = poolShare.times(dexStorage.tokenPool).times(adjustedSlippage)
    const thirdTokenAmount = poolShare.times(dexStorage.thirdTokenPool).times(adjustedSlippage)

    return { cashAmount, tokenAmount, thirdTokenAmount }
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

    const tokenPriceInCash: BigNumber = await this.getTokenPriceInCash()
    const tokenMultiplier = storage.tokenMultiplier.times(tokenPriceInCash)

    const res = marginalPrice(newToken1Pool, newToken2Pool, cashMultiplier, tokenMultiplier, storage.curveExponent)
    const newExchangeRate = new BigNumber(1).div(res[0].div(res[1])).times(tokenPriceInCash)
    return exchangeRate.minus(newExchangeRate).div(exchangeRate).abs()
  }

  public async getExchangeUrl(): Promise<string> {
    return `https://youves.com/swap?from=${this.token1.symbol}&to=${this.token2.symbol}`
  }

  public async clearCache() {
    promiseCache.clear()
  }
}
