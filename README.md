# Presale contracts
## Setup
```bash
echo OWNER_PRIVATE_KEY=<YOUR_PRIVATE_KEY> > .env
echo BLOCK_EXPLORER_API_KEY=<BSCSCAN_API_KEY> >> .env
```

BLOCK_EXPLORER_API_KEY is used for verification purpose.

## Deployment and verification
### Testnet
```bash
yarn deploy --tags Testnet --network bscTestnet
yarn verify --network bscTestnet
```

### Mainnet
```bash
yarn hardhat deploy --tags Mainnet --network mainnet
yarn verify --network mainnet
```
