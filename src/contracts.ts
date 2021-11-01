import { ContractAbstraction, ContractMethod, TezosToolkit, Wallet } from '@taquito/taquito'
import { ContractsLibrary } from '@taquito/contracts-library'

import BigNumber from 'bignumber.js'
import { Contracts, DexType, EngineType } from './networks'
import { Storage } from './storage/Storage'
import { StorageKey, StorageKeyReturnType } from './storage/types'
import {
  Activity,
  EngineStorage,
  GovernanceTokenStorage,
  Intent,
  OptionsListingStroage,
  RewardsPoolStorage,
  SavingsPoolStorage,
  Vault,
  VaultContext,
  VestingLedgerValue,
  VestingStorage
} from './types'
import { request } from 'graphql-request'
import { QuipuswapExchange } from './exchanges/quipuswap'
import { sendAndAwait } from './utils'
import { Exchange } from './exchanges/exchange'
import { PlentyExchange } from './exchanges/plenty'
import { Token, TokenSymbol } from './tokens/token'
import { contractInfo } from './contracts/contracts'

const contractsLibrary = new ContractsLibrary()

contractsLibrary.addContract(contractInfo)

const globalPromiseCache = new Map<string, Promise<unknown>>()

const simpleHash = (s: string) => {
  let h = 0
  for (let i = 0; i < s.length; i++) {
    h = (Math.imul(31, h) + s.charCodeAt(i)) | 0
  }

  return h
}

const cache = () => {
  return (_target: Object, propertyKey: string, descriptor: PropertyDescriptor) => {
    const originalMethod = descriptor.value

    const constructKey = (symbol: string, input: any[]) => {
      const processedInput = input.map((value) => {
        if (value instanceof ContractAbstraction) {
          return value.address
        } else if (value instanceof BigNumber) {
          return value.toString(10)
        } else if (typeof value === 'object') {
          return simpleHash(JSON.stringify(value))
        } else {
          return value
        }
      })
      return `${symbol}-${propertyKey}-${processedInput.join('-')}`
    }

    descriptor.value = async function (...args: any[]) {
      const youves = this as Youves
      const constructedKey = constructKey(youves?.symbol, args)
      const promise = globalPromiseCache.get(constructedKey)
      if (promise) {
        // log with constructedKey --> goes into cache
        return promise
      } else {
        const newPromise = originalMethod.apply(this, args)
        globalPromiseCache.set(constructedKey, newPromise)
        return newPromise
      }
    }

    return descriptor
  }
}

const trycatch = (defaultValue: any) => {
  return (_target: Object, propertyKey: string, descriptor: PropertyDescriptor) => {
    const originalMethod = descriptor.value

    descriptor.value = async function (...args: any[]) {
      try {
        return await originalMethod.apply(this, args)
      } catch (e) {
        console.error(`METHOD ${propertyKey} HAS THROWN AN ERROR, RETURNING ${defaultValue}`)
        return defaultValue
      }
    }

    return descriptor
  }
}

export class Youves {
  public symbol: TokenSymbol
  public collateralToken: Token
  public token: Token

  public TARGET_ORACLE_ADDRESS: string
  public TOKEN_ADDRESS: string
  public TOKEN_ID: string
  public ENGINE_ADDRESS: string
  public ENGINE_TYPE: string
  public GOVERNANCE_TOKEN_ADDRESS: string
  public GOVERNANCE_TOKEN_ID: string = '0'
  public OPTIONS_LISTING_ADDRESS: string
  public REWARD_POOL_ADDRESS: string
  public SAVINGS_POOL_ADDRESS: string
  public SAVINGS_V2_POOL_ADDRESS: string
  public SAVINGS_V2_VESTING_ADDRESS: string
  public VIEWER_CALLBACK_ADDRESS: string
  public GOVERNANCE_DEX: string

  public SECONDS_INTEREST_SPREAD = 316
  public TOKEN_DECIMALS = 12
  public TEZ_DECIMALS = 6
  public PRECISION_FACTOR = 10 ** this.TOKEN_DECIMALS
  public ONE_TOKEN = 10 ** this.TOKEN_DECIMALS
  public GOVERNANCE_TOKEN_ISSUANCE_RATE = 66137566137
  public YEARLY_WEEKS_MILLIS = 1000 * 60 * 60 * 24 * 7 * 52
  public MINTING_FEE = 0.015625

  public tokenContractPromise: Promise<ContractAbstraction<Wallet>>
  public governanceTokenContractPromise: Promise<ContractAbstraction<Wallet>>
  public rewardsPoolContractPromise: Promise<ContractAbstraction<Wallet>>
  public savingsPoolContractPromise: Promise<ContractAbstraction<Wallet>>
  public savingsV2PoolContractPromise: Promise<ContractAbstraction<Wallet>>
  public savingsV2VestingContractPromise: Promise<ContractAbstraction<Wallet>>
  public optionsListingContractPromise: Promise<ContractAbstraction<Wallet>>
  public engineContractPromise: Promise<ContractAbstraction<Wallet>>
  public targetOracleContractPromise: Promise<ContractAbstraction<Wallet>>
  public governanceTokenDexContractPromise: Promise<ContractAbstraction<Wallet>>

  public lastBlockHash: string = ''
  private chainWatcherIntervalId: ReturnType<typeof setInterval> | undefined = undefined
  private chainUpdateCallbacks: Array<() => void> = []

  constructor(
    public readonly tezos: TezosToolkit,
    private readonly contracts: Contracts,
    private readonly storage: Storage,
    private readonly indexerEndpoint: string,
    private readonly tokens: Record<TokenSymbol | any, Token>
  ) {
    this.tezos.addExtension(contractsLibrary)

    this.symbol = contracts.symbol
    this.collateralToken = contracts.collateralToken
    this.token = contracts.token
    this.TARGET_ORACLE_ADDRESS = contracts.TARGET_ORACLE_ADDRESS
    this.TOKEN_ADDRESS = contracts.TOKEN_ADDRESS
    this.TOKEN_ID = contracts.TOKEN_ID
    this.ENGINE_ADDRESS = contracts.ENGINE_ADDRESS
    this.ENGINE_TYPE = contracts.ENGINE_TYPE
    this.GOVERNANCE_TOKEN_ADDRESS = contracts.GOVERNANCE_TOKEN_ADDRESS
    this.OPTIONS_LISTING_ADDRESS = contracts.OPTIONS_LISTING_ADDRESS
    this.REWARD_POOL_ADDRESS = contracts.REWARD_POOL_ADDRESS
    this.SAVINGS_POOL_ADDRESS = contracts.SAVINGS_POOL_ADDRESS
    this.SAVINGS_V2_POOL_ADDRESS = contracts.SAVINGS_V2_POOL_ADDRESS
    this.SAVINGS_V2_VESTING_ADDRESS = contracts.SAVINGS_V2_VESTING_ADDRESS
    this.VIEWER_CALLBACK_ADDRESS = contracts.VIEWER_CALLBACK_ADDRESS
    this.GOVERNANCE_DEX = contracts.GOVERNANCE_DEX

    this.tokenContractPromise = this.tezos.wallet.at(this.TOKEN_ADDRESS)
    this.governanceTokenContractPromise = this.tezos.wallet.at(this.GOVERNANCE_TOKEN_ADDRESS)
    this.rewardsPoolContractPromise = this.tezos.wallet.at(this.REWARD_POOL_ADDRESS)
    this.savingsPoolContractPromise = this.tezos.wallet.at(this.SAVINGS_POOL_ADDRESS)
    this.savingsV2PoolContractPromise = this.tezos.wallet.at(this.SAVINGS_V2_POOL_ADDRESS)
    this.savingsV2VestingContractPromise = this.tezos.wallet.at(this.SAVINGS_V2_VESTING_ADDRESS)
    this.optionsListingContractPromise = this.tezos.wallet.at(this.OPTIONS_LISTING_ADDRESS)
    this.engineContractPromise = this.tezos.wallet.at(this.ENGINE_ADDRESS)
    this.targetOracleContractPromise = this.tezos.wallet.at(this.TARGET_ORACLE_ADDRESS)
    this.governanceTokenDexContractPromise = this.tezos.wallet.at(this.GOVERNANCE_DEX)
  }

