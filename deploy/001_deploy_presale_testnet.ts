import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { DeployFunction } from 'hardhat-deploy/types'
import { ethers } from 'hardhat'
const { parseEther, parseUnits } = ethers.utils

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const { deployments, getNamedAccounts } = hre
  const { deploy } = deployments

  const { deployer } = await getNamedAccounts()

  const startDate = Math.floor(Date.now() / 1000) + 30
  const endDate = Math.floor(Date.now() / 1000) + 3600
  const minCommitment = parseEther('0.1')
  const maxCommitment = parseEther('2')
  const softCap = parseEther('1')
  const hardCap = parseEther('10')
  const tokenOut = '0x0000000000000000000000000000000000000000'
  const presalePrice = 180e3
  const launchPrice = 180e3
  const routerAddress = '0x10ed43c718714eb63d5aa57b78b54704e256024e' // PancakeRouterV2
  const fee = parseEther('2')
  const feeAddress = deployer

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
      fee,
      feeAddress,
    ],
    log: true,
  })
}

export default func
func.tags = ['testnet']
