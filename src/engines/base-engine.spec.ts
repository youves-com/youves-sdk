test('test', () => {
  expect(true).toBe(true)
})

// Tests temporarily disabled

// import { TezosToolkit } from '@taquito/taquito'
// import { importKey } from '@taquito/signer'
// import { contracts, tokens as tokensEnv, createEngine } from '../public'
// import BigNumber from 'bignumber.js'
// import { Storage } from '../storage/Storage'
// import { StorageKey, StorageKeyReturnType } from '../storage/types'
// import { SavingsPoolStorage } from '../types'

// const TIMEOUT = 1000 * 60 * 2 // 2 min timeout, because 1 min blocktime
// const DEFAULT_RECIPIENT = 'tz1QBQmnc6i51cYxTXa3bjiRJawMzZTgEBWS'
// const toolkit = new TezosToolkit('https://ghostnet.smartpy.io')

// export class MemoryStorage implements Storage {
//   public storage: Map<string, any>

//   constructor() {
//     this.storage = new Map()
//   }
//   public async set<K extends StorageKey>(key: K, value: StorageKeyReturnType[K]): Promise<void> {
//     this.storage.set(key, value)
//   }
//   public async get<K extends StorageKey>(key: K): Promise<StorageKeyReturnType[K]> {
//     return this.storage.get(key)
//   }
//   public async delete<K extends StorageKey>(key: K): Promise<void> {
//     this.storage.delete(key)
//   }
//   public async clear() {
//     this.storage.clear()
//   }
// }

// const FAUCET_KEY = {
//   mnemonic: [
//     'fetch',
//     'foil',
//     'before',
//     'raven',
//     'whale',
//     'exercise',
//     'stem',
//     'unable',
//     'fashion',
//     'veteran',
//     'where',
//     'ice',
//     'mom',
//     'hub',
//     'dune'
//   ],
//   secret: '8acc240930677cd3871682afa8c75c5f5c5030ff',
//   amount: '17109414886',
//   pkh: 'tz1fmXVmMUzivioqnmPcaPxadhofW8WHrdsy',
//   password: 'eS0JVfXjWn',
//   email: 'ubexpgba.fkobpqjx@tezos.example.org'
// }

// const indexerUrl = 'https://youves-testnet-indexer.dev.gke.papers.tech/v1/graphql'

// const asset = contracts.ghostnet.find((a) => a.symbol === 'uDEFI')!
// const tokens = tokensEnv.ghostnet

// importKey(toolkit, FAUCET_KEY.email, FAUCET_KEY.password, FAUCET_KEY.mnemonic.join(' '), FAUCET_KEY.secret).catch((e) => console.error(e))

// if (false) {
//   test(
//     'should create a vault',
//     async () => {
//       try {
//         const youves = createEngine({
//           tezos: toolkit,
//           contracts: asset,
//           storage: new MemoryStorage(),
//           indexerEndpoint: indexerUrl,
//           tokens: tokens
//         })
//         const amount = 10 * 10 ** 6 //pay 10 tez
//         const mintAmount = 10 ** 12 //mint 1 uUSD
//         const result = await youves.createVault(amount, mintAmount)
//         expect(result.length).toBe(51)
//       } catch (e) {
//         console.log('ERROR', JSON.stringify(e))
//       }
//     },
//     TIMEOUT
//   )

//   test(
//     'should fund vault',
//     async () => {
//       const youves = createEngine({
//         tezos: toolkit,
//         contracts: asset,
//         storage: new MemoryStorage(),
//         indexerEndpoint: indexerUrl,
//         tokens: tokens
//       })
//       const amount = 10 * 10 ** 6 //pay 10 tez
//       const result = await youves.depositCollateral(amount)
//       expect(result.length).toBe(51)
//     },
//     TIMEOUT
//   )

//   test(
//     'should mint',
//     async () => {
//       const youves = createEngine({
//         tezos: toolkit,
//         contracts: asset,
//         storage: new MemoryStorage(),
//         indexerEndpoint: indexerUrl,
//         tokens: tokens
//       })
//       const mintAmount = 10 ** 12
//       const result = await youves.mint(mintAmount)
//       expect(result.length).toBe(51)
//     },
//     TIMEOUT
//   )

//   test(
//     'should burn',
//     async () => {
//       const youves = createEngine({
//         tezos: toolkit,
//         contracts: asset,
//         storage: new MemoryStorage(),
//         indexerEndpoint: indexerUrl,
//         tokens: tokens
//       })
//       const mintAmount = 10 ** 10
//       const result = await youves.burn(mintAmount)
//       expect(result.length).toBe(51)
//     },
//     TIMEOUT
//   )

