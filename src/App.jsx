import React, { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import axios from 'axios';
import { UploadCloud, DollarSign, BarChart2, Share2, Wallet, CheckCircle, X, Shield, RefreshCw, Users, Crown, Download, Bot } from 'lucide-react';
import { useWallet } from './components/WalletContext';
import toast, { Toaster } from 'react-hot-toast';
import ChatWidget, { FloatingChatButton } from './components/ChatWidget';

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
            <div className="bg-gray-800 rounded-xl border border-gray-700 shadow-2xl w-full max-w-md">
                <div className="flex justify-between items-center p-4 border-b border-gray-700">
                    <h3 className="text-lg font-semibold text-white">{title}</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed" disabled={disableClose}>
                        <X size={24} />
                    </button>
                </div>
                <div className="p-6">
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

const DATMintingForm = ({ mintingContract, onMintSuccess, walletConnected, title, icon, buttonText, disabled: formDisabled }) => {
  const { account } = useWallet();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [file, setFile] = useState(null);
  const [minting, setMinting] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [mintingStep, setMintingStep] = useState('');
  const [error, setError] = useState('');

  const allowedFileTypes = ['.txt', '.pdf', '.csv', '.json', '.xml'];
  const isPdf = file?.name.toLowerCase().endsWith('.pdf');

  const handleFileChange = (e) => {
      const selectedFile = e.target.files[0];
      if (selectedFile) {
          const fileExtension = selectedFile.name.slice(selectedFile.name.lastIndexOf('.'));
          if (allowedFileTypes.includes(fileExtension.toLowerCase())) {
              setFile(selectedFile);
              setError('');
          } else {
              setFile(null);
              setError(`Invalid file type. Please upload one of: ${allowedFileTypes.join(', ')}`);
          }
      }
  };

  const handleAnalyze = async () => {
    if (!file) {
        toast.error('Please select a file first.');
        return;
    }
    setIsAnalyzing(true);
    const toastId = toast.loading('Analyzing data with Alith...');

    const reader = new FileReader();
    reader.onload = async (e) => {
        try {
            const text = e.target.result;
            const lines = text.split('\n').slice(0, 21); // Header + 20 rows
            const textSample = lines.join('\n');

            const response = await axios.post('/api/analyze-dat', { textSample });

            if (response.data.success) {
                const { name, description, price } = response.data.analysis;
                setName(name);
                setDescription(description);
                setPrice(price.toString());
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
    reader.onerror = () => {
        toast.error('Failed to read file.', { id: toastId });
        setIsAnalyzing(false);
    };
    reader.readAsText(file);
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
      await tx.wait();

      setMintingStep('Success!');
      toast.success('DAT Minted Successfully!', { id: toastId });
      await onMintSuccess();
      
      // Reset form
      setName('');
      setDescription('');
      setPrice('');
      setFile(null);
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
              <input type="file" className="hidden" onChange={handleFileChange} accept={allowedFileTypes.join(',')} required />
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
          <button type="submit" disabled={minting || !walletConnected || formDisabled} className="w-full bg-purple-600 text-white p-3 rounded-lg font-bold hover:bg-purple-700 transition disabled:bg-gray-500 disabled:cursor-not-allowed flex items-center justify-center">
            {buttonText}
          </button>
        )}

        {error && <p className="text-center text-red-500 text-sm mt-2">{error}</p>}
        {!walletConnected && <p className="text-center text-yellow-400 text-sm mt-2">Connect wallet to enable minting.</p>}
      </form>
    </Card>
  );
};

const DATCard = ({ dat, onBuy, currentUserAddress }) => {
    const isOwner = currentUserAddress && dat.owner.toLowerCase() === currentUserAddress.toLowerCase();
    const isOfficial = dat.type === 'official';

    return (
        <div className="bg-gray-900/50 p-4 rounded-lg border border-gray-700 flex flex-col justify-between h-full hover:border-purple-500 transition-colors duration-300 relative">
            {isOfficial && (
                <div className="absolute top-2 right-2 bg-purple-600 text-white text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1">
                    <Crown size={12} />
                    <span>Official</span>
                </div>
            )}
            <div>
                <h3 className="font-bold text-lg text-purple-300 pr-16">{dat.name}</h3>
                <p className="text-gray-400 text-sm my-2 h-16 overflow-hidden">{dat.description}</p>
                <p className="text-xs text-gray-500">Owner: {formatAddress(dat.owner)}</p>
            </div>
            <div className="mt-4 flex justify-between items-center">
                <span className="text-xl font-semibold text-white">{dat.price} LAZAI</span>
                <button
                    onClick={() => onBuy(dat)}
                    disabled={isOwner}
                    className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-green-700 transition disabled:bg-gray-600 disabled:cursor-not-allowed"
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

const Marketplace = ({ dats, onBuy, currentUserAddress, onRefresh, loading }) => {
    const officialDats = dats.filter(d => d.type === 'official');
    const communityDats = dats.filter(d => d.type === 'user');

    const renderSkeletons = (count) => (
        Array(count).fill(0).map((_, i) => <SkeletonCard key={i} />)
    );

    return (
      <section className="mt-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-3xl font-bold text-white">Marketplace</h2>
          <button onClick={onRefresh} disabled={loading} className="text-purple-400 hover:text-purple-300 disabled:text-gray-500 disabled:cursor-wait">
              <RefreshCw className={`transition-transform duration-500 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
        
        <div>
            <h3 className="text-2xl font-semibold text-purple-400 mb-4 flex items-center gap-2"><Crown size={20}/> Official DATs</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {loading ? renderSkeletons(4) : officialDats.map(dat => (
                    <DATCard key={`${dat.type}-${dat.id}`} dat={dat} onBuy={onBuy} currentUserAddress={currentUserAddress} />
                ))}
            </div>
            {!loading && officialDats.length === 0 && <p className="text-gray-500 mt-4">No official DATs available at the moment.</p>}
        </div>

        <div className="mt-12">
            <h3 className="text-2xl font-semibold text-purple-400 mb-4 flex items-center gap-2"><Users size={20}/> Community DATs</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {loading ? renderSkeletons(8) : communityDats.map(dat => (
                    <DATCard key={`${dat.type}-${dat.id}`} dat={dat} onBuy={onBuy} currentUserAddress={currentUserAddress} />
                ))}
            </div>
            {!loading && communityDats.length === 0 && <p className="text-gray-500 mt-4">No community-minted DATs available yet.</p>}
        </div>
      </section>
    );
};

const Dashboard = ({ dats, currentUserAddress, onAccessData, onRefresh, loading }) => {
    const userDats = dats.filter(dat => currentUserAddress && dat.owner.toLowerCase() === currentUserAddress.toLowerCase());
    const totalRevenue = userDats.reduce((acc, dat) => acc + (dat.revenue || 0), 0);
    const totalConsumption = userDats.reduce((acc, dat) => acc + (dat.consumption || 0), 0);

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
                    <p className="text-gray-500">You don't own any DATs to track.</p>
                )}
            </Card>
            <Card className="flex-1">
                <SectionTitle icon={<Share2 className="text-purple-400" />} title="My Revenue" />
                {userDats.length > 0 ? (
                    <div className="text-center">
                        <p className="text-gray-400">Total Estimated Earnings</p>
                        <p className="text-3xl font-bold text-green-400 mt-2">{totalRevenue.toFixed(2)} LAZAI</p>
                        <p className="text-xs text-gray-500 mt-2">Based on {totalConsumption} total calls across your DATs.</p>
                    </div>
                ) : (
                    <p className="text-gray-500">You don't own any DATs generating revenue.</p>
                )}
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
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDat, setSelectedDat] = useState(null);
  const [processingPurchase, setProcessingPurchase] = useState(false);
  const [purchaseSuccess, setPurchaseSuccess] = useState(false);
  const [loadingDats, setLoadingDats] = useState(false);
  const [purchaseProgress, setPurchaseProgress] = useState(0);
  const [purchaseStep, setPurchaseStep] = useState('');
  const [isChatVisible, setIsChatVisible] = useState(false);

  const fetchDats = useCallback(async () => {
      if (!contract || !userContract) return;
      setLoadingDats(true);
      try {
          const allDats = [];
          // Fetch from official contract
          const officialSupply = await contract.totalSupply();
          for (let i = 1; i <= officialSupply; i++) {
              try {
                  const owner = await contract.ownerOf(i);
                  const metadata = await contract.datMetadata(i);
                  allDats.push({
                      id: i, type: 'official', contract: contract,
                      name: metadata.name, description: metadata.description,
                      price: parseFloat(ethers.formatEther(metadata.price)), owner: owner,
                      consumption: Math.floor(Math.random() * 1000), revenue: Math.random() * 100,
                  });
              } catch (e) { console.warn(`Could not fetch official DAT ${i}:`, e); }
          }

          // Fetch from user contract
          const userSupply = await userContract.totalSupply();
          for (let i = 1; i <= userSupply; i++) {
              try {
                  const owner = await userContract.ownerOf(i);
                  const metadata = await userContract.datMetadata(i);
                  allDats.push({
                      id: i, type: 'user', contract: userContract,
                      name: metadata.name, description: metadata.description,
                      price: parseFloat(ethers.formatEther(metadata.price)), owner: owner,
                      consumption: Math.floor(Math.random() * 500), revenue: Math.random() * 50,
                  });
              } catch (e) { console.warn(`Could not fetch user DAT ${i}:`, e); }
          }

          setDats(allDats.sort((a, b) => b.id - a.id)); // Sort by ID desc
      } catch (err) {
          console.error("Failed to fetch DATs:", err);
          toast.error("Failed to fetch DATs from the network.");
      } finally {
          setLoadingDats(false);
      }
  }, [contract, userContract]);

  useEffect(() => {
    if (contract && userContract && provider) {
      const checkOwnershipAndBalance = async () => {
        if (account) {
          try {
            const ownerAddress = await contract.owner();
            setIsOwner(ownerAddress.toLowerCase() === account.toLowerCase());
            const userBalance = await provider.getBalance(account);
            setBalance(parseFloat(ethers.formatEther(userBalance)));
          } catch (err) {
            console.error("Failed to check contract owner or balance:", err);
          }
        }
      };

      fetchDats();
      checkOwnershipAndBalance();

      // Event listener for real-time updates
      const handleTransfer = (from, to, tokenId) => {
        console.log('Transfer event received:', { from, to, tokenId });
        // Ignore the initial load of events
        if (from === ethers.ZeroAddress) {
            toast.success('New DAT minted! Marketplace updated.');
        } else {
            toast.success('DAT transferred! Marketplace updated.');
        }
        fetchDats();
      };

      const officialFilter = contract.filters.Transfer();
      const userFilter = userContract.filters.Transfer();

      contract.on(officialFilter, handleTransfer);
      userContract.on(userFilter, handleTransfer);

      // Cleanup listeners on component unmount
      return () => {
        contract.off(officialFilter, handleTransfer);
        userContract.off(userFilter, handleTransfer);
      };
    }
  }, [account, contract, userContract, provider, fetchDats]);

  const handleBuyClick = (dat) => {
      if (!isConnected) { toast.error("Please connect your wallet to purchase a DAT."); return; }
      if (balance < dat.price) { toast.error("Insufficient funds to purchase this DAT."); return; }
      setSelectedDat(dat);
      setIsModalOpen(true);
      setPurchaseSuccess(false);
  };

  const confirmPurchase = async () => {
      if (!selectedDat || !selectedDat.contract) return;
      setProcessingPurchase(true);
      setPurchaseProgress(0);
      setPurchaseStep('');

      const toastId = toast.loading('Processing purchase...');

      try {
        const priceInWei = ethers.parseEther(selectedDat.price.toString());

        setPurchaseStep('Awaiting wallet confirmation...');
        setPurchaseProgress(10);
        toast.loading('Awaiting wallet confirmation...', { id: toastId });

        const tx = await selectedDat.contract.purchase(selectedDat.id, { value: priceInWei });
        
        setPurchaseStep('Processing transaction...');
        setPurchaseProgress(50);
        toast.loading('Processing transaction on the blockchain...', { id: toastId });

        await tx.wait();

        setPurchaseStep('Finalizing purchase...');
        setPurchaseProgress(90);

        await fetchDats();
        setPurchaseSuccess(true);
        setPurchaseProgress(100);
        toast.success('Purchase Successful!', { id: toastId });
        
        setTimeout(() => {
            setIsModalOpen(false);
            setSelectedDat(null);
            setProcessingPurchase(false);
            setPurchaseProgress(0);
            setPurchaseStep('');
        }, 2000);
      } catch (err) {
          console.error("Purchase failed:", err);
          const errorMessage = err.reason || "Purchase failed! See console for details.";
          toast.error(errorMessage, { id: toastId });
          setIsModalOpen(false); // Close modal on failure
          setProcessingPurchase(false);
          setPurchaseProgress(0);
          setPurchaseStep('');
      }
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
                />
            </div>
            <div className="lg:w-2/3">
              <Dashboard dats={dats} currentUserAddress={account} onAccessData={handleAccessData} onRefresh={fetchDats} loading={loadingDats} />
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
                  />
              </div>
          )}

          <Marketplace dats={dats} onBuy={handleBuyClick} currentUserAddress={account} onRefresh={fetchDats} loading={loadingDats} />
        </main>
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Confirm Purchase" disableClose={processingPurchase}>
          {selectedDat && (
              <div>
                  {!purchaseSuccess ? (
                      <>
                          <p className="text-gray-300">You are about to purchase <span className="font-bold text-purple-400">{selectedDat.name}</span> for <span className="font-bold text-white">{selectedDat.price} LAZAI</span>.</p>
                          <p className="text-sm text-gray-500 mt-2">Your current balance is {balance.toFixed(2)} LAZAI.</p>
                          
                          {processingPurchase && (
                              <div className="mt-6">
                                  <ProgressBar progress={purchaseProgress} text={purchaseStep} />
                              </div>
                          )}

                          <div className="mt-6 flex justify-end gap-4">
                              <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 rounded-lg bg-gray-600 hover:bg-gray-700 transition" disabled={processingPurchase}>Cancel</button>
                              <button onClick={confirmPurchase} disabled={processingPurchase} className="px-4 py-2 rounded-lg bg-green-600 hover:bg-green-700 transition disabled:bg-gray-500 disabled:cursor-not-allowed">
                                  {processingPurchase ? 'Processing...' : 'Confirm'}
                              </button>
                          </div>
                      </>
                  ) : (
                      <div className="text-center">
                          <CheckCircle className="text-green-500 w-16 h-16 mx-auto mb-4" />
                          <h4 className="text-xl font-bold text-white">Purchase Successful!</h4>
                          <p className="text-gray-300 mt-2">You are now the owner of <span className="font-bold text-purple-400">{selectedDat.name}</span>.</p>
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