  public async getTezWalletBalance(address: string): Promise<BigNumber> {
    return this.tezos.tz.getBalance(address)
  }

  @cache()
  public async getDelegate(address: string): Promise<string | null> {
    return this.tezos.tz.getDelegate(address)
  }

  public async getAccountTezWalletBalance(): Promise<BigNumber> {
    const source = await this.getOwnAddress()
    return this.getTezWalletBalance(source)
  }

  @cache()
  @trycatch(new BigNumber(0))
  public async getVaultBalance(address: string): Promise<BigNumber> {
    const engineContract = await this.engineContractPromise
    const storage = (await this.getStorageOfContract(engineContract)) as any
    const vaultContext = await this.getStorageValue(storage, 'vault_contexts', address)
    return new BigNumber(vaultContext ? vaultContext.balance : 0)
  }

  @cache()
  @trycatch(new BigNumber(0))
  public async getOwnVaultBalance(): Promise<BigNumber> {
    const source = await this.getOwnAddress()
    return this.getVaultBalance(source)
  }

  async sendAndAwait(walletOperation: any): Promise<string> {
    return sendAndAwait(walletOperation, () => this.clearCache())
  }

  public async createVault(
    collateralAmountInMutez: number,
    mintAmountInuUSD: number,
    baker?: string,
    allowSettlement: boolean = true
  ): Promise<string> {
    const engineContract = await this.engineContractPromise
    console.log('creating vault')

    if (this.collateralToken.symbol === 'tez') {
      return this.sendAndAwait(
        this.tezos.wallet
          .batch()
          .withTransfer(
            engineContract.methods
              .create_vault(baker ? baker : null, this.VIEWER_CALLBACK_ADDRESS)
              .toTransferParams({ amount: collateralAmountInMutez, mutez: true })
          )
          .withContractCall(engineContract.methods.mint(mintAmountInuUSD))
      )
    } else {
      return this.sendAndAwait(
        this.tezos.wallet
          .batch()
          .withContractCall(
            await this.prepareAddTokenOperator(this.collateralToken.contractAddress, this.ENGINE_ADDRESS, this.collateralToken.tokenId)
          )
          .withContractCall(engineContract.methods.create_vault(allowSettlement, this.VIEWER_CALLBACK_ADDRESS))
          .withContractCall(engineContract.methods.deposit(collateralAmountInMutez))
          .withContractCall(engineContract.methods.mint(mintAmountInuUSD))
          .withContractCall(
            await this.prepareRemoveTokenOperator(this.collateralToken.contractAddress, this.ENGINE_ADDRESS, this.collateralToken.tokenId)
          )
      )
    }
  }

  @cache()
  public async getOwnAddress(): Promise<string> {
    return await this.tezos.wallet.pkh({ forceRefetch: true })
  }

  @cache()
  public async getOwnVaultAddress(): Promise<string> {
    return this.getFromStorageOrPersist(StorageKey.OWN_VAULT_ADDRESS, async () => {
      const source = await this.getOwnAddress()
      const engineContract = await this.engineContractPromise
      const storage = (await this.getStorageOfContract(engineContract)) as any
      const vaultContext = await this.getStorageValue(storage, 'vault_contexts', source)
      if (!vaultContext) {
        throw new Error('Account does not have a Vault yet!')
      }

      return vaultContext.address ?? source
    })
  }
  public async transferMutez(amountInMutez: number, address: string): Promise<string> {
    return this.sendAndAwait(
      this.tezos.wallet.transfer({
        to: address,
        amount: amountInMutez,
        mutez: true
      })
    )
  }

  public async setDeletage(delegate: string | null): Promise<string> {
    const engineContract = await this.engineContractPromise
    return this.sendAndAwait(engineContract.methods.set_vault_delegate(delegate))
  }

  public async depositCollateral(amountInMutez: number): Promise<string> {
    if (this.collateralToken.symbol === 'tez') {
      const ownVaultAddress = await this.getOwnVaultAddress()
      return this.transferMutez(amountInMutez, ownVaultAddress)
    } else {
      const engineContract = await this.engineContractPromise
      return this.sendAndAwait(
        this.tezos.wallet
          .batch()
          .withContractCall(
            await this.prepareAddTokenOperator(this.collateralToken.contractAddress, this.ENGINE_ADDRESS, this.collateralToken.tokenId)
          )
          .withContractCall(engineContract.methods.deposit(amountInMutez))
          .withContractCall(
            await this.prepareRemoveTokenOperator(this.collateralToken.contractAddress, this.ENGINE_ADDRESS, this.collateralToken.tokenId)
          )
      )
    }
  }

  public async withdrawCollateral(amountInMutez: number): Promise<string> {
    const engineContract = await this.engineContractPromise
    return this.sendAndAwait(engineContract.methods.withdraw(amountInMutez))
  }

  public async mint(mintAmount: number): Promise<string> {
    const engineContract = await this.engineContractPromise
    return this.sendAndAwait(engineContract.methods.mint(mintAmount))
  }

  public async burn(burnAmount: number): Promise<string> {
    const engineContract = await this.engineContractPromise
    return this.sendAndAwait(engineContract.methods.burn(burnAmount))
  }

  public async liquidate(tokenAmount: number, vaultOwner: string): Promise<string> {
    const engineContract = await this.engineContractPromise
    return this.sendAndAwait(engineContract.methods.liquidate(vaultOwner, tokenAmount))
  }

  public async transferToken(tokenAddress: string, recipient: string, tokenAmount: number, tokenId: number): Promise<string> {
    const source = await this.getOwnAddress()
    const tokenContract = await this.tezos.wallet.at(tokenAddress)
    return this.sendAndAwait(
      tokenContract.methods.transfer([
        {
          from_: source,
          txs: [
            {
              to_: recipient,
              token_id: tokenId,
              amount: tokenAmount
            }
          ]
        }
      ])
    )
  }

  public async transferSyntheticToken(recipient: string, tokenAmount: number): Promise<string> {
    return this.transferToken(this.TOKEN_ADDRESS, recipient, tokenAmount, Number(this.TOKEN_ID))
  }

  public async transferGovernanceToken(recipient: string, tokenAmount: number): Promise<string> {
    return this.transferToken(this.GOVERNANCE_TOKEN_ADDRESS, recipient, tokenAmount, Number(this.GOVERNANCE_TOKEN_ID))
  }

  public async addTokenOperator(tokenAddress: string, operator: string, tokenId: number): Promise<string> {
    return this.sendAndAwait(await this.prepareAddTokenOperator(tokenAddress, operator, tokenId))
  }

  public async prepareAddTokenOperator(tokenAddress: string, operator: string, tokenId: number): Promise<ContractMethod<Wallet>> {
    const source = await this.getOwnAddress()
    const tokenContract = await this.tezos.wallet.at(tokenAddress)
    return tokenContract.methods.update_operators([
      {
        add_operator: {
          owner: source,
          operator: operator,
          token_id: tokenId
        }
      }
    ])
  }

  public async prepareRemoveTokenOperator(tokenAddress: string, operator: string, tokenId: number): Promise<ContractMethod<Wallet>> {
    const source = await this.getOwnAddress()
    const tokenContract = await this.tezos.wallet.at(tokenAddress)
    return tokenContract.methods.update_operators([
      {
        remove_operator: {
          owner: source,
          operator: operator,
          token_id: tokenId
        }
      }
    ])
  }

