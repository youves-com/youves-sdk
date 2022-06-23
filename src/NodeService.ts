import axios, { AxiosResponse } from 'axios'
import { BehaviorSubject } from 'rxjs'
import { distinctUntilChanged } from 'rxjs/operators'

export enum NodeStatusType {
  ONLINE,
  OFFLINE
}

export const internalNodeStatus: BehaviorSubject<NodeStatusType> = new BehaviorSubject<NodeStatusType>(NodeStatusType.ONLINE)
export const nodeStatus = internalNodeStatus.pipe(distinctUntilChanged())

class NodeService {
  private requestCache: { url: string; responsePromise: Promise<AxiosResponse<any>>; timestamp: number }[] = []

  public getHeader(node: string) {
    return this.doRequestWithCache(`${node}/chains/main/blocks/head/header`)
  }

  private async doRequestWithCache(url: string) {
    this.requestCache = this.requestCache.filter((req) => new Date().getTime() - req.timestamp < 2000)
    const cachedRequest = this.requestCache.find((el) => el.url === url)
    if (cachedRequest) {
      return cachedRequest.responsePromise
    }

    const res = axios.get(url)

    this.requestCache.push({
      url,
      responsePromise: res,
      timestamp: new Date().getTime()
    })

    try {
      const data = (await res).data

      internalNodeStatus.next(NodeStatusType.ONLINE)
      return data
    } catch (error) {
      internalNodeStatus.next(NodeStatusType.OFFLINE)

      throw error
    }
  }
}

const nodeService = new NodeService()

export const getNodeService = () => {
  return nodeService
}
