import BigNumber from 'bignumber.js'
import { request } from 'graphql-request'
import { BehaviorSubject } from 'rxjs'
import { distinctUntilChanged } from 'rxjs/operators'
import { Token, TokenType } from './tokens/token'
import { Activity, CheckerLiquidationUpdate, IndexerConfig, Intent, Vault } from './types'
import { doRequestWithCache } from './utils'

export enum IndexerStatusType {
  ONLINE,
  REINDEXING,
  OFFLINE
}
export const internalIndexerStatus: BehaviorSubject<IndexerStatusType> = new BehaviorSubject<IndexerStatusType>(IndexerStatusType.ONLINE)
export const indexerStatus = internalIndexerStatus.pipe(distinctUntilChanged())

let requestCache: { query: string; responsePromise: Promise<any>; timestamp: number }[] = []

export type SortingPropertyExectuableVaultsDefinition = 'minted' | 'ratio' | 'balance'
export type SortingDirection = 'asc' | 'desc'

export class YouvesIndexer {
  constructor(protected readonly indexerConfig: IndexerConfig) {
    this.getSyncStatus()
  }

  public async getSyncStatus(): Promise<boolean> {
    const result: { data: { dipdup_head_status: { status: string }[] } } = await doRequestWithCache(
      `${this.indexerConfig.url.substring(0, this.indexerConfig.url.length - 11)}/api/rest/dipdup_head_status?name=${
        this.indexerConfig.headCheckUrl
      }`
    )

    const isInSync: boolean | undefined = result.data.dipdup_head_status[0]?.status === 'OK'

    if (isInSync) {
      internalIndexerStatus.next(IndexerStatusType.ONLINE)
    } else {
      internalIndexerStatus.next(IndexerStatusType.REINDEXING)
    }

    return isInSync
  }

  public async getTransferAggregateOverTime(
    farmAddress: string,
    token: Token,
    from: Date,
    to: Date,
    sender?: string,
    senderFilterType: '_eq' | '_neq' = '_eq'
  ): Promise<BigNumber> {
    const filter: string[] = [`contract: { _eq: "${token.contractAddress}" }`]

    if (token.type === TokenType.FA2) {
      filter.push(`token_id: { _eq: "${token.tokenId}" }`)
    }

    if (sender) {
      filter.push(`sender: { ${senderFilterType}: "${sender}" }`)
    }

    const query = `
        {
            transfer_aggregate(
                where: {                
                    receiver: { _eq: "${farmAddress}"}
                    ${filter.join('\n')}
                    created: {
                        _gte: "${from.toISOString()}"
                        _lte: "${to.toISOString()}"
                    }
                }
            )
                
            {
                aggregate {
                    sum {
                        token_amount
                    }
                }
            }
        }
        `
    let response: any
    try {
      response = await this.doRequestWithCache(query)
      return new BigNumber(response.transfer_aggregate.aggregate.sum.token_amount)
    } catch (error) {
      console.error(
        '🚨 indexer error: getTransferAggregateOverTime(',
        farmAddress,
        token.symbol,
        from.toDateString(),
        to.toDateString(),
        sender,
        senderFilterType,
        ') ',
        error
      )
      return new BigNumber(0)
    }
  }

  public async getIntentsForEngine(
    engineAddress: string,
    dateThreshold: Date = new Date(0),
    tokenAmountThreshold: BigNumber = new BigNumber(0)
  ): Promise<Intent[]> {
    const order = `order_by: { start_timestamp:asc }`
    const query = `
    {
      intent(
        where: {
          engine_contract_address: { _eq: "${engineAddress}" } 
          start_timestamp: { _gte: "${dateThreshold.toISOString()}" }
          token_amount: { _gte: "${tokenAmountThreshold.toString()}" }
        }
        ${order}
      ) {
          owner
          token_amount
          start_timestamp
      }
    }
    `
    const response = await this.doRequestWithCache(query)
    return response['intent']
  }