  public async addSynthenticTokenOperator(operator: string): Promise<string> {
    return this.addTokenOperator(this.TOKEN_ADDRESS, operator, Number(this.TOKEN_ID))
  }

  public async addGovernanceTokenOperator(operator: string): Promise<string> {
    return this.addTokenOperator(this.GOVERNANCE_TOKEN_ADDRESS, operator, Number(this.GOVERNANCE_TOKEN_ID))
  }

  public async claimGovernanceToken(): Promise<string> {
    const governanceTokenContract = await this.governanceTokenContractPromise
    return this.sendAndAwait(governanceTokenContract.methods.claim(null))
  }

  public async depositToRewardsPool(tokenAmount: number): Promise<string> {
    const source = await this.getOwnAddress()
    const rewardsPoolContract = await this.rewardsPoolContractPromise

    let batchCall = this.tezos.wallet.batch()
    if (!(await this.isGovernanceTokenOperatorSet(this.REWARD_POOL_ADDRESS))) {
      const governanceTokenContract = await this.governanceTokenContractPromise
      batchCall = batchCall.withContractCall(
        governanceTokenContract.methods.update_operators([
          { add_operator: { owner: source, operator: this.REWARD_POOL_ADDRESS, token_id: Number(this.GOVERNANCE_TOKEN_ID) } }
        ])
      )
    }
    batchCall = batchCall.withContractCall(rewardsPoolContract.methods.deposit(tokenAmount))

    return this.sendAndAwait(batchCall)
  }

  public async claimRewards(): Promise<string> {
    const rewardsPoolContract = await this.rewardsPoolContractPromise
    return this.sendAndAwait(rewardsPoolContract.methods.claim(null))
  }

  public async claimAndStake(): Promise<string> {
    // TODO: Refactor this so the code is not duplicated in "depositToRewardsPool". We should find a way to batch our sdk methods together, we need that in a couple flows
    const claimableTokenAmount = await this.getClaimableGovernanceToken()
    const governanceTokenContract = await this.governanceTokenContractPromise

    const source = await this.getOwnAddress()
    const rewardsPoolContract = await this.rewardsPoolContractPromise

    let batchCall = this.tezos.wallet.batch()
    batchCall = batchCall.withContractCall(governanceTokenContract.methods.claim(null))

    if (!(await this.isGovernanceTokenOperatorSet(this.REWARD_POOL_ADDRESS))) {
      const governanceTokenContract = await this.governanceTokenContractPromise
      batchCall = batchCall.withContractCall(
        governanceTokenContract.methods.update_operators([
          { add_operator: { owner: source, operator: this.REWARD_POOL_ADDRESS, token_id: 0 } }
        ])
      )
    }
    batchCall = batchCall.withContractCall(rewardsPoolContract.methods.deposit(Math.floor(claimableTokenAmount.toNumber()).toString()))

    return this.sendAndAwait(batchCall)
  }

  public async withdrawFromRewardsPool(): Promise<string> {
    const rewardsPoolContract = await this.rewardsPoolContractPromise
    return this.sendAndAwait(rewardsPoolContract.methods.withdraw(null))
  }

  public async depositToSavingsPool(tokenAmount: number): Promise<string> {
    const source = await this.getOwnAddress()
    const savingsPoolContract = await this.savingsV2PoolContractPromise

    let batchCall = this.tezos.wallet.batch()
    if (!(await this.isSyntheticAssetOperatorSet(this.SAVINGS_V2_POOL_ADDRESS))) {
      const tokenContract = await this.tokenContractPromise
      batchCall = batchCall.withContractCall(
        tokenContract.methods.update_operators([
          { add_operator: { owner: source, operator: this.SAVINGS_V2_POOL_ADDRESS, token_id: this.TOKEN_ID } }
        ])
      )
    }
    batchCall = batchCall.withContractCall(savingsPoolContract.methods.deposit(tokenAmount))

    return this.sendAndAwait(batchCall)
  }

  public async withdrawFromSavingsPool(): Promise<string> {
    const savingsPoolContract = await this.savingsPoolContractPromise
    return this.sendAndAwait(savingsPoolContract.methods.withdraw(null))
  }

  public async withdrawFromSavingsPoolV2(): Promise<string> {
    const savingsPoolContract = await this.savingsV2PoolContractPromise
    return this.sendAndAwait(savingsPoolContract.methods.withdraw(null))
  }

  public async withdrawFromVestingPoolV2(): Promise<string> {
    const source = await this.getOwnAddress()
    const vestingContract = await this.savingsV2VestingContractPromise
    return this.sendAndAwait(
      vestingContract.methods.divest([
        {
          locker: this.SAVINGS_V2_POOL_ADDRESS,
          recipient: source
        }
      ])
    )
  }

  public async advertiseIntent(tokenAmount: number): Promise<string> {
    const source = await this.getOwnAddress()
    const optionsListingContract = await this.optionsListingContractPromise

    let batchCall = this.tezos.wallet.batch()
    if (!(await this.isSyntheticAssetOperatorSet(this.OPTIONS_LISTING_ADDRESS))) {
      const tokenContract = await this.tokenContractPromise
      batchCall = batchCall.withContractCall(
        tokenContract.methods.update_operators([
          {
            add_operator: {
              owner: source,
              operator: this.OPTIONS_LISTING_ADDRESS,
              token_id: this.TOKEN_ID
            }
          }
        ])
      )
    }
    batchCall = batchCall.withContractCall(optionsListingContract.methods.advertise_intent(tokenAmount))
    return this.sendAndAwait(batchCall)
  }

  public async removeIntent(): Promise<string> {
    const optionsListingContract = await this.optionsListingContractPromise
    return this.sendAndAwait(optionsListingContract.methods.remove_intent(null))
  }

  @cache()
  public async getIntentPayoutAmount(tokenAmount: number): Promise<BigNumber> {
    const marketPriceAmount = (await this.getTargetPrice()).multipliedBy(tokenAmount)
    return marketPriceAmount.minus(marketPriceAmount.dividedBy(2 ** 4)).dividedBy(this.PRECISION_FACTOR) // taking away the 6.25% fee
  }

  public async fulfillIntent(intentOwner: string, tokenAmount: number): Promise<string> {
    const payoutAmount = await this.getIntentPayoutAmount(tokenAmount)

    if (this.collateralToken.symbol === 'tez') {
      return await this.fulfillIntentTez(intentOwner, payoutAmount)
    } else {
      return await this.fulfillIntentToken(intentOwner, payoutAmount)
    }
  }

  public async fulfillIntentTez(intentOwner: string, tezAmount: BigNumber): Promise<string> {
    const optionsListingContract = await this.optionsListingContractPromise

    return this.sendAndAwait(
      this.tezos.wallet.batch().withTransfer(
        optionsListingContract.methods.fulfill_intent(intentOwner).toTransferParams({
          amount: Math.floor(tezAmount.toNumber()),
          mutez: true
        })
      )
    )
  }

  public async fulfillIntentToken(intentOwner: string, tokenAmount: BigNumber): Promise<string> {
    const optionsListingContract = await this.optionsListingContractPromise

    return this.sendAndAwait(
      this.tezos.wallet
        .batch()
        .withContractCall(
          await this.prepareAddTokenOperator(
            this.collateralToken.contractAddress,
            this.OPTIONS_LISTING_ADDRESS,
            this.collateralToken.tokenId
          )
        )
        .withContractCall(optionsListingContract.methods.fulfill_intent(intentOwner, Math.floor(tokenAmount.shiftedBy(6).toNumber())))
        .withContractCall(
          await this.prepareRemoveTokenOperator(
            this.collateralToken.contractAddress,
            this.OPTIONS_LISTING_ADDRESS,
            this.collateralToken.tokenId
          )
        )
    )
  }

