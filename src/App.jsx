import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { ethers } from 'ethers';
import axios from 'axios';
import { UploadCloud, DollarSign, BarChart2, Share2, Wallet, CheckCircle, X, Shield, RefreshCw, Users, Crown, Download, Bot, Info, Clock, Hash, FileText, Eye } from 'lucide-react';
import { useWallet } from './components/WalletContext';
import toast, { Toaster } from 'react-hot-toast';
import ChatWidget, { FloatingChatButton } from './components/ChatWidget';
import MarketplaceControls from './components/MarketplaceControls'; // Import the new component

const formatAddress = (address) => (typeof address === 'string' && address.length > 10) ? `${address.slice(0, 6)}...${address.slice(-4)}` : '';

// --- UI COMPONENTS ---

const Header = ({ isConnected, account, onConnect }) => (
  <header className="bg-gray-900/50 backdrop-blur-lg p-4 rounded-xl shadow-lg border border-gray-700 flex justify-between items-center sticky top-4 z-20 mx-4">
    <h1 className="text-xl md:text-2xl font-bold text-white tracking-wider">
      <span className="text-purple-400">Laz</span>AI Data Marketplace
    </h1>
    <button
      onClick={onConnect}
      className={`px-3 py-2 md:px-4 rounded-lg font-semibold text-white transition-all duration-300 flex items-center gap-2 text-sm md:text-base ${ 
        isConnected
          ? 'bg-green-600 hover:bg-green-700'
          : 'bg-purple-600 hover:bg-purple-700'
      }`}
    >
      {isConnected && account ? (
        <>
          <CheckCircle size={18} />
          <span className="hidden md:inline">{formatAddress(account)}</span>
          <span className="md:hidden">Connected</span>
        </>
      ) : (
        <>
          <Wallet size={18} />
          Connect Wallet
        </>
      )}
    </button>
  </header>
);

const Card = ({ children, className }) => (
  <div className={`bg-gray-800/60 backdrop-blur-md p-6 rounded-xl shadow-lg border border-gray-700 ${className}`}>
    {children}
  </div>
);

const SectionTitle = ({ icon, title }) => (
    <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-3">
        {icon}
        {title}
    </h2>
);

const Modal = ({ isOpen, onClose, title, children, disableClose = false }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-50 p-4">
            <div className="bg-gray-800 rounded-xl border border-gray-700 shadow-2xl w-full max-w-2xl">
                <div className="flex justify-between items-center p-4 border-b border-gray-700">
                    <h3 className="text-lg font-semibold text-white">{title}</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed" disabled={disableClose}>
                        <X size={24} />
                    </button>
                </div>
                <div className="p-6 max-h-[80vh] overflow-y-auto">
                    {children}
                </div>
            </div>
        </div>
    );
};

const ProgressBar = ({ progress, text }) => (
    <div className="w-full">
        <div className="flex justify-between mb-1">
            <span className="text-base font-medium text-purple-300">{text}</span>
            <span className="text-sm font-medium text-purple-300">{Math.round(progress)}%</span>
        </div>
        <div className="w-full bg-gray-700 rounded-full h-2.5">
            <div className="bg-purple-600 h-2.5 rounded-full" style={{ width: `${progress}%`, transition: 'width 0.3s ease-in-out' }}></div>
        </div>
    </div>
);


// --- CORE FEATURE COMPONENTS ---

const AnalysisResults = ({ results }) => {
    if (!results) return null;

    const getScoreColor = (score, reverse = false) => {
        const effectiveScore = reverse ? 11 - score : score;
        if (effectiveScore >= 8) return 'text-green-400';
        if (effectiveScore >= 5) return 'text-yellow-400';
        return 'text-red-400';
    };

    return (
        <div className="mt-4 p-4 bg-gray-900/50 rounded-lg border border-gray-700 space-y-3 animate-fade-in">
            <h4 className="font-semibold text-white flex items-center gap-2"><Bot size={18} /> AI Analysis Results</h4>
            <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="bg-gray-700 p-2 rounded-md">
                    <p className="text-gray-400">Quality Score</p>
                    <p className={`font-bold text-lg ${getScoreColor(results.qualityScore)}`}>{results.qualityScore} / 10</p>
                </div>
                <div className="bg-gray-700 p-2 rounded-md">
                    <p className="text-gray-400">Fraud Risk</p>
                    <p className={`font-bold text-lg ${getScoreColor(results.fraudScore, true)}`}>{results.fraudScore} / 10</p>
                </div>
            </div>
            <div>
                <p className="text-gray-400 text-sm mb-1">Suggested Tags</p>
                <div className="flex flex-wrap gap-2">
                    {results.tags && results.tags.map(tag => (
                        <span key={tag} className="bg-purple-600/50 text-purple-300 text-xs font-medium px-2.5 py-1 rounded-full">{tag}</span>
                    ))}
                </div>
            </div>
        </div>
    );
};


