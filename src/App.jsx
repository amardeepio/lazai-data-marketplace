import React, { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import { UploadCloud, DollarSign, BarChart2, Share2, Wallet, CheckCircle, X, Shield, RefreshCw } from 'lucide-react';
import { useWallet } from './components/WalletContext';

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

const Modal = ({ isOpen, onClose, title, children }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-50 p-4">
            <div className="bg-gray-800 rounded-xl border border-gray-700 shadow-2xl w-full max-w-md">
                <div className="flex justify-between items-center p-4 border-b border-gray-700">
                    <h3 className="text-lg font-semibold text-white">{title}</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-white">
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


// --- CORE FEATURE COMPONENTS ---

const DATMinting = ({ onMint, walletConnected, isOwner }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [file, setFile] = useState(null);
  const [minting, setMinting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!walletConnected) {
        setError("Please connect your wallet to mint a DAT.");
        return;
    }
    if (!isOwner) {
        setError("Only the contract owner can mint new DATs.");
        return;
    }
    setError('');
    setMinting(true);
    setSuccess(false);

    try {
      const uri = `ipfs://${file.name}`;
      await onMint({ name, description, price: parseFloat(price), uri });
      
      setName('');
      setDescription('');
      setPrice('');
      setFile(null);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 5000);
    } catch (err) {
        setError(err.message || "An error occurred during minting.");
    } finally {
        setMinting(false);
    }
  };

  if (!isOwner) {
      return (
          <Card className="flex-1 min-w-[300px]">
              <SectionTitle icon={<Shield className="text-yellow-400" />} title="Admin Minting" />
              <p className="text-center text-yellow-400">Only the contract owner can mint new DATs.</p>
          </Card>
      )
  }

  return (
    <Card className="flex-1 min-w-[300px]">
      <SectionTitle icon={<UploadCloud className="text-purple-400" />} title="Mint a New DAT" />
      <form onSubmit={handleSubmit} className="space-y-4">
        <input type="text" placeholder="Dataset Name" value={name} onChange={(e) => setName(e.target.value)} className="w-full bg-gray-700 text-white p-2 rounded-lg border border-gray-600 focus:outline-none focus:ring-2 focus:ring-purple-500" required />
        <textarea placeholder="Description" value={description} onChange={(e) => setDescription(e.target.value)} className="w-full bg-gray-700 text-white p-2 rounded-lg border border-gray-600 h-24 resize-none focus:outline-none focus:ring-2 focus:ring-purple-500" required />
        <div className="relative">
            <DollarSign size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input type="number" placeholder="Price in LAZAI" value={price} onChange={(e) => setPrice(e.target.value)} className="w-full bg-gray-700 text-white p-2 pl-10 rounded-lg border border-gray-600 focus:outline-none focus:ring-2 focus:ring-purple-500" required min="0" step="any" />
        </div>
        <label className="w-full flex items-center justify-center px-4 py-3 bg-gray-700 text-gray-400 rounded-lg border border-dashed border-gray-600 cursor-pointer hover:bg-gray-600 hover:text-white transition">
          <UploadCloud size={20} className="mr-2"/>
          <span>{file ? file.name : 'Upload Dataset File'}</span>
          <input type="file" className="hidden" onChange={(e) => setFile(e.target.files[0])} required />
        </label>
        <button type="submit" disabled={minting || !walletConnected || !isOwner} className="w-full bg-purple-600 text-white p-3 rounded-lg font-bold hover:bg-purple-700 transition disabled:bg-gray-500 disabled:cursor-not-allowed flex items-center justify-center">
          {minting ? 'Minting Transaction...' : 'Mint DAT'}
        </button>
        {error && <p className="text-center text-red-500 text-sm mt-2">{error}</p>}
        {!walletConnected && <p className="text-center text-yellow-400 text-sm mt-2">Connect wallet to enable minting.</p>}
        {success && <p className="text-center text-green-500 text-sm">Transaction sent! DAT will appear after confirmation.</p>}
      </form>
    </Card>
  );
};