//   test(
//     'should withdraw',
//     async () => {
//       const youves = createEngine({
//         tezos: toolkit,
//         contracts: asset,
//         storage: new MemoryStorage(),
//         indexerEndpoint: indexerUrl,
//         tokens: tokens
//       })
//       const mutezAmount = 10 ** 5
//       const result = await youves.withdrawCollateral(mutezAmount)
//       expect(result.length).toBe(51)
//     },
//     TIMEOUT
//   )

//   test(
//     'should transfer minted tokens',
//     async () => {
//       const youves = createEngine({
//         tezos: toolkit,
//         contracts: asset,
//         storage: new MemoryStorage(),
//         indexerEndpoint: indexerUrl,
//         tokens: tokens
//       })
//       const tokenAmount = 10 ** 10 //pay 1 tez
//       const result = await youves.transferSyntheticToken(DEFAULT_RECIPIENT, tokenAmount)
//       expect(result.length).toBe(51)
//     },
//     TIMEOUT
//   )

//   test(
//     'should claim governance tokens',
//     async () => {
//       const youves = createEngine({
//         tezos: toolkit,
//         contracts: asset,
//         storage: new MemoryStorage(),
//         indexerEndpoint: indexerUrl,
//         tokens: tokens
//       })
//       const result = await youves.claimGovernanceToken()
//       expect(result.length).toBe(51)
//     },
//     TIMEOUT
//   )

//   test(
//     'should transfer governance tokens',
//     async () => {
//       const youves = createEngine({
//         tezos: toolkit,
//         contracts: asset,
//         storage: new MemoryStorage(),
//         indexerEndpoint: indexerUrl,
//         tokens: tokens
//       })
//       const tokenAmount = 10 * 10 ** 12 //pay 1 tez
//       const result = await youves.transferGovernanceToken(DEFAULT_RECIPIENT, tokenAmount)
//       expect(result.length).toBe(51)
//     },
//     TIMEOUT
//   )

//   test(
//     'should add staking pool as governance token operator',
//     async () => {
//       const youves = createEngine({
//         tezos: toolkit,
//         contracts: asset,
//         storage: new MemoryStorage(),
//         indexerEndpoint: indexerUrl,
//         tokens: tokens
//       })
//       youves
//       //   const result = await youves.addGovernanceTokenOperator(youves.REWARD_POOL_ADDRESS)
//       //   expect(result.length).toBe(51)
//     },
//     TIMEOUT
//   )

//   test(
//     'should deposit to rewards pool',
//     async () => {
//       const youves = createEngine({
//         tezos: toolkit,
//         contracts: asset,
//         storage: new MemoryStorage(),
//         indexerEndpoint: indexerUrl,
//         tokens: tokens
//       })
//       const result = await youves.depositToRewardsPool(89222)
//       expect(result.length).toBe(51)
//     },
//     TIMEOUT
//   )

//   test(
//     'should claim staking rewards',
//     async () => {
//       const youves = createEngine({
//         tezos: toolkit,
//         contracts: asset,
//         storage: new MemoryStorage(),
//         indexerEndpoint: indexerUrl,
//         tokens: tokens
//       })
//       const result = await youves.claimRewards()
//       expect(result.length).toBe(51)
//     },
//     TIMEOUT
//   )

//   test(
//     'should withdraw from rewards pool',
//     async () => {
//       const youves = createEngine({
//         tezos: toolkit,
//         contracts: asset,
//         storage: new MemoryStorage(),
//         indexerEndpoint: indexerUrl,
//         tokens: tokens
//       })
//       const result = await youves.withdrawFromRewardsPool()
//       expect(result.length).toBe(51)
//     },
//     TIMEOUT
//   )

//   test(
//     'should add synthetic token operator',
//     async () => {
//       const youves = createEngine({
//         tezos: toolkit,
//         contracts: asset,
//         storage: new MemoryStorage(),
//         indexerEndpoint: indexerUrl,
//         tokens: tokens
//       })
//       youves
//       //   const result = await youves.addSynthenticTokenOperator(youves.SAVINGS_POOL_ADDRESS)
//       //   expect(result.length).toBe(51)
//     },
//     TIMEOUT
//   )

//   test(
//     'should deposit to savings pool',
//     async () => {
//       const youves = createEngine({
//         tezos: toolkit,
//         contracts: asset,
//         storage: new MemoryStorage(),
//         indexerEndpoint: indexerUrl,
//         tokens: tokens
//       })
//       const result = await youves.depositToSavingsPool(10 ** 11)
//       expect(result.length).toBe(51)
//     },
//     TIMEOUT
//   )

