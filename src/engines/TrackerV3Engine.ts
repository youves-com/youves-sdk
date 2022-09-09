import BigNumber from 'bignumber.js'
import { round } from '../utils'
import { TrackerV2Engine } from './TrackerV2Engine'

export class TrackerV3Engine extends TrackerV2Engine {
  public async createVault(
    collateralAmountInMutez: number,
    mintAmountInToken: number,
    baker?: string,
    _allowSettlement: boolean = true,
    referrer?: string
  ): Promise<string> {
    const engineContract = await this.engineContractPromise
    console.log('creating vault v3', 'referrer', referrer)

    // Check if the referrer is an address (maybe we should actually validate the address at some point, if it's invalid the operation will fail now)
    const isValidAddress = (addr: string | undefined): boolean => {
      if (!addr) {
        return false
      }

      const lowercaseAddr = addr.toLowerCase()

      return (
        lowercaseAddr.startsWith('tz1') ||
        lowercaseAddr.startsWith('tz2') ||
        lowercaseAddr.startsWith('tz3') ||
        lowercaseAddr.startsWith('kt1')
      )
    }

    if (this.activeCollateral.token.symbol === 'tez') {
      return this.sendAndAwait(
        this.tezos.wallet
          .batch()
          .withTransfer(
            engineContract.methods
              .create_vault(baker ? baker : null, isValidAddress(referrer) ? referrer : undefined, this.VIEWER_CALLBACK_ADDRESS)
              .toTransferParams({ amount: collateralAmountInMutez, mutez: true })
          )
          .withContractCall(engineContract.methods.mint(round(new BigNumber(mintAmountInToken))))
      )
    }

    return this.sendAndAwait(
      this.tezos.wallet
        .batch()
        .withContractCall(await this.prepareAddTokenOperator(this.activeCollateral.token, this.ENGINE_ADDRESS))
        .withContractCall(
          engineContract.methods.create_vault(isValidAddress(referrer) ? referrer : undefined, this.VIEWER_CALLBACK_ADDRESS)
        )
        .withContractCall(engineContract.methods.deposit(collateralAmountInMutez))
        .withContractCall(engineContract.methods.mint(round(new BigNumber(mintAmountInToken))))
        .withContractCall(await this.prepareRemoveTokenOperator(this.activeCollateral.token, this.ENGINE_ADDRESS))
    )
  }
}
