import { TezosToolkit } from '@taquito/taquito'
import { importKey } from '@taquito/signer'
import { contracts, Youves } from './public'
import BigNumber from 'bignumber.js'
import { Storage } from './storage/Storage'
import { StorageKey, StorageKeyReturnType } from './storage/types'

const TIMEOUT = 1000 * 60 * 2 // 2 min timeout, because 1 min blocktime
const DEFAULT_RECIPIENT = 'tz1QBQmnc6i51cYxTXa3bjiRJawMzZTgEBWS'
const toolkit = new TezosToolkit('https://mainnet-tezos.giganode.io/')

export class MemoryStorage implements Storage {
  public storage: Map<string, any>

  constructor() {
    this.storage = new Map()
  }
  public async set<K extends StorageKey>(key: K, value: StorageKeyReturnType[K]): Promise<void> {
    this.storage.set(key, value)
  }
  public async get<K extends StorageKey>(key: K): Promise<StorageKeyReturnType[K]> {
    return this.storage.get(key)
  }
  public async delete<K extends StorageKey>(key: K): Promise<void> {
    this.storage.delete(key)
  }
  public async clear() {
    this.storage.clear()
  }
}

const FAUCET_KEY = {
  mnemonic: [
    'cart',
    'will',
    'page',
    'bench',
    'notice',
    'leisure',
    'penalty',
    'medal',
    'define',
    'odor',
    'ride',
    'devote',
    'cannon',
    'setup',
    'rescue'
  ],
  secret: '35f266fbf0fca752da1342fdfc745a9c608e7b20',
  amount: '4219352756',
  pkh: 'tz1YBMFg1nLAPxBE6djnCPbMRH5PLXQWt8Mg',
  password: 'Fa26j580dQ',
  email: 'jxmjvauo.guddusns@tezos.example.org'
}

const indexerUrl = 'https://youves-indexer.dev.gke.papers.tech/v1/graphql'

importKey(toolkit, FAUCET_KEY.email, FAUCET_KEY.password, FAUCET_KEY.mnemonic.join(' '), FAUCET_KEY.secret).catch((e) => console.error(e))