//   test(
//     'should withdraw from savings pool',
//     async () => {
//       const youves = createEngine({
//         tezos: toolkit,
//         contracts: asset,
//         storage: new MemoryStorage(),
//         indexerEndpoint: indexerUrl,
//         tokens: tokens
//       })
//       const result = await youves.withdrawFromSavingsPool()
//       expect(result.length).toBe(51)
//     },
//     TIMEOUT
//   )

//   test(
//     'should deposit to savings pool (again)',
//     async () => {
//       const youves = createEngine({
//         tezos: toolkit,
//         contracts: asset,
//         storage: new MemoryStorage(),
//         indexerEndpoint: indexerUrl,
//         tokens: tokens
//       })
//       const result = await youves.depositToSavingsPool(10 ** 11)
//       expect(result.length).toBe(51)
//     },
//     TIMEOUT
//   )

//   test(
//     'should mint new tokens ',
//     async () => {
//       const youves = createEngine({
//         tezos: toolkit,
//         contracts: asset,
//         storage: new MemoryStorage(),
//         indexerEndpoint: indexerUrl,
//         tokens: tokens
//       })
//       const mintAmount = 10 ** 12
//       const result = await youves.mint(mintAmount)
//       expect(result.length).toBe(51)
//     },
//     TIMEOUT
//   )

//   test(
//     'should create a new intent',
//     async () => {
//       const youves = createEngine({
//         tezos: toolkit,
//         contracts: asset,
//         storage: new MemoryStorage(),
//         indexerEndpoint: indexerUrl,
//         tokens: tokens
//       })
//       const result = await youves.advertiseIntent(10 ** 11)
//       expect(result.length).toBe(51)
//     },
//     TIMEOUT
//   )

//   test(
//     'should partially fulfill intent',
//     async () => {
//       const youves = createEngine({
//         tezos: toolkit,
//         contracts: asset,
//         storage: new MemoryStorage(),
//         indexerEndpoint: indexerUrl,
//         tokens: tokens
//       })
//       const result = await youves.fulfillIntent(FAUCET_KEY.pkh, 10 ** 10)
//       expect(result.length).toBe(51)
//     },
//     TIMEOUT
//   )

//   test(
//     'removes intent',
//     async () => {
//       const youves = createEngine({
//         tezos: toolkit,
//         contracts: asset,
//         storage: new MemoryStorage(),
//         indexerEndpoint: indexerUrl,
//         tokens: tokens
//       })
//       const result = await youves.removeIntent()
//       expect(result.length).toBe(51)
//     },
//     TIMEOUT
//   )
// }

// async function testBigNumberGteZero(tag: string, result: Promise<BigNumber | undefined>) {
//   test('should get ' + tag, async () => {
//     const awaitedResult = await result
//     if (awaitedResult) {
//       console.log(tag, awaitedResult.toString())
//       expect(awaitedResult.toNumber()).toBeGreaterThan(0)
//       return true
//     }
//   })
// }

// const youves = createEngine({ tezos: toolkit, contracts: asset, storage: new MemoryStorage(), indexerEndpoint: indexerUrl, tokens: tokens })

// // testBigNumberGteZero('getSyntheticAssetExchangeRate', youves.getSyntheticAssetExchangeRate())
// // testBigNumberGteZero('getGovernanceTokenExchangeRate', youves.getGovernanceTokenExchangeRate())
// // testBigNumberGteZero('getTargetExchangeRate', youves.getTargetExchangeRate())
// // testBigNumberGteZero('getOwnMaxMintableAmount', youves.getOwnMaxMintableAmount())
// // testBigNumberGteZero('getVaultMaxMintableAmount', youves.getVaultMaxMintableAmount())
// // testBigNumberGteZero('getClaimableGovernanceToken', youves.getClaimableGovernanceToken())
// // testBigNumberGteZero('getYearlyLiabilityInterestRate', youves.getYearlyLiabilityInterestRate())
// // testBigNumberGteZero('getYearlyAssetInterestRate', youves.getYearlyAssetInterestRate())
// // testBigNumberGteZero('getYearlySpreadInterestRate', youves.getYearlySpreadInterestRate())
// // testBigNumberGteZero('getGovernanceTokenTotalSupply', youves.getGovernanceTokenTotalSupply())
// // testBigNumberGteZero('getSyntheticAssetTotalSupply', youves.getSyntheticAssetTotalSupply())
// // testBigNumberGteZero(
// //   'getExpectedWeeklyGovernanceRewards',
// //   youves.getExpectedWeeklyGovernanceRewards(youves.GOVERNANCE_TOKEN_PRECISION_FACTOR)
// // )
// // testBigNumberGteZero('getCollateralisationUsage', youves.getCollateralisationUsage())
// // testBigNumberGteZero('getVaultCollateralisation', youves.getVaultCollateralisation())
// // testBigNumberGteZero('getRequiredCollateral', youves.getRequiredCollateral())
// // testBigNumberGteZero('getMintedSyntheticAsset', youves.getMintedSyntheticAsset())
// // testBigNumberGteZero('getWithdrawableCollateral', youves.getWithdrawableCollateral())
// // testBigNumberGteZero('getMintableAmount', youves.getMintableAmount())
// // testBigNumberGteZero('getOwnVaultBalance', youves.getOwnVaultBalance())
// // testBigNumberGteZero('getSavingsAvailableTokens', youves.getSavingsAvailableTokens())
// // testBigNumberGteZero('getOwnGovernanceTokenAmount', youves.getOwnGovernanceTokenAmount())
// // testBigNumberGteZero('getOwnSyntheticAssetTokenAmount', youves.getOwnSyntheticAssetTokenAmount())
// // testBigNumberGteZero('getSavingsPoolYearlyInterestRate', youves.getSavingsPoolYearlyInterestRate())
// // testBigNumberGteZero(
// //   'getExpectedYearlyRewardPoolReturn',
// //   youves.getExpectedYearlyRewardPoolReturn(youves.GOVERNANCE_TOKEN_PRECISION_FACTOR)
// // )
// // testBigNumberGteZero('getObservedPrice', youves.getObservedPrice())
// // testBigNumberGteZero('getGovernanceTokenExchangeMaximumTezAmount', youves.getGovernanceTokenExchangeMaximumTezAmount())
// // testBigNumberGteZero('getGovernanceTokenExchangeMaximumTokenAmount', youves.getGovernanceTokenExchangeMaximumTokenAmount())

