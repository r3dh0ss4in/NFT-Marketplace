import Navbar from "./Navbar";
import NFTTile from "./NFTTile";
import MarketplaceJSON from "../Marketplace.json";
import axios from "axios";
import { useState, useEffect } from "react";
import { GetIpfsUrlFromPinata } from "../utils";

export default function Marketplace() {
    const [data, updateData] = useState([]);
    const [dataFetched, updateFetched] = useState(false);

    async function getAllNFTs() {
        if(!window.ethereum) {
            alert("Please install MetaMask!");
            return;
        }

        try {
            const ethers = require("ethers");
            const provider = new ethers.providers.Web3Provider(window.ethereum);
            const signer = provider.getSigner();
            let contract = new ethers.Contract(MarketplaceJSON.address, MarketplaceJSON.abi, signer)
            let transaction = await contract.getAllNFTs()

            const items = await Promise.all(transaction.map(async i => {
                var tokenURI = await contract.tokenURI(i.tokenId);
                tokenURI = GetIpfsUrlFromPinata(tokenURI);
                let meta = await axios.get(tokenURI);
                meta = meta.data;

                let price = ethers.utils.formatUnits(i.price.toString(), 'ether');
                let item = {
                    price,
                    tokenId: i.tokenId.toNumber(),
                    seller: i.seller,
                    owner: i.owner,
                    image: meta.image,
                    name: meta.name,
                    description: meta.description,
                }
                return item;
            }))

            updateFetched(true);
            updateData(items);
        } catch(error) {
            console.log("Error fetching NFTs:", error);
        }
    }

    useEffect(() => {
        if(!dataFetched) {
            getAllNFTs();
        }
    }, [dataFetched]);

    return (
        <div className="bg-transparent">
            <Navbar></Navbar>
            <div className="flex flex-col place-items-center mt-32"> {/* Increased mt from 20 to 32 */}
                <div className="md:text-3xl font-bold text-white mb-10"> {/* Increased text size and added mb-10 */}
                    Top NFTs
                </div>
                <div className="flex justify-center flex-wrap max-w-screen-xl gap-10"> {/* Added gap-10 for better spacing */}
                    {data.map((value, index) => {
                        return <NFTTile data={value} key={index}></NFTTile>;
                    })}
                </div>
            </div>            
        </div>
    );
}