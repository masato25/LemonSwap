require("@nomicfoundation/hardhat-toolbox");
require('dotenv').config();

const alchemyKey = process.env.ALCHEMY_KEY;
/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  networks: {
    hardhat: {
      forking: {
        url: `https://arb-mainnet.g.alchemy.com/v2/${alchemyKey}`,
        // blockNumber: 193420109,
        // url: `https://rpc.ankr.com/optimism`,
        // blockNumber: 117789706
      },
      chains: {
        42161: {
          hardforkHistory: {
            london: 193401253
          }
        }
      }
    },
    hh: {
      url: `http://0.0.0.0:8545`,
      // accounts: {
      //   mnemonic: mnemonic,
      // },
      accounts: ["0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80", process.env.ETH_PRIVATE_KEY],
      timeout: 1400000
    },
  },
  solidity: {
    compilers: [
      {
        version: "0.7.6",
        settings: {
          optimizer: {
            enabled: true,
            runs: 1,
          },
        },
      },
    ],
  },
  contractSizer: {
    alphaSort: true,
    disambiguatePaths: false,
    runOnCompile: true,
    strict: false,
    only: [
      "DiamondFactoryController",
      "LendingPoolV3",
      "InterestModel",
      "BalanceVaultV3",
      "DiamondFactoryV3",
      "DiamondFactoryStorageV3",
    ],
  },
};
