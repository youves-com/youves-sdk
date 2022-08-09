import { OpKind } from '@taquito/rpc'
import { ContractAbstraction, TezosToolkit } from '@taquito/taquito'
import axios, { AxiosError, AxiosResponse } from 'axios'
import BigNumber from 'bignumber.js'
import { BehaviorSubject } from 'rxjs'
import { distinctUntilChanged } from 'rxjs/operators'
import { TargetOracle } from './networks.base'
import { internalNodeStatus, NodeStatusType } from './NodeService'

export enum OracleStatusType {
  AVAILABLE,
  UNAVAILABLE
}
const internalOracleStatus: BehaviorSubject<OracleStatusType> = new BehaviorSubject<OracleStatusType>(OracleStatusType.AVAILABLE)
export const oracleStatus = internalOracleStatus.pipe(distinctUntilChanged())

export const sendAndAwait = async (walletOperation: any, clearCacheCallback: () => Promise<void>): Promise<string> => {
  const batchOp = await walletOperation.send()
  await batchOp.confirmation()
  await clearCacheCallback()
  return batchOp.opHash
}

let requestCache: { url: string; responsePromise: Promise<AxiosResponse<any>>; timestamp: number }[] = []

export const doNodeRequestWithCache = (url: string) => {
  const res = doRequestWithCache(url)

  res
    .then(() => {
      internalNodeStatus.next(NodeStatusType.ONLINE)
    })
    .catch(() => {
      internalNodeStatus.next(NodeStatusType.OFFLINE)
    })

  return res
}

export const doRequestWithCache = (url: string) => {
  requestCache = requestCache.filter((req) => new Date().getTime() - req.timestamp < 5000)
  const cachedRequest = requestCache.find((el) => el.url === url)
  if (cachedRequest) {
    return cachedRequest.responsePromise
  }
  const res = axios.get(url)

  requestCache.push({
    url,
    responsePromise: res,
    timestamp: new Date().getTime()
  })

  return res
}

const runOperation = async (node: string, destination: string, parameters: any, fakeAddress: string) => {
  const fakeSignature: string = 'sigUHx32f9wesZ1n2BWpixXz4AQaZggEtchaQNHYGRCoWNAXx45WGW2ua3apUUUAGMLPwAU41QoaFCzVSL61VaessLg4YbbP'

  const results = await Promise.all([
    doNodeRequestWithCache(`${node}/chains/main/blocks/head/context/contracts/${fakeAddress}/counter`),
    doNodeRequestWithCache(`${node}/chains/main/blocks/head/header`)
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

const getPriceFromOracleView = async (oracle: TargetOracle, tezos: TezosToolkit) => {
  const contract = await tezos.wallet.at(oracle.address)
  const price = await contract.contractViews.get_price().executeView({ viewCaller: oracle.address })

  return price
}

export const getPriceFromOracle = async (
  oracle: TargetOracle,
  tezos: TezosToolkit,
  fakeAddress: string,
  viewerCallback: string
): Promise<string> => {
  if (oracle.isView) {
    return getPriceFromOracleView(oracle, tezos)
  }

  const res = await runOperation(
    tezos.rpc.getRpcUrl(),
    oracle.address,
    {
      entrypoint: oracle.entrypoint,
      value: {
        string: viewerCallback
      }
    },
    fakeAddress
  ).catch((error) => {
    internalOracleStatus.next(OracleStatusType.UNAVAILABLE)
    throw error
  })

  if (res.contents[0]?.metadata?.operation_result?.status !== 'applied') {
    internalOracleStatus.next(OracleStatusType.UNAVAILABLE)

    console.error(`LOADING ORACLE PRICE FROM ${oracle.address} FAILED`)
    return ''
  }

  internalOracleStatus.next(OracleStatusType.AVAILABLE)

  const internalOps: any[] = res.contents[0].metadata.internal_operation_results
  const op = internalOps.pop()
  const result = Array.isArray(op.result.storage)
    ? op.result.storage.args[1].int
    : Array.isArray(op.result.storage.args)
    ? op.result.storage.args[1].int
    : op.result.storage.int

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
  balanceOfViewerCallback: string
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
            string: balanceOfViewerCallback
          }
        ]
      }
    },
    fakeAddress
  )

  const internalOps: any[] = res.contents[0].metadata.internal_operation_results
  const op = internalOps.pop()

  const result = op.result.storage[0][0].args[1].int

  return result
}

export const calculateAPR = (
  totalStake: BigNumber,
  volumeInTimeframe: BigNumber,
  timeframeYearlyFactor: BigNumber,
  assetExchangeRate: BigNumber,
  governanceExchangeRate: BigNumber
) => {
  const yearlyRewardsInUSD = volumeInTimeframe.multipliedBy(timeframeYearlyFactor).multipliedBy(governanceExchangeRate)
  const totalStakeInUSD = totalStake.multipliedBy(assetExchangeRate)

  return yearlyRewardsInUSD.div(totalStakeInUSD)
}

export const simpleHash = (s: string) => {
  let h = 0
  for (let i = 0; i < s.length; i++) {
    h = (Math.imul(31, h) + s.charCodeAt(i)) | 0
  }

  return h
}

export const cacheFactory = (promiseCache: Map<string, Promise<unknown>>, getKeys: (obj: any) => [string, string]) => {
  return () => {
    return (_target: Object, propertyKey: string, descriptor: PropertyDescriptor) => {
      const originalMethod = descriptor.value

      const constructKey = (key1: string, key2: string, input: any[]) => {
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
        return `${key1}-${key2}-${propertyKey}-${processedInput.join('-')}`
      }

      descriptor.value = async function (...args: any[]) {
        const keys = getKeys(this)
        const constructedKey = constructKey(keys[0], keys[1], args)
        const promise = promiseCache.get(constructedKey)
        if (promise) {
          // log with constructedKey --> goes into cache
          // console.log(constructedKey, await promise)
          return promise
        } else {
          const newPromise = originalMethod.apply(this, args)
          promiseCache.set(constructedKey, newPromise)
          return newPromise
        }
      }

      return descriptor
    }
  }
}
