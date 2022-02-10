import BigNumber from 'bignumber.js'
import { request } from 'graphql-request'

export class YouvesIndexer {
  constructor(protected readonly indexerEndpoint: string) {}

  public async getTransferAggregate(farmAddress: string, tokenAddress: string): Promise<BigNumber> {
    const fromDate = new Date(new Date().getTime() - 7 * 24 * 60 * 60 * 1000)
    const nowDate = new Date()

    const query = `
        {
            transfer_aggregate(
                where: {                
                    receiver: { _eq: "${farmAddress}"}
                    contract: { _eq: "${tokenAddress}" }
                    created: {
                        _gte: "${fromDate.toISOString()}"
                        _lte: "${nowDate.toISOString()}"
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
}
