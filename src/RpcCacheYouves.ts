import { BlockHeaderResponse, defaultRPCOptions, RpcClientCache, RpcClientInterface, RPCOptions } from '@taquito/rpc'

interface CachedDataInterface {
  [key: string]: {
    handle: Function
    response: Promise<any> // CHANGE: Promise
  }
}

const defaultTtl = 1000

export class RpcClientPromiseCache extends RpcClientCache {
  private rpcClient2: RpcClientInterface
  private _cache2: CachedDataInterface = {}
  private ttl2: number

  constructor(rpcClient: RpcClientInterface, ttl = defaultTtl) {
    super(rpcClient, ttl)
    this.rpcClient2 = rpcClient
    this.ttl2 = ttl
  }

  private formatCacheKey2(rpcUrl: string, rpcMethodName: string, rpcMethodParams: any[], rpcMethodData?: any) {
    let paramsToString = ''
    rpcMethodParams.forEach((param) => {
      paramsToString = typeof param === 'object' ? paramsToString + JSON.stringify(param) + '/' : paramsToString + param + '/'
    })
    return rpcMethodData
      ? `${rpcUrl}/${rpcMethodName}/${paramsToString}/${JSON.stringify(rpcMethodData)}`
      : `${rpcUrl}/${rpcMethodName}/${paramsToString}`
  }

  private has2(key: string) {
    return key in this._cache2
  }

  private get2(key: string) {
    return this._cache2[key].response
  }

  private put2(key: string, response: Promise<any>) {
    // CHANGE: Promise
    let handle = setTimeout(() => {
      return this.remove2(key)
    }, this.ttl2)

    Object.assign(this._cache2, { [key]: { handle, response } })
  }

  private remove2(key: string) {
    if (key in this._cache2) {
      delete this._cache2[key]
    }
  }

  async getBlockHeader({ block }: RPCOptions = defaultRPCOptions): Promise<BlockHeaderResponse> {
    const key = this.formatCacheKey2(this.rpcClient2.getRpcUrl(), 'getBlockHeader', [block])
    if (this.has2(key)) {
      return this.get2(key)
    } else {
      const response = this.rpcClient2.getBlockHeader({ block }) // CHANGE: do not await request
      this.put2(key, response)
      return response
    }
  }
}