  public async executeIntent(vaults: { vaultOwner: string; tokenAmount: number }[]): Promise<string> {
    const optionsListingContract = await this.optionsListingContractPromise

    const batch = this.tezos.wallet.batch()

    for (let vault of vaults) {
      batch.withContractCall(optionsListingContract.methods.execute_intent(vault.vaultOwner, vault.tokenAmount))
    }

    return this.sendAndAwait(batch)
  }

  public async bailout(tokenAmount: number): Promise<string> {
    const engineContract = await this.engineContractPromise
    return this.sendAndAwait(engineContract.methods.bailout(tokenAmount))
  }

  //Quipo Actions start here
  public async governanceTokenToTezSwap(tokenAmount: number, minimumReceived: number): Promise<string> {
    return new QuipuswapExchange(this.tezos, this.contracts.GOVERNANCE_DEX, this.tokens.xtzToken, this.tokens.youToken).token2ToToken1(
      tokenAmount,
      minimumReceived
    )
  }

  public async tezToGovernanceSwap(amountInMutez: number, minimumReceived: number): Promise<string> {
    return new QuipuswapExchange(this.tezos, this.contracts.GOVERNANCE_DEX, this.tokens.xtzToken, this.tokens.youToken).token1ToToken2(
      amountInMutez,
      minimumReceived
    )
  }

  // Values and Numbers start here
  public startChainWatcher() {
    if (this.chainWatcherIntervalId === undefined) {
      this.chainWatcherIntervalId = setInterval(async () => {
        const block = await this.tezos.rpc.getBlock()
        if (block.hash !== this.lastBlockHash) {
          await this.clearCache()
          this.chainUpdateCallbacks.map((callback) => {
            callback()
          })
        }
        this.lastBlockHash = block.hash
      }, 1000 * 10)
    }
  }

  public async watchChainUpdate(callback: () => void) {
    this.chainUpdateCallbacks.push(callback)
  }

  public async clearChainUpdateWatchers() {
    this.chainUpdateCallbacks = []
  }

  @cache()
  public async getSyntheticAssetTotalSupply(): Promise<BigNumber> {
    const engineContract = await this.engineContractPromise
    const storage = (await this.getStorageOfContract(engineContract)) as any
    return new BigNumber(storage['total_supply'])
  }

  // TODO: Can we replace this with the Quipuswap class?
  @cache()
  private async getExchangeRate(dexAddress: string): Promise<BigNumber> {
    const dexContract = await this.getContractWalletAbstraction(dexAddress)
    const storage = (await this.getStorageOfContract(dexContract)) as any
    return new BigNumber(storage['storage']['token_pool'])
      .dividedBy(10 ** this.TOKEN_DECIMALS)
      .dividedBy(new BigNumber(storage['storage']['tez_pool']).dividedBy(10 ** this.TEZ_DECIMALS))
  }

  // TODO: Can we replace this with the Quipuswap class?
  @cache()
  public async getExchangeMaximumTokenAmount(dexAddress: string): Promise<BigNumber> {
    const dexContract = await this.getContractWalletAbstraction(dexAddress)
    const storage = (await this.getStorageOfContract(dexContract)) as any
    const currentTokenPool = new BigNumber(storage['storage']['token_pool'])
    return currentTokenPool.dividedBy(3)
  }

  // TODO: Can we replace this with the Quipuswap class?
  @cache()
  public async getExchangeMaximumTezAmount(dexAddress: string): Promise<BigNumber> {
    const dexContract = await this.getContractWalletAbstraction(dexAddress)
    const storage = (await this.getStorageOfContract(dexContract)) as any
    const currentTezPool = new BigNumber(storage['storage']['tez_pool'])
    return currentTezPool.dividedBy(3)
  }

  // TODO: Can we replace this with the Quipuswap class?
  @cache()
  public async getGovernanceTokenExchangeMaximumTezAmount(): Promise<BigNumber> {
    return this.getExchangeMaximumTezAmount(this.GOVERNANCE_DEX)
  }

  // TODO: Can we replace this with the Quipuswap class?
  @cache()
  public async getGovernanceTokenExchangeMaximumTokenAmount(): Promise<BigNumber> {
    return this.getExchangeMaximumTokenAmount(this.GOVERNANCE_DEX)
  }

  @cache()
  public async getSyntheticAssetExchangeRate(): Promise<BigNumber> {
    return new QuipuswapExchange(this.tezos, this.contracts.DEX[0].address, this.tokens.xtzToken, this.token).getExchangeRate()
  }

  // TODO: Can we replace this with the Quipuswap class?
  @cache()
  public async getGovernanceTokenExchangeRate(): Promise<BigNumber> {
    return this.getExchangeRate(this.GOVERNANCE_DEX)
  }

  @cache()
  public async getTokenAssetExchangeInstance(dexType: DexType, dexAddress: string, token1: Token, token2: Token): Promise<Exchange> {
    if (dexType === DexType.QUIPUSWAP) {
      return new QuipuswapExchange(this.tezos, dexAddress, token1, token2)
    } else if (dexType === DexType.PLENTY) {
      return new PlentyExchange(this.tezos, dexAddress, token1, token2)
    } else {
      throw new Error('Unknown DEX')
    }
  }

  @cache()
  public async getTargetExchangeRate(): Promise<BigNumber> {
    return (await this.getObservedPrice()).dividedBy(await this.getTargetPrice())
  }

  @cache()
  public async getObservedPrice(): Promise<BigNumber> {
    console.log(
      'getObservedPrice',
      this.token.symbol,
      new BigNumber(1)
        .dividedBy(await this.getSyntheticAssetExchangeRate())
        .multipliedBy(10 ** this.collateralToken.decimals)
        .toString()
    )
    return new BigNumber(1).dividedBy(await this.getSyntheticAssetExchangeRate()).multipliedBy(10 ** 6)
  }

  @cache()
  public async getTargetPrice(): Promise<BigNumber> {
    const targetOracleContract = await this.targetOracleContractPromise
    const targetPrice = (await this.getStorageOfContract(targetOracleContract)) as any
    return new BigNumber(this.PRECISION_FACTOR).div(targetPrice.price)
  }

  @cache()
  public async getMaxMintableAmount(amountInMutez: BigNumber | number): Promise<BigNumber> {
    const targetPrice = await this.getTargetPrice()
    return (
      new BigNumber(amountInMutez)
        .dividedBy(3)
        .dividedBy(new BigNumber(targetPrice))
        //.multipliedBy(this.ONE_TOKEN)
        .multipliedBy(10 ** (this.collateralToken.symbol === 'tez' ? 12 : 6) /* this.ONE_TOKEN */) // TODO: ???
    )
  }

  @cache()
  public async getAccountMaxMintableAmount(account: string): Promise<BigNumber> {
    const balance = await this.getCollateralTokenWalletBalance(account)
    return this.getMaxMintableAmount(balance)
  }

  @cache()
  public async getOwnMaxMintableAmount(): Promise<BigNumber> {
    const source = await this.getOwnAddress()
    return this.getAccountMaxMintableAmount(source)
  }

  @cache()
  @trycatch(new BigNumber(0))
  public async getVaultMaxMintableAmount(): Promise<BigNumber> {
    const source = await this.getOwnAddress()
    const engineContract = await this.engineContractPromise

    const storage = (await this.getStorageOfContract(engineContract)) as any
    const vaultContext = await this.getStorageValue(storage, 'vault_contexts', source)
    if (this.collateralToken.symbol === 'tez') {
      if (!vaultContext.address) {
        throw new Error('No Vault address!')
      }
    }

    return this.getMaxMintableAmount(vaultContext.balance)
  }