if (false) {
  test(
    'should create a vault',
    async () => {
      const youves = new Youves(toolkit, contracts.florencenet, new MemoryStorage(), indexerUrl)
      const amount = 10 * 10 ** 6 //pay 10 tez
      const mintAmount = 10 ** 12 //mint 1 uUSD
      const result = await youves.createVault(amount, mintAmount)
      expect(result.length).toBe(51)
    },
    TIMEOUT
  )

  test(
    'should fund vault',
    async () => {
      const youves = new Youves(toolkit, contracts.florencenet, new MemoryStorage(), indexerUrl)
      const amount = 10 * 10 ** 6 //pay 10 tez
      const result = await youves.fundVault(amount)
      expect(result.length).toBe(51)
    },
    TIMEOUT
  )

  test(
    'should mint',
    async () => {
      const youves = new Youves(toolkit, contracts.florencenet, new MemoryStorage(), indexerUrl)
      const mintAmount = 10 ** 12
      const result = await youves.mint(mintAmount)
      expect(result.length).toBe(51)
    },
    TIMEOUT
  )

  test(
    'should burn',
    async () => {
      const youves = new Youves(toolkit, contracts.florencenet, new MemoryStorage(), indexerUrl)
      const mintAmount = 10 ** 10
      const result = await youves.burn(mintAmount)
      expect(result.length).toBe(51)
    },
    TIMEOUT
  )

  test(
    'should withdraw',
    async () => {
      const youves = new Youves(toolkit, contracts.florencenet, new MemoryStorage(), indexerUrl)
      const mutezAmount = 10 ** 5
      const result = await youves.withdrawCollateral(mutezAmount)
      expect(result.length).toBe(51)
    },
    TIMEOUT
  )

  test(
    'should transfer minted tokens',
    async () => {
      const youves = new Youves(toolkit, contracts.florencenet, new MemoryStorage(), indexerUrl)
      const tokenAmount = 10 ** 10 //pay 1 tez
      const result = await youves.transferSyntheticToken(DEFAULT_RECIPIENT, tokenAmount)
      expect(result.length).toBe(51)
    },
    TIMEOUT
  )

  test(
    'should claim governance tokens',
    async () => {
      const youves = new Youves(toolkit, contracts.florencenet, new MemoryStorage(), indexerUrl)
      const result = await youves.claimGovernanceToken()
      expect(result.length).toBe(51)
    },
    TIMEOUT
  )

  test(
    'should transfer governance tokens',
    async () => {
      const youves = new Youves(toolkit, contracts.florencenet, new MemoryStorage(), indexerUrl)
      const tokenAmount = 10 * 10 ** 12 //pay 1 tez
      const result = await youves.transferGovernanceToken(DEFAULT_RECIPIENT, tokenAmount)
      expect(result.length).toBe(51)
    },
    TIMEOUT
  )

  test(
    'should add staking pool as governance token operator',
    async () => {
      const youves = new Youves(toolkit, contracts.florencenet, new MemoryStorage(), indexerUrl)
      const result = await youves.addGovernanceTokenOperator(youves.REWARD_POOL_ADDRESS)
      expect(result.length).toBe(51)
    },
    TIMEOUT
  )

  test(
    'should deposit to rewards pool',
    async () => {
      const youves = new Youves(toolkit, contracts.florencenet, new MemoryStorage(), indexerUrl)
      const result = await youves.depositToRewardsPool(89222)
      expect(result.length).toBe(51)
    },
    TIMEOUT
  )

  test(
    'should claim staking rewards',
    async () => {
      const youves = new Youves(toolkit, contracts.florencenet, new MemoryStorage(), indexerUrl)
      const result = await youves.claimRewards()
      expect(result.length).toBe(51)
    },
    TIMEOUT
  )

  test(
    'should withdraw from rewards pool',
    async () => {
      const youves = new Youves(toolkit, contracts.florencenet, new MemoryStorage(), indexerUrl)
      const result = await youves.withdrawFromRewardsPool()
      expect(result.length).toBe(51)
    },
    TIMEOUT
  )

  test(
    'should add synthetic token operator',
    async () => {
      const youves = new Youves(toolkit, contracts.florencenet, new MemoryStorage(), indexerUrl)
      const result = await youves.addSynthenticTokenOperator(youves.SAVINGS_POOL_ADDRESS)
      expect(result.length).toBe(51)
    },
    TIMEOUT
  )

  test(
    'should deposit to savings pool',
    async () => {
      const youves = new Youves(toolkit, contracts.florencenet, new MemoryStorage(), indexerUrl)
      const result = await youves.depositToSavingsPool(10 ** 11)
      expect(result.length).toBe(51)
    },
    TIMEOUT
  )

  test(
    'should withdraw from savings pool',
    async () => {
      const youves = new Youves(toolkit, contracts.florencenet, new MemoryStorage(), indexerUrl)
      const result = await youves.withdrawFromSavingsPool()
      expect(result.length).toBe(51)
    },
    TIMEOUT
  )

  test(
    'should deposit to savings pool (again)',
    async () => {
      const youves = new Youves(toolkit, contracts.florencenet, new MemoryStorage(), indexerUrl)
      const result = await youves.depositToSavingsPool(10 ** 11)
      expect(result.length).toBe(51)
    },
    TIMEOUT
  )

  test(
    'should mint new tokens ',
    async () => {
      const youves = new Youves(toolkit, contracts.florencenet, new MemoryStorage(), indexerUrl)
      const mintAmount = 10 ** 12
      const result = await youves.mint(mintAmount)
      expect(result.length).toBe(51)
    },
    TIMEOUT
  )

  test(
    'should create a new intent',
    async () => {
      const youves = new Youves(toolkit, contracts.florencenet, new MemoryStorage(), indexerUrl)
      const result = await youves.advertiseIntent(10 ** 11)
      expect(result.length).toBe(51)
    },
    TIMEOUT
  )

  test(
    'should partially fulfill intent',
    async () => {
      const youves = new Youves(toolkit, contracts.florencenet, new MemoryStorage(), indexerUrl)
      const result = await youves.fulfillIntent(FAUCET_KEY.pkh, 10 ** 10)
      expect(result.length).toBe(51)
    },
    TIMEOUT
  )

  test(
    'removes intent',
    async () => {
      const youves = new Youves(toolkit, contracts.florencenet, new MemoryStorage(), indexerUrl)
      const result = await youves.removeIntent()
      expect(result.length).toBe(51)
    },
    TIMEOUT
  )

  // quipo tests
  test(
    'should trade tez for synthetic token',
    async () => {
      const youves = new Youves(toolkit, contracts.florencenet, new MemoryStorage(), indexerUrl)
      const result = await youves.tezToSyntheticSwap(10 ** 5, 1)
      expect(result.length).toBe(51)
    },
    TIMEOUT * 2
  )

  test(
    'should trade synthetic token for tez',
    async () => {
      const youves = new Youves(toolkit, contracts.florencenet, new MemoryStorage(), indexerUrl)
      const result = await youves.syntheticAssetToTezSwap(10 ** 3, 1)
      expect(result.length).toBe(51)
    },
    TIMEOUT * 2
  )
}

async function testBigNumberGteZero(tag: string, result: Promise<BigNumber>) {
  test('should get ' + tag, async () => {
    const awaitedResult = await result
    console.log(tag, awaitedResult.toString())
    expect(awaitedResult.toNumber()).toBeGreaterThan(0)
    return true
  })
}