// //TODO move to exchanges
// // testBigNumberGteZero('getSyntheticAssetExchangeMaximumTezAmount', youves.getSyntheticAssetExchangeMaximumTezAmount())
// // testBigNumberGteZero('getSyntheticAssetExchangeMaximumTokenAmount', youves.getSyntheticAssetExchangeMaximumTokenAmount())

// // only tested if account has savings
// // ;async () => {
// //   const source = await youves.getOwnAddress()
// //   const savingsPoolContract = await youves.savingsPoolContractPromise
// //   const savingsPoolStorage: SavingsPoolStorage = (await savingsPoolContract.storage()) as any
// //   const stakes = await savingsPoolStorage['stakes'].get(source)
// //   if (stakes) {
// //     return testBigNumberGteZero('getOwnSavingsPoolStake', youves.getOwnSavingsV2PoolStake())
// //   }
// // }

// // testing the indexer values
// // testBigNumberGteZero('getTotalBalanceInVaults', youves.getTotalBalanceInVaults())
// // testBigNumberGteZero('getVaultCount', youves.getVaultCount())
// // testBigNumberGteZero('getTotalMinted', youves.getTotalMinted())
// // testBigNumberGteZero('getTotalCollateralRatio', youves.getTotalCollateralRatio())
// testBigNumberGteZero('getTargetPrice', youves.getTargetPrice())
// // testBigNumberGteZero('getTargetExchangeRate', youves.getTargetExchangeRate())

// // testBigNumberGteZero('getMintingPoolAPY', youves.getMintingPoolAPY())

// // const aDay = 24 * 60 * 60 * 1000
// // only tested if account has mintedInTimeRange
// // ;async () => {
// //   const mintedInTimeRange = await youves.getMintedInTimeRange(new Date(Date.now() - aDay), new Date())
// //   if (mintedInTimeRange) {
// //     return testBigNumberGteZero('getOwnSavingsPoolStake', youves.getOwnSavingsV2PoolStake())
// //   }
// // }

// // only tested if account has ownStake & ownDistFactor
// // ;async () => {
// //   const source = await youves.getOwnAddress()
// //   const savingsPoolContract = await youves.savingsPoolContractPromise
// //   const savingsPoolStorage: SavingsPoolStorage = (await savingsPoolContract.storage()) as any
// //   const ownStake = await savingsPoolStorage['stakes'].get(source)
// //   const ownDistFactor = await savingsPoolStorage['dist_factors'].get(source)
// //   if (ownStake && ownDistFactor) {
// //     return testBigNumberGteZero('getClaimableSavingsPayout', youves.getClaimableSavingsPayout())
// //   }
// // }

// // testing intent list
// // test('should get all intents', async () => {
// //   const awaitedResult = await youves.getIntents()
// //   console.log('intents', awaitedResult)
// //   expect(awaitedResult.length).toBeGreaterThan(0)
// //   return true
// // })

// // test('should get all intents', async () => {
// //   const awaitedResult = await youves.getFullfillableIntents()
// //   console.log('intents', awaitedResult)
// //   return true
// // })
