import { MichelsonMap, TezosToolkit } from '@taquito/taquito'
import BigNumber from 'bignumber.js'
import { MultiswapExchangeInfo, NetworkConstants } from '../networks.base'
import { Token, TokenType } from '../tokens/token'
import { cacheFactory, getMillisFromMinutes, round } from '../utils'
import { Exchange, LiquidityPoolInfo } from './exchange'
import { FlatYouvesExchange } from './flat-youves-swap'
import { AddLiquidityInfo, getLiquidityAddToken } from './flat-youves-utils'
import { tooOldErrors } from './flat-youves-swapV2'
import { BehaviorSubject } from 'rxjs'

export interface SwapFeeRatio {
  numerator: BigNumber
  denominator: BigNumber
}

export interface TokensInfoKey {
  fa1?: string
  fa12?: string
  fa2?: { [key: number]: string | BigNumber }
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
  bakingRewardsReceiver: string
  tokenKeys: TokensInfoKey[]
  tokenKeyStrings: string[]
  tokenKeysMap: Record<string, TokensInfoKey>
  targetOracle: string
  cashPool: BigNumber
  tokenPool: BigNumber
  thirdTokenPool: BigNumber
  cashMultiplier: BigNumber
  tokenMultiplier: BigNumber
  thirdTokenMultiplier: BigNumber
}

export type TokenParameterValue = { fa2: { [key: number]: string | BigNumber } } | { fa12: string } | { fa1: string } | { tez: any }
export type Parameters = { [key: number]: TokenParameterValue }

const promiseCache = new Map<string, Promise<unknown>>()

const cache = cacheFactory(promiseCache, (obj: FlatYouvesExchange): [string, string, string] => {
  return [obj.dexAddress, obj.token1.symbol, obj.token2.symbol]
})

export class MultiSwapExchange extends Exchange {
  public exchangeUrl: string = 'https://youves.com/swap'
  public exchangeId: string = ``
  public name: string = 'FlatYouves'
  public logo: string = 'youves.svg'

  public fee: number = 0 // This is not used, it is calculated from storage

  public token1: Token
  public token2: Token
  public token3: Token

  protected liquidityToken: Token