const DATCard = ({ dat, onBuy, currentUserAddress }) => {
    const isOwner = currentUserAddress && dat.owner.toLowerCase() === currentUserAddress.toLowerCase();
    return (
        <div className="bg-gray-900/50 p-4 rounded-lg border border-gray-700 flex flex-col justify-between h-full hover:border-purple-500 transition-colors duration-300">
            <div>
                <h3 className="font-bold text-lg text-purple-300">{dat.name}</h3>
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

const Marketplace = ({ dats, onBuy, currentUserAddress, onRefresh, loading }) => (
  <section className="mt-8">
    <div className="flex justify-between items-center mb-6">
      <h2 className="text-3xl font-bold text-white text-center">Available DATs</h2>
      <button onClick={onRefresh} disabled={loading} className="text-purple-400 hover:text-purple-300 disabled:text-gray-500 disabled:cursor-wait">
          <RefreshCw className={`transition-transform duration-500 ${loading ? 'animate-spin' : ''}`} />
      </button>
    </div>
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {dats.map(dat => (
        <DATCard key={dat.id} dat={dat} onBuy={onBuy} currentUserAddress={currentUserAddress} />
      ))}
    </div>
  </section>
);

const Dashboard = ({ dats, currentUserAddress }) => {
    const userDats = dats.filter(dat => currentUserAddress && dat.owner.toLowerCase() === currentUserAddress.toLowerCase());
    const totalRevenue = userDats.reduce((acc, dat) => acc + (dat.revenue || 0), 0);
    const totalConsumption = userDats.reduce((acc, dat) => acc + (dat.consumption || 0), 0);

    return (
        <div className="flex flex-col md:flex-row gap-6">
            <Card className="flex-1">
                <SectionTitle icon={<BarChart2 className="text-purple-400" />} title="Usage Tracking" />
                {userDats.length > 0 ? (
                    <ul className="space-y-3">
                        {userDats.map(dat => (
                            <li key={dat.id} className="text-gray-300 flex justify-between items-center">
                                <span>{dat.name}</span>
                                <span className="font-mono bg-gray-700 px-2 py-1 rounded text-sm text-purple-300">{dat.consumption || 0} calls</span>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <p className="text-gray-500">You don't own any DATs to track.</p>
                )}
            </Card>
            <Card className="flex-1">
                <SectionTitle icon={<Share2 className="text-purple-400" />} title="Revenue Distribution" />
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
  const { account, contract, connectWallet, isConnected, error: walletError, provider } = useWallet();
  const [dats, setDats] = useState([]);
  const [isOwner, setIsOwner] = useState(false);
  const [balance, setBalance] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDat, setSelectedDat] = useState(null);
  const [processingPurchase, setProcessingPurchase] = useState(false);
  const [purchaseSuccess, setPurchaseSuccess] = useState(false);
  const [loadingDats, setLoadingDats] = useState(false);

  const fetchDats = useCallback(async () => {
      if (!contract) return;
      setLoadingDats(true);
      try {
          const totalSupply = await contract.totalSupply();
          const fetchedDats = [];
          for (let i = 1; i <= totalSupply; i++) {
              try {
                  const owner = await contract.ownerOf(i);
                  const metadata = await contract.datMetadata(i);
                  const priceInEther = ethers.formatEther(metadata.price);
                  fetchedDats.push({
                      id: i,
                      name: metadata.name,
                      description: metadata.description,
                      price: parseFloat(priceInEther),
                      owner: owner,
                      // Mocking these for now as they are not on-chain
                      consumption: Math.floor(Math.random() * 1000),
                      revenue: Math.random() * 100,
                  });
              } catch (error) {
                  console.warn(`Could not fetch metadata for token ${i}:`, error);
              }
          }
          setDats(fetchedDats.reverse()); // Show newest first
      } catch (err) {
          console.error("Failed to fetch DATs:", err);
      } finally {
          setLoadingDats(false);
      }
  }, [contract]);

  useEffect(() => {
    const checkOwnershipAndBalance = async () => {
      if (account && contract && provider) {
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
  }, [account, contract, provider, fetchDats]);

  const handleMint = async ({ name, description, price, uri }) => {
    if (!contract || !isOwner) {
        throw new Error("Not authorized or contract not available.");
    }

    const priceInWei = ethers.parseEther(price.toString());
    const tx = await contract.safeMint(account, uri, name, description, priceInWei);
    await tx.wait();
    await fetchDats(); // Refetch after minting
  };

  const handleBuyClick = (dat) => {
      if (!isConnected) {
          alert("Please connect your wallet to purchase a DAT.");
          return;
      }
      if (balance < dat.price) {
          alert("Insufficient funds to purchase this DAT.");
          return;
      }
      setSelectedDat(dat);
      setIsModalOpen(true);
      setPurchaseSuccess(false);
  };

  const confirmPurchase = async () => {
      if (!selectedDat || !contract) return;
      setProcessingPurchase(true);
      
      try {
        const priceInWei = ethers.parseEther(selectedDat.price.toString());
        const tx = await contract.purchase(selectedDat.id, { value: priceInWei });
        await tx.wait();

        await fetchDats(); // Refetch DATs to update ownership
        setPurchaseSuccess(true);
        setTimeout(() => {
            setIsModalOpen(false);
            setSelectedDat(null);
        }, 2000);
      } catch (err) {
          console.error("Purchase failed:", err);
          alert("Purchase failed! See console for details.");
      } finally {
        setProcessingPurchase(false);
      }
  };

  return (
    <div className="bg-gray-900 text-white min-h-screen font-sans" style={{background: 'radial-gradient(circle at top, #1F2937, #111827)'}}>
      <div className="container mx-auto p-4">
        <Header 
          isConnected={isConnected}
          account={account}
          onConnect={connectWallet}
        />
        
        {walletError && <div className="text-center text-red-500 bg-red-900/50 p-3 rounded-lg my-4 border border-red-700">{walletError}</div>}
        
        <main className="mt-8">
          <div className="flex flex-col lg:flex-row gap-6">
            <div className="lg:w-1/3">
              <DATMinting onMint={handleMint} walletConnected={isConnected} isOwner={isOwner} />
            </div>
            <div className="lg:w-2/3">
              <Dashboard dats={dats} currentUserAddress={account} />
            </div>
          </div>

          <Marketplace dats={dats} onBuy={handleBuyClick} currentUserAddress={account} onRefresh={fetchDats} loading={loadingDats} />
        </main>
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Confirm Purchase">
          {selectedDat && (
              <div>
                  {!purchaseSuccess ? (
                      <>
                          <p className="text-gray-300">You are about to purchase <span className="font-bold text-purple-400">{selectedDat.name}</span> for <span className="font-bold text-white">{selectedDat.price} LAZAI</span>.</p>
                          <p className="text-sm text-gray-500 mt-2">Your current balance is {balance.toFixed(2)} LAZAI.</p>
                          <div className="mt-6 flex justify-end gap-4">
                              <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 rounded-lg bg-gray-600 hover:bg-gray-700 transition">Cancel</button>
                              <button onClick={confirmPurchase} disabled={processingPurchase} className="px-4 py-2 rounded-lg bg-green-600 hover:bg-green-700 transition disabled:bg-gray-500">
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
    </div>
  );
}
