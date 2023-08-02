import { TezosToolkit } from '@taquito/taquito'
import BigNumber from 'bignumber.js'
import { DexType, Farm, FlatYouvesExchangeInfo, NetworkConstants } from '../networks.base'
import { IndexerConfig } from '../types'
import { calculateAPR, getMillisFromDays, getMillisFromYears } from '../utils'
import { YouvesIndexer } from '../YouvesIndexer'
import { FlatYouvesExchangeV2 } from '../exchanges/flat-youves-swapV2'

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
    console.log(this.pool)
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
    return (await this.pool.getAccruedRewards()).totalRewards.div(30)
  }

  async getAPR(assetToUsdExchangeRate: BigNumber, governanceToUsdExchangeRate: BigNumber) {
    const totalStake = (await this.getFarmBalance()).shiftedBy(-1 * this.farm.lpToken.decimals)

    const fromDate = new Date(new Date().getTime() - getMillisFromDays(7))
    const toDate = new Date()

    const weeklyTransactionValue = (await this.getTransactionValueInTimeframe(fromDate, toDate)).shiftedBy(
      -1 * this.farm.rewardToken.decimals
    )

    const yearlyFactor = new BigNumber(getMillisFromYears(1) / (toDate.getTime() - fromDate.getTime()))

    return calculateAPR(totalStake, weeklyTransactionValue, yearlyFactor, assetToUsdExchangeRate, governanceToUsdExchangeRate)
  }

  async getTransactionValueInTimeframe(from: Date, to: Date): Promise<BigNumber> {
    const indexer = new YouvesIndexer(this.indexerConfig)

    const expectedWeeklyVolume = new BigNumber(this.farm.expectedWeeklyRewards).shiftedBy(this.farm.rewardToken.decimals)

    const volume = await indexer.getTransferAggregateOverTime(this.farm.farmContract, this.farm.rewardToken, from, to)

    if (volume.isNaN()) {
      return expectedWeeklyVolume
    }

    return BigNumber.max(expectedWeeklyVolume, volume)
  }
}
