let util = function (x: number, y: number): number[] {
  return [(x + y) ** 8 - (x - y) ** 8, 8 * ((x - y) ** 7 + (x + y) ** 7)]
}

type NewtonParam = { x: number; y: number; dx: number; dy: number; u: number; n: number }

let newton = function (p: NewtonParam): number {
  if (p.n == 0) return p.dy
  else {
    let [new_u, new_du_dy] = util(p.x + p.dx, p.y - p.dy)
    //  new_u - p.u > 0 because dy remains an underestimate
    let dy = p.dy + (new_u - p.u) / new_du_dy
    // dy is an underestimate because we start at 0 and the utility curve is convex
    p.dy = dy
    p.n -= 1
    return newton(p)
  }
}

export const tokensBoughtN = function (
  cashPool: number,
  tokenPool: number,
  cashShold: number,
  price_num: number,
  price_denom: number
): number {
  let x = cashPool * price_num
  let y = tokenPool * price_denom
  // 4 round is enough for most cases and underestimates the true payoff, so the user
  //    can always break up a trade for better terms *)
  let u = util(x, y)[0]
  var p: NewtonParam = { x: x, y: y, dx: cashShold * price_num, dy: 0, u: u, n: 5 }
  return newton(p) / price_denom
}

export const cashBoughtN = function (
  cashPool: number,
  tokenPool: number,
  tokenSold: number,
  price_num: number,
  price_denom: number
): number {
  let x = tokenPool * price_denom
  let y = cashPool * price_num
  let u = util(x, y)[0]
  let p: NewtonParam = { x: x, y: y, dx: tokenSold * price_denom, dy: 0, u: u, n: 5 }
  return newton(p) / price_num
}

export const marginalPrice = function (cashPool: number, tokenPool: number, price_num: number, price_denom: number) {
  let x = cashPool * price_num
  let y = tokenPool * price_denom
  let num = (x + y) ** 7 + (x - y) ** 7
  let den = (x + y) ** 7 - (x - y) ** 7
  return [num, den]
}
