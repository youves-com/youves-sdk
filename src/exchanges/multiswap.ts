import { TezosToolkit } from '@taquito/taquito'
import BigNumber from 'bignumber.js'
import { MultiswapExchangeInfo, NetworkConstants } from '../networks.base'
import { Token, TokenType } from '../tokens/token'
import { cacheFactory, getMillisFromMinutes } from '../utils'
import { Exchange, LiquidityPoolInfo } from './exchange'
import { marginalPrice } from './flat-cfmm-utils'
import { FlatYouvesExchange } from './flat-youves-swap'

//TODO rework the whole thing

export interface AdministratorsValue {
  proposed?: null
  set?: null
}

export interface SwapFeeRatio {
  numerator: number
  denominator: number
}

export interface TokensInfoKey {
  fa12?: string
  fa2?: {
    address_25: string
    nat_26: number
  }
  tez?: null
}

export interface TokensInfoValue {
  funds: number
  multiplier: number
}

export interface CurveExponent {
  exponent4?: null
  exponent6?: null
  exponent8?: null
}

export interface MultiStorage {
  administrators: Record<string, AdministratorsValue>
  lqt_total: number
  lqt_address: string
  swap_fee_ratio: SwapFeeRatio
  partial_swap_fee_receiver: string
  baking_rewards_receiver: string
  tokens_info: Map<TokensInfoKey, TokensInfoValue>
  target_oracle: string
  curve_exponent: CurveExponent
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

  public fee: number = 0.9985

  public token1: Token
  public token2: Token
  protected liquidityToken: Token

