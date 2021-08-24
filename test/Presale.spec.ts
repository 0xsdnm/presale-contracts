import hre, { ethers, waffle } from 'hardhat'
const { BigNumber, Contract } = ethers
const { parseEther, parseUnits } = ethers.utils
const { deployContract } = waffle
import { expect } from './chai-setup'
import { Presale } from '../typechain'
import { MockERC20 } from '../typechain'
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import PresaleArtifact from '../artifacts/contracts/Presale.sol/Presale.json'
import MockERC20Artifact from '../artifacts/contracts/test/MockERC20.sol/MockERC20.json'
import IDEXRouter from '../artifacts/contracts/interfaces/IDEXRouter.sol/IDEXRouter.json'

describe('Presale', () => {
  const provider = ethers.provider
  let owner: SignerWithAddress
  let alice: SignerWithAddress
  let bob: SignerWithAddress
  let carol: SignerWithAddress
  let david: SignerWithAddress
  let presale: Presale
  let mockERC20: MockERC20

  let currentTimestamp: number
  let startDate: number
  let endDate: number
  const minCommitment = parseEther('0.1')
  const maxCommitment = parseEther('2')
  const softCap = parseEther('3')
  const hardCap = parseEther('6')
  const tokenOut = '0x0000000000000000000000000000000000000000'
  const presalePrice = '180000'
  const launchPrice = '120000'
  // requiring mainnet fork
  const routerAddress = '0x10ed43c718714eb63d5aa57b78b54704e256024e'
  const WETHAddress = '0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c'
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
    router = new ethers.Contract(routerAddress, IDEXRouter.abi, owner)
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
      expect((await presale.router()).toLowerCase()).to.eq(routerAddress)
      expect(await presale.isWhitelistEnabled()).to.be.true
      expect(await presale.isAddLiquidityEnabled()).to.be.true
    })
  })

  // Manage sale
  describe('#setTokenOut', () => {
    it('sets tokenOut correctly', async () => {
      mockERC20 = (await deployMockERC20(owner)) as MockERC20
      await presale.setTokenOut(mockERC20.address)
      expect(await presale.tokenOut()).to.eq(mockERC20.address)
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

  describe('#setIsWhitelistEnabled', () => {
    it('sets isWhitelistEnabled correctly', async () => {
      await presale.setIsWhitelistEnabled(true)
      expect(await presale.isWhitelistEnabled()).to.be.true
      await presale.setIsWhitelistEnabled(false)
      expect(await presale.isWhitelistEnabled()).to.be.false
    })
  })

  describe('#setIsAddLiquidityEnabled', () => {
    it('sets isAddLiquidityEnabled correctly', async () => {
      await presale.setIsAddLiquidityEnabled(true)
      expect(await presale.isAddLiquidityEnabled()).to.be.true
      await presale.setIsAddLiquidityEnabled(false)
      expect(await presale.isAddLiquidityEnabled()).to.be.false
    })
  })

  describe('#setRouter', () => {
    it('sets router correctly', async () => {
      await expect(presale.setRouter('0x0000000000000000000000000000000000000000')).to.be.revertedWith(
        'Presale: invalid router'
      )
      await presale.setRouter('0x10ed43c718714eb63d5aa57b78b54704e256024e')
      expect((await presale.router()).toLowerCase()).to.eq('0x10ed43c718714eb63d5aa57b78b54704e256024e')
    })
  })

  describe('Sale actions', () => {
    beforeEach(async () => {
      mockERC20 = await deployMockERC20(owner)
      await presale.setTokenOut(mockERC20.address)
    })

    describe('#purchaseTokens', () => {
      it('coordinates the sale correctly', async () => {
        // Start date checks
        await expect(presale.connect(alice).purchaseTokens({ value: minCommitment })).to.be.revertedWith(
          'Presale: too early!'
        )
        await provider.send('evm_setNextBlockTimestamp', [startDate])
        await expect(presale.connect(alice).purchaseTokens({ value: minCommitment })).to.be.revertedWith(
          'Presale: too early!'
        )

        // Whitelist checks
        await provider.send('evm_setNextBlockTimestamp', [startDate + 1])
        await expect(presale.connect(alice).purchaseTokens({ value: minCommitment })).to.be.revertedWith(
          "Whitelistable: You're not on the whitelist."
        )

        // min/max commitment checks
        await presale.addToWhitelist([alice.address])
        await expect(presale.connect(alice).purchaseTokens({ value: 0 })).to.be.revertedWith(
          'Presale: amount too low'
        )
        await expect(presale.connect(alice).purchaseTokens({ value: minCommitment.sub(1) })).to.be.revertedWith(
          'Presale: amount too low'
        )
        await expect(presale.connect(alice).purchaseTokens({ value: maxCommitment.add(1) })).to.be.revertedWith(
          'Presale: maxCommitment reached'
        )
        await presale.connect(alice).purchaseTokens({ value: minCommitment })
        await presale.connect(alice).purchaseTokens({ value: parseEther('0.05') })
        const tokenSoldToAlice = minCommitment.add(parseEther('0.05'))
        expect(await presale.tokensSold()).to.eq(tokenSoldToAlice)
        expect(await presale.tokensPurchased(alice.address)).to.eq(tokenSoldToAlice)
        expect(await presale.connect(alice).tokensRemaining()).to.eq(parseUnits('1053000', 9))
        expect(await presale.connect(alice).bnbRemaining()).to.eq(parseEther('5.85'))
        expect(await presale.connect(alice).getReservedTokens()).to.eq(parseUnits('27000', 9))

        await presale.connect(alice).purchaseTokens({ value: maxCommitment.sub(tokenSoldToAlice) })
        expect(await presale.tokensPurchased(alice.address)).to.eq(maxCommitment)
        expect(await presale.tokensSold()).to.eq(maxCommitment)
        expect(await presale.connect(alice).tokensRemaining()).to.eq(parseUnits('720000', 9))
        expect(await presale.connect(alice).bnbRemaining()).to.eq(parseEther('4'))
        expect(await presale.connect(alice).getReservedTokens()).to.eq(parseUnits('360000', 9))

        expect(await presale.tokensPurchased(alice.address)).to.eq(maxCommitment)
        await expect(presale.connect(alice).purchaseTokens({ value: minCommitment })).to.be.revertedWith(
          'Presale: maxCommitment reached'
        )

        // hardhap reached checks
        await presale.addToWhitelist([bob.address, carol.address, david.address])
        await presale.connect(bob).purchaseTokens({ value: maxCommitment })
        expect(await presale.tokensRemaining()).to.eq(parseUnits('360000', 9))
        expect(await presale.bnbRemaining()).to.eq(parseEther('2'))
        expect(await presale.tokensPurchased(bob.address)).to.eq(maxCommitment)
        await presale.connect(carol).purchaseTokens({ value: maxCommitment })
        expect(await presale.tokensPurchased(carol.address)).to.eq(maxCommitment)
        await expect(presale.connect(david).purchaseTokens({ value: maxCommitment })).to.be.revertedWith(
          'Presale: hardcap reached'
        )
        expect(await presale.tokensPurchased(david.address)).to.eq(0)
        await expect(presale.finalizeSale()).to.be.revertedWith('Presale: token balance must be positive')
        // transfer ERC20 token to presale
        const presaleAmount = parseUnits(presalePrice, 9).mul(6)
        const launchAmount = parseUnits(launchPrice, 9).mul(6)
        await mockERC20.transfer(presale.address, presaleAmount.add(launchAmount))
        await presale.finalizeSale()
        await expect(presale.connect(david).purchaseTokens({ value: maxCommitment })).to.be.revertedWith(
          'Presale: sale finalized'
        )
        expect(await presale.tokensPurchased(david.address)).to.eq(0)
        await provider.send('evm_setNextBlockTimestamp', [endDate + 1])
        await expect(presale.connect(david).purchaseTokens({ value: minCommitment })).to.be.revertedWith(
          'Presale: too late!'
        )
        expect(await presale.tokensPurchased(david.address)).to.eq(0)
        expect(await mockERC20.balanceOf(david.address)).to.eq(0)
        await router
          .connect(david)
          .swapExactETHForTokensSupportingFeeOnTransferTokens(
            0,
            [WETHAddress, mockERC20.address],
            david.address,
            currentTimestamp + 3600,
            { value: parseEther('1') }
          )
        expect(await mockERC20.balanceOf(david.address)).to.be.eq(102636655948553)
      })

      it('allows public purchase after whitelisting period', async () => {
        await presale.addToWhitelist([alice.address])
        await provider.send('evm_setNextBlockTimestamp', [startDate + 1])
        await presale.connect(alice).purchaseTokens({ value: maxCommitment })
        expect(await presale.tokensPurchased(alice.address)).to.eq(maxCommitment)
        await expect(presale.connect(bob).purchaseTokens({ value: minCommitment })).to.be.revertedWith(
          "Whitelistable: You're not on the whitelist."
        )
        await expect(presale.connect(carol).purchaseTokens({ value: minCommitment })).to.be.revertedWith(
          "Whitelistable: You're not on the whitelist."
        )
        await presale.setIsWhitelistEnabled(false)
        await presale.connect(bob).purchaseTokens({ value: maxCommitment })
        await presale.connect(carol).purchaseTokens({ value: maxCommitment })
        expect(await presale.tokensPurchased(bob.address)).to.eq(maxCommitment)
        expect(await presale.tokensPurchased(carol.address)).to.eq(maxCommitment)
        await expect(presale.connect(david).purchaseTokens({ value: maxCommitment })).to.be.revertedWith(
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
        await presale.connect(alice).purchaseTokens({ value: parseEther('1') })
        await presale.connect(bob).purchaseTokens({ value: parseEther('0.5') })
        expect(await provider.getBalance(presale.address)).to.eq(parseEther('1.5'))
        const oldOwnerBalance = await provider.getBalance(owner.address)
        await presale.withdrawBnb()
        expect(await provider.getBalance(presale.address)).to.eq(0)
        expect(await provider.getBalance(owner.address)).to.be.above(oldOwnerBalance)
      })
    })

    describe('#withdrawErc20Token', () => {
      it('can withdraw deposited ERC20 tokens', async () => {
        const ownerERC20Balance = await mockERC20.balanceOf(owner.address)
        expect(ownerERC20Balance).to.be.above(0)
        // transfer ERC20 token to presale
        const transferAmount = parseUnits(presalePrice, 9).mul(6)
        await mockERC20.transfer(presale.address, transferAmount)
        expect(await mockERC20.balanceOf(presale.address)).to.eq(transferAmount)
        expect(await mockERC20.balanceOf(owner.address)).to.be.below(ownerERC20Balance)

        const withdrawAmount = parseUnits(presalePrice, 9).mul(2)
        await presale.withdrawErc20Token(mockERC20.address, alice.address, withdrawAmount)
        expect(await mockERC20.balanceOf(presale.address)).to.eq(parseUnits(presalePrice, 9).mul(4))
        expect(await mockERC20.balanceOf(alice.address)).to.eq(withdrawAmount)
      })
    })

    describe('sale finalized succesfully', () => {
      beforeEach(async () => {
        // transfer ERC20 token to presale
        const presaleAmount = parseUnits(presalePrice, 9).mul(6)
        const launchAmount = parseUnits(launchPrice, 9).mul(6)
        await mockERC20.transfer(presale.address, presaleAmount.add(launchAmount))
        // start private sale
        await presale.addToWhitelist([alice.address, bob.address, carol.address, david.address])
      })

      it('can finalize sale and allows token claim when hardcap reached', async () => {
        await provider.send('evm_setNextBlockTimestamp', [startDate + 1])
        await expect(presale.connect(alice).releaseTokens()).to.be.revertedWith('Presale: endDate not passed')

        await presale.connect(alice).purchaseTokens({ value: maxCommitment })
        await presale.connect(bob).purchaseTokens({ value: maxCommitment })
        await presale.connect(carol).purchaseTokens({ value: maxCommitment })

        // claim tokens unsuccessfully
        await expect(presale.connect(alice).claimTokens()).to.be.revertedWith('Presale: sale not finalized')
        await expect(presale.connect(bob).claimTokens()).to.be.revertedWith('Presale: sale not finalized')
        await expect(presale.connect(carol).claimTokens()).to.be.revertedWith('Presale: sale not finalized')

        // finalize sale
        await presale.finalizeSale()
        expect(await presale.isFinalized()).to.be.true
        await expect(presale.finalizeSale()).to.be.revertedWith('Presale: already finalized')
        expect(await presale.isFinalized()).to.be.true

        // refund tokens unsuccessfully
        await expect(presale.connect(alice).releaseTokens()).to.be.revertedWith(
          'Presale: cannot release tokens for finalized sale'
        )
        await expect(presale.connect(bob).releaseTokens()).to.be.revertedWith(
          'Presale: cannot release tokens for finalized sale'
        )
        await expect(presale.connect(carol).releaseTokens()).to.be.revertedWith(
          'Presale: cannot release tokens for finalized sale'
        )
        await expect(presale.connect(david).releaseTokens()).to.be.revertedWith(
          'Presale: cannot release tokens for finalized sale'
        )

        // claim tokens successfully
        await presale.connect(alice).claimTokens()
        await presale.connect(bob).claimTokens()
        await presale.connect(carol).claimTokens()
        await expect(presale.connect(david).claimTokens()).to.be.revertedWith('Presale: no tokens to claim')
        const maxClaimableAmount = parseUnits('360000', 9)
        expect(await mockERC20.balanceOf(alice.address)).to.eq(maxClaimableAmount)
        expect(await mockERC20.balanceOf(bob.address)).to.eq(maxClaimableAmount)
        expect(await mockERC20.balanceOf(carol.address)).to.eq(maxClaimableAmount)
        expect(await mockERC20.balanceOf(david.address)).to.eq(0)
      })

      it('can finalize sale and allows token claim when softcap reached and ended', async () => {
        await provider.send('evm_setNextBlockTimestamp', [startDate + 1])
        await presale.connect(alice).purchaseTokens({ value: maxCommitment })
        await presale.connect(bob).purchaseTokens({ value: maxCommitment })
        expect(await presale.connect(alice).bnbRemaining()).to.eq(parseEther('2'))

        // refund tokens unsuccessfully
        await expect(presale.connect(alice).releaseTokens()).to.be.revertedWith('Presale: endDate not passed')
        await expect(presale.connect(bob).releaseTokens()).to.be.revertedWith('Presale: endDate not passed')
        await expect(presale.connect(carol).releaseTokens()).to.be.revertedWith('Presale: endDate not passed')

        await expect(presale.finalizeSale()).to.be.revertedWith('Presale: endDate not passed or hardcap not reached')
        expect(await presale.isFinalized()).to.be.false
        await provider.send('evm_setNextBlockTimestamp', [endDate + 1])
        await expect(presale.connect(alice).releaseTokens()).to.be.revertedWith('Presale: softCap reached')
        await expect(presale.connect(bob).releaseTokens()).to.be.revertedWith('Presale: softCap reached')
        await expect(presale.connect(carol).releaseTokens()).to.be.revertedWith('Presale: no tokens to release')

        await presale.finalizeSale()
        expect(await presale.isFinalized()).to.be.true
      })

      it('adds liquidity when finalizing if the option is enabled', async () => {
        await provider.send('evm_setNextBlockTimestamp', [startDate + 1])

        await presale.connect(alice).purchaseTokens({ value: maxCommitment })
        await presale.connect(bob).purchaseTokens({ value: maxCommitment })
        await presale.connect(carol).purchaseTokens({ value: maxCommitment })

        await presale.setIsAddLiquidityEnabled(true)
        await presale.finalizeSale()

        // claim tokens successfully
        await presale.connect(alice).claimTokens()
        await presale.connect(bob).claimTokens()
        await presale.connect(carol).claimTokens()
        await expect(presale.connect(david).claimTokens()).to.be.revertedWith('Presale: no tokens to claim')
        const maxClaimableAmount = parseUnits('360000', 9)
        expect(await mockERC20.balanceOf(alice.address)).to.eq(maxClaimableAmount)
        expect(await mockERC20.balanceOf(bob.address)).to.eq(maxClaimableAmount)
        expect(await mockERC20.balanceOf(carol.address)).to.eq(maxClaimableAmount)
        expect(await mockERC20.balanceOf(david.address)).to.eq(0)

        await router
          .connect(david)
          .swapExactETHForTokensSupportingFeeOnTransferTokens(
            0,
            [WETHAddress, mockERC20.address],
            david.address,
            currentTimestamp + 3600,
            { value: parseEther('1') }
          )
        expect(await mockERC20.balanceOf(david.address)).to.be.eq(102636655948553)
        const carolCurrentETHBalance = await provider.getBalance(carol.address)
        await mockERC20.connect(carol).approve(routerAddress, maxClaimableAmount)
        await router
          .connect(carol)
          .swapExactTokensForETHSupportingFeeOnTransferTokens(
            maxClaimableAmount,
            0,
            [mockERC20.address, WETHAddress],
            carol.address,
            currentTimestamp + 3600
          )
        expect(await mockERC20.balanceOf(carol.address)).to.eq(0)
        expect(await provider.getBalance(carol.address)).to.be.above(carolCurrentETHBalance)
      })

      it('does not add liquidity when finalizing if the option is disabled', async () => {
        await provider.send('evm_setNextBlockTimestamp', [startDate + 1])

        await presale.connect(alice).purchaseTokens({ value: maxCommitment })
        await presale.connect(bob).purchaseTokens({ value: maxCommitment })
        await presale.connect(carol).purchaseTokens({ value: maxCommitment })

        await presale.setIsAddLiquidityEnabled(false)
        await presale.finalizeSale()

        // claim tokens successfully
        await presale.connect(alice).claimTokens()
        await presale.connect(bob).claimTokens()
        await presale.connect(carol).claimTokens()
        await expect(presale.connect(david).claimTokens()).to.be.revertedWith('Presale: no tokens to claim')
        const maxClaimableAmount = parseUnits('360000', 9)
        expect(await mockERC20.balanceOf(alice.address)).to.eq(maxClaimableAmount)
        expect(await mockERC20.balanceOf(bob.address)).to.eq(maxClaimableAmount)
        expect(await mockERC20.balanceOf(carol.address)).to.eq(maxClaimableAmount)
        expect(await mockERC20.balanceOf(david.address)).to.eq(0)

        await expect(
          router
            .connect(david)
            .swapExactETHForTokensSupportingFeeOnTransferTokens(
              0,
              [WETHAddress, mockERC20.address],
              david.address,
              currentTimestamp + 3600,
              { value: parseEther('1') }
            )
        ).to.be.revertedWith('')
        expect(await mockERC20.balanceOf(david.address)).to.be.eq(0)
        const carolCurrentETHBalance = await provider.getBalance(carol.address)
        await mockERC20.connect(carol).approve(routerAddress, maxClaimableAmount)
        await expect(
          router
            .connect(carol)
            .swapExactTokensForETHSupportingFeeOnTransferTokens(
              maxClaimableAmount,
              0,
              [mockERC20.address, WETHAddress],
              carol.address,
              currentTimestamp + 3600
            )
        ).to.be.revertedWith('')
        expect(await mockERC20.balanceOf(carol.address)).to.eq(maxClaimableAmount)
        expect(await provider.getBalance(carol.address)).to.be.below(carolCurrentETHBalance) // because of tx fee
      })
    })

    describe('sale failed', () => {
      beforeEach(async () => {
        // transfer ERC20 token to presale
        const transferAmount = parseUnits(presalePrice, 9).mul(6)
        await mockERC20.transfer(presale.address, transferAmount)
        // start private sale
        await presale.addToWhitelist([alice.address, bob.address, carol.address, david.address])
      })

      it('allows refund', async () => {
        await provider.send('evm_setNextBlockTimestamp', [startDate + 1])
        await presale.connect(alice).purchaseTokens({ value: minCommitment })
        await presale.connect(bob).purchaseTokens({ value: minCommitment })
        await presale.connect(carol).purchaseTokens({ value: minCommitment })
        expect(await provider.getBalance(presale.address)).to.eq(minCommitment.mul(3))

        await provider.send('evm_setNextBlockTimestamp', [endDate + 1])

        const aliceBalanceAfterPurchase = await provider.getBalance(alice.address)
        const bobBalanceAfterPurchase = await provider.getBalance(bob.address)
        const carolBalanceAfterPurchase = await provider.getBalance(carol.address)
        const davidBalanceAfterPurchase = await provider.getBalance(david.address)
        await presale.connect(alice).releaseTokens()
        await presale.connect(bob).releaseTokens()
        await presale.connect(carol).releaseTokens()
        await expect(presale.connect(david).releaseTokens()).to.be.revertedWith('Presale: no tokens to release')

        expect(await provider.getBalance(alice.address)).to.be.above(aliceBalanceAfterPurchase)
        expect(await provider.getBalance(bob.address)).to.be.above(bobBalanceAfterPurchase)
        expect(await provider.getBalance(carol.address)).to.be.above(carolBalanceAfterPurchase)
        expect(await provider.getBalance(david.address)).to.eq(davidBalanceAfterPurchase)
        expect(await provider.getBalance(presale.address)).to.eq(0)
      })
    })
  })
})

const deployMockERC20 = async (owner: SignerWithAddress) => {
  return (await deployContract(owner, MockERC20Artifact, [
    9,
    parseUnits('1000000000000', 9), // 1T
  ])) as MockERC20
}
