require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { ethers } = require('ethers');
const { Agent, WindowBufferMemory } = require('alith');

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

let datsCache = {
  timestamp: 0,
  data: [],
};
const CACHE_DURATION_MS = 60 * 1000; // 60 seconds

// Alith Agent Setup
const alithAgent = new Agent({
    // FIX: Changed 'llm' to 'model'
    model: 'gemini-2.5-flash',
    agent_logs: false,
    apiKey: process.env.GEMINI_API_KEY,
    baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai",
    memory: new WindowBufferMemory({ window_size: 10}),
    preamble: `You are a helpful assistant for the LazAI Data Marketplace.
    Your goal is to assist users with their questions about the marketplace.
    You can explain what DATs (Data Asset Tokens) are, how to mint them, how to buy and sell them, and how to access the data associated with them.
    Be friendly, concise, and helpful.
    The marketplace has two types of DATs: "Official DATs" minted by the platform owner, and "Community DATs" minted by any user.
    The native token is LAZAI.`,
   
});

// Middleware
app.use(cors());
app.use(express.json());

// --- ROUTES ---

app.get('/', (req, res) => {
  res.send('LazAI Backend is running!');
});

// Alith Chatbot Route
app.post('/api/chat', async (req, res) => {
    const { message } = req.body;

    if (!message) {
        return res.status(400).json({ success: false, message: 'Message is required.' });
    }

    try {
        const response = await alithAgent.prompt(message);
        res.json({ success: true, reply: response });
    } catch (error) {
        console.error('Alith agent error:', error);
        res.status(500).json({ success: false, message: 'Error processing your request with the AI agent.' });
    }
});

// New route for DAT analysis
app.post('/api/analyze-dat', async (req, res) => {
    const { textSample } = req.body;

    if (!textSample) {
        return res.status(400).json({ success: false, message: 'textSample is required.' });
    }

    try {
        const analysisPrompt = `
            You are an expert data analyst for a data marketplace. Based on the following sample from a dataset, please provide a detailed analysis.
            The dataset sample is:
            --- SAMPLE ---
            ${textSample}
            --- END SAMPLE ---
            Your task is to return a single, minified JSON object with the following keys:
            1. "name": A concise and descriptive name for the dataset.
            2. "description": A short, compelling description (max 50 words).
            3. "price": A fair market price in LAZAI tokens (as a number).
            4. "tags": An array of 3-5 relevant keyword tags (as strings) for search and filtering.
            5. "qualityScore": A numerical score from 1 (poor) to 10 (excellent) representing the data's structure, completeness, and consistency.
            6. "fraudScore": A numerical score from 1 (unlikely) to 10 (highly likely) indicating the likelihood of this being spam, low-quality, or fraudulent data.
            Do not include any other text, markdown, or explanation in your response. Just the raw JSON object.
        `;

        const response = await alithAgent.prompt(analysisPrompt);
        
        // A more robust method to find and parse the JSON object from the AI's response
        const startIndex = response.indexOf('{');
        const endIndex = response.lastIndexOf('}');

        if (startIndex === -1 || endIndex === -1 || endIndex < startIndex) {
            throw new Error("No valid JSON object found in the AI's response.");
        }

        const jsonString = response.substring(startIndex, endIndex + 1);
        const jsonResponse = JSON.parse(jsonString);

        res.json({ success: true, analysis: jsonResponse });

    } catch (error) {
        console.error('Alith analysis error:', error);
        res.status(500).json({ success: false, message: 'Error analyzing data with the AI agent.' });
    }
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

// New route for fetching all DATs with caching
app.get('/api/dats', async (req, res) => {
  const { forceRefresh } = req.query;
  const now = Date.now();

  // If cache is recent and not a forced refresh, return it
  if (forceRefresh !== 'true' && now - datsCache.timestamp < CACHE_DURATION_MS && datsCache.data.length > 0) {
    return res.json({ success: true, dats: datsCache.data, source: 'cache' });
  }

  try {
    const fromWei = (num) => ethers.formatEther(num);

    const fetchContractDats = async (contract, type) => {
      const supply = await contract.totalSupply();
      const tokenIds = Array.from({ length: Number(supply) }, (_, i) => i + 1);

      const promises = tokenIds.map(async (id) => {
        try {
          const owner = await contract.ownerOf(id);
          const metadata = await contract.datMetadata(id);
          return {
            id,
            type,
            name: metadata.name,
            description: metadata.description,
            price: parseFloat(fromWei(metadata.price)),
            owner,
          };
        } catch (e) {
          console.warn(`Could not fetch ${type} DAT ${id}:`, e.message);
          return null; // Return null for failed fetches
        }
      });

      const results = await Promise.allSettled(promises);
      return results
        .filter(result => result.status === 'fulfilled' && result.value)
        .map(result => result.value);
    };

    const [officialDats, userDats] = await Promise.all([
      fetchContractDats(officialContract, 'official'),
      fetchContractDats(userContract, 'user'),
    ]);

    const allDats = [...officialDats, ...userDats];

    // Update cache
    datsCache = {
      timestamp: now,
      data: allDats,
    };

    res.json({ success: true, dats: allDats, source: 'fresh' });

  } catch (error) {
    console.error('Error fetching DATs from blockchain:', error);
    res.status(500).json({ success: false, message: 'Error fetching DATs from the server.' });
  }
});

if (require.main === module) {
  app.listen(port, () => {
    console.log(`Server listening at http://localhost:${port}`);
  });
}

module.exports = app;