  public async getActivityForEngine(
    engineAddress: string,
    vaultAddress: string,
    orderKey: string = 'created',
    orderDirection: SortingDirection = 'desc'
  ): Promise<Activity[]> {
    const order = `order_by: { ${orderKey}:${orderDirection} }`
    const query = `
    query {
      activity(
        where: { engine_contract_address: { _eq: "${engineAddress}" } vault: {address:{_eq:"${vaultAddress}"}}} 
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
    const response = await this.doRequestWithCache(query)
    return response['activity']
  }

  public async getCheckerLiquidationUpdates(address: string): Promise<CheckerLiquidationUpdate[]> {
    const query = `
    query {
      checker_liquidation_update(
        where: { address: { _eq: "${address}" }}
      ) {
        address
        collateral_removed
        repaid_kit
        excess_kit
      }
    }
    `
    const response = await this.doRequestWithCache(query)
    return response['checker_liquidation_update']
  }

  public async getExecutableVaultsForEngine(
    engineAddress: string,
    property: SortingPropertyExectuableVaultsDefinition,
    orderDirection: SortingDirection,
    offset: number,
    limit: number
  ): Promise<Vault[]> {
    const query = `
    query {
      vault(where: { engine_contract_address: { _eq: "${engineAddress}" } } 
      offset:${offset}
      limit:${limit}
      order_by: { ${property}:${orderDirection} }) {
          owner
          address
          ratio
          balance
          minted
      }
    }    
    `
    const response = await this.doRequestWithCache(query)
    return response['vault']
  }

  public async getBurntInTimeRangeForEngine(engineAddress: string, from: Date, to: Date): Promise<BigNumber> {
    const query = `
    query { 
      activity_aggregate(
        where: { 
          event: { _eq: "BURN" }
          engine_contract_address: { _eq: "${engineAddress}"}
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
    const response = await this.doRequestWithCache(query)
    return new BigNumber(response['activity_aggregate']['aggregate']['sum']['token_amount'])
  }

  public async getMintedInTimeRangeForEngine(engineAddress: string, from: Date, to: Date): Promise<BigNumber> {
    const query = `
    query { 
      activity_aggregate(
        where: { 
          event: { _eq: "MINT" }
          engine_contract_address: { _eq: "${engineAddress}"}
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
    const response = await this.doRequestWithCache(query)
    return new BigNumber(response['activity_aggregate']['aggregate']['sum']['token_amount'])
  }

  public async getTotalMintedForEngine(engineAddress: string): Promise<BigNumber> {
    const query = `
      {
        vault_aggregate(where: { engine_contract_address: { _eq: "${engineAddress}" } }) {
          aggregate {
            sum {
              minted
            }
          }
        }
      }
    `
    const response = await this.doRequestWithCache(query)

    return new BigNumber(response['vault_aggregate']['aggregate']['sum']['minted'])
  }

  public async getVaultCountForEngine(engineAddress: string): Promise<BigNumber> {
    const query = `
      {
        vault_aggregate(where: { engine_contract_address: { _eq: "${engineAddress}" } }) {
          aggregate {
            count
          }
        }
      }
    `
    const response = await this.doRequestWithCache(query)
    return new BigNumber(response['vault_aggregate']['aggregate']['count'])
  }

  public async getTotalBalanceInVaultsForEngine(engineAddress: string): Promise<BigNumber> {
    const query = `
      {
        vault_aggregate(where: { engine_contract_address: { _eq: "${engineAddress}" } }) {
          aggregate {
            sum {
              balance
            }
          }
        }
      }
    `
    const response = await this.doRequestWithCache(query)
    return new BigNumber(response['vault_aggregate']['aggregate']['sum']['balance'])
  }

  public async getVotedStakes(voterAddress: string, currentPollId: number): Promise<any[]> {
    const query = `query { vote ( where: { voter : { _eq: "${voterAddress}" } proposal_id: {_eq:"${currentPollId}"}} ) { voter proposal_id weight vote_value vote_id vote_status } } `
    const response = await this.doRequest(query)
    return response['vote']
  }

  public async getClaimableStakes(voterAddress: string, lastPollIdInUse: number): Promise<any[]> {
    const query = `query { vote ( where: { voter : { _eq: "${voterAddress}" } proposal_id: {_lt:"${lastPollIdInUse}"} vote_status: {_neq: "RETURNED"}} ) { voter proposal_id weight vote_value vote_id vote_status } } `
    const response = await this.doRequestWithCache(query)
    return response['vote']
  }

  public async getStakeIdsByOwner(ownerAddress: string): Promise<any[]> {
    const query = `query { commitmentPoolStake (where: { owner: { _eq: "${ownerAddress}" } }) { stake_id } }`
    const response = await this.doRequest(query)
    return response['commitmentPoolStake']
  }

  private async doRequestWithCache(query: string) {
    requestCache = requestCache.filter((req) => new Date().getTime() - req.timestamp < 5000)
    const cachedRequest = requestCache.find((el) => el.query === query)
    if (cachedRequest) {
      return cachedRequest.responsePromise
    }

    try {
      const res = await request(this.indexerConfig.url, query)

      requestCache.push({
        query,
        responsePromise: res,
        timestamp: new Date().getTime()
      })
      if (internalIndexerStatus.value === IndexerStatusType.OFFLINE) {
        internalIndexerStatus.next(IndexerStatusType.ONLINE)
      }

      return res
    } catch (error) {
      internalIndexerStatus.next(IndexerStatusType.OFFLINE)

      throw error
    }
  }

  private async doRequest(query: string) {
    try {
      const res = await request(this.indexerConfig.url, query)
      if (internalIndexerStatus.value === IndexerStatusType.OFFLINE) {
        internalIndexerStatus.next(IndexerStatusType.ONLINE)
      }
      return res
    } catch (error) {
      internalIndexerStatus.next(IndexerStatusType.OFFLINE)

      throw error
    }
  }
}
