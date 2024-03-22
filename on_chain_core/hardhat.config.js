require("@nomicfoundation/hardhat-toolbox");

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
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
