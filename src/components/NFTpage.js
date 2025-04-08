import Navbar from "./Navbar";
import { useParams } from 'react-router-dom';
import MarketplaceJSON from "../Marketplace.json";
import axios from "axios";
import { useState, useEffect } from "react";
import { GetIpfsUrlFromPinata } from "../utils";

export default function NFTPage() {
    const [data, setData] = useState({});
    const [message, setMessage] = useState("");
    const [currentAccount, setCurrentAccount] = useState("");
    const [isOwner, setIsOwner] = useState(false);
    const [isListed, setIsListed] = useState(false);
    const [newPrice, setNewPrice] = useState("");
    const [autoListPrice, setAutoListPrice] = useState("");
    const [autoListEnabled, setAutoListEnabled] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [txHash, setTxHash] = useState("");

    const { tokenId } = useParams();

    async function getNFTData() {
        const ethers = require("ethers");
        if(!window.ethereum) {
            setMessage("Please install MetaMask");
            return;
        }
        
        try {
            const provider = new ethers.providers.Web3Provider(window.ethereum);
            const signer = provider.getSigner();
            const addr = await signer.getAddress();
            
            const contract = new ethers.Contract(
                MarketplaceJSON.address, 
                MarketplaceJSON.abi, 
                signer
            );
            
            const tokenURI = await contract.tokenURI(tokenId);
            const listedToken = await contract.getListedTokenForId(tokenId);
            
            const formattedTokenURI = GetIpfsUrlFromPinata(tokenURI);
            const meta = await axios.get(formattedTokenURI);
            
            setData({
                ...meta.data,
                tokenId,
                seller: listedToken.seller,
                owner: listedToken.owner,
                currentlyListed: listedToken.currentlyListed
            });

            setCurrentAccount(addr);
            setIsOwner(addr.toLowerCase() === listedToken.owner.toLowerCase());
            setIsListed(listedToken.currentlyListed);
        } catch(error) {
            console.error("Error fetching NFT data:", error);
            setMessage("Error loading NFT data");
        }
    }

    async function buyNFT() {
        setIsLoading(true);
        try {
            const ethers = require("ethers");
            const provider = new ethers.providers.Web3Provider(window.ethereum);
            const signer = provider.getSigner();
    
            const contract = new ethers.Contract(
                MarketplaceJSON.address, 
                MarketplaceJSON.abi, 
                signer
            );
            
            const salePrice = ethers.utils.parseUnits(data.price, 'ether');
            
            setMessage("Processing purchase...");
            const buyTx = await contract.executeSale(tokenId, {value: salePrice});
            setTxHash(buyTx.hash);
            
            // Wait for transaction to be mined
            await buyTx.wait();
            
            // Listen for TokenSold event
            contract.once("TokenSold", (soldTokenId, seller, newOwner, price) => {
                if (soldTokenId.toString() === tokenId) {
                    setMessage("NFT transfer confirmed!");
                    // Force refresh all data
                    setTimeout(() => {
                        getNFTData();
                        if (typeof window.updateUI === 'function') {
                            window.updateUI(); // Global refresh if available
                        }
                    }, 2000);
                }
            });
    
            if (autoListEnabled && autoListPrice) {
                setMessage("Preparing auto-listing...");
                const listPrice = await contract.getListPrice();
                const listTx = await contract.createListedToken(
                    tokenId,
                    ethers.utils.parseUnits(autoListPrice, 'ether'),
                    {value: listPrice}
                );
                await listTx.wait();
                setMessage(`Success! NFT purchased and listed for ${autoListPrice} ETH`);
            } else {
                setMessage("NFT purchased successfully!");
            }
        } catch(e) {
            console.error("Transaction error:", e);
            setMessage(`Error: ${e.message}`);
        } finally {
            setIsLoading(false);
            setAutoListPrice("");
            setAutoListEnabled(false);
        }
    }

    async function handleListNFT() {
        if (!newPrice || isNaN(newPrice)) {
            setMessage("Please enter a valid price");
            return;
        }

        try {
            const ethers = require("ethers");
            const provider = new ethers.providers.Web3Provider(window.ethereum);
            const signer = provider.getSigner();

            const contract = new ethers.Contract(
                MarketplaceJSON.address, 
                MarketplaceJSON.abi, 
                signer
            );

            const listPrice = await contract.getListPrice();
            setMessage("Listing NFT...");
            
            const tx = await contract.createListedToken(
                tokenId,
                ethers.utils.parseUnits(newPrice, 'ether'),
                {value: listPrice}
            );
            await tx.wait();

            await getNFTData();
            setMessage("NFT listed successfully!");
            setNewPrice("");
        } catch(e) {
            console.error("Listing error:", e);
            setMessage(`Error: ${e.message}`);
        }
    }

    useEffect(() => {
        getNFTData();
    }, [tokenId]);

    return (
        <div style={{minHeight: "100vh"}}>
            <Navbar />
            <div className="flex ml-20 mt-40">
                <img src={data.image && GetIpfsUrlFromPinata(data.image)} 
                     alt={data.name} 
                     className="w-2/5" />
                
                <div className="text-xl ml-20 space-y-8 text-white shadow-2xl rounded-lg border-2 p-5">
                    <div>Name: {data.name}</div>
                    <div>Description: {data.description}</div>
                    <div>Current Price: {data.price} ETH</div>
                    <div>Owner: <span className="text-sm">{data.owner}</span></div>
                    <div>Seller: <span className="text-sm">{data.seller}</span></div>
                    
                    <div className="space-y-4">
                        {isListed && !isOwner && (
                            <div className="space-y-4">
                                <button 
                                    className="enableEthereumButton bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded text-sm w-full" 
                                    onClick={buyNFT}
                                >
                                    Buy This NFT
                                </button>

                                <div className="flex items-center">
                                    <input
                                        type="checkbox"
                                        id="autoListCheckbox"
                                        checked={autoListEnabled}
                                        onChange={(e) => setAutoListEnabled(e.target.checked)}
                                        className="mr-2"
                                    />
                                    <label htmlFor="autoListCheckbox">List immediately after purchase</label>
                                </div>

                                {autoListEnabled && (
                                    <div className="space-y-2">
                                        <input
                                            type="number"
                                            placeholder="Enter listing price in ETH"
                                            className="p-2 rounded text-black w-full"
                                            value={autoListPrice}
                                            onChange={(e) => setAutoListPrice(e.target.value)}
                                        />
                                        <div className="text-sm text-gray-300">
                                            This will list the NFT at your price right after purchase
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                        
                        {isOwner && !isListed && (
                            <div className="space-y-2">
                                <input
                                    type="number"
                                    placeholder="Enter price in ETH"
                                    className="p-2 rounded text-black w-full"
                                    value={newPrice}
                                    onChange={(e) => setNewPrice(e.target.value)}
                                />
                                <button 
                                    className="enableEthereumButton bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded text-sm w-full"
                                    onClick={handleListNFT}
                                >
                                    List For Sale
                                </button>
                            </div>
                        )}

                        {isOwner && isListed && (
                            <div className="text-emerald-700">
                                This NFT is currently listed for {data.price} ETH
                            </div>
                        )}
                        
                        {message && (
                            <div className={`text-center mt-3 ${message.includes("Error") ? "text-red-500" : "text-green-500"}`}>
                                {message}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}