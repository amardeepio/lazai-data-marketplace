require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.20", // Matched to your contract's pragma
  networks: {
    hardhat: {
      chainId: 31337,
    },
    lazai: {
      url: "https://testnet.lazai.network",
      chainId: 133718,
      accounts: [process.env.PRIVATE_KEY],
    },
  },
  etherscan: {
    apiKey: {
      'lazai': 'empty' // Adjusted for your network name
    },
    customChains: [
      {
        network: "lazai", // Adjusted for your network name
        chainId: 133718,
        urls: {
          apiURL: "https://testnet-explorer-api.lazai.network/api",
          browserURL: "https://testnet-explorer.lazai.network"
        }
      }
    ]
  }
};
