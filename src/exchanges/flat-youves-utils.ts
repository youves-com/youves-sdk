import BigNumber from 'bignumber.js'
import { get_numeraire_bought, get_asset_bought } from './flat-cfmm-utils'

export interface AddLiquidityInfo {
  cashAmount: BigNumber
  tokenAmount: BigNumber
  liqReceived: BigNumber
}

export interface SingleSideLiquidityInfo {
  amount: BigNumber
  swapAmount: BigNumber
  swapMinReceived: BigNumber
  singleSideToken1Amount: BigNumber
  singleSideToken2Amount: BigNumber
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

export const getSingleSideLiquidityAddCash = (
  cashIn: BigNumber,
  minimumReceived: BigNumber,
  cashPool: BigNumber,
  tokenPool: BigNumber,
  lqtPool: BigNumber,
  exchangeRateTo: BigNumber,
  isReverse: boolean = false
): SingleSideLiquidityInfo => {
  const ammRatio = isReverse ? tokenPool.div(cashPool) : cashPool.div(tokenPool)
  const swapRatio = new BigNumber(1).plus(ammRatio.div(exchangeRateTo))
  const swapAmount = cashIn.div(swapRatio)
  const singleSideCashAmount = cashIn.minus(swapAmount)
  const cashShare = singleSideCashAmount.div(isReverse ? tokenPool : cashPool)
  return {
    amount: cashIn.decimalPlaces(0, BigNumber.ROUND_HALF_UP),
    swapAmount: swapAmount.decimalPlaces(0, BigNumber.ROUND_HALF_UP),
    swapMinReceived: minimumReceived.decimalPlaces(0, BigNumber.ROUND_HALF_DOWN),
    singleSideToken1Amount: singleSideCashAmount.decimalPlaces(0, BigNumber.ROUND_HALF_UP),
    singleSideToken2Amount: minimumReceived.decimalPlaces(0, BigNumber.ROUND_HALF_DOWN),
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

export const getSingleSideTradeAmount = (
  cashWallet: BigNumber,
  tokenWallet: BigNumber,
  cashPool: BigNumber,
  tokenPool: BigNumber,
  cashMultiplier: BigNumber,
  tokenMultiplier: BigNumber
) => {
  const SINGLE_SIDE_LIQ_TLRNC_AMT = new BigNumber(0.0015)
  const STEP_SIZE_REL = new BigNumber(0.00001)
  const MAXIMUM_STEPS = new BigNumber(100)
  const MAX_SELL_FRACTION = new BigNumber(0.5)

  const DEX_FEE_REL = new BigNumber(0.0015)

  return get_single_side_trade_amt(cashWallet, tokenWallet, cashPool, tokenPool)

  function get_single_side_trade_amt(
    wallet_numeraire: BigNumber,
    wallet_asset: BigNumber,
    pool_numeraire: BigNumber,
    pool_asset: BigNumber,
    sell_token: string = 'undefined',
    sell_amt: BigNumber = new BigNumber(0),
    step: BigNumber = new BigNumber(0),
    tolerance: BigNumber = SINGLE_SIDE_LIQ_TLRNC_AMT,
    max_steps: BigNumber = MAXIMUM_STEPS,
    is_print: boolean = false
  ): { sell_token: string; sell_amt: BigNumber; sell_amt_gross: BigNumber } | undefined {
    const pool_ratio: BigNumber = pool_numeraire.div(pool_asset)

    if (is_print) {
      console.log('--------------------')
      console.log('step                         = ' + step.toNumber())
      console.log('wallet_numeraire             = ' + wallet_numeraire.toNumber())
      console.log('wallet_asset                 = ' + wallet_asset.toNumber())
      if (wallet_asset.gt(0)) {
        console.log('wallet_ratio                 = ' + wallet_numeraire.div(wallet_asset).times(100).toNumber() + '%')
      } else {
        console.log('wallet_ratio                 = #div/0')
      }
      console.log('pool_numeraire               = ' + pool_numeraire.toNumber())
      console.log('pool_asset                   = ' + pool_asset.toNumber())
      console.log('pool_ratio                   = ' + pool_ratio.times(100).toNumber() + '%')
    }

    if (step.gt(max_steps)) {
      console.log('_max step limit reached_')
      return undefined
    } else if (!wallet_asset.isEqualTo(0) && wallet_numeraire.div(wallet_asset).minus(pool_ratio).abs().lt(tolerance)) {
      //trivial case, already roughly right ratio

      if (is_print) {
        console.log('-------------')
        console.log('case 0')
        console.log('is in tolerance')
        console.log('wallet ratio                 = ' + wallet_numeraire.div(wallet_asset).times(100).toNumber() + '%')
        console.log('pool ratio                   = ' + pool_ratio.times(100).toNumber() + '%')
        console.log('difference                   = ' + wallet_numeraire.div(wallet_asset).minus(pool_ratio).times(100).toNumber() + '%')
        console.log('-------------')
      }
      return { sell_token: sell_token, sell_amt: sell_amt, sell_amt_gross: sell_amt.div(new BigNumber(1).minus(DEX_FEE_REL)) }
    } else if (wallet_asset.isEqualTo(0) || wallet_numeraire.div(wallet_asset).gt(pool_ratio)) {
      // user must sell numeraire vs buy asset against liq pool, sell_token = "numeraire"

      if (step.isEqualTo(0)) {
        //set sell_token to numeraire
        sell_token = 'numeraire'
      }

      if (is_print) {
        console.log('-------------')
        console.log('case 1')
      }
      // do 1-step newton-raphson method

      let num_interm_sell_amt: BigNumber = new BigNumber(0),
        num_small_sell_amt: BigNumber = new BigNumber(0),
        asset_small_buy_amt: BigNumber = new BigNumber(0),
        wallet_ratio_step: BigNumber = new BigNumber(0),
        pool_ratio_step: BigNumber = new BigNumber(0),
        wallet_ratio: BigNumber = new BigNumber(0),
        wallet_pool_ratio_diff: BigNumber = new BigNumber(0),
        wallet_pool_ratio_diff_step: BigNumber = new BigNumber(0)

      if (!wallet_asset.isEqualTo(0)) {
        wallet_ratio = wallet_numeraire.div(wallet_asset)
        wallet_pool_ratio_diff = wallet_ratio.minus(pool_ratio)

        let applied_step_size: BigNumber = STEP_SIZE_REL
        let is_too_large: boolean = true
        //prevent overshooting in small step
        while (is_too_large) {
          num_small_sell_amt = wallet_numeraire.times(applied_step_size)
          asset_small_buy_amt = get_asset_bought(pool_numeraire, pool_asset, num_small_sell_amt, cashMultiplier, tokenMultiplier)
          wallet_ratio_step = wallet_numeraire.minus(num_small_sell_amt).div(wallet_asset.plus(asset_small_buy_amt))
          pool_ratio_step = pool_numeraire.plus(num_small_sell_amt).div(pool_asset.minus(asset_small_buy_amt))

          wallet_pool_ratio_diff_step = wallet_ratio_step.minus(pool_ratio_step)
          if (wallet_pool_ratio_diff_step.gt(0)) {
            is_too_large = false
            break
          } else {
            applied_step_size = applied_step_size.div(2)
          }
        }

        // calculate the sell amount using the linearised function, cap the value at applied_max_sell_frac
        const step_impact: BigNumber = wallet_pool_ratio_diff.minus(wallet_pool_ratio_diff_step).abs()
        const step_multiple: BigNumber = wallet_pool_ratio_diff.div(step_impact)

        if (is_print) {
          console.log('wallet_ratio                 = ' + wallet_ratio.times(100).toNumber() + '%')
          console.log('pool_ratio                   = ' + pool_ratio.times(100).toNumber() + '%')
          console.log('wallet_pool_ratio_diff       = ' + wallet_pool_ratio_diff.times(100).toNumber() + '%')
          console.log('num_small_sell_amt           = ' + num_small_sell_amt.toNumber())
          console.log('asset_small_buy_amt          = ' + asset_small_buy_amt.toNumber())
          console.log('wallet_ratio_step            = ' + wallet_ratio_step.times(100).toNumber() + '%')
          console.log('pool_ratio_step              = ' + pool_ratio_step.times(100).toNumber() + '%')
          console.log('wallet_pool_ratio_diff_step  = ' + wallet_pool_ratio_diff_step.times(100).toNumber() + '%')
          console.log('step_impact                  = ' + step_impact.times(100).toNumber() + '%')
          console.log('step_multiple                = ' + step_multiple.toNumber())
        }

        num_interm_sell_amt = BigNumber.minimum(
          wallet_numeraire.times(MAX_SELL_FRACTION),
          wallet_numeraire.times(applied_step_size).times(step_multiple)
        )
      } else {
        num_interm_sell_amt = wallet_numeraire.times(MAX_SELL_FRACTION)
      }

      const asset_interm_buy_amt = get_asset_bought(pool_numeraire, pool_asset, num_interm_sell_amt, cashMultiplier, tokenMultiplier)

      //prepare values for recursive call
      const wallet_numeraire_new: BigNumber = wallet_numeraire.minus(num_interm_sell_amt)
      const wallet_asset_new: BigNumber = wallet_asset.plus(asset_interm_buy_amt)
      const pool_numeraire_new: BigNumber = pool_numeraire.plus(num_interm_sell_amt)
      const pool_asset_new: BigNumber = pool_asset.minus(asset_interm_buy_amt)

      const wallet_ratio_new: BigNumber = wallet_numeraire_new.div(wallet_asset_new)
      const pool_ratio_new: BigNumber = pool_numeraire_new.div(pool_asset_new)

      if (is_print) {
        console.log('num_interm_sell_amt          = ' + num_interm_sell_amt.toNumber())
        console.log('asset_interm_buy_amt         = ' + asset_interm_buy_amt.toNumber())
        console.log('--------------')
        console.log('wallet_numeraire_new         = ' + wallet_numeraire_new.toNumber())
        console.log('wallet_asset_new             = ' + wallet_asset_new.toNumber())
        console.log('pool_numeraire_new           = ' + pool_numeraire_new.toNumber())
        console.log('pool_asset_new               = ' + pool_asset_new.toNumber())
        console.log('wallet_ratio_new             = ' + wallet_ratio_new.times(100).toNumber() + '%')
        console.log('pool_ratio_new               = ' + pool_ratio_new.times(100).toNumber() + '%')
      }

      if (sell_token == 'numeraire') {
        sell_amt = sell_amt.plus(num_interm_sell_amt)
      } else {
        //if the process initially started with selling asset
        sell_amt = sell_amt.minus(asset_interm_buy_amt)
      }

      if (is_print) {
        console.log('sell_token                   = ' + sell_token)
        console.log('sell_amt                     = ' + sell_amt.toNumber())
        console.log('--------------')
      }

      step = step.plus(1)

      return get_single_side_trade_amt(
        (wallet_numeraire = wallet_numeraire_new),
        (wallet_asset = wallet_asset_new),
        (pool_numeraire = pool_numeraire_new),
        (pool_asset = pool_asset_new),
        (sell_token = sell_token),
        (sell_amt = sell_amt),
        (step = step),
        (tolerance = tolerance),
        (max_steps = max_steps),
        (is_print = is_print)
      )
    } else {
      //user must sell asset vs buy numeraire against liq pool, sell_token = "asset"

      if (step.isEqualTo(0)) {
        //set sell_token to asset
        sell_token = 'asset'
      }

      if (is_print) {
        console.log('----------------')
        console.log('case 2')
      }

      // do 1-step newton-raphson method if wallet_ratio is defined and > 0
      let asset_interm_sell_amt: BigNumber = new BigNumber(0),
        asset_small_sell_amt: BigNumber = new BigNumber(0),
        num_small_buy_amt: BigNumber = new BigNumber(0),
        wallet_ratio_step: BigNumber = new BigNumber(0),
        pool_ratio_step: BigNumber = new BigNumber(0),
        wallet_ratio: BigNumber = new BigNumber(0),
        wallet_pool_ratio_diff: BigNumber = new BigNumber(0),
        wallet_pool_ratio_diff_step: BigNumber = new BigNumber(0)
      if (!wallet_numeraire.isEqualTo(0)) {
        wallet_ratio = wallet_numeraire.div(wallet_asset)
        wallet_pool_ratio_diff = wallet_ratio.minus(pool_ratio).negated()

        let applied_step_size: BigNumber = STEP_SIZE_REL
        let is_too_large: boolean = true
        wallet_pool_ratio_diff_step = new BigNumber(0)
        // prevent overshooting in small step
        while (is_too_large) {
          asset_small_sell_amt = wallet_asset.times(applied_step_size)
          num_small_buy_amt = get_numeraire_bought(pool_numeraire, pool_asset, asset_small_sell_amt, cashMultiplier, tokenMultiplier)

          wallet_ratio_step = wallet_numeraire.plus(num_small_buy_amt).div(wallet_asset.minus(asset_small_sell_amt))
          pool_ratio_step = pool_numeraire.minus(num_small_buy_amt).div(pool_asset.plus(asset_small_sell_amt))

          wallet_pool_ratio_diff_step = wallet_ratio_step.minus(pool_ratio_step).negated() // check sign
          if (wallet_pool_ratio_diff_step.gt(0)) {
            is_too_large = false
          } else {
            applied_step_size = applied_step_size.div(2)
          }
        }

        // calculate the sell amount using the linearised function, cap the value at applied_max_sell_frac
        const step_impact: BigNumber = wallet_pool_ratio_diff.minus(wallet_pool_ratio_diff_step).abs() //check sign
        const step_multiple: BigNumber = wallet_pool_ratio_diff.div(step_impact)

        if (is_print) {
          console.log('wallet_ratio                 = %' + wallet_ratio.times(100).toNumber() + '%')
          console.log('pool_ratio                   = %' + pool_ratio.times(100).toNumber() + '%')
          console.log('wallet_pool_ratio_diff       = %' + wallet_pool_ratio_diff.times(100).toNumber() + '%')
          console.log('asset_small_sell_amt         = ' + asset_small_sell_amt.toNumber())
          console.log('num_small_buy_amt            = ' + num_small_buy_amt.toNumber())
          console.log('wallet_ratio_step            = %' + wallet_ratio_step.times(100).toNumber() + '%')
          console.log('pool_ratio_step              = %' + pool_ratio_step.times(100).toNumber() + '%')
          console.log('wallet_pool_ratio_diff_step  = %' + wallet_pool_ratio_diff_step.times(100).toNumber() + '%')
          console.log('step_impact                  = %' + step_impact.times(100).toNumber() + '%')
          console.log('step_multiple                = ' + step_multiple.toNumber())
        }

        asset_interm_sell_amt = BigNumber.minimum(
          wallet_asset.times(MAX_SELL_FRACTION),
          wallet_asset.times(applied_step_size).times(step_multiple)
        )
      } else {
        asset_interm_sell_amt = wallet_asset.times(MAX_SELL_FRACTION)
      }
      const num_interm_buy_amt = get_numeraire_bought(pool_numeraire, pool_asset, asset_interm_sell_amt, cashMultiplier, tokenMultiplier)

      //prepare values for recursive call
      const wallet_numeraire_new: BigNumber = wallet_numeraire.plus(num_interm_buy_amt)
      const wallet_asset_new: BigNumber = wallet_asset.minus(asset_interm_sell_amt)
      const pool_numeraire_new: BigNumber = pool_numeraire.minus(num_interm_buy_amt)
      const pool_asset_new: BigNumber = pool_asset.plus(asset_interm_sell_amt)

      const wallet_ratio_new: BigNumber = wallet_numeraire_new.div(wallet_asset_new)
      const pool_ratio_new: BigNumber = pool_numeraire_new.div(pool_asset_new)

      if (is_print) {
        console.log('asset_interm_sell_amt        = ' + asset_interm_sell_amt.toNumber())
        console.log('num_interm_buy_amt           = ' + num_interm_buy_amt.toNumber())
        console.log('--------------')
        console.log('wallet_numeraire_new         = ' + wallet_numeraire_new.toNumber())
        console.log('wallet_asset_new             = ' + wallet_asset_new.toNumber())
        console.log('pool_numeraire_new           = ' + pool_numeraire_new.toNumber())
        console.log('pool_asset_new               = ' + pool_asset_new.toNumber())
        console.log('wallet_ratio_new             = %' + wallet_ratio_new.times(100).toNumber() + '%')
        console.log('pool_ratio_new               = %' + pool_ratio_new.times(100).toNumber() + '%')
      }

      if (sell_token == 'numeraire') {
        //if the process initially started with selling numeraire
        sell_amt = sell_amt.minus(num_interm_buy_amt)
      } else {
        sell_amt = sell_amt.plus(asset_interm_sell_amt)
      }

      if (is_print) {
        console.log('sell_token                   = ' + sell_token)
        console.log('sell_amt                     = ' + sell_amt.toNumber())
        console.log('--------------')
      }

      step = step.plus(1)

      return get_single_side_trade_amt(
        (wallet_numeraire = wallet_numeraire_new),
        (wallet_asset = wallet_asset_new),
        (pool_numeraire = pool_numeraire_new),
        (pool_asset = pool_asset_new),
        (sell_token = sell_token),
        (sell_amt = sell_amt),
        (step = step),
        (tolerance = tolerance),
        (max_steps = max_steps),
        (is_print = is_print)
      )
    }
  }
}
