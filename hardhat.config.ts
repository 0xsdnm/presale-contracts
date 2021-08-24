require('dotenv').config()
import { HardhatUserConfig } from 'hardhat/types'
import '@nomiclabs/hardhat-waffle'
import '@typechain/hardhat'
import 'hardhat-abi-exporter'
import '@nomiclabs/hardhat-etherscan'
import 'hardhat-gas-reporter'
import 'hardhat-deploy'
import 'hardhat-deploy-ethers'

const OWNER_PRIVATE_KEY = process.env.OWNER_PRIVATE_KEY || ''
const BLOCK_EXPLORER_API_KEY = process.env.BLOCK_EXPLORER_API_KEY || ''

const config: HardhatUserConfig = {
  defaultNetwork: 'hardhat',
  solidity: {
    compilers: [
      {
        version: '0.8.7',
        settings: {
          optimizer: {
            enabled: true,
            runs: 999999,
          }
        },
      },
    ],
  },
  networks: {
    hardhat: {
      saveDeployments: true,
      forking: {
        url: 'https://speedy-nodes-nyc.moralis.io/364169c3e55223152d6fd977/bsc/mainnet/archive',
      },
    },
    bscTestnet: {
      url: 'https://speedy-nodes-nyc.moralis.io/364169c3e55223152d6fd977/bsc/testnet',
      chainId: 97,
      accounts: [OWNER_PRIVATE_KEY],
    },
    mainnet: {
      url: 'https://bsc-dataseed.binance.org',
      chainId: 56,
      accounts: [OWNER_PRIVATE_KEY],
    },
  },
  namedAccounts: {
    deployer: 0,
  },
  etherscan: {
    apiKey: BLOCK_EXPLORER_API_KEY,
  },
  gasReporter: {
    currency: 'BNB',
    gasPrice: 5,
    enabled: true,
  }
}

export default config
