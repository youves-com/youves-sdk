const price_num = 1n
const price_denom = 1n

let util = function (x: bigint, y: bigint): bigint[] {
  return [(x + y) ** 8n - (x - y) ** 8n, 8n * ((x - y) ** 7n + (x + y) ** 7n)]
}

type NewtonParam = { x: bigint; y: bigint; dx: bigint; dy: bigint; u: bigint; n: bigint }

let newton = function (p: NewtonParam): bigint {
  if (p.n == 0n) return p.dy
  else {
    let [new_u, new_du_dy] = util(p.x + p.dx, p.y - p.dy)
    //  new_u - p.u > 0 because dy remains an underestimate
    let dy = p.dy + (new_u - p.u) / new_du_dy
    // dy is an underestimate because we start at 0 and the utility curve is convex
    p.dy = dy
    p.n -= 1n
    return newton(p)
  }
}

export const tokensBought = function (cashPool: bigint, tokenPool: bigint, cashShold: bigint): bigint {
  let x = cashPool * price_num
  let y = tokenPool * price_denom
  // 4 round is enough for most cases and underestimates the true payoff, so the user
  //    can always break up a trade for better terms *)
  let [u, _] = util(x, y)
  var p: NewtonParam = { x: x, y: y, dx: cashShold * price_num, dy: 0n, u: u, n: 5n }
  return newton(p) / price_denom
}

export const cashBought = function (cashPool: bigint, tokenPool: bigint, tokenSold: bigint): bigint {
  let x = tokenPool * price_denom
  let y = cashPool * price_num
  let [u, _] = util(x, y)
  let p: NewtonParam = { x: x, y: y, dx: tokenSold * price_denom, dy: 0n, u: u, n: 5n }
  return newton(p) / price_num
}

export const marginalPrice = function (cashPool: bigint, tokenPool: bigint) {
  let x = cashPool * price_num
  let y = tokenPool * price_denom
  let num = (x + y) ** 7n + (x - y) ** 7n
  let den = (x + y) ** 7n - (x - y) ** 7n
  return [num, den]
}
