import BigNumber from 'bignumber.js'
import { getLiquidityAddCash, getLiquidityAddToken, getSingleSideLiquidityAddCash } from './flat-youves-utils'

describe('liquidity utils', () => {
  const cashPool = new BigNumber(9000)
  const tokenPool = new BigNumber(9000)
  const lqtPool = new BigNumber(9000)
  const cashIn = new BigNumber(1000)

  test('add cash to pool', () => {
    const { cashAmount, tokenAmount, liqReceived } = getLiquidityAddCash(cashIn, cashPool, tokenPool, lqtPool)
    console.log(cashAmount.toString(), tokenAmount.toString(), liqReceived.toString())

    expect(cashAmount.toString(10)).toBe(cashIn.toString(10))
    expect(tokenAmount.toString(10)).toBe(new BigNumber(1000).toString(10))
    expect(liqReceived.toString(10)).toBe(new BigNumber(1000).toString(10))
  })

  test('add token to pool', () => {
    const tokenIn = new BigNumber(1000)

    const { cashAmount, tokenAmount, liqReceived } = getLiquidityAddCash(tokenIn, cashPool, tokenPool, lqtPool)
    console.log(cashAmount.toString(), tokenAmount.toString(), liqReceived.toString())

    expect(cashAmount.toString(10)).toBe(new BigNumber(1000).toString(10))
    expect(tokenAmount.toString(10)).toBe(tokenIn.toString(10))
    expect(liqReceived.toString(10)).toBe(new BigNumber(1000).toString(10))
  })
})

describe('liquidity utils', () => {
  const cashPool = new BigNumber(1500)
  const tokenPool = new BigNumber(500)
  const lqtPool = new BigNumber(1000)
  const cashIn = new BigNumber(300)

  test('add cash to pool', () => {

    const { cashAmount, tokenAmount, liqReceived } = getLiquidityAddCash(cashIn, cashPool, tokenPool, lqtPool)
    console.log(cashAmount.toString(), tokenAmount.toString(), liqReceived.toString())

    expect(cashAmount.toString(10)).toBe(cashIn.toString(10))
    expect(tokenAmount.toString(10)).toBe(new BigNumber(100).toString(10))
    expect(liqReceived.toString(10)).toBe(new BigNumber(200).toString(10))
  })

  test('single side liquidity add cash to pool: exchangeRateTo > 1', () => {
    const cashPool = new BigNumber(1500)
    const tokenPool = new BigNumber(500)
    const lqtPool = new BigNumber(1000)
    const cashIn = new BigNumber(300)

    const minimumReceived = new BigNumber(100)
    const exchangeRateTo = new BigNumber(1.5)
    const { cashAmount,
      swapCashAmount,
      swapMinReceived,
      singleSideCashAmount,
      singleSideTokenAmount,
      liqReceived } = getSingleSideLiquidityAddCash(cashIn, minimumReceived, cashPool, tokenPool, lqtPool, exchangeRateTo)

    expect(cashAmount.toString(10)).toBe(cashIn.toString(10))
    expect(swapCashAmount.toString(10)).toBe(new BigNumber(100).toString(10))
    expect(swapMinReceived.toString(10)).toBe(minimumReceived.toString(10))
    expect(singleSideCashAmount.toString(10)).toBe(cashAmount.minus(swapCashAmount).toString(10))
    expect(singleSideTokenAmount.toString(10)).toBe(minimumReceived.toString(10))
    expect(liqReceived.toString(10)).toBe(new BigNumber(133).toString(10))
  })

  test('add token to pool', () => {
    const tokenIn = new BigNumber(100)

    const { cashAmount, tokenAmount, liqReceived } = getLiquidityAddToken(tokenIn, cashPool, tokenPool, lqtPool)
    console.log(cashAmount.toString(), tokenAmount.toString(), liqReceived.toString())

    expect(cashAmount.toString(10)).toBe(new BigNumber(300).toString(10))
    expect(tokenAmount.toString(10)).toBe(tokenIn.toString(10))
    expect(liqReceived.toString(10)).toBe(new BigNumber(200).toString(10))
  })


  test('single side liquidity add cash to pool', () => {
    const iterations = 5
    const minimumReceived = new BigNumber(100)

    const cashIns = [300, 300, 300, 300, 2000]
    const cashPools = [1500, 500, 1500, 500, 9000]
    const tokenPools = [500, 1500, 500, 1500, 9000]
    const toExchangeRates = [0.5, 0.5, 1.5, 1.5, 1]
    const expectedCashAmounts = [300, 300, 300, 300, 2000]
    const expectedSwapCashAmount = [43, 180, 100, 245, 1000]
    const expectedSwapMinReceived = [100, 100, 100, 100, 100]
    const expectedLiqReceived = [171, 240, 133, 109, 111]

    for (let i = 0; i < iterations; i++) {
      const { cashAmount,
        swapCashAmount,
        swapMinReceived,
        singleSideCashAmount,
        singleSideTokenAmount,
        liqReceived } = getSingleSideLiquidityAddCash(new BigNumber(cashIns[i]), minimumReceived, new BigNumber(cashPools[i]), new BigNumber(tokenPools[i]), lqtPool, new BigNumber(toExchangeRates[i]))


      expect(cashAmount.toString(10)).toBe(new BigNumber(expectedCashAmounts[i]).toString(10))
      expect(swapCashAmount.toString(10)).toBe(new BigNumber(expectedSwapCashAmount[i]).toString(10))
      expect(swapMinReceived.toString(10)).toBe(new BigNumber(expectedSwapMinReceived[i]).toString(10))
      expect(singleSideCashAmount.toString(10)).toBe(new BigNumber(expectedCashAmounts[i]).minus(expectedSwapCashAmount[i]).toString(10))
      expect(singleSideTokenAmount.toString(10)).toBe(minimumReceived.toString(10))
      expect(liqReceived.toString(10)).toBe(new BigNumber(expectedLiqReceived[i]).toString(10))
    }
  })

})