  @cache()
  public async getVaultCollateralisation(): Promise<BigNumber> {
    console.log('getVaultMaxMintableAmount', (await this.getVaultMaxMintableAmount()).toString())
    console.log('getMintedSyntheticAsset', (await this.getMintedSyntheticAsset()).toString())
    return (await this.getVaultMaxMintableAmount()).dividedBy(await this.getMintedSyntheticAsset())
  }

  @cache()
  public async getCollateralisationUsage(): Promise<BigNumber> {
    return new BigNumber(1).dividedBy(await this.getVaultCollateralisation())
  }

  @cache()
  public async getExpectedWeeklyGovernanceRewards(mintedAmount: number): Promise<BigNumber> {
    const targetPrice = await this.getTargetPrice()

    const governanceTokenContract = await this.governanceTokenContractPromise
    const governanceTokenStorage: GovernanceTokenStorage = (await this.getStorageOfContract(governanceTokenContract)) as any
    const totalStake = new BigNumber(governanceTokenStorage.total_stake)
    const weight = new BigNumber(targetPrice).multipliedBy(mintedAmount).dividedBy(totalStake.plus(mintedAmount))

    return (await this.getWeeklyGovernanceTokenIssuance()).multipliedBy(weight)
  }

  @cache()
  public async getWeeklyGovernanceTokenIssuance(): Promise<BigNumber> {
    return new BigNumber(40000 * 10 ** this.TOKEN_DECIMALS)
  }

  @cache()
  public async getGovernanceTokenTotalSupply(): Promise<BigNumber> {
    const governanceTokenContract = await this.governanceTokenContractPromise
    const governanceTokenStorage: GovernanceTokenStorage = (await this.getStorageOfContract(governanceTokenContract)) as any
    const timedelta = (new Date().getTime() - Date.parse(governanceTokenStorage['epoch_start_timestamp'])) / 1000
    return new BigNumber(timedelta * this.GOVERNANCE_TOKEN_ISSUANCE_RATE).times(1.125) // 1.125 for the 5k YOU that go to us
  }

  @cache()
  public async getYearlyLiabilityInterestRate(): Promise<BigNumber> {
    return (await this.getYearlyAssetInterestRate()).plus(await this.getYearlySpreadInterestRate()).minus(1)
  }

  @cache()
  public async getYearlyAssetInterestRate(): Promise<BigNumber> {
    const engineContract = await this.engineContractPromise
    const engineStorage: EngineStorage = (await this.getStorageOfContract(engineContract)) as any
    return new BigNumber(
      new BigNumber(engineStorage.reference_interest_rate).plus(this.ONE_TOKEN).dividedBy(this.ONE_TOKEN).toNumber() ** (60 * 60 * 24 * 365)
    )
  }

  @cache()
  public async getYearlySpreadInterestRate(): Promise<BigNumber> {
    return new BigNumber(
      new BigNumber(this.SECONDS_INTEREST_SPREAD).plus(this.ONE_TOKEN).dividedBy(this.ONE_TOKEN).toNumber() ** (60 * 60 * 24 * 365)
    )
  }

  public async getClaimableGovernanceToken(): Promise<BigNumber> {
    const source = await this.getOwnAddress()
    const governanceTokenContract = await this.governanceTokenContractPromise
    const governanceTokenStorage: GovernanceTokenStorage = (await this.getStorageOfContract(governanceTokenContract)) as any

    let currentDistFactor = new BigNumber(governanceTokenStorage['dist_factor'])
    const ownStake = new BigNumber(await this.getStorageValue(governanceTokenStorage, 'stakes', source))
    const ownDistFactor = new BigNumber(await this.getStorageValue(governanceTokenStorage, 'dist_factors', source))
    const timedelta = (new Date().getTime() - Date.parse(governanceTokenStorage['last_update_timestamp'])) / 1000
    const totalStake = new BigNumber(governanceTokenStorage['total_stake'])
    currentDistFactor = currentDistFactor.plus(
      new BigNumber(timedelta * this.GOVERNANCE_TOKEN_ISSUANCE_RATE * this.PRECISION_FACTOR).dividedBy(totalStake)
    )

    return ownStake.multipliedBy(currentDistFactor.minus(ownDistFactor)).dividedBy(this.PRECISION_FACTOR)
  }

  @cache()
  public async getClaimableRewards(): Promise<BigNumber> {
    const source = await this.getOwnAddress()
    const rewardsPoolContract = await this.rewardsPoolContractPromise
    const rewardsPoolStorage: RewardsPoolStorage = (await this.getStorageOfContract(rewardsPoolContract)) as any

    let currentDistFactor = new BigNumber(rewardsPoolStorage['dist_factor'])
    const ownStake = new BigNumber(await this.getStorageValue(rewardsPoolStorage, 'stakes', source))
    const ownDistFactor = new BigNumber(await this.getStorageValue(rewardsPoolStorage, 'dist_factors', source))

    return ownStake.multipliedBy(currentDistFactor.minus(ownDistFactor)).dividedBy(this.PRECISION_FACTOR)
  }

  @cache()
  public async getClaimableSavingsPayout(): Promise<BigNumber | undefined> {
    const source = await this.getOwnAddress()
    const savingsPoolContract = await this.savingsV2PoolContractPromise
    const savingsPoolStorage: SavingsPoolStorage = (await this.getStorageOfContract(savingsPoolContract)) as any

    let currentDistFactor = new BigNumber(savingsPoolStorage['dist_factor'])

    const ownStake: BigNumber | undefined = new BigNumber(await this.getStorageValue(savingsPoolStorage, 'stakes', source))
    const ownDistFactor: BigNumber | undefined = new BigNumber(await this.getStorageValue(savingsPoolStorage, 'dist_factors', source))

    return ownStake.multipliedBy(currentDistFactor.minus(ownDistFactor)).dividedBy(this.PRECISION_FACTOR)
  }

  @cache()
  public async getVestedSavings(): Promise<VestingLedgerValue> {
    const source = await this.getOwnAddress()
    const vestingContract = await this.savingsV2VestingContractPromise
    const vestingStorage: VestingStorage = (await this.getStorageOfContract(vestingContract)) as any
    const ownVested: VestingLedgerValue = await this.getStorageValue(vestingStorage, 'ledger', {
      owner: source,
      locker: this.SAVINGS_V2_POOL_ADDRESS
    })

    return ownVested
  }

  @cache()
  public async getRequiredCollateral(): Promise<BigNumber> {
    const targetPrice = await this.getTargetPrice()
    return (
      (await this.getMintedSyntheticAsset())
        .multipliedBy(new BigNumber(targetPrice))
        .multipliedBy(3)
        //.dividedBy(this.PRECISION_FACTOR)
        .dividedBy(10 ** (this.collateralToken.symbol === 'tez' ? 12 : 6) /*this.PRECISION_FACTOR*/) // TODO: ???
    )
  }

  @cache()
  public async getVaultContext(tzAddress: string): Promise<VaultContext> {
    const engineContract = await this.engineContractPromise
    const storage = (await this.getStorageOfContract(engineContract)) as any
    const vaultContext: VaultContext = await this.getStorageValue(storage, 'vault_contexts', tzAddress)

    return vaultContext
  }

  @cache()
  public async getOwnVaultContext(): Promise<VaultContext> {
    const source = await this.getOwnAddress()

    return await this.getVaultContext(source)
  }

  @cache()
  @trycatch(new BigNumber(0))
  public async getMintedSyntheticAsset(): Promise<BigNumber> {
    const engineContract = await this.engineContractPromise
    const storage = (await this.getStorageOfContract(engineContract)) as any

    return new BigNumber((await this.getOwnVaultContext()).minted)
      .multipliedBy(new BigNumber(storage['compound_interest_rate']))
      .dividedBy(this.PRECISION_FACTOR)
  }

