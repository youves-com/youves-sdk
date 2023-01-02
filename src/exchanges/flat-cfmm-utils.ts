import BigNumber from 'bignumber.js'
import { cashBoughtN, tokensBoughtN } from './flat-cfmm-utils-original-number'

const ZERO = new BigNumber(0)
const ONE = new BigNumber(1)
const FIVE = new BigNumber(5)
const SEVEN = new BigNumber(7)
const EIGHT = new BigNumber(8)

// const price_num = ONE
// const price_denom = ONE

let util = function (x: BigNumber, y: BigNumber): [BigNumber, BigNumber] {
  return [
    x.plus(y).exponentiatedBy(EIGHT).minus(x.minus(y).exponentiatedBy(EIGHT)),
    EIGHT.times(x.minus(y).exponentiatedBy(SEVEN).plus(x.plus(y).exponentiatedBy(SEVEN)))
  ]
}

type NewtonParam = { x: BigNumber; y: BigNumber; dx: BigNumber; dy: BigNumber; u: BigNumber; n: BigNumber }

let newton = function (p: NewtonParam): BigNumber {
  if (p.n.eq(ZERO)) return p.dy
  else {
    let [new_u, new_du_dy] = util(p.x.plus(p.dx), p.y.minus(p.dy))
    //  new_u - p.u > 0 because dy remains an underestimate
    let dy = p.dy.plus(new_u.minus(p.u).div(new_du_dy)).decimalPlaces(0, BigNumber.ROUND_FLOOR)
    // dy is an underestimate because we start at 0 and the utility curve is convex
    p.dy = dy
    p.n = p.n.minus(ONE)
    return newton(p)
  }
}
export const tokensBought = function (
  cashPool: BigNumber,
  tokenPool: BigNumber,
  cashSold: BigNumber,
  price_num: BigNumber,
  price_denom: BigNumber
): BigNumber {
  let x = cashPool.times(price_num)
  let y = tokenPool.times(price_denom)
  // 4 round is enough for most cases and underestimates the true payoff, so the user
  //    can always break up a trade for better terms *)
  let [u] = util(x, y)
  var p: NewtonParam = { x: x, y: y, dx: cashSold.times(price_num), dy: ZERO, u: u, n: FIVE }

  return newton(p).div(price_denom).decimalPlaces(0, BigNumber.ROUND_FLOOR)
}

export const cashBought = function (
  cashPool: BigNumber,
  tokenPool: BigNumber,
  tokenSold: BigNumber,
  price_num: BigNumber,
  price_denom: BigNumber
): BigNumber {
  let x = tokenPool.times(price_denom)
  let y = cashPool.times(price_num)
  let [u] = util(x, y)
  let p: NewtonParam = { x: x, y: y, dx: tokenSold.times(price_denom), dy: ZERO, u: u, n: FIVE }
  return newton(p).div(price_num).decimalPlaces(0, BigNumber.ROUND_FLOOR)
}

export const marginalPrice = function (cashPool: BigNumber, tokenPool: BigNumber, price_num: BigNumber, price_denom: BigNumber) {
  let x = cashPool.times(price_num)
  let y = tokenPool.times(price_denom)
  let num = x.plus(y).exponentiatedBy(SEVEN).plus(x.minus(y).exponentiatedBy(SEVEN))
  let den = x.plus(y).exponentiatedBy(SEVEN).minus(x.minus(y).exponentiatedBy(SEVEN))
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
