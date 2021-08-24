import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { DeployFunction } from 'hardhat-deploy/types'
import { ethers } from 'hardhat'

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const { deployments, getNamedAccounts } = hre
  const { deploy } = deployments

  const { deployer } = await getNamedAccounts()

  const startDate = Math.floor(Date.now() / 1000) + 3600 * 24
  const endDate = Math.floor(Date.now() / 1000) + 3600 * 24 * 2
  const minCommitment = ethers.utils.parseEther('0.5') // 0.5 BNB
  const maxCommitment = ethers.utils.parseEther('2') // 2 BNB
  const softCap = ethers.utils.parseEther('500') // 500 BNB
  const hardCap = ethers.utils.parseEther('1000') // 1000 BNB
  const tokenOut = '0x0000000000000000000000000000000000000000'
  const presalePrice = 100e3 // 1 BNB = 100,000 ERC20 tokens
  const launchPrice = 100e3 // 1 BNB = 100,000 ERC20 tokens
  const routerAddress = '0x10ed43c718714eb63d5aa57b78b54704e256024e' // PancakeRouterV2
  const isAddLiquidityEnabled = false

  await deploy('Presale', {
    from: deployer,
    args: [
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
      isAddLiquidityEnabled,
    ],
    log: true,
  })
}

export default func
func.tags = ['mainnet']