  constructor(tezos: TezosToolkit, contractAddress: string, dexInfo: MultiswapExchangeInfo, networkConstants: NetworkConstants) {
    super(tezos, contractAddress, dexInfo.token1, dexInfo.token2, dexInfo.dexType, networkConstants)
    this.liquidityToken = dexInfo.liquidityToken
    this.token1 = dexInfo.token1
    this.token2 = dexInfo.token2
    this.token3 = dexInfo.token3
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

    const tokensInfo = dexStorage.tokens.valueMap
    const tokensKeys = dexStorage.tokens.keyMap

    //console.log('TOKENS INFO', tokensInfo)
    //console.log('TOKENS KEYS', tokensKeys)

    const [cashPool, tokenPool, thirdTokenPool] = await Promise.all([
      this.getTokenAmount(this.token1, this.dexAddress),
      this.getTokenAmount(this.token2, this.dexAddress),
      this.getTokenAmount(this.token3, this.dexAddress)
    ])

    //console.log('POOLS', cashPool.toNumber(), tokenPool.toNumber(), thirdTokenPool.toNumber())

    const tokens = [this.token1, this.token2, this.token3]
    const [token1Key, token2Key, token3Key] = tokens.map((token) => {
      const tokenKey: any = Array.from(tokensKeys).find(
        (x: any) => x[0].includes(token.contractAddress) || (token.symbol === 'tez' && x[0] === '{}')
      )
      return tokenKey[1]
    })
    const tokenKeys = [token1Key, token2Key, token3Key]
    const tokenKeyStrings = [JSON.stringify(token1Key), JSON.stringify(token2Key), JSON.stringify(token3Key)]
    const tokenKeysMap: Record<string, TokensInfoKey> = {
      [this.token1.symbol]: token1Key,
      [this.token2.symbol]: token2Key,
      [this.token3.symbol]: token3Key
    }
    // console.log('token1Key', token1Key, 'token2Key', token2Key, 'token3Key', token3Key)

    // console.log(
    //   'tokenInfos',
    //   tokensInfo.get(JSON.stringify(token1Key)),
    //   tokensInfo.get(JSON.stringify(token2Key)),
    //   tokensInfo.get(JSON.stringify(token3Key))
    // )

    const token1Info = tokensInfo.get(tokenKeyStrings[0])
    const token2Info = tokensInfo.get(tokenKeyStrings[1])
    const token3Info = tokensInfo.get(tokenKeyStrings[2])

    // const cashPool = new BigNumber(tokensInfo.get(this.token1Key).funds)
    // const tokenPool = new BigNumber(tokensInfo.get(this.token2Key).funds)
    // const thirdTokenPool = new BigNumber(tokensInfo.get(this.token3Key).funds)
    const cashMultiplier = new BigNumber(token1Info.multiplier)
    const tokenMultiplier = new BigNumber(token2Info.multiplier)
    const thirdTokenMultiplier = new BigNumber(token3Info.multiplier)

    const storage: MultiStorage = {
      lqtTotal: new BigNumber(dexStorage.lqt_total),
      lqtAddress: dexStorage.lqt_address,
      swapFeeRatio: {
        numerator: new BigNumber(dexStorage.swap_fee.numerator),
        denominator: new BigNumber(dexStorage.swap_fee.denominator)
      },
      bakingRewardsReceiver: dexStorage.baking_rewards_receiver,
      tokenKeys: tokenKeys,
      tokenKeyStrings: tokenKeyStrings,
      tokenKeysMap: tokenKeysMap,
      targetOracle: dexStorage.target_oracle,
      cashPool,
      tokenPool,
      thirdTokenPool,
      cashMultiplier,
      tokenMultiplier,
      thirdTokenMultiplier
    }

    // console.log('STORAGE', storage)
    // console.log(JSON.parse(JSON.stringify(storage)))
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

  private async totalExpectedOut(srcTokenIndex: number, dstTokenIndex: number, amountSold: BigNumber | number): Promise<BigNumber> {
    const storage: MultiStorage = await this.getContractStorage()
    const dexContract = await this.getContractWalletAbstraction(this.dexAddress)

    const parameters = {
      src_token: storage.tokenKeys[srcTokenIndex],
      dst_token: storage.tokenKeys[dstTokenIndex],
      amount_sold: new BigNumber(amountSold)
    }
    // console.log('EXCHANGE RATE PARAMETERS', parameters)

    //check if the dexAddress is already in the map if not initialize new BehaviorSubject
    if (!tooOldErrors.has(this.dexAddress)) {
      tooOldErrors.set(this.dexAddress, new BehaviorSubject<boolean>(false))
    }

    const exchangeRate: BigNumber = await dexContract.contractViews
      .total_expected_out_amount(parameters)
      .executeView({ viewCaller: this.dexAddress })
      .then((res) => {
        if (res !== undefined) {
          tooOldErrors.get(this.dexAddress)?.next(false)
        }
        return res
      })
      .catch((e: any) => {
        console.error(this.dexAddress, e)
        if (e.message.includes('OldPrice')) {
          tooOldErrors.get(this.dexAddress)?.next(true)
        }
      })

    // console.log('EXCHANGE RATE', exchangeRate.toNumber())
    return exchangeRate
  }

  @cache()
  public async getExchangeRate(): Promise<BigNumber> {
    return this.totalExpectedOut(0, 1, new BigNumber(1).shiftedBy(this.token1.decimals)).then((res) => {
      return res.shiftedBy(-this.token2.decimals)
    })
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
    const storage: MultiStorage = await this.getContractStorage()

    const amountSold = round(tokenAmount)
    const minAmountBought = round(minimumReceived)

    const swapObject = {
      src_token: storage.tokenKeysMap[srcToken.symbol],
      dst_token: storage.tokenKeysMap[dstToken.symbol],
      amount_sold: amountSold,
      min_amount_bought: minAmountBought,
      receiver: receiver,
      deadline: deadline
    }

    // console.log('TOKEN SWAP', swapObject)
    // console.log(JSON.parse(JSON.stringify(swapObject)))

    if (srcToken.type === TokenType.NATIVE) {
      return this.sendAndAwait(
        this.tezos.wallet
          .batch()
          .withTransfer(dexContract.methodsObject.token_swap(swapObject).toTransferParams({ amount: amountSold.toNumber(), mutez: true }))
      )
    } else if (srcToken.type === TokenType.FA2) {
      return this.sendAndAwait(
        this.tezos.wallet
          .batch()
          .withContractCall(await this.prepareAddTokenOperator(srcToken.contractAddress, this.dexAddress, srcToken.tokenId))
          .withContractCall(dexContract.methodsObject.token_swap(swapObject))
          .withContractCall(await this.prepareRemoveTokenOperator(srcToken.contractAddress, this.dexAddress, srcToken.tokenId))
      )
    } else {
      const tokenContract = await this.getContractWalletAbstraction(srcToken.contractAddress)
      return this.sendAndAwait(
        this.tezos.wallet
          .batch()
          .withContractCall(tokenContract.methods.approve(this.dexAddress, amountSold))
          .withContractCall(dexContract.methodsObject.token_swap(swapObject))
          .withContractCall(tokenContract.methods.approve(this.dexAddress, 0))
      )
    }
  }

  private getDeadline(): string {
    return new Date(new Date().getTime() + getMillisFromMinutes(15)).toISOString()
  }

  protected async getMinReceivedTokenForCash(amount: BigNumber) {
    // console.log('GET MIN RECEIVED TOKEN FOR CASH', amount.toNumber())
    const fee = await this.getExchangeFee()
    return this.totalExpectedOut(0, 1, amount).then((res) => {
      return res.times(fee)
    })
  }

  protected async getMinReceivedCashForToken(amount: BigNumber) {
    // console.log('GET MIN RECEvIED CASH FOR TOKEN', amount.toNumber())
    const fee = await this.getExchangeFee()
    return this.totalExpectedOut(1, 0, amount).then((res) => {
      return res.times(fee)
    })
  }

  @cache()
  public async getLiquidityPoolInfo(): Promise<LiquidityPoolInfo> {
    const storage: MultiStorage = await this.getContractStorage()

    const poolInfo: LiquidityPoolInfo = {
      cashPool: new BigNumber(storage.cashPool),
      tokenPool: new BigNumber(storage.tokenPool),
      thirdTokenPool: new BigNumber(storage.thirdTokenPool),
      lqtTotal: new BigNumber(storage.lqtTotal)
    }

    return poolInfo
  }

  @cache()
  public async getOwnLiquidityPoolTokens(): Promise<BigNumber> {
    const source = await this.getOwnAddress()

    const tokenContract = await this.tezos.wallet.at(this.liquidityToken.contractAddress)
    const tokenStorage = (await this.getStorageOfContract(tokenContract)) as any
    const entry = await tokenStorage['ledger'].get(source)
    const tokenAmount = entry !== undefined ? entry[0] : undefined
    return new BigNumber(tokenAmount ? tokenAmount : 0)
  }

  public async addLiquidity(
    minLiquidityMinted: BigNumber,
    maxTokenDeposit: BigNumber,
    cashDeposit: BigNumber,
    maxThirdTokenDeposit: BigNumber
  ) {
    const source = await this.getOwnAddress()
    const dexContract = await this.getContractWalletAbstraction(this.dexAddress)
    const deadline = await this.getDeadline()
    const storage: MultiStorage = await this.getContractStorage()

    const tokenParameters = storage.tokenKeys
    let srcToken, dstToken, thirdToken, srcTokenAmount, dstTokenAmount, thirdTokenAmount
    //THIS is a workaround because I could no fire out why if Tez is not the first token I get an addressValidation error. So tez will always be srcToken
    if (this.token3.symbol === 'tez') {
      srcToken = tokenParameters[2]
      dstToken = tokenParameters[1]
      thirdToken = tokenParameters[0]
      srcTokenAmount = maxThirdTokenDeposit
      dstTokenAmount = maxTokenDeposit
      thirdTokenAmount = cashDeposit
    } else {
      srcToken = tokenParameters[0]
      dstToken = tokenParameters[1]
      thirdToken = tokenParameters[2]
      srcTokenAmount = cashDeposit
      dstTokenAmount = maxTokenDeposit
      thirdTokenAmount = maxThirdTokenDeposit
    }

    let batchCall = this.tezos.wallet.batch()

    //add approvals
    if (this.token1.type === TokenType.FA2) {
      batchCall = batchCall.withContractCall(
        await this.prepareAddTokenOperator(this.token1.contractAddress, this.dexAddress, this.token1.tokenId)
      )
    } else if (this.token1.type === TokenType.FA1p2) {
      const tokenContract = await this.getContractWalletAbstraction(this.token1.contractAddress)
      batchCall = batchCall.withContractCall(tokenContract.methods.approve(this.dexAddress, round(srcTokenAmount)))
    }

    if (this.token2.type === TokenType.FA2) {
      batchCall = batchCall.withContractCall(
        await this.prepareAddTokenOperator(this.token2.contractAddress, this.dexAddress, this.token2.tokenId)
      )
    } else if (this.token2.type === TokenType.FA1p2) {
      const tokenContract = await this.getContractWalletAbstraction(this.token2.contractAddress)
      batchCall = batchCall.withContractCall(tokenContract.methods.approve(this.dexAddress, round(dstTokenAmount)))
    }

    if (this.token3.type === TokenType.FA2) {
      batchCall = batchCall.withContractCall(
        await this.prepareAddTokenOperator(this.token3.contractAddress, this.dexAddress, this.token3.tokenId)
      )
    } else if (this.token3.type === TokenType.FA1p2) {
      const tokenContract = await this.getContractWalletAbstraction(this.token3.contractAddress)
      batchCall = batchCall.withContractCall(tokenContract.methods.approve(this.dexAddress, round(thirdTokenAmount)))
    }

    //add liquidity
    const remainingTokensMaxDeposited = new MichelsonMap()
    remainingTokensMaxDeposited.set(dstToken, round(dstTokenAmount))
    remainingTokensMaxDeposited.set(thirdToken, round(thirdTokenAmount))

    const addLiquidtyObject = {
      owner: source,
      min_lqt_minted: round(minLiquidityMinted),
      src_token: srcToken,
      src_token_amount: round(srcTokenAmount),
      other_tokens_max_deposited: remainingTokensMaxDeposited,
      deadline: deadline
    }

    // console.log('ADD LIQUIDITY', addLiquidtyObject)
    // console.log(JSON.parse(JSON.stringify(addLiquidtyObject)))
    if (this.token1.symbol === 'tez' || this.token2.symbol === 'tez' || this.token3.symbol === 'tez') {
      batchCall = batchCall.withTransfer(
        dexContract.methodsObject
          .add_liquidity(addLiquidtyObject)
          .toTransferParams({ amount: round(srcTokenAmount).toNumber(), mutez: true })
      )
    } else {
      batchCall = batchCall.withContractCall(dexContract.methodsObject.add_liquidity(addLiquidtyObject))
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

    if (this.token3.type === TokenType.FA2) {
      batchCall = batchCall.withContractCall(
        await this.prepareRemoveTokenOperator(this.token3.contractAddress, this.dexAddress, this.token3.tokenId)
      )
    } else if (this.token3.type === TokenType.FA1p2) {
      const tokenContract = await this.getContractWalletAbstraction(this.token3.contractAddress)
      batchCall = batchCall.withContractCall(tokenContract.methods.approve(this.dexAddress, 0))
    }

    return this.sendAndAwait(batchCall)
  }

  public async removeLiquidity(
    liquidityToBurn: BigNumber,
    minCashWithdrawn: BigNumber,
    minTokensWithdrawn: BigNumber,
    minThirdTokenWithdrawn: BigNumber
  ) {
    const source = await this.getOwnAddress()
    const deadline = this.getDeadline()
    const dexContract = await this.getContractWalletAbstraction(this.dexAddress)
    const storage: MultiStorage = await this.getContractStorage()

    const tokenParameters = storage.tokenKeys
    const srcToken = tokenParameters[0]
    const dstToken = tokenParameters[1]
    const thirdToken = tokenParameters[2]
    const minTokensMap = new MichelsonMap()
    minTokensMap.set(srcToken, round(minCashWithdrawn))
    minTokensMap.set(dstToken, round(minTokensWithdrawn))
    minTokensMap.set(thirdToken, round(minThirdTokenWithdrawn))

    const removedLiquidityObject = {
      receiver: source,
      lqt_burned: round(liquidityToBurn),
      min_tokens_withdrawn: minTokensMap,
      deadline: deadline
    }

    // console.log('REMOVE LIQUIDITY', removedLiquidityObject)
    // console.log(minCashWithdrawn.toNumber(), minTokensWithdrawn.toNumber(), minThirdTokenWithdrawn.toNumber())

    return this.sendAndAwait(this.tezos.wallet.batch().withContractCall(dexContract.methodsObject.remove_liquidity(removedLiquidityObject)))
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

    // console.log(
    //   'GET LIQUIDITY ADD MULTI',
    //   cashPool.toNumber(),
    //   tokenPool.toNumber(),
    //   thirdTokenPool.toNumber(),
    //   lqtPool.toNumber(),
    //   share.toNumber()
    // )
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

  public async getPriceImpact(_amount: BigNumber, _reverse: boolean): Promise<BigNumber> {
    return new BigNumber(0)
  }

  //Single side is DISABLED for multiswap
  public async addSingleSideLiquidity(
    _swapAmount: BigNumber,
    _swapMinReceived: BigNumber,
    _minLiquidityMinted: BigNumber,
    _maxTokenDeposit: BigNumber,
    _cashDeposit: BigNumber,
    _isReverse: boolean = false
  ) {}

  @cache()
  public async getSingleSideLiquidity(_amount: BigNumber, _isReverse: boolean = false) {}

  public async getExchangeUrl(): Promise<string> {
    return `https://youves.com/swap?from=${this.token1.symbol}&to=${this.token2.symbol}`
  }

  public async clearCache() {
    promiseCache.clear()
  }
}