  @cache()
  public async getWithdrawableCollateral(): Promise<BigNumber> {
    return (await this.getOwnVaultBalance()).minus(await this.getRequiredCollateral())
  }

  @cache()
  @trycatch(new BigNumber(0))
  public async getMintableAmount(): Promise<BigNumber> {
    const maxMintable = await this.getVaultMaxMintableAmount()
    const res = maxMintable.minus(await this.getMintedSyntheticAsset())
    return res
  }

  @cache()
  public async getVaultDelegate(): Promise<string | null> {
    return this.getDelegate((await this.getOwnVaultContext()).address)
  }

  @cache()
  public async getAllowsSettlement(): Promise<boolean | undefined> {
    if (this.ENGINE_TYPE !== EngineType.TRACKER_V2) {
      return true
    } else {
      return this.getFromStorageOrPersist(StorageKey.ALLOWS_SETTLEMENT, async () => {
        const source = await this.getOwnAddress()
        const engineContract = await this.engineContractPromise
        const storage = (await this.getStorageOfContract(engineContract)) as any
        const vaultContext = await this.getStorageValue(storage, 'vault_contexts', source)

        if (!vaultContext) {
          throw new Error('Account does not have a Vault yet!')
        }

        return vaultContext.allows_settlement
      })
    }
  }

  @cache()
  public async isOperatorSet(tokenContractAddress: string, operator: string, tokenId: number): Promise<boolean> {
    const source = await this.getOwnAddress()
    const tokenContract = await this.tezos.wallet.at(tokenContractAddress)
    const tokenStorage = (await this.getStorageOfContract(tokenContract)) as any
    const isOperatorSet = await this.getStorageValue(tokenStorage, 'operators', {
      owner: source,
      operator: operator,
      token_id: tokenId
    })
    return isOperatorSet !== undefined
  }

  @cache()
  public async isSyntheticAssetOperatorSet(operator: string): Promise<boolean> {
    return this.isOperatorSet(this.TOKEN_ADDRESS, operator, Number(this.TOKEN_ID))
  }

  @cache()
  public async isGovernanceTokenOperatorSet(operator: string): Promise<boolean> {
    return this.isOperatorSet(this.GOVERNANCE_TOKEN_ADDRESS, operator, Number(this.GOVERNANCE_TOKEN_ID))
  }

  @cache()
  public async getTokenAmount(tokenContractAddress: string, owner: string, tokenId: number): Promise<BigNumber> {
    const tokenContract = await this.tezos.wallet.at(tokenContractAddress)
    const tokenStorage = (await this.getStorageOfContract(tokenContract)) as any
    const tokenAmount = await this.getStorageValue(tokenStorage, 'ledger', {
      owner: owner,
      token_id: tokenId
    })
    return new BigNumber(tokenAmount ? tokenAmount : 0)
  }

  @cache()
  public async getOwnCollateralTokenWalletBalance(): Promise<BigNumber> {
    const source = await this.getOwnAddress()
    return this.getCollateralTokenWalletBalance(source)
  }

  @cache()
  public async getCollateralTokenWalletBalance(address: string): Promise<BigNumber> {
    if (this.collateralToken.symbol === 'tez') {
      return this.getTezWalletBalance(address)
    }

    return this.getTokenAmount(this.collateralToken.contractAddress, address, this.collateralToken.tokenId)
  }

  @cache()
  public async getOwnSyntheticAssetTokenAmount(): Promise<BigNumber> {
    const source = await this.getOwnAddress()
    return this.getTokenAmount(this.TOKEN_ADDRESS, source, Number(this.TOKEN_ID))
  }

  @cache()
  public async getOwnGovernanceTokenAmount(): Promise<BigNumber> {
    const source = await this.getOwnAddress()
    return this.getTokenAmount(this.GOVERNANCE_TOKEN_ADDRESS, source, Number(this.GOVERNANCE_TOKEN_ID))
  }

  @cache()
  public async getSavingsPoolYearlyInterestRate(): Promise<BigNumber> {
    const syntheticAssetTotalSupply = await this.getSyntheticAssetTotalSupply()
    return syntheticAssetTotalSupply
      .multipliedBy((await this.getYearlyAssetInterestRate()).minus(1))
      .dividedBy(await this.getTokenAmount(this.TOKEN_ADDRESS, this.SAVINGS_V2_POOL_ADDRESS, Number(this.TOKEN_ID)))
  }

  @cache()
  public async getSavingsPoolTokenAmount(): Promise<BigNumber> {
    return this.getTokenAmount(this.TOKEN_ADDRESS, this.SAVINGS_V2_POOL_ADDRESS, Number(this.TOKEN_ID))
  }

  @cache()
  public async getRewardsPoolTokenAmount(): Promise<BigNumber> {
    return this.getTokenAmount(this.GOVERNANCE_TOKEN_ADDRESS, this.REWARD_POOL_ADDRESS, Number(this.GOVERNANCE_TOKEN_ID))
  }

  @cache()
  public async getExpectedYearlySavingsPoolReturn(tokenAmount: number): Promise<BigNumber> {
    return (await this.getSavingsPoolYearlyInterestRate()).multipliedBy(tokenAmount)
  }

  @cache()
  public async getFutureExpectedYearlySavingsPoolReturn(oldAmount: number, newAmount: number): Promise<BigNumber> {
    const ratio = await this.getFutureSavingsPoolRatio(new BigNumber(oldAmount), new BigNumber(newAmount))

    return ratio.times(await this.getTotalExpectedYearlySavingsPoolReturn())
  }

  @cache()
  public async getTotalExpectedYearlySavingsPoolReturn(): Promise<BigNumber> {
    const syntheticAssetTotalSupply = await this.getSyntheticAssetTotalSupply()

    return syntheticAssetTotalSupply.multipliedBy((await this.getYearlyAssetInterestRate()).minus(1))
  }

  @cache()
  public async getExpectedYearlyRewardPoolReturn(tokenAmount: number): Promise<BigNumber> {
    const rewardsPoolContract = await this.rewardsPoolContractPromise
    const rewardsPoolStorage: RewardsPoolStorage = (await this.getStorageOfContract(rewardsPoolContract)) as any
    return (await this.getTotalExpectedYearlyRewardPoolReturn())
      .multipliedBy(tokenAmount)
      .dividedBy(new BigNumber(rewardsPoolStorage['total_stake']))
  }

  @cache()
  public async getFutureExpectedYearlyRewardPoolReturn(oldAmount: number, newAmount: number): Promise<BigNumber> {
    const rewardsPoolContract = await this.rewardsPoolContractPromise
    const rewardsPoolStorage: RewardsPoolStorage = (await this.getStorageOfContract(rewardsPoolContract)) as any
    return (await this.getTotalExpectedYearlyRewardPoolReturn())
      .multipliedBy(new BigNumber(oldAmount).plus(newAmount))
      .dividedBy(new BigNumber(rewardsPoolStorage['total_stake']).plus(newAmount))
  }

  @cache()
  public async getTotalExpectedYearlyRewardPoolReturn(): Promise<BigNumber> {
    const syntheticAssetTotalSupply = await this.getSyntheticAssetTotalSupply()
    return syntheticAssetTotalSupply.multipliedBy((await this.getYearlySpreadInterestRate()).minus(1))
  }

  @cache()
  public async getOwnRewardPoolStake(): Promise<BigNumber> {
    const source = await this.getOwnAddress()
    const rewardsPoolContract = await this.rewardsPoolContractPromise
    const rewardsPoolStorage: RewardsPoolStorage = (await this.getStorageOfContract(rewardsPoolContract)) as any
    return new BigNumber(await this.getStorageValue(rewardsPoolStorage, 'stakes', source))
  }

