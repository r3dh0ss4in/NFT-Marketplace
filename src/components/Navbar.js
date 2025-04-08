import { useEffect, useState } from 'react';
import { useLocation, Link } from 'react-router-dom';
import fullLogo from '../logo.png';
import logo from '../logo_3.png';
import MarketplaceJSON from "../Marketplace.json";

function Navbar() {
  const [connected, toggleConnect] = useState(false);
  const location = useLocation();
  const [currAddress, updateAddress] = useState('0x');

  async function getAddress() {
    try {
      const ethers = require("ethers");
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const signer = provider.getSigner();
      const addr = await signer.getAddress();
      updateAddress(addr);
      return true;
    } catch (err) {
      console.log("Error getting address:", err);
      updateAddress('0x');
      toggleConnect(false);
      resetButton();
      return false;
    }
  }

  function updateButton() {
    const ethereumButton = document.querySelector('.enableEthereumButton');
    if (ethereumButton) {
      ethereumButton.textContent = "Connected";
      ethereumButton.classList.remove("hover:bg-blue-70");
      ethereumButton.classList.remove("bg-blue-500");
      ethereumButton.classList.add("hover:bg-green-70");
      ethereumButton.classList.add("bg-green-500");
    }
  }

  function resetButton() {
    const ethereumButton = document.querySelector('.enableEthereumButton');
    if (ethereumButton) {
      ethereumButton.textContent = "Connect Wallet";
      ethereumButton.classList.remove("hover:bg-green-70");
      ethereumButton.classList.remove("bg-green-500");
      ethereumButton.classList.add("hover:bg-blue-70");
      ethereumButton.classList.add("bg-blue-500");
    }
  }

  async function connectWebsite() {
    try {
      if (!window.ethereum) {
        alert("MetaMask is not installed!");
        return;
      }

      const chainId = await window.ethereum.request({ method: 'eth_chainId' });
      if(chainId !== '0xaa36a7') {
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: '0xaa36a7' }],
        });
      }  

      await window.ethereum.request({ method: 'eth_requestAccounts' })
        .then(async () => {
          const success = await getAddress();
          if (success) {
            updateButton();
            toggleConnect(true);
            window.location.replace(location.pathname);
          }
        });
    } catch (error) {
      console.error("Error connecting website:", error);
    }
  }

  useEffect(() => {
    if (!window.ethereum) {
      return;
    }

    const checkConnection = async () => {
      try {
        const accounts = await window.ethereum.request({ method: 'eth_accounts' });
        if (accounts.length > 0) {
          const success = await getAddress();
          if (success) {
            toggleConnect(true);
            updateButton();
          }
        } else {
          toggleConnect(false);
          resetButton();
        }
      } catch (error) {
        console.error("Error checking connection:", error);
        toggleConnect(false);
        resetButton();
      }
    };

    checkConnection();

    window.ethereum.on('accountsChanged', (accounts) => {
      if (accounts.length > 0) {
        getAddress();
      } else {
        updateAddress('0x');
        toggleConnect(false);
        resetButton();
      }
      window.location.replace(location.pathname);
    });

    return () => {
      if (window.ethereum.removeListener) {
        window.ethereum.removeListener('accountsChanged', () => {});
      }
    };
  }, [location.pathname]);

  return (
    <div className="fixed w-full top-0 z-50">
      <nav className="w-full bg-red bg-opacity-80 backdrop-blur-md">
        <ul className='flex items-end justify-between py-3 bg-transparent text-white pr-5'>
          <li className='flex items-end ml-5 pb-2'>
            <Link to="/">
              <img src={fullLogo} alt="" width={120} height={120} className="inline-block -mt-2"/>
            </Link>
          </li>
          <li className='w-2/6'>
            <ul className='lg:flex justify-between font-bold mr-10 text-lg'>
              {location.pathname === "/" ? 
                <li className='border-b-2 hover:pb-0 p-2'>
                  <Link to="/">Marketplace</Link>
                </li>
                :
                <li className='hover:border-b-2 hover:pb-0 p-2'>
                  <Link to="/">Marketplace</Link>
                </li>              
              }
              {location.pathname === "/sellNFT" ? 
                <li className='border-b-2 hover:pb-0 p-2'>
                  <Link to="/sellNFT">List My NFT</Link>
                </li>
                :
                <li className='hover:border-b-2 hover:pb-0 p-2'>
                  <Link to="/sellNFT">List NFT</Link>
                </li>              
              }              
              {location.pathname === "/profile" ? 
                <li className='border-b-2 hover:pb-0 p-2'>
                  <Link to="/profile">Profile</Link>
                </li>
                :
                <li className='hover:border-b-2 hover:pb-0 p-2'>
                  <Link to="/profile">Profile</Link>
                </li>              
              }  
              <li>
                <button className="enableEthereumButton bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded text-sm" onClick={connectWebsite}>
                  {connected ? "Connected" : "Connect Wallet"}
                </button>
              </li>
            </ul>
          </li>
        </ul>
      </nav>
      <div className='text-white text-bold text-right mr-10 text-sm bg-black bg-opacity-50 py-1'>
        {currAddress !== "0x" ? "Connected to" : "Not Connected. Please login to view NFTs"} {currAddress !== "0x" ? (currAddress.substring(0,15)+'...') : ""}
      </div>
    </div>
  );
}

export default Navbar;