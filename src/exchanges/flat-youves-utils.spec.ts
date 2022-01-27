import BigNumber from 'bignumber.js'
import { getLiquidityAddCash, getLiquidityAddToken } from './flat-youves-utils'

describe('liquidity utils', () => {
  const cashPool = new BigNumber(9000)
  const tokenPool = new BigNumber(9000)
  const lqtPool = new BigNumber(9000)

  test('add cash to pool', () => {
    const cashIn = new BigNumber(1000)
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

  test('add cash to pool', () => {
    const cashIn = new BigNumber(300)

    const { cashAmount, tokenAmount, liqReceived } = getLiquidityAddCash(cashIn, cashPool, tokenPool, lqtPool)
    console.log(cashAmount.toString(), tokenAmount.toString(), liqReceived.toString())

    expect(cashAmount.toString(10)).toBe(cashIn.toString(10))
    expect(tokenAmount.toString(10)).toBe(new BigNumber(100).toString(10))
    expect(liqReceived.toString(10)).toBe(new BigNumber(200).toString(10))
  })

  test('add token to pool', () => {
    const tokenIn = new BigNumber(100)

    const { cashAmount, tokenAmount, liqReceived } = getLiquidityAddToken(tokenIn, cashPool, tokenPool, lqtPool)
    console.log(cashAmount.toString(), tokenAmount.toString(), liqReceived.toString())

    expect(cashAmount.toString(10)).toBe(new BigNumber(300).toString(10))
    expect(tokenAmount.toString(10)).toBe(tokenIn.toString(10))
    expect(liqReceived.toString(10)).toBe(new BigNumber(200).toString(10))
  })
})
