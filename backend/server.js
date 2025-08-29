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
            Based on the following sample from a dataset, please suggest a concise and descriptive name, a short description (max 50 words), and a fair market price in LAZAI tokens (as a number).
            The dataset sample is:
            --- SAMPLE ---
            ${textSample}
            --- END SAMPLE ---
            Return the result as a single, minified JSON object with three keys: "name", "description", and "price". Do not include any other text or explanation in your response.
        `;

        const response = await alithAgent.prompt(analysisPrompt);
        
        // The model might wrap the JSON in a markdown block, so we extract it.
        const jsonMatch = response.match(/```json\n([\s\S]*?)\n```/);
        const jsonString = jsonMatch ? jsonMatch[1].trim() : response.trim();
        
        // Attempt to parse the cleaned JSON response
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

if (require.main === module) {
  app.listen(port, () => {
    console.log(`Server listening at http://localhost:${port}`);
  });
}

module.exports = app;