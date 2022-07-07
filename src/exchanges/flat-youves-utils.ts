import BigNumber from 'bignumber.js'

export interface AddLiquidityInfo {
  cashAmount: BigNumber
  tokenAmount: BigNumber
  liqReceived: BigNumber
}

export interface SingleSideLiquidityInfo {
  cashAmount: BigNumber
  swapCashAmount: BigNumber
  swapMinReceived: BigNumber
  singleSideCashAmount: BigNumber
  singleSideTokenAmount: BigNumber
  liqReceived: BigNumber
}

export const getLiquidityAddCash = (cashIn: BigNumber, cashPool: BigNumber, tokenPool: BigNumber, lqtPool: BigNumber): AddLiquidityInfo => {
  const cashShare = cashIn.div(cashPool)

  return {
    cashAmount: cashIn.decimalPlaces(0, BigNumber.ROUND_HALF_UP),
    tokenAmount: tokenPool.times(cashShare).decimalPlaces(0, BigNumber.ROUND_HALF_UP),
    liqReceived: lqtPool.times(cashShare).decimalPlaces(0, BigNumber.ROUND_HALF_UP)
  }
}

export const getSingleSideLiquidityAddCash = (cashIn: BigNumber, minimumReceived: BigNumber, cashPool: BigNumber, tokenPool: BigNumber, lqtPool: BigNumber, exchangeRateTo: BigNumber, isReverse: boolean = false): SingleSideLiquidityInfo => {

  const ammRatio = isReverse ? tokenPool.div(cashPool): cashPool.div(tokenPool)
  const swapRatio = (new BigNumber(1).plus(ammRatio.div(exchangeRateTo)))
  const swapCashAmount = cashIn.div(swapRatio)
  const singleSideCashAmount = cashIn.minus(swapCashAmount)
  const cashShare = singleSideCashAmount.div(isReverse ? tokenPool : cashPool)
  return {
    cashAmount: cashIn.decimalPlaces(0, BigNumber.ROUND_HALF_UP),
    swapCashAmount: swapCashAmount.decimalPlaces(0, BigNumber.ROUND_HALF_UP),
    swapMinReceived: minimumReceived.decimalPlaces(0, BigNumber.ROUND_HALF_DOWN),
    singleSideCashAmount: singleSideCashAmount.decimalPlaces(0, BigNumber.ROUND_HALF_UP),
    singleSideTokenAmount:minimumReceived.decimalPlaces(0, BigNumber.ROUND_HALF_DOWN),
    liqReceived: lqtPool.times(cashShare).decimalPlaces(0, BigNumber.ROUND_HALF_UP)
  }
}

export const getLiquidityAddToken = (
  tokenIn: BigNumber,
  cashPool: BigNumber,
  tokenPool: BigNumber,
  lqtPool: BigNumber
): AddLiquidityInfo => {
  const tokenShare = tokenIn.div(tokenPool)

  return {
    cashAmount: cashPool.times(tokenShare).decimalPlaces(0, BigNumber.ROUND_HALF_UP),
    tokenAmount: tokenIn.decimalPlaces(0, BigNumber.ROUND_HALF_UP),
    liqReceived: lqtPool.times(tokenShare).decimalPlaces(0, BigNumber.ROUND_HALF_UP)
  }
}
