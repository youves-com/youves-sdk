import { TezosToolkit } from '@taquito/taquito'
import BigNumber from 'bignumber.js'
import { DexType, Farm, MultiswapExchangeInfo, NetworkConstants } from '../networks.base'
import { IndexerConfig } from '../types'
import { getMillisFromDays, getMillisFromYears } from '../utils'
import { Observable, from, combineLatest } from 'rxjs'
import { map } from 'rxjs/operators'
import { MultiSwapExchange } from '../exchanges/multiswap'
import { Token, TokenType } from '../tokens/token'
import { YouvesIndexer } from '../YouvesIndexer'

export class MultiPool {
  public pool: MultiSwapExchange
  protected youvesIndexer: YouvesIndexer | undefined
  constructor(
    protected readonly tezos: TezosToolkit,
    protected readonly farm: Farm,
    protected readonly indexerConfig: IndexerConfig,
    public readonly networkConstants: NetworkConstants
  ) {
    this.youvesIndexer = this.indexerConfig !== undefined ? new YouvesIndexer(this.indexerConfig) : undefined

    const dex = this.networkConstants.dexes.find(
      (dex) =>
        dex.token1.symbol === farm.token1.symbol &&
        dex.token2.symbol === farm.token2.symbol &&
        dex.dexType === DexType.MULTISWAP &&
        dex.version === farm.swapVersion
    ) as MultiswapExchangeInfo
    this.pool = new MultiSwapExchange(this.tezos, farm.farmContract, dex, this.networkConstants)
  }

  async getOwnStake() {
    return this.pool.getOwnLiquidityPoolTokens()
  }

  async getFarmBalance() {
    const poolInfo = this.pool.getLiquidityPoolInfo()
    return poolInfo.then((res) => {
      return Promise.resolve(res.lqtTotal)
    })
  }

  async getAccruedRewards() {
    const now = new Date()
    const lastWeek = new Date(now.valueOf() - getMillisFromDays(7))

    const nullToken: Token = {
      id: 'null',
      type: TokenType.FA2,
      name: 'null',
      shortName: 'null',
      decimals: 0,
      symbol: 'null',
      targetSymbol: 'null',
      unit: 'null',
      impliedPrice: 0,
      contractAddress: 'tz1Ke2h7sDdakHJQh8WX4Z372du1KChsksyU',
      tokenId: 0,
      decimalPlaces: 0,
      inputDecimalPlaces: 0
    }
    let token1Rewards: BigNumber | undefined = await this.youvesIndexer?.getTransferAggregateOverTime(
      this.pool.dexAddress,
      nullToken,
      lastWeek,
      now,
      'tz1Ke2h7sDdakHJQh8WX4Z372du1KChsksyU'
    )
    token1Rewards = token1Rewards === undefined || token1Rewards.isNaN() ? undefined : token1Rewards

    //console.log('🍋 rewards', token1Rewards?.toNumber(), this.token1.symbol, token2Rewards?.toNumber(), this.token2.symbol)
    return {
      token1Rewards: token1Rewards
    }
  }

  async dailyRewards() {
    return await this.getAccruedRewards().then((res) => {
      return {
        token1Rewards: res.token1Rewards !== undefined ? res.token1Rewards.div(7) : undefined
      }
    })
  }

  public getAPR$(reward1ExchangeRate: Observable<BigNumber | undefined>, lpExchangeRate: Observable<BigNumber | undefined>) {
    const rewards = from(this.getAccruedRewards())

    const reward1USD = combineLatest([rewards, reward1ExchangeRate]).pipe(
      map(([rewards, rate]) => {
        return rewards.token1Rewards !== undefined
          ? rewards.token1Rewards.multipliedBy(rate!).shiftedBy(-this.farm.token1.decimals)
          : new BigNumber(0)
      })
    )

    const fromDate = new Date(new Date().getTime() - getMillisFromDays(7))
    const toDate = new Date()
    const yearlyFactor = new BigNumber(getMillisFromYears(1) / (toDate.getTime() - fromDate.getTime()))

    const yearlyRewardsInUSD = reward1USD.pipe(
      map((rewards) => {
        return rewards.multipliedBy(yearlyFactor)
      })
    )

    const totalStake = from(this.getFarmBalance())

    const totalStakeInUSD = combineLatest([totalStake, lpExchangeRate]).pipe(
      map(([stake, rate]) => {
        return stake.multipliedBy(rate!).shiftedBy(-this.farm.lpToken.decimals)
      })
    )

    return combineLatest([yearlyRewardsInUSD, totalStakeInUSD]).pipe(
      map(([rewards, stake]) => {
        return rewards.dividedBy(stake).toNumber()
      })
    )
  }
}
