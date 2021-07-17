import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { DeployFunction } from 'hardhat-deploy/types'
import { ethers } from 'hardhat'

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const { deployments, getNamedAccounts } = hre
  const { deploy } = deployments

  const { deployer } = await getNamedAccounts()

  const startDate = Math.floor(Date.now() / 1000) + 30
  const endDate = Math.floor(Date.now() / 1000) + 3600
  const minCommitment = ethers.utils.parseEther('0.1')
  const maxCommitment = ethers.utils.parseEther('2')
  const softCap = ethers.utils.parseEther('1')
  const hardCap = ethers.utils.parseEther('10')
  const tokenOut = '0x0000000000000000000000000000000000000000'
  const presalePrice = 180e3
  const launchPrice = 180e3
  const routerAddress = '0x0000000000000000000000000000000000000000'

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
    ],
    log: true,
  })
}

export default func
func.tags = ['Sale', 'Testnet']
