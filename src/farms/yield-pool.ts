import { TezosToolkit } from '@taquito/taquito'
import BigNumber from 'bignumber.js'
import { DexType, Farm, FlatYouvesExchangeInfo, NetworkConstants } from '../networks.base'
import { IndexerConfig } from '../types'
import { getMillisFromDays, getMillisFromYears } from '../utils'
import { FlatYouvesExchangeV2 } from '../exchanges/flat-youves-swapV2'
import { Observable, from, combineLatest } from 'rxjs'
import { map } from 'rxjs/operators'

export class YieldPool {
  public pool: FlatYouvesExchangeV2
  constructor(
    protected readonly tezos: TezosToolkit,
    protected readonly farm: Farm,
    protected readonly indexerConfig: IndexerConfig,
    public readonly networkConstants: NetworkConstants
  ) {
    const dex = this.networkConstants.dexes.find(
      (dex) => dex.token1.symbol === farm.token1.symbol && dex.token2.symbol === farm.token2.symbol && dex.dexType === DexType.FLAT_CURVE_V2
    ) as FlatYouvesExchangeInfo
    this.pool = new FlatYouvesExchangeV2(this.tezos, farm.farmContract, dex, this.networkConstants, this.indexerConfig)
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

  async dailyRewards() {
    return await this.pool.getAccruedRewards().then((res) => {
      return { token1Rewards: res.token1Rewards.div(30), token2Rewards: res.token2Rewards.div(30) }
    })
  }

  public async getAPR(reward1ExchangeRate: BigNumber, reward2ExchangeRate: BigNumber, lpExchangeRate: BigNumber) {
    const rewards = await this.pool.getAccruedRewards()

    const reward1USD = rewards.token1Rewards.multipliedBy(reward1ExchangeRate).shiftedBy(-this.farm.token1.decimals)
    const reward2USD = rewards.token2Rewards.multipliedBy(reward2ExchangeRate).shiftedBy(-this.farm.token2.decimals)
    const totalRewardsUSD = reward1USD.plus(reward2USD)

    const fromDate = new Date(new Date().getTime() - getMillisFromDays(30))
    const toDate = new Date()
    const yearlyFactor = new BigNumber(getMillisFromYears(1) / (toDate.getTime() - fromDate.getTime()))

    const yearlyRewardsInUSD = totalRewardsUSD.multipliedBy(yearlyFactor)
    const totalStakeInUSD = (await this.getFarmBalance()).multipliedBy(lpExchangeRate).shiftedBy(-this.farm.lpToken.decimals)

    return yearlyRewardsInUSD.div(totalStakeInUSD)
  }

  public getAPR$(
    reward1ExchangeRate: Observable<BigNumber | undefined>,
    reward2ExchangeRate: Observable<BigNumber | undefined>,
    lpExchangeRate: Observable<BigNumber | undefined>
  ) {
    const rewards = from(this.pool.getAccruedRewards())

    const reward1USD = combineLatest([rewards, reward1ExchangeRate]).pipe(
      map(([rewards, rate]) => {
        return rewards.token1Rewards.multipliedBy(rate!).shiftedBy(-this.farm.token1.decimals)
      })
    )

    const reward2USD = combineLatest([rewards, reward2ExchangeRate]).pipe(
      map(([rewards, rate]) => {
        return rewards.token2Rewards.multipliedBy(rate!).shiftedBy(-this.farm.token2.decimals)
      })
    )

    const totalRewardsUSD = combineLatest([reward1USD, reward2USD]).pipe(
      map(([reward1, reward2]) => {
        return reward1.plus(reward2)
      })
    )

    const fromDate = new Date(new Date().getTime() - getMillisFromDays(30))
    const toDate = new Date()
    const yearlyFactor = new BigNumber(getMillisFromYears(1) / (toDate.getTime() - fromDate.getTime()))

    const yearlyRewardsInUSD = totalRewardsUSD.pipe(
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
