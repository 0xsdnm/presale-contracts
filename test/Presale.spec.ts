import hre, { ethers, waffle } from 'hardhat'
const { BigNumber, Contract } = ethers
const { deployContract } = waffle
import { expect } from './chai-setup'
import { Presale } from '../typechain'
import { SampleERC20 } from '../typechain'
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import PresaleArtifact from '../artifacts/contracts/Presale.sol/Presale.json'
import SampleERC20Artifact from '../artifacts/contracts/test/SampleERC20.sol/SampleERC20.json'
import IPancakeFactory from '../artifacts/contracts/interfaces/IPancakeFactory.sol/IPancakeFactory.json'
import IPancakeRouter02 from '../artifacts/contracts/interfaces/IPancakeRouter02.sol/IPancakeRouter02.json'

describe('Presale', () => {
  const provider = ethers.provider
  let owner: SignerWithAddress
  let alice: SignerWithAddress
  let bob: SignerWithAddress
  let carol: SignerWithAddress
  let david: SignerWithAddress
  let presale: Presale
  let presaleByAlice: Presale
  let presaleByBob: Presale
  let presaleByCarol: Presale
  let presaleByDavid: Presale
  let sampleERC20: SampleERC20

  let currentTimestamp: number
  let startDate: number
  let endDate: number
  const minCommitment = ethers.utils.parseEther('0.1')
  const maxCommitment = ethers.utils.parseEther('2')
  const softCap = ethers.utils.parseEther('3')
  const hardCap = ethers.utils.parseEther('6')
  const tokenOut = '0x0000000000000000000000000000000000000000'
  const presalePrice = '180000'
  const launchPrice = '120000'
  // requiring mainnet fork
  const routerAddress = '0x10ed43c718714eb63d5aa57b78b54704e256024e'
  const factoryAddress = '0xBCfCcbde45cE874adCB698cC183deBcF17952812'
  const WETHAddress = '0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c'
  let factory: InstanceType<typeof Contract>
  let router: InstanceType<typeof Contract>

  beforeEach(async () => {
    ;[owner, alice, bob, carol, david] = await ethers.getSigners()
    currentTimestamp = (await provider.getBlock('latest')).timestamp
    startDate = currentTimestamp + 900 // 15 mins from now
    endDate = currentTimestamp + 1800 // 30 mins from now
    presale = (await deployContract(owner, PresaleArtifact, [
      startDate,
      endDate,
      minCommitment,
      maxCommitment,
      softCap,
      hardCap,
      tokenOut,
      presalePrice,
      launchPrice,
      routerAddress,
    ])) as Presale
    presaleByAlice = presale.connect(alice)
    presaleByBob = presale.connect(bob)
    presaleByCarol = presale.connect(carol)
    presaleByDavid = presale.connect(david)
    factory = new ethers.Contract(factoryAddress, IPancakeFactory.abi, owner)
    router = new ethers.Contract(routerAddress, IPancakeRouter02.abi, owner)
  })

  describe('Constructor', () => {
    it('has correct settings', async () => {
      expect(await presale.startDate()).to.eq(startDate)
      expect(await presale.endDate()).to.eq(endDate)
      expect((await presale.minCommitment()).valueOf()).to.eq(minCommitment)
      expect((await presale.maxCommitment()).valueOf()).to.eq(maxCommitment)
      expect((await presale.softCap()).valueOf()).to.eq(softCap)
      expect((await presale.hardCap()).valueOf()).to.eq(hardCap)
      expect((await presale.tokenOut()).valueOf()).to.eq(tokenOut)
      expect((await presale.presalePrice()).valueOf()).to.eq(presalePrice)
      expect((await presale.launchPrice()).valueOf()).to.eq(launchPrice)
      expect((await presale.routerAddress()).toLowerCase()).to.eq(routerAddress)
      expect(await presale.whitelistEnabled()).to.be.true
      expect(await presale.addLiquidityEnabled()).to.be.true
    })
  })

  // Manage sale
  describe('#setTokenOut', () => {
    it('sets tokenOut correctly', async () => {
      sampleERC20 = (await deploySampleERC20(owner)) as SampleERC20
      await presale.setTokenOut(sampleERC20.address)
      expect(await presale.tokenOut()).to.eq(sampleERC20.address)
    })
  })

  describe('#setPresalePrice', () => {
    it('sets presalePrice correctly', async () => {
      await expect(presale.setPresalePrice(0)).to.be.revertedWith('Presale: presalePrice must be positive')
      await presale.setPresalePrice(100 * 1e9)
      expect(await presale.presalePrice()).to.eq(100 * 1e9)
    })
  })

  describe('#setLaunchPrice', () => {
    it('sets launchPrice correctly', async () => {
      await expect(presale.setLaunchPrice(0)).to.be.revertedWith('Presale: launchPrice must be positive')
      await presale.setLaunchPrice(100 * 1e9)
      expect(await presale.launchPrice()).to.eq(100 * 1e9)
    })
  })

  describe('#setStartDate', () => {
    it('sets startDate correctly', async () => {
      await expect(presale.setStartDate(endDate + 1)).to.be.revertedWith('Presale: invalid startDate')
      await presale.setStartDate(startDate + 100)
      expect(await presale.startDate()).to.eq(startDate + 100)
      await presale.setStartDate(startDate - 100)
      expect(await presale.startDate()).to.eq(startDate - 100)
    })
  })

  describe('#setEndDate', () => {
    it('sets endDate correctly', async () => {
      await expect(presale.setEndDate(startDate - 1)).to.be.revertedWith('Presale: invalid endDate')
      await presale.setEndDate(endDate + 100)
      expect(await presale.endDate()).to.eq(endDate + 100)
      await presale.setEndDate(endDate - 100)
      expect(await presale.endDate()).to.eq(endDate - 100)
    })
  })

  describe('#setWhitelistEnabled', () => {
    it('sets whitelistEnabled correctly', async () => {
      await presale.setWhitelistEnabled(true)
      expect(await presale.whitelistEnabled()).to.be.true
      await presale.setWhitelistEnabled(false)
      expect(await presale.whitelistEnabled()).to.be.false
    })
  })

  describe('#setAddLiquidityEnabled', () => {
    it('sets addLiquidityEnabled correctly', async () => {
      await presale.setAddLiquidityEnabled(true)
      expect(await presale.addLiquidityEnabled()).to.be.true
      await presale.setAddLiquidityEnabled(false)
      expect(await presale.addLiquidityEnabled()).to.be.false
    })
  })

  describe('#setRouterAddress', () => {
    it('sets routerAddress correctly', async () => {
      await expect(presale.setRouterAddress('0x0000000000000000000000000000000000000000')).to.be.revertedWith(
        'Presale: invalid routerAddress'
      )
      await presale.setRouterAddress('0x000000000000000000000000000000000000dead')
      expect((await presale.routerAddress()).toLowerCase()).to.eq('0x000000000000000000000000000000000000dead')
    })
  })

  describe('Sale actions', () => {
    beforeEach(async () => {
      sampleERC20 = await deploySampleERC20(owner)
      await presale.setTokenOut(sampleERC20.address)
    })

    describe('#purchaseTokens', () => {
      it('coordinates the sale correctly', async () => {
        // Start date checks
        await expect(presaleByAlice.purchaseTokens({ value: minCommitment })).to.be.revertedWith('Presale: too early!')
        await provider.send('evm_setNextBlockTimestamp', [startDate])
        await expect(presaleByAlice.purchaseTokens({ value: minCommitment })).to.be.revertedWith('Presale: too early!')

        // Whitelist checks
        await provider.send('evm_setNextBlockTimestamp', [startDate + 1])
        await expect(presaleByAlice.purchaseTokens({ value: minCommitment })).to.be.revertedWith(
          "Whitelistable: You're not on the whitelist."
        )

        // min/max commitment checks
        await presale.addToWhitelist([alice.address])
        await expect(presaleByAlice.purchaseTokens({ value: minCommitment.sub(1) })).to.be.revertedWith(
          'Presale: amount too low'
        )
        await expect(presaleByAlice.purchaseTokens({ value: maxCommitment.add(1) })).to.be.revertedWith(
          'Presale: maxCommitment reached'
        )
        await presaleByAlice.purchaseTokens({ value: minCommitment })
        expect(await presale.tokensSold()).to.eq(minCommitment)
        expect(await presale.tokensPurchased(alice.address)).to.eq(minCommitment)
        expect(await presaleByAlice.tokensRemaining()).to.eq(ethers.utils.parseUnits('1062000', 9))
        expect(await presaleByAlice.bnbRemaining()).to.eq(ethers.utils.parseEther('5.9'))
        expect(await presaleByAlice.getReservedTokens()).to.eq(ethers.utils.parseUnits('18000', 9))

        await presaleByAlice.purchaseTokens({ value: maxCommitment.sub(minCommitment) })
        expect(await presale.tokensPurchased(alice.address)).to.eq(maxCommitment)
        expect(await presale.tokensSold()).to.eq(maxCommitment)
        expect(await presaleByAlice.tokensRemaining()).to.eq(ethers.utils.parseUnits('720000', 9))
        expect(await presaleByAlice.bnbRemaining()).to.eq(ethers.utils.parseEther('4'))
        expect(await presaleByAlice.getReservedTokens()).to.eq(ethers.utils.parseUnits('360000', 9))

        expect(await presale.tokensPurchased(alice.address)).to.eq(maxCommitment)
        await expect(presaleByAlice.purchaseTokens({ value: minCommitment })).to.be.revertedWith(
          'Presale: maxCommitment reached'
        )

        // hardhap reached checks
        await presale.addToWhitelist([bob.address, carol.address, david.address])
        await presaleByBob.purchaseTokens({ value: maxCommitment })
        expect(await presale.tokensRemaining()).to.eq(ethers.utils.parseUnits('360000', 9))
        expect(await presale.bnbRemaining()).to.eq(ethers.utils.parseEther('2'))
        expect(await presale.tokensPurchased(bob.address)).to.eq(maxCommitment)
        await presaleByCarol.purchaseTokens({ value: maxCommitment })
        expect(await presale.tokensPurchased(carol.address)).to.eq(maxCommitment)
        await expect(presaleByDavid.purchaseTokens({ value: maxCommitment })).to.be.revertedWith(
          'Presale: hardcap reached'
        )
        expect(await presale.tokensPurchased(david.address)).to.eq(0)
        await expect(presale.finalizeSale()).to.be.revertedWith('Presale: token balance must be positive')
        // transfer ERC20 token to presale
        const presaleAmount = ethers.utils.parseUnits(presalePrice, 9).mul(6)
        const launchAmount = ethers.utils.parseUnits(launchPrice, 9).mul(6)
        await sampleERC20.transfer(presale.address, presaleAmount.add(launchAmount))
        await presale.finalizeSale()
        await expect(presaleByDavid.purchaseTokens({ value: maxCommitment })).to.be.revertedWith(
          'Presale: sale finalized'
        )
        expect(await presale.tokensPurchased(david.address)).to.eq(0)
        await provider.send('evm_setNextBlockTimestamp', [endDate + 1])
        await expect(presaleByDavid.purchaseTokens({ value: minCommitment })).to.be.revertedWith('Presale: too late!')
        expect(await presale.tokensPurchased(david.address)).to.eq(0)
        expect(await sampleERC20.balanceOf(david.address)).to.eq(0)
        await router
          .connect(david)
          .swapExactETHForTokensSupportingFeeOnTransferTokens(
            0,
            [WETHAddress, sampleERC20.address],
            david.address,
            currentTimestamp + 3600,
            { value: ethers.utils.parseEther('1') }
          )
        expect(await sampleERC20.balanceOf(david.address)).to.be.eq(102636655948553)
      })

      it('allows public purchase after whitelisting period', async () => {
        await presale.addToWhitelist([alice.address])
        await provider.send('evm_setNextBlockTimestamp', [startDate + 1])
        await presaleByAlice.purchaseTokens({ value: maxCommitment })
        expect(await presale.tokensPurchased(alice.address)).to.eq(maxCommitment)
        await expect(presaleByBob.purchaseTokens({ value: minCommitment })).to.be.revertedWith(
          "Whitelistable: You're not on the whitelist."
        )
        await expect(presaleByCarol.purchaseTokens({ value: minCommitment })).to.be.revertedWith(
          "Whitelistable: You're not on the whitelist."
        )
        await presale.setWhitelistEnabled(false)
        await presaleByBob.purchaseTokens({ value: maxCommitment })
        await presaleByCarol.purchaseTokens({ value: maxCommitment })
        expect(await presale.tokensPurchased(bob.address)).to.eq(maxCommitment)
        expect(await presale.tokensPurchased(carol.address)).to.eq(maxCommitment)
        await expect(presaleByDavid.purchaseTokens({ value: maxCommitment })).to.be.revertedWith(
          'Presale: hardcap reached'
        )
      })
    })

    describe('#withdrawBnb', () => {
      beforeEach(async () => {
        startDate = endDate + 900
        endDate = startDate + 900
        await presale.setEndDate(endDate)
        await presale.setStartDate(startDate)
      })

      it('transfers BNB balance to the owner wallet', async () => {
        await provider.send('evm_setNextBlockTimestamp', [startDate + 1])
        await presale.addToWhitelist([alice.address, bob.address])
        await presaleByAlice.purchaseTokens({ value: ethers.utils.parseEther('1') })
        await presaleByBob.purchaseTokens({ value: ethers.utils.parseEther('0.5') })
        expect(await provider.getBalance(presale.address)).to.eq(ethers.utils.parseEther('1.5'))
        const oldOwnerBalance = await provider.getBalance(owner.address)
        await presale.withdrawBnb()
        expect(await provider.getBalance(presale.address)).to.eq(0)
        expect(await provider.getBalance(owner.address)).to.be.above(oldOwnerBalance)
      })
    })

    describe('#withdrawErc20Token', () => {
      it('can withdraw deposited ERC20 tokens', async () => {
        const ownerERC20Balance = await sampleERC20.balanceOf(owner.address)
        expect(ownerERC20Balance).to.be.above(0)
        // transfer ERC20 token to presale
        const transferAmount = ethers.utils.parseUnits(presalePrice, 9).mul(6)
        await sampleERC20.transfer(presale.address, transferAmount)
        expect(await sampleERC20.balanceOf(presale.address)).to.eq(transferAmount)
        expect(await sampleERC20.balanceOf(owner.address)).to.be.below(ownerERC20Balance)

        const withdrawAmount = ethers.utils.parseUnits(presalePrice, 9).mul(2)
        await presale.withdrawErc20Token(sampleERC20.address, alice.address, withdrawAmount)
        expect(await sampleERC20.balanceOf(presale.address)).to.eq(ethers.utils.parseUnits(presalePrice, 9).mul(4))
        expect(await sampleERC20.balanceOf(alice.address)).to.eq(withdrawAmount)
      })
    })

    describe('sale finalized succesfully', () => {
      beforeEach(async () => {
        // transfer ERC20 token to presale
        const presaleAmount = ethers.utils.parseUnits(presalePrice, 9).mul(6)
        const launchAmount = ethers.utils.parseUnits(launchPrice, 9).mul(6)
        await sampleERC20.transfer(presale.address, presaleAmount.add(launchAmount))
        // start private sale
        await presale.addToWhitelist([alice.address, bob.address, carol.address, david.address])
      })

      it('can finalize sale and allows token claim when hardcap reached', async () => {
        await provider.send('evm_setNextBlockTimestamp', [startDate + 1])
        await expect(presaleByAlice.releaseTokens()).to.be.revertedWith('Presale: endDate not passed')

        await presaleByAlice.purchaseTokens({ value: maxCommitment })
        await presaleByBob.purchaseTokens({ value: maxCommitment })
        await presaleByCarol.purchaseTokens({ value: maxCommitment })

        // claim tokens unsuccessfully
        await expect(presaleByAlice.claimTokens()).to.be.revertedWith('Presale: sale not finalized')
        await expect(presaleByBob.claimTokens()).to.be.revertedWith('Presale: sale not finalized')
        await expect(presaleByCarol.claimTokens()).to.be.revertedWith('Presale: sale not finalized')

        // finalize sale
        await presale.finalizeSale()
        expect(await presale.isFinalized()).to.be.true
        await expect(presale.finalizeSale()).to.be.revertedWith('Presale: already finalized')
        expect(await presale.isFinalized()).to.be.true

        // refund tokens unsuccessfully
        await expect(presaleByAlice.releaseTokens()).to.be.revertedWith(
          'Presale: cannot release tokens for finalized sale'
        )
        await expect(presaleByBob.releaseTokens()).to.be.revertedWith(
          'Presale: cannot release tokens for finalized sale'
        )
        await expect(presaleByCarol.releaseTokens()).to.be.revertedWith(
          'Presale: cannot release tokens for finalized sale'
        )
        await expect(presaleByDavid.releaseTokens()).to.be.revertedWith(
          'Presale: cannot release tokens for finalized sale'
        )

        // claim tokens successfully
        await presaleByAlice.claimTokens()
        await presaleByBob.claimTokens()
        await presaleByCarol.claimTokens()
        await expect(presaleByDavid.claimTokens()).to.be.revertedWith('Presale: no tokens to claim')
        const maxClaimableAmount = ethers.utils.parseUnits('360000', 9)
        expect(await sampleERC20.balanceOf(alice.address)).to.eq(maxClaimableAmount)
        expect(await sampleERC20.balanceOf(bob.address)).to.eq(maxClaimableAmount)
        expect(await sampleERC20.balanceOf(carol.address)).to.eq(maxClaimableAmount)
        expect(await sampleERC20.balanceOf(david.address)).to.eq(0)
      })

      it('can finalize sale and allows token claim when softcap reached and ended', async () => {
        await provider.send('evm_setNextBlockTimestamp', [startDate + 1])
        await presaleByAlice.purchaseTokens({ value: maxCommitment })
        await presaleByBob.purchaseTokens({ value: maxCommitment })
        expect(await presaleByAlice.bnbRemaining()).to.eq(ethers.utils.parseEther('2'))

        // refund tokens unsuccessfully
        await expect(presaleByAlice.releaseTokens()).to.be.revertedWith('Presale: endDate not passed')
        await expect(presaleByBob.releaseTokens()).to.be.revertedWith('Presale: endDate not passed')
        await expect(presaleByCarol.releaseTokens()).to.be.revertedWith('Presale: endDate not passed')

        await expect(presale.finalizeSale()).to.be.revertedWith('Presale: endDate not passed or hardcap not reached')
        expect(await presale.isFinalized()).to.be.false
        await provider.send('evm_setNextBlockTimestamp', [endDate + 1])
        await expect(presaleByAlice.releaseTokens()).to.be.revertedWith('Presale: softCap reached')
        await expect(presaleByBob.releaseTokens()).to.be.revertedWith('Presale: softCap reached')
        await expect(presaleByCarol.releaseTokens()).to.be.revertedWith('Presale: no tokens to release')

        await presale.finalizeSale()
        expect(await presale.isFinalized()).to.be.true
      })

      it('adds liquidity when finalizing if the option is enabled', async () => {
        await provider.send('evm_setNextBlockTimestamp', [startDate + 1])

        await presaleByAlice.purchaseTokens({ value: maxCommitment })
        await presaleByBob.purchaseTokens({ value: maxCommitment })
        await presaleByCarol.purchaseTokens({ value: maxCommitment })

        await presale.setAddLiquidityEnabled(true)
        await presale.finalizeSale()

        // claim tokens successfully
        await presaleByAlice.claimTokens()
        await presaleByBob.claimTokens()
        await presaleByCarol.claimTokens()
        await expect(presaleByDavid.claimTokens()).to.be.revertedWith('Presale: no tokens to claim')
        const maxClaimableAmount = ethers.utils.parseUnits('360000', 9)
        expect(await sampleERC20.balanceOf(alice.address)).to.eq(maxClaimableAmount)
        expect(await sampleERC20.balanceOf(bob.address)).to.eq(maxClaimableAmount)
        expect(await sampleERC20.balanceOf(carol.address)).to.eq(maxClaimableAmount)
        expect(await sampleERC20.balanceOf(david.address)).to.eq(0)

        await router
          .connect(david)
          .swapExactETHForTokensSupportingFeeOnTransferTokens(
            0,
            [WETHAddress, sampleERC20.address],
            david.address,
            currentTimestamp + 3600,
            { value: ethers.utils.parseEther('1') }
          )
        expect(await sampleERC20.balanceOf(david.address)).to.be.eq(102636655948553)
        const carolCurrentETHBalance = await provider.getBalance(carol.address)
        await sampleERC20.connect(carol).approve(routerAddress, maxClaimableAmount)
        await router
          .connect(carol)
          .swapExactTokensForETHSupportingFeeOnTransferTokens(
            maxClaimableAmount,
            0,
            [sampleERC20.address, WETHAddress],
            carol.address,
            currentTimestamp + 3600
          )
        expect(await sampleERC20.balanceOf(carol.address)).to.eq(0)
        expect(await provider.getBalance(carol.address)).to.be.above(carolCurrentETHBalance)
      })

      it('does not add liquidity when finalizing if the option is disabled', async () => {
        await provider.send('evm_setNextBlockTimestamp', [startDate + 1])

        await presaleByAlice.purchaseTokens({ value: maxCommitment })
        await presaleByBob.purchaseTokens({ value: maxCommitment })
        await presaleByCarol.purchaseTokens({ value: maxCommitment })

        await presale.setAddLiquidityEnabled(false)
        await presale.finalizeSale()

        // claim tokens successfully
        await presaleByAlice.claimTokens()
        await presaleByBob.claimTokens()
        await presaleByCarol.claimTokens()
        await expect(presaleByDavid.claimTokens()).to.be.revertedWith('Presale: no tokens to claim')
        const maxClaimableAmount = ethers.utils.parseUnits('360000', 9)
        expect(await sampleERC20.balanceOf(alice.address)).to.eq(maxClaimableAmount)
        expect(await sampleERC20.balanceOf(bob.address)).to.eq(maxClaimableAmount)
        expect(await sampleERC20.balanceOf(carol.address)).to.eq(maxClaimableAmount)
        expect(await sampleERC20.balanceOf(david.address)).to.eq(0)

        await expect(
          router
            .connect(david)
            .swapExactETHForTokensSupportingFeeOnTransferTokens(
              0,
              [WETHAddress, sampleERC20.address],
              david.address,
              currentTimestamp + 3600,
              { value: ethers.utils.parseEther('1') }
            )
        ).to.be.revertedWith('')
        expect(await sampleERC20.balanceOf(david.address)).to.be.eq(0)
        const carolCurrentETHBalance = await provider.getBalance(carol.address)
        await sampleERC20.connect(carol).approve(routerAddress, maxClaimableAmount)
        await expect(
          router
            .connect(carol)
            .swapExactTokensForETHSupportingFeeOnTransferTokens(
              maxClaimableAmount,
              0,
              [sampleERC20.address, WETHAddress],
              carol.address,
              currentTimestamp + 3600
            )
        ).to.be.revertedWith('')
        expect(await sampleERC20.balanceOf(carol.address)).to.eq(maxClaimableAmount)
        expect(await provider.getBalance(carol.address)).to.be.below(carolCurrentETHBalance) // because of tx fee
      })
    })

    describe('sale failed', () => {
      beforeEach(async () => {
        // transfer ERC20 token to presale
        const transferAmount = ethers.utils.parseUnits(presalePrice, 9).mul(6)
        await sampleERC20.transfer(presale.address, transferAmount)
        // start private sale
        await presale.addToWhitelist([alice.address, bob.address, carol.address, david.address])
      })

      it('allows refund', async () => {
        await provider.send('evm_setNextBlockTimestamp', [startDate + 1])
        await presaleByAlice.purchaseTokens({ value: minCommitment })
        await presaleByBob.purchaseTokens({ value: minCommitment })
        await presaleByCarol.purchaseTokens({ value: minCommitment })
        expect(await provider.getBalance(presale.address)).to.eq(minCommitment.mul(3))

        await provider.send('evm_setNextBlockTimestamp', [endDate + 1])

        const aliceBalanceAfterPurchase = await provider.getBalance(alice.address)
        const bobBalanceAfterPurchase = await provider.getBalance(bob.address)
        const carolBalanceAfterPurchase = await provider.getBalance(carol.address)
        const davidBalanceAfterPurchase = await provider.getBalance(david.address)
        await presaleByAlice.releaseTokens()
        await presaleByBob.releaseTokens()
        await presaleByCarol.releaseTokens()
        await expect(presaleByDavid.releaseTokens()).to.be.revertedWith('Presale: no tokens to release')

        expect(await provider.getBalance(alice.address)).to.be.above(aliceBalanceAfterPurchase)
        expect(await provider.getBalance(bob.address)).to.be.above(bobBalanceAfterPurchase)
        expect(await provider.getBalance(carol.address)).to.be.above(carolBalanceAfterPurchase)
        expect(await provider.getBalance(david.address)).to.eq(davidBalanceAfterPurchase)
        expect(await provider.getBalance(presale.address)).to.eq(0)
      })
    })
  })
})

const deploySampleERC20 = async (owner: SignerWithAddress) => {
  return (await deployContract(owner, SampleERC20Artifact, [
    9,
    ethers.utils.parseUnits('1000000000000', 9), // 1T
  ])) as SampleERC20
}
