# LazAI Data Marketplace

A decentralized application (DApp) for minting, trading, and licensing datasets as Data Asset Tokens (DATs) on the Lazai blockchain network. This marketplace allows users to tokenize their datasets into unique ERC-721 tokens (NFTs) and trade them on an open market.

The core feature is **gated data access**, where only the current owner of a DAT can access the underlying data file, turning the token into a verifiable digital key.

## Core Features

- **Wallet Integration**: Connects to MetaMask to interact with the Lazai network.
- **DAT Minting**: Users can upload a dataset file and mint a "Community DAT" with a name, description, and price.
- **AI-Powered Minting**: Utilizes the **Lazai Alith Agentic Framework** to analyze datasets and suggest metadata (name, description, price) to streamline the minting process.
- **Official DATs**: The contract owner has the ability to mint special "Official DATs".
- **Decentralized Marketplace**: Browse all Community and Official DATs available for purchase.
- **On-Chain Purchasing**: Buy DATs from other users. The transaction, including payment and ownership transfer, is handled securely by the smart contract.
- **Personal Dashboard with Revenue Tracking**: View all DATs you currently own and monitor your total on-chain sales revenue, calculated in real-time.
- **Secure Data Access**: A backend service verifies token ownership on the blockchain before granting access to the underlying dataset, which is stored on IPFS.
- **Real-Time Updates & Caching**: The UI listens for on-chain events to refresh data instantly and uses an intelligent caching mechanism for a highly responsive user experience.

## Tech Stack

- **Frontend**: React, Vite, Ethers.js, Tailwind CSS
- **Backend**: Node.js, Express.js
- **Blockchain**: Solidity, Hardhat, OpenZeppelin Contracts
- **Storage**: IPFS (via Pinata for pinning)
- **Network**: Lazai Testnet
- **Ai Agents**: LazAI Alith agentic Framework

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or later)
- [MetaMask](https://metamask.io/) browser extension
- Test LAZAI tokens from a faucet for the Lazai Testnet.

### Installation & Setup

1.  **Clone the repository:**
    ```bash
    git clone <repository-url>
    cd lazai-data-marketplace
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Environment Variables:**
    Create a `.env` file in the root of the project by copying the `.env.example` file (if one exists) or creating it from scratch. It must contain the following variables:

    ```
    # The private key of the wallet you want to use for deploying contracts
    PRIVATE_KEY=your_wallet_private_key

    # The addresses of the deployed smart contracts (filled in after deployment)
    VITE_CONTRACT_ADDRESS=address_of_LazaiDAT_contract
    VITE_USER_CONTRACT_ADDRESS=address_of_UserDAT_contract

    # Your JWT from Pinata for uploading files to IPFS
    VITE_PINATA_JWT=your_pinata_jwt
    ```

### Running the Application

This project is configured to run both the frontend and backend concurrently with a single command.

```bash
npm start
```

This will:
- Start the Vite frontend development server (usually on `http://localhost:5173`).
- Start the Node.js backend server (on `http://localhost:3001`).

### Available Scripts

- `npm start`: Starts both frontend and backend servers concurrently.
- `npm run dev`: Starts only the frontend Vite server.
- `npm run server`: Starts only the backend Node.js server.
- `npm run build`: Builds the frontend for production.
- `npm run deploy`: Deploys the `LazaiDAT` (Official) contract to the Lazai network.
- `npm run deploy:user`: Deploys the `UserDAT` (Community) contract to the Lazai network.