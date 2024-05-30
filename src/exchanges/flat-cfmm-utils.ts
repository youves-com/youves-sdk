import BigNumber from 'bignumber.js'
import { cashBoughtN, tokensBoughtN } from './flat-cfmm-utils-original-number'

const ZERO = new BigNumber(0)
const ONE = new BigNumber(1)
const THREE = new BigNumber(3)
const FOUR = new BigNumber(4)
const FIVE = new BigNumber(5)
const SIX = new BigNumber(6)
const SEVEN = new BigNumber(7)
const EIGHT = new BigNumber(8)

export enum CurveExponent {
  EIGHT = 8,
  SIX = 6,
  FOUR = 4
}

const exponentMap: Record<CurveExponent, [BigNumber, BigNumber]> = {
  [CurveExponent.EIGHT]: [SEVEN, EIGHT],
  [CurveExponent.SIX]: [FIVE, SIX],
  [CurveExponent.FOUR]: [THREE, FOUR]
}

// const price_num = ONE
// const price_denom = ONE

let util = function (x: BigNumber, y: BigNumber, curveExponent: CurveExponent): [BigNumber, BigNumber] {
  return [
    x.plus(y).exponentiatedBy(exponentMap[curveExponent][1]).minus(x.minus(y).exponentiatedBy(exponentMap[curveExponent][1])),
    exponentMap[curveExponent][1].times(
      x.minus(y).exponentiatedBy(exponentMap[curveExponent][0]).plus(x.plus(y).exponentiatedBy(exponentMap[curveExponent][0]))
    )
  ]
}

type NewtonParam = { x: BigNumber; y: BigNumber; dx: BigNumber; dy: BigNumber; u: BigNumber; n: BigNumber }

let newton = function (p: NewtonParam, curveExponent: CurveExponent): BigNumber {
  if (p.n.eq(ZERO)) return p.dy
  else {
    let [new_u, new_du_dy] = util(p.x.plus(p.dx), p.y.minus(p.dy), curveExponent)
    //  new_u - p.u > 0 because dy remains an underestimate
    let dy = p.dy.plus(new_u.minus(p.u).div(new_du_dy)).decimalPlaces(0, BigNumber.ROUND_FLOOR)
    // dy is an underestimate because we start at 0 and the utility curve is convex
    p.dy = dy
    p.n = p.n.minus(ONE)
    return newton(p, curveExponent)
  }
}
export const tokensBought = function (
  cashPool: BigNumber,
  tokenPool: BigNumber,
  cashSold: BigNumber,
  price_num: BigNumber,
  price_denom: BigNumber,
  curveExponent: CurveExponent = CurveExponent.EIGHT
): BigNumber {
  let x = cashPool.times(price_num)
  let y = tokenPool.times(price_denom)
  // 4 round is enough for most cases and underestimates the true payoff, so the user
  //    can always break up a trade for better terms *)
  let [u] = util(x, y, curveExponent)
  var p: NewtonParam = { x: x, y: y, dx: cashSold.times(price_num), dy: ZERO, u: u, n: FIVE }

  return newton(p, curveExponent).div(price_denom).decimalPlaces(0, BigNumber.ROUND_FLOOR)
}

export const cashBought = function (
  cashPool: BigNumber,
  tokenPool: BigNumber,
  tokenSold: BigNumber,
  price_num: BigNumber,
  price_denom: BigNumber,
  curveExponent: CurveExponent = CurveExponent.EIGHT
): BigNumber {
  let x = tokenPool.times(price_denom)
  let y = cashPool.times(price_num)
  let [u] = util(x, y, curveExponent)
  let p: NewtonParam = { x: x, y: y, dx: tokenSold.times(price_denom), dy: ZERO, u: u, n: FIVE }
  return newton(p, curveExponent).div(price_num).decimalPlaces(0, BigNumber.ROUND_FLOOR)
}

export const marginalPrice = function (
  cashPool: BigNumber,
  tokenPool: BigNumber,
  price_num: BigNumber,
  price_denom: BigNumber,
  curveExponent: CurveExponent = CurveExponent.EIGHT
) {
  let x = cashPool.times(price_num)
  let y = tokenPool.times(price_denom)
  let num = x.plus(y).exponentiatedBy(exponentMap[curveExponent][0]).plus(x.minus(y).exponentiatedBy(exponentMap[curveExponent][0]))
  let den = x.plus(y).exponentiatedBy(exponentMap[curveExponent][0]).minus(x.minus(y).exponentiatedBy(exponentMap[curveExponent][0]))
  return [num, den]
}

//these are used for the single slide liquidity trade calculation.
//The already existing ones have rounding.
//When using BigNumbers it would be extremely slow so I am using numbers
export const get_asset_bought = function (
  cashPool: BigNumber,
  tokenPool: BigNumber,
  cashSold: BigNumber,
  price_num: BigNumber,
  price_denom: BigNumber
): BigNumber {
  const result = tokensBoughtN(cashPool.toNumber(), tokenPool.toNumber(), cashSold.toNumber(), price_num.toNumber(), price_denom.toNumber())
  return new BigNumber(result)
}

export const get_numeraire_bought = function (
  cashPool: BigNumber,
  tokenPool: BigNumber,
  tokenSold: BigNumber,
  price_num: BigNumber,
  price_denom: BigNumber
): BigNumber {
  const result = cashBoughtN(cashPool.toNumber(), tokenPool.toNumber(), tokenSold.toNumber(), price_num.toNumber(), price_denom.toNumber())
  return new BigNumber(result)
}