  @cache()
  public async getTotalRewardPoolStake(): Promise<BigNumber> {
    const rewardsPoolContract = await this.rewardsPoolContractPromise
    const rewardsPoolStorage: RewardsPoolStorage = (await this.getStorageOfContract(rewardsPoolContract)) as any
    const totalStake = rewardsPoolStorage['total_stake']
    return new BigNumber(totalStake)
  }
  @cache()
  public async getRewardsPoolRatio(amount?: BigNumber): Promise<BigNumber> {
    const totalRewardPoolStake = await this.getTotalRewardPoolStake()
    const ownRewardPoolStake = amount ?? (await this.getOwnRewardPoolStake())
    const ratio = ownRewardPoolStake.dividedBy(totalRewardPoolStake)
    return new BigNumber(ratio)
  }
  /**
   * This method will calculate the pool ratio for an amount that will be added to the pool
   */
  @cache()
  public async getFutureRewardsPoolRatio(oldAmount: BigNumber, newAmount: BigNumber): Promise<BigNumber> {
    const totalFutureRewardPoolStake = (await this.getTotalRewardPoolStake()).plus(newAmount)
    const ratio = oldAmount.plus(newAmount).dividedBy(totalFutureRewardPoolStake)
    return new BigNumber(ratio)
  }

  @cache()
  public async getOwnSavingsV1PoolStake(): Promise<BigNumber | undefined> {
    if (this.symbol !== 'uUSD') {
      return new BigNumber(0)
    }

    const source = await this.getOwnAddress()
    const savingsPoolContract = await this.savingsPoolContractPromise
    const savingsPoolStorage: SavingsPoolStorage = (await this.getStorageOfContract(savingsPoolContract)) as any
    const stakes = await this.getStorageValue(savingsPoolStorage, 'stakes', source)

    if (!stakes) {
      return new BigNumber(0)
    }

    return new BigNumber(stakes).multipliedBy(new BigNumber(savingsPoolStorage['disc_factor'])).dividedBy(this.PRECISION_FACTOR)
  }
  @cache()
  public async getOwnSavingsV2PoolStake(): Promise<BigNumber | undefined> {
    const source = await this.getOwnAddress()
    const savingsPoolContract = await this.savingsV2PoolContractPromise
    const savingsPoolStorage: SavingsPoolStorage = (await this.getStorageOfContract(savingsPoolContract)) as any
    const stakes = await this.getStorageValue(savingsPoolStorage, 'stakes', source)

    if (!stakes) {
      return new BigNumber(0)
    }

    return new BigNumber(stakes).multipliedBy(new BigNumber(savingsPoolStorage['disc_factor'])).dividedBy(this.PRECISION_FACTOR)
  }

  @cache()
  public async getTotalSavingsPoolStake(): Promise<BigNumber> {
    const savingsPoolContract = await this.savingsV2PoolContractPromise
    const savingsPoolStorage: SavingsPoolStorage = (await this.getStorageOfContract(savingsPoolContract)) as any
    const totalStake = savingsPoolStorage['total_stake']
    return new BigNumber(totalStake).multipliedBy(new BigNumber(savingsPoolStorage['disc_factor'])).dividedBy(this.PRECISION_FACTOR)
  }

  @cache()
  public async getSavingsPoolRatio(amount?: BigNumber): Promise<BigNumber | undefined> {
    const savingsPoolTokenAmount = await this.getSavingsPoolTokenAmount()
    const ownSavingsPoolStake = amount ?? (await this.getOwnSavingsV2PoolStake())
    const ratio = ownSavingsPoolStake ? ownSavingsPoolStake.dividedBy(savingsPoolTokenAmount) : undefined
    return ratio ? new BigNumber(ratio) : undefined
  }

  /**
   * This method will calculate the pool ratio for an amount that will be added to the pool
   */
  @cache()
  public async getFutureSavingsPoolRatio(oldAmount: BigNumber, newAmount: BigNumber): Promise<BigNumber> {
    const savingsPoolTokenAmount = (await this.getSavingsPoolTokenAmount()).plus(newAmount)
    const ratio = oldAmount.plus(newAmount).dividedBy(savingsPoolTokenAmount)
    return new BigNumber(ratio)
  }

  @cache()
  public async getSavingsAvailableTokens(): Promise<BigNumber> {
    const savingsPoolContract = await this.savingsV2PoolContractPromise
    const savingsPoolStorage: SavingsPoolStorage = (await this.getStorageOfContract(savingsPoolContract)) as any
    return new BigNumber(savingsPoolStorage['total_stake'])
      .multipliedBy(new BigNumber(savingsPoolStorage['disc_factor']))
      .dividedBy(this.PRECISION_FACTOR)
  }

  @cache()
  public async getIntent(intentOwner: string): Promise<Intent> {
    const optionsListingContract = await this.optionsListingContractPromise
    const optionsListingStorage: OptionsListingStroage = (await this.getStorageOfContract(optionsListingContract)) as any
    const intent = await this.getStorageValue(optionsListingStorage, 'intents', intentOwner)
    intent.owner = intentOwner
    return intent
  }

  @cache()
  public async getOwnIntent(): Promise<Intent> {
    const source = await this.getOwnAddress()
    return this.getIntent(source)
  }

  @cache()
  public async getOwnIntentTokenAmount(): Promise<BigNumber> {
    return new BigNumber((await this.getOwnIntent()).token_amount)
  }

  @cache()
  public async getOwnIntentAdvertisementStart(): Promise<Date> {
    return new Date(Date.parse((await this.getOwnIntent()).start_timestamp))
  }

  @cache()
  public async getTotalBalanceInVaults(): Promise<BigNumber> {
    const query = `
      {
        vault_aggregate(where: { engine_contract_address: { _eq: "${this.ENGINE_ADDRESS}" } }) {
          aggregate {
            sum {
              balance
            }
          }
        }
      }
    `
    const response = await request(this.indexerEndpoint, query)
    return new BigNumber(response['vault_aggregate']['aggregate']['sum']['balance'])
  }

  @cache()
  public async getVaultCount(): Promise<BigNumber> {
    const query = `
      {
        vault_aggregate(where: { engine_contract_address: { _eq: "${this.ENGINE_ADDRESS}" } }) {
          aggregate {
            count
          }
        }
      }
    `
    const response = await request(this.indexerEndpoint, query)
    return new BigNumber(response['vault_aggregate']['aggregate']['count'])
  }

  @cache()
  public async getTotalMinted(): Promise<BigNumber> {
    const query = `
      {
        vault_aggregate(where: { engine_contract_address: { _eq: "${this.ENGINE_ADDRESS}" } }) {
          aggregate {
            sum {
              minted
            }
          }
        }
      }
    `
    const response = await request(this.indexerEndpoint, query)
    const engineContract = await this.engineContractPromise
    const storage = (await this.getStorageOfContract(engineContract)) as any
    return new BigNumber(response['vault_aggregate']['aggregate']['sum']['minted'])
      .multipliedBy(new BigNumber(storage['compound_interest_rate']))
      .dividedBy(this.PRECISION_FACTOR)
  }

  @cache()
  public async getMintedInTimeRange(from: Date, to: Date): Promise<BigNumber> {
    const query = `
    query { 
      activity_aggregate(
        where: { 
          event: { _eq: "MINT" }
          created: { 
              _gte: "${from.toISOString()}" 
              _lte: "${to.toISOString()}" 
          }
        }) 
        {
          aggregate {
              sum {
                  token_amount
              }
          }
        }
      }
    `
    const response = await request(this.indexerEndpoint, query)
    return new BigNumber(response['activity_aggregate']['aggregate']['sum']['token_amount'])
  }

