import Navbar from "./Navbar";
import { useState } from "react";
import { uploadFileToIPFS, uploadJSONToIPFS } from "../pinata";
import Marketplace from '../Marketplace.json';
import { useLocation } from "react-router";

export default function SellNFT () {
    const [formParams, updateFormParams] = useState({ name: '', description: '', price: ''});
    const [fileURL, setFileURL] = useState(null);
    const ethers = require("ethers");
    const [message, updateMessage] = useState('');
    const location = useLocation();

    async function disableButton() {
        const listButton = document.getElementById("list-button")
        if (listButton) {
            listButton.disabled = true
            listButton.style.backgroundColor = "grey";
            listButton.style.opacity = 0.3;
        }
    }

    async function enableButton() {
        const listButton = document.getElementById("list-button")
        if (listButton) {
            listButton.disabled = false
            listButton.style.backgroundColor = "#A500FF";
            listButton.style.opacity = 1;
        }
    }

    async function onChangeFile(e) {
        var file = e.target.files[0];
        // Check if file size exceeds 500 KB
        if (file.size > 500000) {
            updateMessage("File size too large (max 500 KB)");
            return;
        }
        
        try {
            disableButton();
            updateMessage('Uploading image... please wait');
            const response = await uploadFileToIPFS(file);
            if (response.success === true) {
                enableButton();
                updateMessage("");
                console.log("Uploaded image to pinata: ", response.pinataURL);
                setFileURL(response.pinataURL);
            }
        } catch (e) {
            console.log("Error uploading file: ", e);
            updateMessage("Error uploading file");
            enableButton();
        }
    }

    async function uploadMetadataToIPFS() {
        const {name, description, price} = formParams;

        if (!name || !description || !price || !fileURL) {
            updateMessage("Please fill all the fields");
            return -1;
        }

        // Validate price is a positive number
        if (isNaN(price) || parseFloat(price) <= 0) {
            updateMessage("Please enter a valid price (must be > 0)");
            return -1;
        }

        const nftJSON = {
            name, 
            description, 
            price, 
            image: fileURL
        }

        try {
            const response = await uploadJSONToIPFS(nftJSON);
            if (response.success === true) {
                console.log("Uploaded JSON to pinata: ", response.pinataURL);
                return response.pinataURL;
            }
        } catch(e) {
            console.log("Error uploading JSON: ", e);
            updateMessage("Error uploading metadata");
            throw e;
        }     
    }

    async function listNFT(e) {
        e.preventDefault();

        try {
            if (!window.ethereum) {
                alert("Please install MetaMask!");
                return;
            }

            const metadataURL = await uploadMetadataToIPFS();
            if (metadataURL === -1) {
                return;
            }

            const provider = new ethers.providers.Web3Provider(window.ethereum);
            await provider.send("eth_requestAccounts", []);
            const signer = provider.getSigner();
            
            disableButton();
            updateMessage("Uploading NFT... please wait (this may take a few minutes)");

            let contract = new ethers.Contract(Marketplace.address, Marketplace.abi, signer);
            const price = ethers.utils.parseUnits(formParams.price, 'ether');
            
            // Get listing price
            let listingPrice = await contract.getListPrice();
            listingPrice = listingPrice.toString();
            
            // Create the NFT
            let transaction = await contract.createToken(metadataURL, price, {value: listingPrice});
            await transaction.wait();

            alert("Successfully listed your NFT!");
            enableButton();
            updateMessage("");
            updateFormParams({
                name: '',
                description: '',
                price: ''
            });
            window.location.replace("/");
        } catch (e) {
            console.error("Error listing NFT:", e);
            let errorMessage = "Error listing NFT";
            if (e.message.includes("user rejected transaction")) {
                errorMessage = "Transaction rejected by user";
            } else if (e.message.includes("insufficient funds")) {
                errorMessage = "Insufficient funds for listing fee";
            }
            alert(errorMessage);
            updateMessage(errorMessage);
            enableButton();
        }
    }

    return (
        <div className="">
        <Navbar></Navbar>
        <div className="flex flex-col place-items-center mt-40" id="nftForm">
            <form className="bg-white shadow-md rounded px-8 pt-4 pb-8 mb-4">
            <h3 className="text-center font-bold text-purple-500 mb-8">Upload your NFT to the marketplace</h3>
                <div className="mb-4">
                    <label className="block text-purple-500 text-sm font-bold mb-2" htmlFor="name">NFT Name</label>
                    <input className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline" id="name" type="text" placeholder="Farena#4563" onChange={e => updateFormParams({...formParams, name: e.target.value})} value={formParams.name}></input>
                </div>
                <div className="mb-6">
                    <label className="block text-purple-500 text-sm font-bold mb-2" htmlFor="description">NFT Description</label>
                    <textarea className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline" cols="40" rows="5" id="description" type="text" placeholder="Farena Infinity Collection" value={formParams.description} onChange={e => updateFormParams({...formParams, description: e.target.value})}></textarea>
                </div>
                <div className="mb-6">
                    <label className="block text-purple-500 text-sm font-bold mb-2" htmlFor="price">Price (in ETH)</label>
                    <input className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline" type="number" placeholder="Min 0.01 ETH" step="0.01" min="0.01" value={formParams.price} onChange={e => updateFormParams({...formParams, price: e.target.value})}></input>
                </div>
                <div>
                    <label className="block text-purple-500 text-sm font-bold mb-2" htmlFor="image">Upload Image (&lt;500 KB)</label>
                    <input type={"file"} onChange={onChangeFile} accept="image/*"></input>
                </div>
                <br></br>
                <div className="text-red-500 text-center">{message}</div>
                <button onClick={listNFT} className="font-bold mt-10 w-full bg-purple-500 text-white rounded p-2 shadow-lg" id="list-button">
                    List NFT
                </button>
            </form>
        </div>
        </div>
    )
}