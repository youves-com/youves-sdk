import BigNumber from 'bignumber.js'
import { request } from 'graphql-request'
import { Token, TokenType } from './tokens/token'
import { Activity, Intent, Vault } from './types'

export class YouvesIndexer {
  constructor(protected readonly indexerEndpoint: string) {}

  public async getTransferAggregateOverTime(farmAddress: string, token: Token, from: Date, to: Date, sender?: string): Promise<BigNumber> {
    const filter: string[] = [`contract: { _eq: "${token.contractAddress}" }`]

    if (token.type === TokenType.FA2) {
      filter.push(`token_id: { _eq: "${token.tokenId}" }`)
    }

    if (sender) {
      filter.push(`sender: { _eq: "${sender}" }`)
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
    const response = await request(this.indexerEndpoint, query)

    return new BigNumber(response.transfer_aggregate.aggregate.sum.token_amount)
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
    const response = await request(this.indexerEndpoint, query)
    return response['intent']
  }

  public async getActivityForEngine(
    engineAddress: string,
    vaultAddress: string,
    orderKey: string = 'created',
    orderDirection: string = 'desc'
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
    const response = await request(this.indexerEndpoint, query)
    return response['activity']
  }

  public async getExecutableVaultsForEngine(engineAddress: string): Promise<Vault[]> {
    const query = `
    query {
      vault(where: { engine_contract_address: { _eq: "${engineAddress}" } } order_by: { ratio:asc }) {
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
    const response = await request(this.indexerEndpoint, query)
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
    const response = await request(this.indexerEndpoint, query)
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
    const response = await request(this.indexerEndpoint, query)

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
    const response = await request(this.indexerEndpoint, query)
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
    const response = await request(this.indexerEndpoint, query)
    return new BigNumber(response['vault_aggregate']['aggregate']['sum']['balance'])
  }
}