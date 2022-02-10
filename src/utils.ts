import { OpKind } from '@taquito/rpc'
import { TezosToolkit } from '@taquito/taquito'
import axios, { AxiosError } from 'axios'
import BigNumber from 'bignumber.js'

export const sendAndAwait = async (walletOperation: any, clearCacheCallback: () => Promise<void>): Promise<string> => {
  const batchOp = await walletOperation.send()
  await batchOp.confirmation()
  await clearCacheCallback()
  return batchOp.opHash
}

const runOperation = async (node: string, destination: string, parameters: any, fakeAddress: string) => {
  const fakeSignature: string = 'sigUHx32f9wesZ1n2BWpixXz4AQaZggEtchaQNHYGRCoWNAXx45WGW2ua3apUUUAGMLPwAU41QoaFCzVSL61VaessLg4YbbP'

  const results = await Promise.all([
    axios.get(`${node}/chains/main/blocks/head/context/contracts/${fakeAddress}/counter`),
    axios.get<{ chain_id: string; hash: string }>(`${node}/chains/main/blocks/head`)
  ])

  const counter = new BigNumber(results[0].data).plus(1).toString(10)
  const block = results[1].data

  const body = {
    chain_id: block.chain_id,
    operation: {
      branch: block.hash,
      contents: [
        {
          source: fakeAddress,
          kind: OpKind.TRANSACTION,
          fee: '999999',
          counter,
          gas_limit: '1040000',
          storage_limit: '60000',
          amount: '0',
          destination,
          parameters
        }
      ],
      signature: fakeSignature // signature will not be checked, so it is ok to always use this one
    }
  }

  const response: any = await axios
    .post(`${node}/chains/main/blocks/head/helpers/scripts/run_operation`, body, {
      headers: { 'Content-Type': 'application/json' }
    })
    .catch((runOperationError: AxiosError) => {
      console.error('runOperationError', runOperationError)
    })

  return response.data
}

export const getPriceFromOracle = async (
  contract: string,
  tezos: TezosToolkit,
  fakeAddress: string,
  viewerCallback: string
): Promise<string> => {
  const res = await runOperation(
    tezos.rpc.getRpcUrl(),
    contract,
    {
      entrypoint: 'get_price',
      value: {
        string: viewerCallback
      }
    },
    fakeAddress
  )
  const internalOps: any[] = res.contents[0].metadata.internal_operation_results
  const op = internalOps.pop()
  const result = Array.isArray(op.result.storage) ? op.result.storage.args[1].int : op.result.storage.int

  return result
}

export const round = (number: BigNumber) => {
  return number.decimalPlaces(0, BigNumber.ROUND_DOWN)
}

export const getFA1p2Balance = async (
  owner: string,
  contract: string,
  tezos: TezosToolkit,
  fakeAddress: string,
  viewerCallback: string
): Promise<string> => {
  const res = await runOperation(
    tezos.rpc.getRpcUrl(),
    contract,
    {
      entrypoint: 'getBalance',
      value: {
        prim: 'Pair',
        args: [
          {
            string: owner
          },
          {
            string: viewerCallback
          }
        ]
      }
    },
    fakeAddress
  )

  const internalOps: any[] = res.contents[0].metadata.internal_operation_results
  const op = internalOps.pop()

  const result = op.result.storage.args && Array.isArray(op.result.storage.args) ? op.result.storage.args[1].int : op.result.storage.int

  return result
}

export const getFA2Balance = async (
  owner: string,
  contract: string,
  tokenId: number,
  tezos: TezosToolkit,
  fakeAddress: string,
  viewerCallback: string
): Promise<string> => {
  const res = await runOperation(
    tezos.rpc.getRpcUrl(),
    contract,
    {
      entrypoint: 'balance_of',
      value: {
        prim: 'Pair',
        args: [
          [
            {
              prim: 'Pair',
              args: [
                {
                  string: owner
                },
                {
                  int: tokenId.toString()
                }
              ]
            }
          ],
          {
            string: viewerCallback
          }
        ]
      }
    },
    fakeAddress
  )

  const internalOps: any[] = res.contents[0].metadata.internal_operation_results
  const op = internalOps.pop()

  const result = op.result.storage.args && Array.isArray(op.result.storage.args) ? op.result.storage.args[1].int : op.result.storage.int

  return result
}
