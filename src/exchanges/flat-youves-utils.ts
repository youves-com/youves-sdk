import BigNumber from 'bignumber.js'

export interface AddLiquidityInfo {
  cashAmount: BigNumber
  tokenAmount: BigNumber
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