const youves = new Youves(toolkit, contracts.florencenet, new MemoryStorage(), indexerUrl)

testBigNumberGteZero('getSyntheticAssetExchangeRate', youves.getSyntheticAssetExchangeRate())
testBigNumberGteZero('getGovernanceTokenExchangeRate', youves.getGovernanceTokenExchangeRate())
testBigNumberGteZero('getTargetExchangeRate', youves.getTargetExchangeRate())
testBigNumberGteZero('getOwnMaxMintableAmount', youves.getOwnMaxMintableAmount())
testBigNumberGteZero('getVaultMaxMintableAmount', youves.getVaultMaxMintableAmount())
testBigNumberGteZero('getClaimableGovernanceToken', youves.getClaimableGovernanceToken())
testBigNumberGteZero('getYearlyLiabilityInterestRate', youves.getYearlyLiabilityInterestRate())
testBigNumberGteZero('getYearlyAssetInterestRate', youves.getYearlyAssetInterestRate())
testBigNumberGteZero('getYearlySpreadInterestRate', youves.getYearlySpreadInterestRate())
testBigNumberGteZero('getGovernanceTokenTotalSupply', youves.getGovernanceTokenTotalSupply())
testBigNumberGteZero('getSyntheticAssetTotalSupply', youves.getSyntheticAssetTotalSupply())
testBigNumberGteZero('getExpectedWeeklyGovernanceRewards', youves.getExpectedWeeklyGovernanceRewards(youves.ONE_TOKEN))
testBigNumberGteZero('getCollateralisationUsage', youves.getCollateralisationUsage())
testBigNumberGteZero('getVaultCollateralisation', youves.getVaultCollateralisation())
testBigNumberGteZero('getRequiredCollateral', youves.getRequiredCollateral())
testBigNumberGteZero('getMintedSyntheticAsset', youves.getMintedSyntheticAsset())
testBigNumberGteZero('getWithdrawableCollateral', youves.getWithdrawableCollateral())
testBigNumberGteZero('getMintableAmount', youves.getMintableAmount())
testBigNumberGteZero('getVaultBalance', youves.getVaultBalance())
testBigNumberGteZero('getSavingsAvailableTokens', youves.getSavingsAvailableTokens())
testBigNumberGteZero('getOwnGovernanceTokenAmount', youves.getOwnGovernanceTokenAmount())
testBigNumberGteZero('getOwnSyntheticAssetTokenAmount', youves.getOwnSyntheticAssetTokenAmount())
testBigNumberGteZero('getSavingsPoolYearlyInterestRate', youves.getSavingsPoolYearlyInterestRate())
testBigNumberGteZero('getExpectedYearlyRewardPoolReturn', youves.getExpectedYearlyRewardPoolReturn(youves.ONE_TOKEN))
testBigNumberGteZero('getObservedPrice', youves.getObservedPrice())
testBigNumberGteZero('getGovernanceTokenExchangeMaximumTezAmount', youves.getGovernanceTokenExchangeMaximumTezAmount())
testBigNumberGteZero('getGovernanceTokenExchangeMaximumTokenAmount', youves.getGovernanceTokenExchangeMaximumTokenAmount())
testBigNumberGteZero('getSyntheticAssetExchangeMaximumTezAmount', youves.getSyntheticAssetExchangeMaximumTezAmount())
testBigNumberGteZero('getSyntheticAssetExchangeMaximumTokenAmount', youves.getSyntheticAssetExchangeMaximumTokenAmount())
testBigNumberGteZero('getOwnSavingsPoolStake', youves.getOwnSavingsPoolStake())
// testing the indexer values
testBigNumberGteZero('getTotalBalanceInVaults', youves.getTotalBalanceInVaults())
testBigNumberGteZero('getVaultCount', youves.getVaultCount())
testBigNumberGteZero('getTotalMinted', youves.getTotalMinted())
testBigNumberGteZero('getTotalCollateralRatio', youves.getTotalCollateralRatio())

testBigNumberGteZero('getTargetPrice', youves.getTargetPrice())
testBigNumberGteZero('getTargetExchangeRate', youves.getTargetExchangeRate())

testBigNumberGteZero('getMintingPoolAPY', youves.getMintingPoolAPY())

const aDay = 24*60*60*1000
testBigNumberGteZero('getRewardPoolAPY', youves.getRewardPoolAPY(new Date(Date.now()-aDay), new Date()))
testBigNumberGteZero('getClaimableSavingsPayout', youves.getClaimableSavingsPayout())

// testing intent list
test('should get all intents', async () => {
  const awaitedResult = await youves.getIntents()
  console.log('intents', awaitedResult)
  expect(awaitedResult.length).toBeGreaterThan(0)
  return true
})

test('should get all intents', async () => {
  const awaitedResult = await youves.getFullfillableIntents()
  console.log('intents', awaitedResult)
  return true
})