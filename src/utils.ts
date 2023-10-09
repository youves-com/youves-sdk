import { OpKind } from '@taquito/rpc'
import { ContractAbstraction, TezosToolkit } from '@taquito/taquito'
import axios, { AxiosError, AxiosResponse } from 'axios'
import BigNumber from 'bignumber.js'
import { BehaviorSubject } from 'rxjs'
import { distinctUntilChanged, map } from 'rxjs/operators'
import { TargetOracle } from './networks.base'
import { internalNodeStatus, NodeStatusType } from './NodeService'

export const SECONDS_IN_A_YEAR = 60 * 60 * 24 * 365

export const internalStaleOracles: BehaviorSubject<Set<string>> = new BehaviorSubject<Set<string>>(new Set())
export const staleOracles$ = internalStaleOracles.pipe(
  map((set) => Array.from(set)),
  distinctUntilChanged()
)

export const internalMarketStaleOracles: BehaviorSubject<Set<string>> = new BehaviorSubject<Set<string>>(new Set())
export const marketStaleOracles$ = internalMarketStaleOracles.pipe(
  map((set) => Array.from(set)),
  distinctUntilChanged()
)

export const oracleAvailable$ = staleOracles$.pipe(map((staleOracles) => (staleOracles.length > 0 ? false : true), distinctUntilChanged()))
export const marketOracleAvailable$ = marketStaleOracles$.pipe(
  map((staleOracles) => (staleOracles.length > 0 ? false : true), distinctUntilChanged())
)

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

  const response = await axios
    .post(`${node}/chains/main/blocks/head/helpers/scripts/run_operation`, body, {
      headers: { 'Content-Type': 'application/json' }
    })
    .catch((runOperationError: AxiosError) => {
      console.error('runOperationError', runOperationError)
    })

  return response !== undefined ? response.data : undefined
}

const getPriceFromOracleView = async (oracle: TargetOracle, tezos: TezosToolkit) => {
  const contract = await tezos.wallet.at(oracle.address)
  const price = await contract.contractViews
    .get_price()
    .executeView({ viewCaller: oracle.address })
    .catch((error) => {
      addStaleOracle(oracle)
      throw error
    })

  deleteStaleOracle(oracle)
  return price
}

const addStaleOracle = (oracle: TargetOracle) => {
  if (!oracle.symbol) return
  if (oracle.isMarket) {
    const currentSet = internalMarketStaleOracles.getValue()
    currentSet.add(oracle.symbol)
    internalMarketStaleOracles.next(currentSet)
  } else {
    const currentSet = internalStaleOracles.getValue()
    currentSet.add(oracle.symbol)
    internalStaleOracles.next(currentSet)
  }
}

const deleteStaleOracle = (oracle: TargetOracle) => {
  if (!oracle.symbol) return
  if (oracle.isMarket) {
    const currentSet = internalMarketStaleOracles.getValue()
    currentSet.delete(oracle.symbol)
    internalMarketStaleOracles.next(currentSet)
  } else {
    const currentSet = internalStaleOracles.getValue()
    currentSet.delete(oracle.symbol)
    internalStaleOracles.next(currentSet)
  }
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
    addStaleOracle(oracle)
    throw error
  })

  if (res.contents[0]?.metadata?.operation_result?.status !== 'applied') {
    addStaleOracle(oracle)

    console.error(`LOADING ORACLE PRICE FROM ${oracle.address} FAILED`)
    return ''
  }

  deleteStaleOracle(oracle)

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

export const cacheFactory = (promiseCache: Map<string, Promise<unknown>>, getKeys: (obj: any) => string[]) => {
  return () => {
    return (_target: Object, propertyKey: string, descriptor: PropertyDescriptor) => {
      const originalMethod = descriptor.value

      const constructKey = (keys: string[], input: any[]) => {
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
        return `${keys.join('-')}-${propertyKey}-${processedInput.join('-')}`
      }

      descriptor.value = async function (...args: any[]) {
        const keys = getKeys(this)
        const constructedKey = constructKey(keys, args)
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

//get milliseconds from seconds
export const getMillisFromSeconds = (s: number) => {
  return s * 1000
}

//get milliseconds from minutes
export const getMillisFromMinutes = (m: number) => {
  return m * 60 * 1000
}

//get milliseconds from hours
export const getMillisFromHours = (h: number) => {
  return h * 60 * 60 * 1000
}

//get milliseconds from hours
export const getMillisFromDays = (d: number) => {
  return d * 24 * 60 * 60 * 1000
}

//get milliseconds from years
export const getMillisFromYears = (y: number) => {
  return y * 52 * 7 * 24 * 60 * 60 * 1000
}
