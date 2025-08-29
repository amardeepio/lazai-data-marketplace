require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { ethers } = require('ethers');

// Import ABIs
const LazaiDATArtifact = require('../src/lazaiDAT.json');
const UserDATArtifact = require('../src/userDAT.json');

const app = express();
const port = process.env.PORT || 3001;

// Ethers setup
const provider = new ethers.JsonRpcProvider('https://testnet.lazai.network');
const officialContractAddress = process.env.VITE_CONTRACT_ADDRESS;
const userContractAddress = process.env.VITE_USER_CONTRACT_ADDRESS;

const officialContract = new ethers.Contract(officialContractAddress, LazaiDATArtifact.abi, provider);
const userContract = new ethers.Contract(userContractAddress, UserDATArtifact.abi, provider);

// Middleware
app.use(cors());
app.use(express.json());

// --- ROUTES ---

app.get('/', (req, res) => {
  res.send('LazAI Backend is running!');
});

// Secure data access route
app.get('/api/data/:contractType/:tokenId', async (req, res) => {
  const { contractType, tokenId } = req.params;
  const { userAddress } = req.query; // expecting user address as a query param

  if (!userAddress) {
    return res.status(400).json({ success: false, message: 'userAddress query parameter is required.' });
  }

  let contract;
  if (contractType === 'official') {
    contract = officialContract;
  } else if (contractType === 'user') {
    contract = userContract;
  } else {
    return res.status(400).json({ success: false, message: 'Invalid contractType specified.' });
  }

  try {
    const owner = await contract.ownerOf(tokenId);

    if (owner.toLowerCase() === userAddress.toLowerCase()) {
      // Ownership verified, grant access
      const tokenURI = await contract.tokenURI(tokenId);
      const ipfsHash = tokenURI.replace('ipfs://', '');
      const gatewayUrl = `https://gateway.pinata.cloud/ipfs/${ipfsHash}`;

      res.json({
        success: true,
        message: 'Ownership verified.',
        dataUrl: gatewayUrl,
        tokenURI: tokenURI
      });

    } else {
      // Ownership check failed
      res.status(403).json({ success: false, message: 'You are not the owner of this DAT.' });
    }
  } catch (error) {
    console.error(`Error verifying token ${tokenId} on ${contractType} contract:`, error);
    // Handle cases where the token might not exist
    if (error.code === 'CALL_EXCEPTION') { // Common ethers error for non-existent token
        return res.status(404).json({ success: false, message: 'Token does not exist or could not be found.' });
    }
    res.status(500).json({ success: false, message: 'An error occurred on the server.' });
  }
});

if (require.main === module) {
  app.listen(port, () => {
    console.log(`Server listening at http://localhost:${port}`);
  });
}

module.exports = app;