  constructor(tezos: TezosToolkit, contractAddress: string, dexInfo: MultiswapExchangeInfo, networkConstants: NetworkConstants) {
    super(tezos, contractAddress, dexInfo.token1, dexInfo.token2, dexInfo.dexType, networkConstants)
    this.liquidityToken = dexInfo.liquidityToken
    this.token1 = dexInfo.token1
    this.token2 = dexInfo.token2
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

  public async addSingleSideLiquidity(
    _swapAmount: BigNumber,
    _swapMinReceived: BigNumber,
    _minLiquidityMinted: BigNumber,
    _maxTokenDeposit: BigNumber,
    _cashDeposit: BigNumber,
    _isReverse: boolean = false
  ) {}

  public async removeLiquidity(_liquidityToBurn: BigNumber, _minCashWithdrawn: BigNumber, _minTokensWithdrawn: BigNumber) {}

  @cache()
  public async getExchangeRate(): Promise<BigNumber> {
    return new BigNumber(1)
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
    // const poolInfo: MultiStorage = await this.getContractStorage()
    if (tokenNumber === 1) {
      // return new BigNumber(poolInfo.cashPool)
      return new BigNumber(100000000)
    } else {
      // return new BigNumber(poolInfo.tokenPool)
      return new BigNumber(100000000)
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
  protected async getMinReceivedTokenForCash(_amount: BigNumber) {
    // const poolInfo: MultiStorage = await this.getContractStorage()

    // return tokensBought(
    //   new BigNumber(poolInfo.cashPool),
    //   new BigNumber(poolInfo.tokenPool),
    //   amount,
    //   new BigNumber(poolInfo.cashMultiplier),
    //   new BigNumber(poolInfo.tokenMultiplier)
    // ).times(this.fee)
    return new BigNumber(100000000)
  }

  @cache()
  protected async getMinReceivedCashForToken(_amount: BigNumber) {
    // const poolInfo: MultiStorage = await this.getContractStorage()

    // return cashBought(
    //   new BigNumber(poolInfo.cashPool),
    //   new BigNumber(poolInfo.tokenPool),
    //   amount,
    //   new BigNumber(poolInfo.cashMultiplier),
    //   new BigNumber(poolInfo.tokenMultiplier)
    // ).times(this.fee)

    return new BigNumber(100000000)
  }

  @cache()
  public async getContractStorage(): Promise<MultiStorage> {
    const dexContract = await this.getContractWalletAbstraction(this.dexAddress)
    const dexStorage: any = (await this.getStorageOfContract(dexContract)) as any

    const tokensInfo = new Map<TokensInfoKey, TokensInfoValue>()
    for (const key of dexStorage.tokens_info.keyMap) {
      console.log(key)
      const value: TokensInfoValue = dexStorage.tokens_info.valueMap.get(key[0])
      console.log(value)
      if (value) {
        tokensInfo.set(key[1], value)
      }
    }

    console.log('😶‍🌫️😶‍🌫️😶‍🌫️😶‍🌫️', tokensInfo)
    
    dexStorage.tokens_info = tokensInfo
    return dexStorage
  }

  @cache()
  public async getLiquidityPoolInfo(): Promise<LiquidityPoolInfo> {
    // const storage: MultiStorage = await this.getContractStorage()

    // const poolInfo: LiquidityPoolInfo = {
    //   cashPool: new BigNumber(storage.cashPool),
    //   tokenPool: new BigNumber(storage.tokenPool),
    //   lqtTotal: new BigNumber(storage.lqtTotal)
    // }

    // return poolInfo

    return {
      cashPool: new BigNumber(100000000),
      tokenPool: new BigNumber(100000000),
      lqtTotal: new BigNumber(100000000)
    }
  }

  @cache()
  public async getOwnLiquidityPoolTokens(): Promise<BigNumber> {
    const source = await this.getOwnAddress()

    const tokenContract = await this.tezos.wallet.at(this.liquidityToken.contractAddress)
    const tokenStorage = (await this.getStorageOfContract(tokenContract)) as any
    const tokenAmount = await tokenStorage['tokens'].get(source)
    return new BigNumber(tokenAmount ? tokenAmount : 0)
  }

  // @cache()
  // public async getLiquidityForCash(cash: BigNumber): Promise<AddLiquidityInfo> {
  //   const poolInfo: MultiStorage = await this.getContractStorage()

  //   return getLiquidityAddCash(
  //     cash,
  //     new BigNumber(poolInfo.cashPool).shiftedBy(-1 * this.token1.decimals),
  //     new BigNumber(poolInfo.tokenPool).shiftedBy(-1 * this.token2.decimals),
  //     new BigNumber(poolInfo.lqtTotal).shiftedBy(-1 * this.token1.decimals)
  //   )
  // }

  // //new implementation using wener single side liquidity calculations
  // @cache()
  // public async getSingleSideLiquidity(amount: BigNumber, isReverse: boolean = false): Promise<SingleSideLiquidityInfo | undefined> {
  //   const poolInfo: MultiStorage = await this.getContractStorage()
  //   const cashPool = new BigNumber(poolInfo.cashPool).shiftedBy(-1 * this.token1.decimals)
  //   const tokenPool = new BigNumber(poolInfo.tokenPool).shiftedBy(-1 * this.token2.decimals)
  //   const shiftedAmount = isReverse ? amount.shiftedBy(-1 * this.token2.decimals) : amount.shiftedBy(-1 * this.token1.decimals)
  //   const singleSideTrade = getSingleSideTradeAmount(
  //     isReverse ? new BigNumber(0) : shiftedAmount,
  //     isReverse ? shiftedAmount : new BigNumber(0),
  //     cashPool,
  //     tokenPool,
  //     new BigNumber(1),
  //     new BigNumber(1)
  //   )

  //   const swapAmountShifted = singleSideTrade != undefined ? new BigNumber(singleSideTrade.sell_amt_gross) : undefined
  //   if (!swapAmountShifted) return undefined

  //   const swapAmount = isReverse
  //     ? swapAmountShifted.shiftedBy(1 * this.token2.decimals)
  //     : swapAmountShifted.shiftedBy(1 * this.token1.decimals)
  //   const minimumReceived = isReverse
  //     ? await this.getMinReceivedCashForToken(swapAmount)
  //     : await this.getMinReceivedTokenForCash(swapAmount)

  //   const singleSideCashAmount = isReverse ? minimumReceived : amount.minus(swapAmount)
  //   const singleSideTokenAmount = isReverse ? amount.minus(swapAmount) : minimumReceived

  //   const cashShare = isReverse ? singleSideTokenAmount.div(tokenPool) : singleSideCashAmount.div(cashPool)
  //   const lqtPool = new BigNumber(poolInfo.lqtTotal).shiftedBy(-1 * (isReverse ? this.token2.decimals : this.token1.decimals))
  //   return {
  //     amount: amount.decimalPlaces(0, BigNumber.ROUND_HALF_UP),
  //     swapAmount: swapAmount.decimalPlaces(0, BigNumber.ROUND_HALF_UP),
  //     swapMinReceived: minimumReceived.decimalPlaces(0, BigNumber.ROUND_HALF_DOWN),
  //     singleSideToken1Amount: isReverse
  //       ? singleSideTokenAmount.decimalPlaces(0, BigNumber.ROUND_HALF_DOWN)
  //       : singleSideCashAmount.decimalPlaces(0, BigNumber.ROUND_HALF_UP),
  //     singleSideToken2Amount: isReverse
  //       ? singleSideCashAmount.decimalPlaces(0, BigNumber.ROUND_HALF_UP)
  //       : singleSideTokenAmount.decimalPlaces(0, BigNumber.ROUND_HALF_DOWN),
  //     liqReceived: lqtPool.times(cashShare).decimalPlaces(0, BigNumber.ROUND_HALF_UP)
  //   }
  // }

  // @cache()
  // public async getLiquidityForToken(token: BigNumber): Promise<AddLiquidityInfo> {
  //   const poolInfo: MultiStorage = await this.getContractStorage()

  //   return getLiquidityAddToken(
  //     token,
  //     new BigNumber(poolInfo.cashPool).shiftedBy(-1 * this.token1.decimals),
  //     new BigNumber(poolInfo.tokenPool).shiftedBy(-1 * this.token2.decimals),
  //     new BigNumber(poolInfo.lqtTotal).shiftedBy(-1 * this.token2.decimals)
  //   )
  // }

  // @cache()
  // public async getLiquidityPoolReturn(
  //   ownPoolTokens: BigNumber,
  //   slippage: number
  // ): Promise<{ cashAmount: BigNumber; tokenAmount: BigNumber }> {
  //   const dexStorage: CfmmStorage = await this.getLiquidityPoolState()

  //   const poolShare = ownPoolTokens.div(dexStorage.lqtTotal)

  //   const adjustedSlippage = 1 - slippage / 100

  //   const cashAmount = poolShare.times(dexStorage.cashPool).times(adjustedSlippage)
  //   const tokenAmount = poolShare.times(dexStorage.tokenPool).times(adjustedSlippage)

  //   return { cashAmount, tokenAmount }
  // }

  public async getPriceImpact(amount: BigNumber, reverse: boolean): Promise<BigNumber> {
    // const storage: MultiStorage = await this.getContractStorage()

    const exchangeRate = await this.getExchangeRate()

    const tokenReceived = !reverse
      ? await this.getExpectedMinimumReceivedToken2ForToken1(amount)
      : await this.getExpectedMinimumReceivedToken1ForToken2(amount)

    // const cashPool = new BigNumber(storage.cashPool)
    // const tokenPool = new BigNumber(storage.tokenPool)
    // const cashMultiplier = new BigNumber(storage.cashMultiplier)
    // const tokenMultiplier = new BigNumber(storage.tokenMultiplier)
    const cashPool = new BigNumber(100000000)
    const tokenPool = new BigNumber(100000000)
    const cashMultiplier = new BigNumber(1)
    const tokenMultiplier = new BigNumber(1)

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

    const res = marginalPrice(newToken1Pool, newToken2Pool, new BigNumber(cashMultiplier), new BigNumber(tokenMultiplier))
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