const DATMintingForm = ({ mintingContract, onMintSuccess, walletConnected, title, icon, buttonText, disabled: formDisabled, contractType }) => {
  const { account } = useWallet();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [file, setFile] = useState(null);
  const [minting, setMinting] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [mintingStep, setMintingStep] = useState('');
  const [error, setError] = useState('');
  const [analysisResult, setAnalysisResult] = useState(null);

  const allowedFileTypes = ['.txt', '.pdf', '.csv', '.json', '.xml'];
  const isPdf = file?.name.toLowerCase().endsWith('.pdf');

  const handleFileChange = (e) => {
      const selectedFile = e.target.files[0];
      if (selectedFile) {
          const fileExtension = selectedFile.name.slice(selectedFile.name.lastIndexOf('.'));
          if (allowedFileTypes.includes(fileExtension.toLowerCase())) {
              setFile(selectedFile);
              setError('');
              setAnalysisResult(null); // Reset analysis on new file
          } else {
              setFile(null);
              setError(`Invalid file type. Please upload one of: ${allowedFileTypes.join(', ')}`);
          }
      }
  };

  const getFileSample = (file) => {
      return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (e) => {
              const text = e.target.result;
              const lines = text.split('\n').slice(0, 21); // Header + 20 rows
              resolve(lines.join('\n'));
          };
          reader.onerror = (e) => reject(e);
          reader.readAsText(file);
      });
  };

  const handleAnalyze = async () => {
    if (!file) {
        toast.error('Please select a file first.');
        return;
    }
    setIsAnalyzing(true);
    setAnalysisResult(null);
    const toastId = toast.loading('Analyzing data with Alith...');

    try {
        const textSample = await getFileSample(file);
        const response = await axios.post('/api/analyze-dat', { textSample });

        if (response.data.success) {
            const analysis = response.data.analysis;
            setName(analysis.name);
            setDescription(analysis.description);
            setPrice(analysis.price.toString());
            setAnalysisResult(analysis);
            toast.success('Analysis complete!', { id: toastId });
        } else {
            throw new Error(response.data.message || 'Analysis failed.');
        }
    } catch (err) {
        console.error("Analysis failed:", err);
        toast.error(err.message || 'An error occurred during analysis.', { id: toastId });
    } finally {
        setIsAnalyzing(false);
    }
  };

  const uploadFileToPinata = async (file) => {
      const url = `https://api.pinata.cloud/pinning/pinFileToIPFS`;
      let data = new FormData();
      data.append('file', file);

      const metadata = JSON.stringify({ name: file.name });
      data.append('pinataMetadata', metadata);

      const pinataOptions = JSON.stringify({ cidVersion: 0 });
      data.append('pinataOptions', pinataOptions);

      try {
          const res = await axios.post(url, data, {
              maxBodyLength: 'Infinity',
              headers: {
                  'Content-Type': `multipart/form-data; boundary=${data._boundary}`,
                  'Authorization': `Bearer ${import.meta.env.VITE_PINATA_JWT}`
              }
          });
          return res.data.IpfsHash;
      } catch (error) {
          console.error("Error uploading file to Pinata: ", error);
          throw new Error("Failed to upload file to IPFS.");
      }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!walletConnected || !mintingContract) {
        toast.error("Please connect your wallet to mint a DAT.");
        return;
    }
    if (!file) {
        toast.error("Please select a valid file to upload.");
        return;
    }
    if (!analysisResult) {
        toast.error("Please analyze the data before minting.");
        return;
    }
    setError('');
    setMinting(true);

    const toastId = toast.loading('Starting minting process...');

    try {
      setMintingStep('Uploading data to IPFS...');
      toast.loading('Uploading data to IPFS...', { id: toastId });
      const ipfsHash = await uploadFileToPinata(file);
      const uri = `ipfs://${ipfsHash}`;

      setMintingStep('Awaiting wallet confirmation...');
      toast.loading('Awaiting wallet confirmation...', { id: toastId });
      const priceInWei = ethers.parseEther(price.toString());
      const tx = await mintingContract.safeMint(account, uri, name, description, priceInWei);
      
      setMintingStep('Minting DAT on the blockchain...');
      toast.loading('Minting DAT on the blockchain...', { id: toastId });
      const receipt = await tx.wait();

      // --- Save extended metadata off-chain ---
      setMintingStep('Saving analysis data...');
      toast.loading('Saving analysis data...', { id: toastId });

      const transferEvent = receipt.logs.find(log => mintingContract.interface.parseLog(log)?.name === 'Transfer');
      const tokenId = transferEvent ? mintingContract.interface.parseLog(transferEvent).args.tokenId.toString() : null;

      if (tokenId) {
          const dataSample = await getFileSample(file);
          await axios.post('/api/metadata', {
              contractType,
              tokenId,
              dataSample,
              qualityScore: analysisResult.qualityScore,
              fraudScore: analysisResult.fraudScore,
              tags: analysisResult.tags,
          });
      } else {
          console.warn('Could not find tokenId from minting transaction.');
      }
      // ----------------------------------------

      setMintingStep('Success!');
      toast.success('DAT Minted Successfully!', { id: toastId });
      await onMintSuccess(true);
      
      // Reset form
      setName('');
      setDescription('');
      setPrice('');
      setFile(null);
      setAnalysisResult(null);
      setTimeout(() => setMintingStep(''), 3000);

    } catch (err) {
        console.error("Minting failed:", err);
        const errorMessage = err.reason || err.message || "An error occurred during minting.";
        toast.error(errorMessage, { id: toastId });
        setMintingStep('');
    } finally {
        setMinting(false);
    }
  };

  return (
    <Card className="flex-1 min-w-[300px]">
      <SectionTitle icon={icon} title={title} />
      <form onSubmit={handleSubmit} className="space-y-4">
        <input type="text" placeholder="Dataset Name" value={name} onChange={(e) => setName(e.target.value)} className="w-full bg-gray-700 text-white p-2 rounded-lg border border-gray-600 focus:outline-none focus:ring-2 focus:ring-purple-500" required />
        <textarea placeholder="Description" value={description} onChange={(e) => setDescription(e.target.value)} className="w-full bg-gray-700 text-white p-2 rounded-lg border border-gray-600 h-24 resize-none focus:outline-none focus:ring-2 focus:ring-purple-500" required />
        <div className="relative">
            <DollarSign size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input type="number" placeholder="Price in LAZAI" value={price} onChange={(e) => setPrice(e.target.value)} className="w-full bg-gray-700 text-white p-2 pl-10 rounded-lg border border-gray-600 focus:outline-none focus:ring-2 focus:ring-purple-500" required min="0" step="any" />
        </div>
        
        <div className="flex items-center gap-2">
            <label className="flex-grow flex items-center justify-center px-4 py-3 bg-gray-700 text-gray-400 rounded-lg border border-dashed border-gray-600 cursor-pointer hover:bg-gray-600 hover:text-white transition">
              <UploadCloud size={20} className="mr-2"/>
              <span className="truncate">{file ? file.name : 'Upload Dataset File'}</span>
              <input type="file" className="hidden" onChange={handleFileChange} accept={allowedFileTypes.join(',')}/>
            </label>
            <button 
                type="button"
                onClick={handleAnalyze}
                disabled={!file || isPdf || isAnalyzing}
                className="flex-shrink-0 px-4 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition disabled:bg-gray-500 disabled:cursor-not-allowed flex items-center justify-center"
                title={isPdf ? "Analysis is not available for PDF files." : "Analyze with Alith"}
            >
                <Bot size={20} className={`mr-2 ${isAnalyzing ? 'animate-spin' : ''}`} />
                <span>{isAnalyzing ? 'Analyzing...' : 'Analyze'}</span>
            </button>
        </div>

        <AnalysisResults results={analysisResult} />
        
        {minting && mintingStep ? (
          <div className="flex items-center justify-center gap-2 text-yellow-400 p-3 bg-gray-700 rounded-lg">
            {mintingStep !== 'Success!' ? (
              <RefreshCw size={20} className="animate-spin" />
            ) : (
              <CheckCircle size={20} className="text-green-500" />
            )}
            <span>{mintingStep}</span>
          </div>
        ) : (
          <button type="submit" disabled={minting || !walletConnected || formDisabled || !analysisResult} className="w-full bg-purple-600 text-white p-3 rounded-lg font-bold hover:bg-purple-700 transition disabled:bg-gray-500 disabled:cursor-not-allowed flex items-center justify-center">
            {buttonText}
          </button>
        )}

        {error && <p className="text-center text-red-500 text-sm mt-2">{error}</p>}
        {!walletConnected && <p className="text-center text-yellow-400 text-sm mt-2">Connect wallet to enable minting.</p>}
        {walletConnected && !analysisResult && <p className="text-center text-yellow-400 text-sm mt-2">Please analyze the data before minting.</p>}
      </form>
    </Card>
  );
};