  @cache()
  public async getBurntInTimeRange(from: Date, to: Date): Promise<BigNumber> {
    const query = `
    query { 
      activity_aggregate(
        where: { 
          event: { _eq: "BURN" }
          created: { 
              _gte: "${from.toISOString()}" 
              _lte: "${to.toISOString()}" 
          }
        }) 
        {
          aggregate {
              sum {
                  token_amount
              }
          }
        }
    }
    `
    const response = await request(this.indexerEndpoint, query)
    return new BigNumber(response['activity_aggregate']['aggregate']['sum']['token_amount'])
  }

  @cache()
  public async getRewardPoolAPY(from: Date, to: Date): Promise<BigNumber> {
    const poolStake = await this.getTotalRewardPoolStake()
    const mintedTokenAmount = await this.getMintedInTimeRange(from, to)
    const yearlyFactor = this.YEARLY_WEEKS_MILLIS / (to.getTime() - from.getTime())
    return mintedTokenAmount
      .multipliedBy(this.MINTING_FEE)
      .dividedBy(poolStake)
      .dividedBy(await this.getSyntheticAssetExchangeRate())
      .multipliedBy(await this.getGovernanceTokenExchangeRate())
      .multipliedBy(yearlyFactor)
  }

  @cache()
  public async getMintingPoolAPY(): Promise<BigNumber> {
    const requiredMutezPerSynthetic = new BigNumber(3).multipliedBy(await this.getTargetPrice())
    const expectedYearlyGovernanceToken = (await this.getExpectedWeeklyGovernanceRewards(this.ONE_TOKEN)).multipliedBy(52)
    return expectedYearlyGovernanceToken
      .dividedBy(await this.getGovernanceTokenExchangeRate())
      .dividedBy(requiredMutezPerSynthetic)
      .dividedBy(10 ** 6)
  }

  @cache()
  public async getTotalCollateralRatio(): Promise<BigNumber> {
    return (await this.getTotalBalanceInVaults())
      .dividedBy(await this.getTargetPrice())
      .dividedBy(await this.getTotalMinted())
      .multipliedBy(10 ** (this.collateralToken.symbol === 'tez' ? 12 : 6)) // TODO: ???
    // .multipliedBy(10 ** this.TOKEN_DECIMALS)
  }

  @cache()
  public async getVaultCollateralRatio(): Promise<BigNumber> {
    return (await this.getOwnVaultBalance())
      .dividedBy(await this.getTargetPrice())
      .dividedBy(await this.getMintedSyntheticAsset())
      .multipliedBy(10 ** (this.collateralToken.symbol === 'tez' ? 12 : 6)) // TODO: ???
    // .multipliedBy(10 ** this.TOKEN_DECIMALS)
  }

  @cache()
  public async getLiquidationPrice(): Promise<BigNumber> {
    const emergency = '2.0' // 200% Collateral Ratio
    return (await this.getOwnVaultBalance())
      .dividedBy((await this.getMintedSyntheticAsset()).times(emergency))
      .multipliedBy(10 ** (this.collateralToken.symbol === 'tez' ? 12 : 6)) // TODO: ???
    // .multipliedBy(10 ** this.TOKEN_DECIMALS)
  }

  @cache()
  public async getAmountToLiquidate(balance: BigNumber, mintedAmount: BigNumber): Promise<BigNumber> {
    const targetPrice = await this.getTargetPrice()

    return new BigNumber(1.6)
      .multipliedBy(
        mintedAmount.minus(balance.dividedBy(new BigNumber(3).multipliedBy(new BigNumber(this.PRECISION_FACTOR).dividedBy(targetPrice))))
      )
      .minus(new BigNumber(10 ** 6))
  }

  @cache()
  public async getOwnAmountToLiquidate(): Promise<BigNumber> {
    const vaultBalance = await this.getOwnVaultBalance()
    const mintedSyntheticAsset = await this.getMintedSyntheticAsset()

    return await this.getAmountToLiquidate(vaultBalance, mintedSyntheticAsset)
  }

  @cache()
  public async getReceivedMutez(balance: BigNumber, mintedAmount: BigNumber): Promise<BigNumber> {
    const amountToLiquidate = await this.getAmountToLiquidate(balance, mintedAmount)
    const targetPrice = await this.getTargetPrice()
    const BONUS = 1.125

    return amountToLiquidate
      .multipliedBy(targetPrice)
      .multipliedBy(new BigNumber(BONUS))
      .dividedBy(new BigNumber(10 ** 18))
  }

  @cache()
  public async getOwnReceivedMutez(): Promise<BigNumber> {
    const amountToLiquidate = await this.getOwnAmountToLiquidate()
    const targetPrice = await this.getTargetPrice()
    const BONUS = 1.125

    return amountToLiquidate
      .multipliedBy(targetPrice)
      .multipliedBy(new BigNumber(BONUS))
      .dividedBy(new BigNumber(10 ** 18))
  }

  @cache()
  public async getIntents(dateThreshold: Date = new Date(0), tokenAmountThreshold: BigNumber = new BigNumber(0)): Promise<Intent[]> {
    const query = `
    {
      intent(
        where: {
          engine_contract_address: { _eq: "${this.ENGINE_ADDRESS}" } 
          start_timestamp: { _gte: "${dateThreshold.toISOString()}" }
          token_amount: { _gte: "${tokenAmountThreshold.toString()}" }
        }
      ) {
          owner
          token_amount
          start_timestamp
      }
    }
    `
    const response = await request(this.indexerEndpoint, query)
    return response['intent']
  }
  @cache()
  public async getActivity(vaultAddress: string, orderKey: string = 'created', orderDirection: string = 'desc'): Promise<Activity[]> {
    const order = `order_by: { ${orderKey}:${orderDirection} }`
    const query = `
    query {
      activity(
        where: { engine_contract_address: { _eq: "${this.ENGINE_ADDRESS}" } vault: {address:{_eq:"${vaultAddress}"}}} 
        ${order}
      ) {
        operation_hash
        event
        created
        token_amount
        collateral_token_amount
        vault {
          address
        }
      }
    }
    `
    const response = await request(this.indexerEndpoint, query)
    return response['activity']
  }

  @cache()
  public async getExecutableVaults(): Promise<Vault[]> {
    const query = `
    query {
      vault(where: { engine_contract_address: { _eq: "${this.ENGINE_ADDRESS}" } } order_by: { ratio:asc }) {
          owner
          address
          ratio
          balance
          minted
      }
    }    
    `
    const response = await request(this.indexerEndpoint, query)
    return response['vault']
  }

  @cache()
  public async getFullfillableIntents(): Promise<Intent[]> {
    return this.getIntents(new Date(Date.now() - 48 * 3600 * 1000), new BigNumber(1_000_000_000))
  }

  public async clearCache() {
    globalPromiseCache.clear()
  }

  @cache()
  private async getContractWalletAbstraction(address: string): Promise<ContractAbstraction<Wallet>> {
    return this.tezos.wallet.at(address)
  }

  @cache()
  private async getStorageOfContract(contract: ContractAbstraction<Wallet>) {
    return contract.storage()
  }

  @cache()
  private async getStorageValue(storage: any, key: string, source: any) {
    return storage[key].get(source)
  }

  private async getFromStorageOrPersist(storageKey: StorageKey, method: <K extends StorageKey>() => Promise<StorageKeyReturnType[K]>) {
    const key: any = `${this.symbol}-${storageKey}`
    const storage = await this.storage.get(key)
    if (storage) {
      return storage
    }

    const result = await method()

    this.storage.set(key, result)

    return result! // TODO: handle undefined
  }
}
