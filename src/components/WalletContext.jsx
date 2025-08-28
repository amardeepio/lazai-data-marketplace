import React, { useState, useEffect, createContext, useContext } from 'react';
import { ethers } from 'ethers';
import LazaiDATArtifact from '../lazaiDAT.json';

const lazaiDATAddress = import.meta.env.VITE_CONTRACT_ADDRESS;
const lazaiDATAbi = LazaiDATArtifact.abi;

const WalletContext = createContext(null);

export const useWallet = () => useContext(WalletContext);

export const WalletProvider = ({ children }) => {
  const [account, setAccount] = useState(null);
  const [provider, setProvider] = useState(null);
  const [contract, setContract] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const init = async () => {
      if (window.ethereum) {
        try {
          const newProvider = new ethers.BrowserProvider(window.ethereum);
          setProvider(newProvider);

          const accounts = await newProvider.listAccounts();
          if (accounts.length > 0 && accounts[0]) {
            const signer = await newProvider.getSigner();
            setAccount(signer.address);
            const newContract = new ethers.Contract(lazaiDATAddress, lazaiDATAbi, signer);
            setContract(newContract);
          }

          window.ethereum.on('accountsChanged', (accounts) => {
            if (accounts.length > 0) {
              setAccount(accounts[0]);
              window.location.reload();
            } else {
              setAccount(null);
              setContract(null);
            }
          });

          window.ethereum.on('chainChanged', () => {
            window.location.reload();
          });

        } catch (err) {
            console.error("Initialization error:", err);
            setError("Could not initialize wallet connection. Please refresh the page.");
        }
      } else {
        setError('MetaMask is not installed. Please install it to use this app.');
      }
    };
    init();
  }, []);

  const connectWallet = async () => {
    if (!provider) {
      setError('MetaMask is not available.');
      return;
    }
    try {
      const accounts = await provider.send('eth_requestAccounts', []);
      if (accounts.length > 0) {
        const signer = await provider.getSigner();
        setAccount(signer.address);
        const newContract = new ethers.Contract(lazaiDATAddress, lazaiDATAbi, signer);
        setContract(newContract);
        setError('');
      }
    } catch (err) {
      console.error("Error connecting to MetaMask:", err);
      setError('Failed to connect wallet. Please try again.');
    }
  };

  const disconnectWallet = () => {
    setAccount(null);
    setContract(null);
  };

  const value = {
    account,
    provider,
    contract,
    connectWallet,
    disconnectWallet,
    error,
    isConnected: !!account,
  };

  return (
    <WalletContext.Provider value={value}>
      {children}
    </WalletContext.Provider>
  );
};