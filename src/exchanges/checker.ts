import { TezosToolkit } from '@taquito/taquito'
import BigNumber from 'bignumber.js'
import { Token } from '../tokens/token'
import { Exchange } from './exchange'

export abstract class CheckerExchange extends Exchange {
  public exchangeUrl: string = 'https://app.youves.com/swap'
  public exchangeId: string = ``
  public name: string = 'Youves (Checker)'
  public logo: string = 'checker_logo.svg'

  public TOKEN_DECIMALS = 12
  public TEZ_DECIMALS = 6

  public FEE: number = 0.997

  constructor(tezos: TezosToolkit, dexAddress: string, token1: Token, token2: Token) {
    super(tezos, dexAddress, token1, token2)
  }

  //   public abstract token1ToToken2(tokenAmount: number, minimumReceived: number): Promise<string>
  //   public abstract token2ToToken1(tokenAmount: number, minimumReceived: number): Promise<string>

  public abstract getToken1MaximumExchangeAmount(): Promise<BigNumber>

  public abstract getToken2MaximumExchangeAmount(): Promise<BigNumber>

  public abstract getExchangeRate(): Promise<BigNumber>

  public abstract getToken1Balance(): Promise<BigNumber>

  public abstract getToken2Balance(): Promise<BigNumber>

  public abstract getExpectedMinimumReceivedToken1(token2Amount: number): Promise<BigNumber>

  public abstract getExpectedMinimumReceivedToken2(token1Amount: number): Promise<BigNumber>

  abstract getTezBalance(): Promise<BigNumber>

  abstract getExchangeMaximumTokenAmount(): Promise<BigNumber>

  abstract getExchangeMaximumTezAmount(): Promise<BigNumber>

  public abstract tezToTokenSwap(amountInMutez: number, minimumReceived: number): Promise<string>

  public abstract tokenToTezSwap(tokenAmount: number, minimumReceived: number): Promise<string>
  public abstract getExpectedMinimumReceivedToken(amountInMutez: number): Promise<BigNumber>

  public abstract getExpectedMinimumReceivedTez(tokenAmount: number): Promise<BigNumber>
  public abstract getExchangeUrl(): Promise<string>
}
