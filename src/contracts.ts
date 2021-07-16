import { ContractAbstraction, TezosToolkit, Wallet } from '@taquito/taquito'

import BigNumber from 'bignumber.js'
import { Contracts } from './networks'
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
  VaultContext
} from './types'
import { request } from 'graphql-request'

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

    const constructKey = (input: any[]) => {
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
      return `${propertyKey}-${processedInput.join('-')}`
    }

    descriptor.value = async function (...args: any[]) {
      const constructedKey = constructKey(args)
      const promise = globalPromiseCache.get(constructedKey)
      if (promise) {
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

export class Youves {
  public TARGET_ORACLE_ADDRESS: string
  public OBSERVED_ORACLE_ADDRESS: string
  public TOKEN_ADDRESS: string
  public ENGINE_ADDRESS: string
  public GOVERNANCE_TOKEN_ADDRESS: string
  public OPTIONS_LISTING_ADDRESS: string
  public REWARD_POOL_ADDRESS: string
  public SAVINGS_POOL_ADDRESS: string
  public VIEWER_CALLBACK_ADDRESS: string
  public SYNTHETIC_DEX: string
  public GOVERNANCE_DEX: string

  public SECONDS_INTEREST_SPREAD = 316
  public TOKEN_DECIMALS = 12
  public TEZ_DECIMALS = 6
  public PRECISION_FACTOR = 10 ** this.TOKEN_DECIMALS
  public ONE_TOKEN = 10 ** this.TOKEN_DECIMALS
  public GOVERNANCE_TOKEN_ISSUANCE_RATE = 66137566137

  public tokenContractPromise: Promise<ContractAbstraction<Wallet>>
  public governanceTokenContractPromise: Promise<ContractAbstraction<Wallet>>
  public rewardsPoolContractPromise: Promise<ContractAbstraction<Wallet>>
  public savingsPoolContractPromise: Promise<ContractAbstraction<Wallet>>
  public optionsListingContractPromise: Promise<ContractAbstraction<Wallet>>
  public engineContractPromise: Promise<ContractAbstraction<Wallet>>
  public targetOracleContractPromise: Promise<ContractAbstraction<Wallet>>
  public observedOracleContractPromise: Promise<ContractAbstraction<Wallet>>
  public syntheticAssetDexContractPromise: Promise<ContractAbstraction<Wallet>>
  public governanceTokenDexContractPromise: Promise<ContractAbstraction<Wallet>>

  public QUIPUSWAP_FEE: number = 0.997

  public lastBlockHash: string = ''
  private chainWatcherIntervalId: ReturnType<typeof setInterval> | undefined = undefined
  private chainUpdateCallbacks: Array<() => void> = []

  constructor(
    private readonly tezos: TezosToolkit,
    contracts: Contracts,
    private readonly storage: Storage,
    private readonly indexerEndpoint: string = 'https://youves-indexer.dev.gke.papers.tech/v1/graphql/'
  ) {
    this.TARGET_ORACLE_ADDRESS = contracts.TARGET_ORACLE_ADDRESS
    this.OBSERVED_ORACLE_ADDRESS = contracts.OBSERVED_ORACLE_ADDRESS
    this.TOKEN_ADDRESS = contracts.TOKEN_ADDRESS
    this.ENGINE_ADDRESS = contracts.ENGINE_ADDRESS
    this.GOVERNANCE_TOKEN_ADDRESS = contracts.GOVERNANCE_TOKEN_ADDRESS
    this.OPTIONS_LISTING_ADDRESS = contracts.OPTIONS_LISTING_ADDRESS
    this.REWARD_POOL_ADDRESS = contracts.REWARD_POOL_ADDRESS
    this.SAVINGS_POOL_ADDRESS = contracts.SAVINGS_POOL_ADDRESS
    this.VIEWER_CALLBACK_ADDRESS = contracts.VIEWER_CALLBACK_ADDRESS
    this.SYNTHETIC_DEX = contracts.SYNTHETIC_DEX
    this.GOVERNANCE_DEX = contracts.GOVERNANCE_DEX

    this.tokenContractPromise = this.tezos.wallet.at(this.TOKEN_ADDRESS)
    this.governanceTokenContractPromise = this.tezos.wallet.at(this.GOVERNANCE_TOKEN_ADDRESS)
    this.rewardsPoolContractPromise = this.tezos.wallet.at(this.REWARD_POOL_ADDRESS)
    this.savingsPoolContractPromise = this.tezos.wallet.at(this.SAVINGS_POOL_ADDRESS)
    this.optionsListingContractPromise = this.tezos.wallet.at(this.OPTIONS_LISTING_ADDRESS)
    this.engineContractPromise = this.tezos.wallet.at(this.ENGINE_ADDRESS)
    this.targetOracleContractPromise = this.tezos.wallet.at(this.TARGET_ORACLE_ADDRESS)
    this.observedOracleContractPromise = this.tezos.wallet.at(this.OBSERVED_ORACLE_ADDRESS)
    this.syntheticAssetDexContractPromise = this.tezos.wallet.at(this.SYNTHETIC_DEX)
    this.governanceTokenDexContractPromise = this.tezos.wallet.at(this.GOVERNANCE_DEX)
  }

  @cache()
  public async getBalance(address: string): Promise<BigNumber> {
    return this.tezos.tz.getBalance(address)
  }

  @cache()
  public async getDelegate(address: string): Promise<string | null> {
    return this.tezos.tz.getDelegate(address)
  }

  @cache()
  public async getAccountBalance(): Promise<BigNumber> {
    const source = await this.getOwnAddress()
    return this.getBalance(source)
  }

  @cache()
  public async getVaultBalance(): Promise<BigNumber> {
    const source = await this.getOwnAddress()
    const engineContract = await this.engineContractPromise
    const storage = (await this.getStorageOfContract(engineContract)) as any
    const vaultContext = await this.getStorageValue(storage, 'vault_contexts', source)
    return new BigNumber(vaultContext ? vaultContext.balance : 0)
  }

  async sendAndAwait(walletOperation: any): Promise<string> {
    const batchOp = await walletOperation.send()
    await batchOp.confirmation()
    return batchOp.opHash
  }

  public async createVault(amountInMutez: number, mintAmountInuUSD: number, baker?: string): Promise<string> {
    const engineContract = await this.engineContractPromise
    return this.sendAndAwait(
      this.tezos.wallet
        .batch()
        .withTransfer(
          engineContract.methods
            .create_vault(baker ? baker : null, this.VIEWER_CALLBACK_ADDRESS)
            .toTransferParams({ amount: amountInMutez, mutez: true })
        )
        .withContractCall(engineContract.methods.mint(mintAmountInuUSD))
    )
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

      return vaultContext.address
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

  public async fundVault(amountInMutez: number): Promise<string> {
    const ownVaultAddress = await this.getOwnVaultAddress()
    return this.transferMutez(amountInMutez, ownVaultAddress)
  }

  public async setDeletage(delegate: string | null): Promise<string> {
    const engineContract = await this.engineContractPromise
    return this.sendAndAwait(engineContract.methods.set_vault_delegate(delegate))
  }

  public async mint(mintAmount: number): Promise<string> {
    const engineContract = await this.engineContractPromise
    return this.sendAndAwait(engineContract.methods.mint(mintAmount))
  }

  public async burn(burnAmount: number): Promise<string> {
    const engineContract = await this.engineContractPromise
    return this.sendAndAwait(engineContract.methods.burn(burnAmount))
  }

  public async withdrawCollateral(amountInMutez: number): Promise<string> {
    const engineContract = await this.engineContractPromise
    return this.sendAndAwait(engineContract.methods.withdraw(amountInMutez))
  }

  public async liquidate(tokenAmount: number, vaultOwner: string): Promise<string> {
    const engineContract = await this.engineContractPromise
    return this.sendAndAwait(engineContract.methods.liquidate(tokenAmount, vaultOwner))
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
    return this.transferToken(this.TOKEN_ADDRESS, recipient, tokenAmount, 0)
  }

  public async transferGovernanceToken(recipient: string, tokenAmount: number): Promise<string> {
    return this.transferToken(this.GOVERNANCE_TOKEN_ADDRESS, recipient, tokenAmount, 0)
  }

  public async addTokenOperator(tokenAddress: string, operator: string, tokenId: number): Promise<string> {
    const source = await this.getOwnAddress()
    const tokenContract = await this.tezos.wallet.at(tokenAddress)
    return this.sendAndAwait(
      tokenContract.methods.update_operators([
        {
          add_operator: {
            owner: source,
            operator: operator,
            token_id: tokenId
          }
        }
      ])
    )
  }

  public async addSynthenticTokenOperator(operator: string): Promise<string> {
    return this.addTokenOperator(this.TOKEN_ADDRESS, operator, 0)
  }

  public async addGovernanceTokenOperator(operator: string): Promise<string> {
    return this.addTokenOperator(this.GOVERNANCE_TOKEN_ADDRESS, operator, 0)
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
          { add_operator: { owner: source, operator: this.REWARD_POOL_ADDRESS, token_id: 0 } }
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

  public async withdrawFromRewardsPool(): Promise<string> {
    const rewardsPoolContract = await this.rewardsPoolContractPromise
    return this.sendAndAwait(rewardsPoolContract.methods.withdraw(null))
  }

  public async depositToSavingsPool(tokenAmount: number): Promise<string> {
    const source = await this.getOwnAddress()
    const savingsPoolContract = await this.savingsPoolContractPromise

    let batchCall = this.tezos.wallet.batch()
    if (!(await this.isSyntheticAssetOperatorSet(this.SAVINGS_POOL_ADDRESS))) {
      const tokenContract = await this.tokenContractPromise
      batchCall = batchCall.withContractCall(
        tokenContract.methods.update_operators([{ add_operator: { owner: source, operator: this.SAVINGS_POOL_ADDRESS, token_id: 0 } }])
      )
    }
    batchCall = batchCall.withContractCall(savingsPoolContract.methods.deposit(tokenAmount))

    return this.sendAndAwait(batchCall)
  }

  public async withdrawFromSavingsPool(): Promise<string> {
    const savingsPoolContract = await this.savingsPoolContractPromise
    return this.sendAndAwait(savingsPoolContract.methods.withdraw(null))
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
              token_id: 0
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

  public async fulfillIntent(intentOwner: string, tokenAmount: number): Promise<string> {
    const optionsListingContract = await this.optionsListingContractPromise
    const marketPriceAmount = (await this.getTargetPrice()).multipliedBy(tokenAmount)
    const payoutAmount = marketPriceAmount.minus(marketPriceAmount.dividedBy(2 ** 4)).dividedBy(this.PRECISION_FACTOR) // taking away the 6% fee

    return this.sendAndAwait(
      this.tezos.wallet.batch().withTransfer(
        optionsListingContract.methods.fulfill_intent(intentOwner, tokenAmount).toTransferParams({
          amount: Math.floor(payoutAmount.toNumber()),
          mutez: true
        })
      )
    )
  }

  public async executeIntent(vaultOwner: string, tokenAmount: number): Promise<string> {
    const optionsListingContract = await this.optionsListingContractPromise
    return this.sendAndAwait(optionsListingContract.methods.execute_intent(tokenAmount, vaultOwner))
  }

  public async bailout(tokenAmount: number): Promise<string> {
    const engineContract = await this.engineContractPromise
    return this.sendAndAwait(engineContract.methods.bailout(tokenAmount))
  }

  //Quipo Actions start here
  public async tezToTokenSwap(dexAddress: string, amountInMutez: number, minimumReceived: number): Promise<string> {
    const source = await this.getOwnAddress()
    const dexContract = await this.getContractWalletAbstraction(dexAddress)
    return this.sendAndAwait(
      this.tezos.wallet
        .batch()
        .withTransfer(
          dexContract.methods.tezToTokenPayment(minimumReceived, source).toTransferParams({ amount: amountInMutez, mutez: true })
        )
    )
  }

  public async tokenToTezSwap(dexAddress: string, tokenAmount: number, minimumReceived: number): Promise<string> {
    const source = await this.getOwnAddress()
    const dexContract = await this.getContractWalletAbstraction(dexAddress)
    const dexStorage = (await this.getStorageOfContract(dexContract)) as any
    const tokenContract = await this.tezos.wallet.at(dexStorage['storage']['token_address'])
    const tokenStorage = (await this.getStorageOfContract(tokenContract)) as any
    const isOperatorSet = await this.getStorageValue(tokenStorage, 'operators', {
      owner: source,
      operator: dexAddress,
      token_id: dexStorage['storage']['token_id']
    })

    if (isOperatorSet === undefined) {
      await this.addTokenOperator(dexStorage['storage']['token_address'], dexAddress, dexStorage['storage']['token_id'])
    }

    return this.sendAndAwait(dexContract.methods.tokenToTezPayment(tokenAmount, minimumReceived, source))
  }

  public async syntheticAssetToTezSwap(tokenAmount: number, minimumReceived: number): Promise<string> {
    return this.tokenToTezSwap(this.SYNTHETIC_DEX, tokenAmount, minimumReceived)
  }

  public async governanceTokenToTezSwap(tokenAmount: number, minimumReceived: number): Promise<string> {
    return this.tokenToTezSwap(this.GOVERNANCE_DEX, tokenAmount, minimumReceived)
  }

  public async tezToGovernanceSwap(amountInMutez: number, minimumReceived: number): Promise<string> {
    return this.tezToTokenSwap(this.GOVERNANCE_DEX, amountInMutez, minimumReceived)
  }

  public async tezToSyntheticSwap(amountInMutez: number, minimumReceived: number): Promise<string> {
    return this.tezToTokenSwap(this.SYNTHETIC_DEX, amountInMutez, minimumReceived)
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
      }, 1000 * 15)
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

  @cache()
  public async getExpectedMinimumReceivedToken(dexAddress: string, amountInMutez: number): Promise<BigNumber> {
    const dexContract = await this.getContractWalletAbstraction(dexAddress)
    const storage = (await this.getStorageOfContract(dexContract)) as any
    const currentTokenPool = new BigNumber(storage['storage']['token_pool'])
    const currentTezPool = new BigNumber(storage['storage']['tez_pool'])
    const constantProduct = currentTokenPool.multipliedBy(currentTezPool)
    const remainingTokenPoolAmount = constantProduct.dividedBy(currentTezPool.plus(amountInMutez * this.QUIPUSWAP_FEE))
    return currentTokenPool.minus(remainingTokenPoolAmount)
  }

  @cache()
  public async getExpectedMinimumReceivedTez(dexAddress: string, tokenAmount: number): Promise<BigNumber> {
    const dexContract = await this.getContractWalletAbstraction(dexAddress)
    const storage = (await this.getStorageOfContract(dexContract)) as any
    const currentTokenPool = new BigNumber(storage['storage']['token_pool'])
    const currentTezPool = new BigNumber(storage['storage']['tez_pool'])
    const constantProduct = currentTokenPool.multipliedBy(currentTezPool)
    const remainingTezPoolAmount = constantProduct.dividedBy(currentTokenPool.plus(tokenAmount * this.QUIPUSWAP_FEE))
    return currentTezPool.minus(remainingTezPoolAmount)
  }

  @cache()
  public async getExchangeRate(dexAddress: string): Promise<BigNumber> {
    const dexContract = await this.getContractWalletAbstraction(dexAddress)
    const storage = (await this.getStorageOfContract(dexContract)) as any
    return new BigNumber(storage['storage']['token_pool'])
      .dividedBy(10 ** this.TOKEN_DECIMALS)
      .dividedBy(new BigNumber(storage['storage']['tez_pool']).dividedBy(10 ** this.TEZ_DECIMALS))
  }

  @cache()
  public async getExchangeMaximumTokenAmount(dexAddress: string): Promise<BigNumber> {
    const dexContract = await this.getContractWalletAbstraction(dexAddress)
    const storage = (await this.getStorageOfContract(dexContract)) as any
    const currentTokenPool = new BigNumber(storage['storage']['token_pool'])
    return currentTokenPool.dividedBy(3)
  }

  @cache()
  public async getExchangeMaximumTezAmount(dexAddress: string): Promise<BigNumber> {
    const dexContract = await this.getContractWalletAbstraction(dexAddress)
    const storage = (await this.getStorageOfContract(dexContract)) as any
    const currentTezPool = new BigNumber(storage['storage']['tez_pool'])
    return currentTezPool.dividedBy(3)
  }

  @cache()
  public async getSyntheticAssetExchangeMaximumTezAmount(): Promise<BigNumber> {
    return this.getExchangeMaximumTezAmount(this.SYNTHETIC_DEX)
  }

  @cache()
  public async getSyntheticAssetExchangeMaximumTokenAmount(): Promise<BigNumber> {
    return this.getExchangeMaximumTokenAmount(this.SYNTHETIC_DEX)
  }

  @cache()
  public async getGovernanceTokenExchangeMaximumTezAmount(): Promise<BigNumber> {
    return this.getExchangeMaximumTezAmount(this.GOVERNANCE_DEX)
  }

  @cache()
  public async getGovernanceTokenExchangeMaximumTokenAmount(): Promise<BigNumber> {
    return this.getExchangeMaximumTokenAmount(this.GOVERNANCE_DEX)
  }

  @cache()
  public async getSyntheticAssetExchangeRate(): Promise<BigNumber> {
    return this.getExchangeRate(this.SYNTHETIC_DEX)
  }

  @cache()
  public async getGovernanceTokenExchangeRate(): Promise<BigNumber> {
    return this.getExchangeRate(this.GOVERNANCE_DEX)
  }

  @cache()
  public async getTargetExchangeRate(): Promise<BigNumber> {
    return (await this.getObservedPrice()).dividedBy(await this.getTargetPrice())
  }

  @cache()
  public async getObservedPrice(): Promise<BigNumber> {
    return new BigNumber(1).dividedBy(await this.getSyntheticAssetExchangeRate()).multipliedBy(10 ** this.TEZ_DECIMALS)
  }

  @cache()
  public async getTargetPrice(): Promise<BigNumber> {
    const targetOracleContract = await this.targetOracleContractPromise
    const targetPrice = (await this.getStorageOfContract(targetOracleContract)) as any
    return new BigNumber(this.PRECISION_FACTOR).div(targetPrice.price)
  }

  @cache()
  public async getMaxMintableAmount(amountInMutez: number): Promise<BigNumber> {
    const targetPrice = await this.getTargetPrice()
    return new BigNumber(amountInMutez).dividedBy(3).dividedBy(new BigNumber(targetPrice)).multipliedBy(this.ONE_TOKEN)
  }

  @cache()
  public async getAccountMaxMintableAmount(account: string): Promise<BigNumber> {
    const targetPrice = await this.getTargetPrice()
    const balance = await this.getBalance(account)
    return new BigNumber(balance).dividedBy(3).dividedBy(new BigNumber(targetPrice)).multipliedBy(this.ONE_TOKEN)
  }

  @cache()
  public async getOwnMaxMintableAmount(): Promise<BigNumber> {
    const source = await this.getOwnAddress()
    return this.getAccountMaxMintableAmount(source)
  }

  @cache()
  public async getVaultMaxMintableAmount(): Promise<BigNumber> {
    const source = await this.getOwnAddress()
    const engineContract = await this.engineContractPromise
    const storage = (await this.getStorageOfContract(engineContract)) as any
    const vaultContext = await this.getStorageValue(storage, 'vault_contexts', source)
    return this.getAccountMaxMintableAmount(vaultContext.address)
  }

  @cache()
  public async getVaultCollateralisation(): Promise<BigNumber> {
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
    return new BigNumber(timedelta * this.GOVERNANCE_TOKEN_ISSUANCE_RATE)
  }

  @cache()
  public async getYearlyLiabilityInterestRate(): Promise<BigNumber> {
    return (await this.getYearlyAssetInterestRate()).plus(await this.getYearlySpreadInterestRate())
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
  public async getRequiredCollateral(): Promise<BigNumber> {
    const targetPrice = await this.getTargetPrice()
    return (await this.getMintedSyntheticAsset()).multipliedBy(new BigNumber(targetPrice)).multipliedBy(3).dividedBy(this.PRECISION_FACTOR)
  }

  @cache()
  public async getVaultContext(): Promise<VaultContext> {
    const source = await this.getOwnAddress()
    const engineContract = await this.engineContractPromise
    const storage = (await this.getStorageOfContract(engineContract)) as any
    const vaultContext = await this.getStorageValue(storage, 'vault_contexts', source)
    return vaultContext
  }

  @cache()
  public async getMintedSyntheticAsset(): Promise<BigNumber> {
    const engineContract = await this.engineContractPromise
    const storage = (await this.getStorageOfContract(engineContract)) as any
    return new BigNumber((await this.getVaultContext()).minted)
      .multipliedBy(new BigNumber(storage['compound_interest_rate']))
      .dividedBy(this.PRECISION_FACTOR)
  }

  @cache()
  public async getWithdrawableCollateral(): Promise<BigNumber> {
    return (await this.getVaultBalance()).minus(await this.getRequiredCollateral())
  }

  @cache()
  public async getMintableAmount(): Promise<BigNumber> {
    return (await this.getVaultMaxMintableAmount()).minus(await this.getMintedSyntheticAsset())
  }

  @cache()
  public async getVaultDelegate(): Promise<string | null> {
    return this.getDelegate((await this.getVaultContext()).address)
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
    return this.isOperatorSet(this.TOKEN_ADDRESS, operator, 0)
  }

  @cache()
  public async isGovernanceTokenOperatorSet(operator: string): Promise<boolean> {
    return this.isOperatorSet(this.GOVERNANCE_TOKEN_ADDRESS, operator, 0)
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
  public async getOwnSyntheticAssetTokenAmount(): Promise<BigNumber> {
    const source = await this.getOwnAddress()
    return this.getTokenAmount(this.TOKEN_ADDRESS, source, 0)
  }

  @cache()
  public async getOwnGovernanceTokenAmount(): Promise<BigNumber> {
    const source = await this.getOwnAddress()
    return this.getTokenAmount(this.GOVERNANCE_TOKEN_ADDRESS, source, 0)
  }

  @cache()
  public async getSavingsPoolYearlyInterestRate(): Promise<BigNumber> {
    const syntheticAssetTotalSupply = await this.getSyntheticAssetTotalSupply()
    return syntheticAssetTotalSupply
      .multipliedBy((await this.getYearlyAssetInterestRate()).minus(1))
      .dividedBy(await this.getTokenAmount(this.TOKEN_ADDRESS, this.SAVINGS_POOL_ADDRESS, 0))
  }

  @cache()
  public async getSavingsPoolTokenAmount(): Promise<BigNumber> {
    return this.getTokenAmount(this.TOKEN_ADDRESS, this.SAVINGS_POOL_ADDRESS, 0)
  }

  @cache()
  public async getRewardsPoolTokenAmount(): Promise<BigNumber> {
    return this.getTokenAmount(this.GOVERNANCE_TOKEN_ADDRESS, this.REWARD_POOL_ADDRESS, 0)
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
  public async getOwnSavingsPoolStake(): Promise<BigNumber> {
    const source = await this.getOwnAddress()
    const savingsPoolContract = await this.savingsPoolContractPromise
    const savingsPoolStorage: SavingsPoolStorage = (await this.getStorageOfContract(savingsPoolContract)) as any
    return new BigNumber(await this.getStorageValue(savingsPoolStorage, 'stakes', source))
      .multipliedBy(new BigNumber(savingsPoolStorage['disc_factor']))
      .dividedBy(this.PRECISION_FACTOR)
  }
  @cache()
  public async getTotalSavingsPoolStake(): Promise<BigNumber> {
    const savingsPoolContract = await this.savingsPoolContractPromise
    const savingsPoolStorage: SavingsPoolStorage = (await this.getStorageOfContract(savingsPoolContract)) as any
    const totalStake = savingsPoolStorage['total_stake']
    return new BigNumber(totalStake).multipliedBy(new BigNumber(savingsPoolStorage['disc_factor'])).dividedBy(this.PRECISION_FACTOR)
  }
  @cache()
  public async getSavingsPoolRatio(amount?: BigNumber): Promise<BigNumber> {
    const savingsPoolTokenAmount = await this.getSavingsPoolTokenAmount()
    const ownSavingsPoolStake = amount ?? (await this.getOwnSavingsPoolStake())
    const ratio = ownSavingsPoolStake.dividedBy(savingsPoolTokenAmount)
    return new BigNumber(ratio)
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
    const savingsPoolContract = await this.savingsPoolContractPromise
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
        vault_aggregate {
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
        vault_aggregate {
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
        vault_aggregate {
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
  public async getTotalCollateralRatio(): Promise<BigNumber> {
    return (await this.getTotalBalanceInVaults())
      .dividedBy(await this.getTargetPrice())
      .dividedBy(await this.getTotalMinted())
      .multipliedBy(10 ** this.TOKEN_DECIMALS)
  }

  @cache()
  public async getVaultCollateralRatio(): Promise<BigNumber> {
    return (await this.getVaultBalance())
      .dividedBy(await this.getTargetPrice())
      .dividedBy(await this.getMintedSyntheticAsset())
      .multipliedBy(10 ** this.TOKEN_DECIMALS)
  }

  @cache()
  public async getIntents(threshold: Date = new Date(0)): Promise<Intent[]> {
    const query = `
    {
      intent(
        where: { start_timestamp: { _gte: "${threshold.toISOString()}" }}
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
  public async getActivity(vaultAddress: string): Promise<Activity[]> {
    const query = `
    query {
      activity(
        where : { vault: {address:{_eq:"${vaultAddress}"}}} 
      ) {
        operation_hash
        event
        created
        token_amount
        tez_amount
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
  public async getFullfillableIntents(): Promise<Intent[]> {
    return this.getIntents(new Date(Date.now() - 48 * 3600 * 1000))
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
    const storage = await this.storage.get(storageKey)
    if (storage) {
      return storage
    }

    const result = await method()

    this.storage.set(storageKey, result)

    return result! // TODO: handle undefined
  }
}