const DATCard = ({ dat, onViewDetails, currentUserAddress }) => {
    const isOwner = currentUserAddress && dat.owner.toLowerCase() === currentUserAddress.toLowerCase();
    const isOfficial = dat.type === 'official';

    return (
        <div onClick={() => onViewDetails(dat)} className="bg-gray-900/50 p-4 rounded-lg border border-gray-700 flex flex-col justify-between h-full hover:border-purple-500 transition-all duration-300 relative cursor-pointer group">
            {isOfficial && (
                <div className="absolute top-2 right-2 bg-purple-600 text-white text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1">
                    <Crown size={12} />
                    <span>Official</span>
                </div>
            )}
            <div>
                <h3 className="font-bold text-lg text-purple-300 pr-16 group-hover:text-purple-200">{dat.name}</h3>
                <p className="text-gray-400 text-sm my-2 h-16 overflow-hidden">{dat.description}</p>
                <p className="text-xs text-gray-500">Owner: {formatAddress(dat.owner)}</p>
            </div>
            <div className="mt-4 flex justify-between items-center">
                <span className="text-xl font-semibold text-white">{dat.price} LAZAI</span>
                <button
                    disabled={isOwner}
                    className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${ 
                        isOwner
                        ? 'bg-gray-600 cursor-not-allowed'
                        : 'bg-green-600 group-hover:bg-green-700'
                    }`}
                >
                    {isOwner ? 'Owned' : 'Buy DAT'}
                </button>
            </div>
        </div>
    );
};

const SkeletonCard = () => (
    <div className="bg-gray-900/50 p-4 rounded-lg border border-gray-700 flex flex-col justify-between h-full">
        <div className="animate-pulse">
            <div className="h-6 bg-gray-700 rounded w-3/4 mb-4"></div>
            <div className="h-4 bg-gray-700 rounded w-full mb-2"></div>
            <div className="h-4 bg-gray-700 rounded w-5/6 mb-4"></div>
            <div className="h-4 bg-gray-700 rounded w-1/2"></div>
        </div>
        <div className="mt-4 flex justify-between items-center">
            <div className="h-8 bg-gray-700 rounded w-1/3"></div>
            <div className="h-10 bg-gray-700 rounded w-1/4"></div>
        </div>
    </div>
);

const Marketplace = ({ dats, onViewDetails, loading, currentUserAddress }) => {
    const officialDats = dats.filter(d => d.type === 'official');
    const communityDats = dats.filter(d => d.type === 'user');

    const renderSkeletons = (count) => (
        Array(count).fill(0).map((_, i) => <SkeletonCard key={i} />)
    );

    return (
      <>
        <div>
            <h3 className="text-2xl font-semibold text-purple-400 mb-4 flex items-center gap-2"><Crown size={20}/> Official DATs</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {loading ? renderSkeletons(4) : officialDats.map(dat => (
                    <DATCard key={`${dat.type}-${dat.id}`} dat={dat} onViewDetails={onViewDetails} currentUserAddress={currentUserAddress} />
                ))}
            </div>
            {!loading && officialDats.length === 0 && <p className="text-gray-500 mt-4">No official DATs match your criteria.</p>}
        </div>

        <div className="mt-12">
            <h3 className="text-2xl font-semibold text-purple-400 mb-4 flex items-center gap-2"><Users size={20}/> Community DATs</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {loading ? renderSkeletons(8) : communityDats.map(dat => (
                    <DATCard key={`${dat.type}-${dat.id}`} dat={dat} onViewDetails={onViewDetails} currentUserAddress={currentUserAddress} />
                ))}
            </div>
            {!loading && communityDats.length === 0 && <p className="text-gray-500 mt-4">No community DATs match your criteria.</p>}
        </div>
      </>
    );
};

const Dashboard = ({ dats, currentUserAddress, onAccessData, onRefresh, loading, totalRevenue, loadingRevenue }) => {
    const userDats = dats.filter(dat => currentUserAddress && dat.owner.toLowerCase() === currentUserAddress.toLowerCase());

    return (
        <div className="flex flex-col md:flex-row gap-6">
            <Card className="flex-1">
                <div className="flex justify-between items-center">
                    <SectionTitle icon={<BarChart2 className="text-purple-400" />} title="My DATs" />
                    <button onClick={onRefresh} disabled={loading} className="text-purple-400 hover:text-purple-300 disabled:text-gray-500 disabled:cursor-wait -mt-4">
                        <RefreshCw className={`transition-transform duration-500 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                </div>
                {userDats.length > 0 ? (
                    <ul className="space-y-3">
                        {userDats.map(dat => (
                            <li key={`${dat.type}-${dat.id}`} className="text-gray-300 flex justify-between items-center bg-gray-900/50 p-3 rounded-lg">
                                <div className="flex-grow text-left">
                                    <span className="font-semibold">{dat.name}</span>
                                </div>
                                <button 
                                    onClick={() => onAccessData(dat)}
                                    className="bg-blue-600 text-white px-3 py-2 rounded-lg text-sm font-semibold hover:bg-blue-700 transition flex items-center gap-2 cursor-pointer flex-shrink-0"
                                >
                                    <Download size={16} />
                                    Access Data
                                </button>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <p className="text-gray-500">You don't own any DATs yet.</p>
                )}
            </Card>
            <Card className="flex-1">
                <SectionTitle icon={<Share2 className="text-purple-400" />} title="My Revenue" />
                <div className="text-center">
                    {loadingRevenue ? (
                        <div className="flex flex-col items-center justify-center h-full py-4">
                            <RefreshCw className="animate-spin text-purple-400" size={32} />
                            <p className="mt-2 text-gray-400">Updating revenue...</p>
                        </div>
                    ) : (
                        <>
                            <p className="text-gray-400">Total Earnings From Sales</p>
                            <p className="text-3xl font-bold text-green-400 mt-2">{totalRevenue.toFixed(4)} LAZAI</p>
                            <p className="text-xs text-gray-500 mt-2">This is the total revenue from DATs you have sold.</p>
                        </>
                    )}
                </div>
            </Card>
        </div>
    );
};


// --- MAIN APP COMPONENT ---

export default function App() {
  const { account, contract, userContract, connectWallet, isConnected, error: walletError, provider } = useWallet();
  const [dats, setDats] = useState([]);
  const [isOwner, setIsOwner] = useState(false);
  const [balance, setBalance] = useState(0);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [loadingRevenue, setLoadingRevenue] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDat, setSelectedDat] = useState(null);
  const [datDetails, setDatDetails] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [processingPurchase, setProcessingPurchase] = useState(false);
  const [purchaseSuccess, setPurchaseSuccess] = useState(false);
  const [loadingDats, setLoadingDats] = useState(false);
  const [purchaseProgress, setPurchaseProgress] = useState(0);
  const [purchaseStep, setPurchaseStep] = useState('');
  const [isChatVisible, setIsChatVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOption, setSortOption] = useState('date-desc');
  const [filterType, setFilterType] = useState('all');
  const [filterToOwned, setFilterToOwned] = useState(false);
  const [priceRange, setPriceRange] = useState([0, 1000000]); // Default wide range
  const [isAnalyzingExistingDat, setIsAnalyzingExistingDat] = useState(false);


  const filteredAndSortedDats = useMemo(() => {
    return dats
      .filter(dat => {
        // Filter by Type
        if (filterType !== 'all' && dat.type !== filterType) {
          return false;
        }
        // Filter by Search Query
        const query = searchQuery.toLowerCase();
        if (query && !dat.name.toLowerCase().includes(query) && !dat.description.toLowerCase().includes(query)) {
          return false;
        }
        // Filter by owned
        if (filterToOwned && dat.owner.toLowerCase() !== account.toLowerCase()) {
          return false;
        }
        return true;
      })
      .sort((a, b) => {
        switch (sortOption) {
          case 'price-asc':
            return a.price - b.price;
          case 'price-desc':
            return b.price - a.price;
          case 'name-asc':
            return a.name.localeCompare(b.name);
          case 'name-desc':
            return b.name.localeCompare(a.name);
          case 'date-asc':
            return a.id - b.id;
          case 'date-desc':
          default:
            return b.id - a.id;
        }
      });
  }, [dats, searchQuery, sortOption, filterType, filterToOwned, account, priceRange]);

  const fetchDats = useCallback(async (forceRefresh = false) => {
    if (!contract || !userContract) return; // Contracts needed for re-association
    setLoadingDats(true);
    try {
      const url = forceRefresh ? '/api/dats?forceRefresh=true' : '/api/dats';
      const response = await axios.get(url);
      if (response.data.success) {
        // Re-associate contract instances on the frontend for purchase functionality
        const datsWithContracts = response.data.dats.map(dat => ({
          ...dat,
          contract: dat.type === 'official' ? contract : userContract,
        }));
        setDats(datsWithContracts.sort((a, b) => b.id - a.id));
      } else {
        throw new Error(response.data.message || 'Failed to fetch DATs.');
      }
    } catch (err) {
      console.error("Failed to fetch DATs:", err);
      toast.error(err.message || "Failed to fetch DATs from the server.");
    } finally {
      setLoadingDats(false);
    }
  }, [contract, userContract]);

  const fetchRevenue = useCallback(async () => {
    if (!account || !provider || !contract || !userContract) return;
    setLoadingRevenue(true);
    try {
        const fromWei = (num) => parseFloat(ethers.formatEther(num));

        const processEvents = async (c) => {
            const filter = c.filters.Transfer(account, null);
            const latestBlock = await provider.getBlockNumber();
            let allEvents = [];
            const blockRange = 99999; // Max range allowed by the node

            for (let fromBlock = 0; fromBlock <= latestBlock; fromBlock += blockRange) {
                const toBlock = Math.min(fromBlock + blockRange - 1, latestBlock);
                try {
                    const events = await c.queryFilter(filter, fromBlock, toBlock);
                    allEvents = allEvents.concat(events);
                } catch (e) {
                    console.warn(`Could not fetch events for block range ${fromBlock}-${toBlock}:`, e);
                }
            }
            
            const revenues = await Promise.all(allEvents.map(async (event) => {
                const tx = await provider.getTransaction(event.transactionHash);
                if (tx && tx.value > 0) {
                    return fromWei(tx.value);
                }
                return 0;
            }));
            return revenues.reduce((acc, revenue) => acc + revenue, 0);
        };

        const officialRevenue = await processEvents(contract);
        const userRevenue = await processEvents(userContract);

        const newTotalRevenue = officialRevenue + userRevenue;
        setTotalRevenue(newTotalRevenue);
        localStorage.setItem(`revenueCache_${account}`, JSON.stringify({ 
            revenue: newTotalRevenue, 
            timestamp: Date.now() 
        }));

    } catch (err) {
        console.error("Could not fetch revenue:", err);
    } finally {
        setLoadingRevenue(false);
    }
  }, [account, provider, contract, userContract]);

  useEffect(() => {
    if (isConnected && contract && userContract && provider && account) {
      const FIVE_MINUTES_IN_MS = 5 * 60 * 1000;
      const cacheKey = `revenueCache_${account}`;

      const checkCacheAndFetchRevenue = () => {
        const cachedData = localStorage.getItem(cacheKey);
        if (cachedData) {
          const { revenue, timestamp } = JSON.parse(cachedData);
          setTotalRevenue(revenue); // Show cached data immediately
          // Fetch new data only if cache is older than 5 minutes
          if (Date.now() - timestamp > FIVE_MINUTES_IN_MS) {
            fetchRevenue();
          }
        } else {
          fetchRevenue(); // Fetch if no cache exists
        }
      };

      const checkOwnershipAndBalance = async () => {
          try {
            const ownerAddress = await contract.owner();
            setIsOwner(ownerAddress.toLowerCase() === account.toLowerCase());
            const userBalance = await provider.getBalance(account);
            setBalance(parseFloat(ethers.formatEther(userBalance)));
          } catch (err) {
            console.error("Failed to check contract owner or balance:", err);
          }
      };

      fetchDats();
      checkCacheAndFetchRevenue();
      checkOwnershipAndBalance();

      // Event listener for real-time updates
      const handleTransfer = (from, to, tokenId) => {
        console.log('Transfer event received:', { from, to, tokenId });
        // Re-fetch all data on transfer
        fetchDats();
        if (from.toLowerCase() === account.toLowerCase() || to.toLowerCase() === account.toLowerCase()) {
            fetchRevenue(); // Always fetch fresh revenue on a relevant transfer
        }
      };

      const officialFilter = contract.filters.Transfer();
      contract.on(officialFilter, handleTransfer);

      const userFilter = userContract.filters.Transfer();
      userContract.on(userFilter, handleTransfer);

      // Cleanup listeners on component unmount
      return () => {
        contract.off(officialFilter, handleTransfer);
        userContract.off(userFilter, handleTransfer);
      };
    }
  }, [account, contract, userContract, provider, fetchDats, fetchRevenue]);

  const fetchDatDetails = async (dat) => {
    if (!dat || !provider) return;
    setLoadingDetails(true);
    try {
      // Get the latest block number to constrain the query range
      const latestBlock = await provider.getBlockNumber();
      const fromBlock = Math.max(0, latestBlock - 99999); // Adhere to node's 100k block range limit

      const transferFilter = dat.contract.filters.Transfer(null, null, dat.id);
      const transferEvents = await dat.contract.queryFilter(transferFilter, fromBlock, latestBlock);

      const history = await Promise.all(transferEvents.map(async (event) => {
        const block = await provider.getBlock(event.blockNumber);
        return {
          from: event.args.from,
          to: event.args.to,
          timestamp: block.timestamp * 1000, // convert to JS timestamp
          txHash: event.transactionHash,
        };
      }));

      // Sort ascending to find the mint event, then reverse for display
      history.sort((a, b) => a.timestamp - b.timestamp);
      const mintDate = history.length > 0 ? history[0].timestamp : null;
      history.reverse(); // Most recent first

      setDatDetails({
        history: history,
        mintDate: mintDate,
      });

    } catch (err) {
      console.error("Failed to fetch DAT details:", err);
      toast.error("Could not load DAT details.");
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleViewDetails = (dat) => {
    setSelectedDat(dat);
    setDatDetails(null);
    fetchDatDetails(dat);
    setIsModalOpen(true);
    setPurchaseSuccess(false);
  };

  const waitForTransaction = async (tx, toastId) => {
    try {
      await tx.wait(); // The long wait happens here, in the background

      // Success!
      toast.success('Purchase Successful!', { id: toastId });
      fetchDats(true); // Refresh data
      fetchRevenue();
    } catch (err) {
      // Handle transaction failure during mining
      console.error("Transaction failed during mining:", err);
      const errorMessage = err.reason || "Transaction failed during processing.";
      toast.error(errorMessage, { id: toastId });
    }
  };

  const confirmPurchase = () => {
      if (!selectedDat || !selectedDat.contract || processingPurchase) return;

      // Check for sufficient funds before doing anything else
      if (balance < selectedDat.price) {
          toast.error(`Insufficient funds. You need ${selectedDat.price} LAZAI to purchase this DAT.`);
          return;
      }
      
      setProcessingPurchase(true); // Disable button immediately
      const priceInWei = ethers.parseEther(selectedDat.price.toString());
      const toastId = toast.loading('Awaiting wallet confirmation...');

      selectedDat.contract.purchase(selectedDat.id, { value: priceInWei })
        .then(tx => {
            // Close modal and reset state immediately after transaction is submitted
            setIsModalOpen(false);
            setSelectedDat(null);
            setProcessingPurchase(false); // Re-enable button for next time
            setPurchaseSuccess(false);

            const explorerUrl = `https://testnet-explorer.lazai.network/tx/${tx.hash}`;
            const toastMessage = (
                <span>
                    Purchase submitted! It will confirm in the background. <a href={explorerUrl} target="_blank" rel="noopener noreferrer" className="text-purple-400 underline">View on Explorer</a>
                </span>
            );
            toast.loading(toastMessage, { id: toastId, duration: 300000 }); // Keep toast open for 5 minutes

            // Wait for the transaction to be mined in the background
            waitForTransaction(tx, toastId);
        })
        .catch(err => {
            // This catches errors from wallet rejection or other immediate submission issues
            console.error("Purchase failed on submission:", err);
            const errorMessage = err.reason || "Transaction rejected or failed to submit.";
            toast.error(errorMessage, { id: toastId });
            setProcessingPurchase(false); // Re-enable button on failure
        });
  };

  const handleAccessData = async (dat) => {
    if (!account) {
      toast.error('Please connect your wallet.');
      return;
    }
    const toastId = toast.loading('Verifying ownership...');
    try {
      const url = `/api/data/${dat.type}/${dat.id}?userAddress=${account}`;
      const response = await axios.get(url);

      if (response.data.success) {
        toast.success('Ownership verified! Opening data...', { id: toastId });
        window.open(response.data.dataUrl, '_blank');
      } else {
        toast.error(`Failed to access data: ${response.data.message}`, { id: toastId });
      }
    } catch (error) {
      console.error('Error accessing data:', error);
      const errorMessage = error.response?.data?.message || 'An error occurred while fetching data.';
      toast.error(`Failed to access data: ${errorMessage}`, { id: toastId });
    }
  };

  const handleAnalyzeExistingDat = async (dat) => {
    if (!account) {
      toast.error('Please connect your wallet.');
      return;
    }
    setIsAnalyzingExistingDat(true);
    const toastId = toast.loading('Starting analysis... Step 1: Fetching data file.');

    try {
      // 1. Fetch data URL
      const dataUrlResponse = await axios.get(`/api/data/${dat.type}/${dat.id}?userAddress=${account}`);
      if (!dataUrlResponse.data.success) {
        throw new Error(dataUrlResponse.data.message || 'Could not verify ownership to fetch data.');
      }
      
      toast.loading('Step 2: Fetching content from IPFS...', { id: toastId });
      const contentResponse = await axios.get(dataUrlResponse.data.dataUrl);
      const fileContent = typeof contentResponse.data === 'object' ? JSON.stringify(contentResponse.data, null, 2) : contentResponse.data.toString();
      
      // 2. Create sample
      const textSample = fileContent.split('\n').slice(0, 21).join('\n');

      // 3. Analyze data
      toast.loading('Step 3: Analyzing data with Alith AI...', { id: toastId });
      const analysisResponse = await axios.post('/api/analyze-dat', { textSample });
      if (!analysisResponse.data.success) {
        throw new Error(analysisResponse.data.message || 'AI analysis failed.');
      }
      const analysis = analysisResponse.data.analysis;

      // 4. Save metadata
      toast.loading('Step 4: Saving analysis results...', { id: toastId });
      await axios.post('/api/metadata', {
        contractType: dat.type,
        tokenId: dat.id,
        dataSample: textSample,
        qualityScore: analysis.qualityScore,
        fraudScore: analysis.fraudScore,
        tags: analysis.tags,
      });

      toast.success('Analysis and preview added successfully!', { id: toastId });

      // 5. Refresh data
      await fetchDats(true); // Force a refresh
      
      // Update the currently selected DAT in the modal
      setSelectedDat(prev => ({
          ...prev,
          dataSample: textSample,
          ...analysis
      }));

    } catch (error) {
      console.error('Error analyzing existing DAT:', error);
      toast.error(error.message || 'An unexpected error occurred.', { id: toastId });
    } finally {
      setIsAnalyzingExistingDat(false);
    }
  };

  return (
    <div className="bg-gray-900 text-white min-h-screen font-sans" style={{background: 'radial-gradient(circle at top, #1F2937, #111827)'}}>
      <Toaster
        position="top-center"
        reverseOrder={false}
        toastOptions={{
          style: {
            background: '#334155',
            color: '#fff',
          },
        }}
      />
      <div className="container mx-auto p-4">
        <Header isConnected={isConnected} account={account} onConnect={connectWallet} />
        
        {walletError && <div className="text-center text-red-500 bg-red-900/50 p-3 rounded-lg my-4 border border-red-700">{walletError}</div>}
        
        <main className="mt-8">
          <div className="flex flex-col lg:flex-row gap-6">
            <div className="lg:w-1/3">
                <DATMintingForm 
                    mintingContract={userContract}
                    onMintSuccess={fetchDats}
                    walletConnected={isConnected}
                    title="Mint a Community DAT"
                    icon={<Users className="text-purple-400"/>}
                    buttonText="Mint My DAT"
                    contractType="user"
                />
            </div>
            <div className="lg:w-2/3">
              <Dashboard dats={dats} currentUserAddress={account} onAccessData={handleAccessData} onRefresh={fetchDats} loading={loadingDats} totalRevenue={totalRevenue} loadingRevenue={loadingRevenue} />
            </div>
          </div>

          {isOwner && (
              <div className="mt-6">
                  <DATMintingForm 
                      mintingContract={contract}
                      onMintSuccess={fetchDats}
                      walletConnected={isConnected}
                      title="Mint an Official DAT"
                      icon={<Shield className="text-yellow-400"/>}
                      buttonText="Mint Official DAT"
                      disabled={!isOwner}
                      contractType="official"
                  />
              </div>
          )}

          <section className="mt-8">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-3xl font-bold text-white">Marketplace</h2>
              <button onClick={fetchDats} disabled={loadingDats} className="text-purple-400 hover:text-purple-300 disabled:text-gray-500 disabled:cursor-wait">
                  <RefreshCw className={`transition-transform duration-500 ${loadingDats ? 'animate-spin' : ''}`} />
              </button>
            </div>
            <MarketplaceControls 
              searchQuery={searchQuery} 
              setSearchQuery={setSearchQuery} 
              sortOption={sortOption} 
              setSortOption={setSortOption}
              filterType={filterType}
              setFilterType={setFilterType}
              filterToOwned={filterToOwned}
              setFilterToOwned={setFilterToOwned}
              priceRange={priceRange}
              setPriceRange={setPriceRange}
            />
            <Marketplace dats={filteredAndSortedDats} onViewDetails={handleViewDetails} loading={loadingDats} currentUserAddress={account} />
          </section>
        </main>
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={selectedDat ? selectedDat.name : 'DAT Details'} disableClose={processingPurchase || isAnalyzingExistingDat}>
          {loadingDetails && <div className="flex justify-center items-center p-8"><RefreshCw className="animate-spin text-purple-400" size={48} /></div>}
          {!loadingDetails && selectedDat && datDetails && (
              <div>
                  <p className="text-gray-300 mb-4">{selectedDat.description}</p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm mb-6">
                      <div className="bg-gray-900/50 p-3 rounded-lg">
                          <p className="text-gray-400 font-semibold">Price</p>
                          <p className="text-white text-lg">{selectedDat.price} LAZAI</p>
                      </div>
                      <div className="bg-gray-900/50 p-3 rounded-lg">
                          <p className="text-gray-400 font-semibold">Owner</p>
                          <p className="text-white text-lg truncate" title={selectedDat.owner}>{formatAddress(selectedDat.owner)}</p>
                      </div>
                      <div className="bg-gray-900/50 p-3 rounded-lg">
                          <p className="text-gray-400 font-semibold">Token ID</p>
                          <p className="text-white text-lg">{selectedDat.id}</p>
                      </div>
                      <div className="bg-gray-900/50 p-3 rounded-lg">
                          <p className="text-gray-400 font-semibold">Minted On</p>
                          <p className="text-white text-lg">{new Date(datDetails.mintDate).toLocaleDateString()}</p>
                      </div>
                      <div className="bg-gray-900/50 p-3 rounded-lg col-span-1 md:col-span-2">
                          <p className="text-gray-400 font-semibold">Contract Address</p>
                          <a href={`https://testnet-explorer.lazai.network/token/${selectedDat.contract.target}`} target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:underline truncate block">{selectedDat.contract.target}</a>
                      </div>
                  </div>

                  {/* AI Analysis and Preview Section */}
                  {selectedDat.dataSample ? (
                    <>
                      {selectedDat.qualityScore && <AnalysisResults results={selectedDat} />}
                      <div className="mt-4">
                          <h4 className="text-lg font-semibold text-white mb-2 flex items-center gap-2"><Eye size={18}/> Data Preview</h4>
                          <pre className="bg-gray-900/50 p-3 rounded-lg text-xs text-gray-300 overflow-x-auto max-h-40">{selectedDat.dataSample}</pre>
                      </div>
                    </>
                  ) : (
                     account && selectedDat.owner.toLowerCase() === account.toLowerCase() && (
                        <div className="mt-4 p-4 border border-dashed border-gray-600 rounded-lg text-center">
                            <p className="text-gray-400 mb-3">This DAT is missing the AI analysis and preview.</p>
                            <button 
                                onClick={() => handleAnalyzeExistingDat(selectedDat)}
                                disabled={isAnalyzingExistingDat}
                                className="bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-blue-700 transition disabled:bg-gray-500 disabled:cursor-not-allowed flex items-center justify-center mx-auto"
                            >
                                <Bot size={18} className={`mr-2 ${isAnalyzingExistingDat ? 'animate-spin' : ''}`} />
                                {isAnalyzingExistingDat ? 'Analyzing...' : 'Generate AI Analysis & Preview'}
                            </button>
                        </div>
                     )
                  )}


                  <h4 className="text-lg font-semibold text-white mb-3 mt-6">Provenance</h4>
                  <ul className="space-y-2 text-xs">
                      {datDetails.history.map((item, index) => (
                          <li key={index} className="bg-gray-900/50 p-2 rounded-md">
                              <p><span className="font-semibold">From:</span> {formatAddress(item.from)}</p>
                              <p><span className="font-semibold">To:</span> {formatAddress(item.to)}</p>
                              <p><span className="font-semibold">Date:</span> {new Date(item.timestamp).toLocaleString()}</p>
                              <a href={`https://testnet-explorer.lazai.network/tx/${item.txHash}`} target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:underline">View Transaction</a>
                          </li>
                      ))}
                  </ul>

                  {!purchaseSuccess ? (
                      <div className="mt-6 flex justify-end gap-4">
                          {account && selectedDat.owner.toLowerCase() !== account.toLowerCase() && (
                            <button onClick={confirmPurchase} disabled={processingPurchase} className="px-6 py-2 rounded-lg bg-green-600 hover:bg-green-700 transition disabled:bg-gray-500 disabled:cursor-not-allowed font-semibold">
                                {processingPurchase ? 'Processing...' : 'Buy DAT'}
                            </button>
                          )}
                      </div>
                  ) : (
                      <div className="text-center mt-6">
                          <CheckCircle className="text-green-500 w-16 h-16 mx-auto mb-4" />
                          <h4 className="text-xl font-bold text-white">Purchase Successful!</h4>
                      </div>
                  )}
              </div>
          )}
      </Modal>

       <ChatWidget isVisible={isChatVisible} onClose={() => setIsChatVisible(false)} />
       <FloatingChatButton onClick={() => setIsChatVisible(true)} />
    </div>
  );
}