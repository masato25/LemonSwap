import React, { useState, useEffect, useRef } from "react";
import { ethers } from "ethers";
import LemonSwap from "./artifacts/contracts/LemonSwap.sol/LemonSwap.json";


import { 
  ChakraProvider, NumberInput, NumberInputField, Select, Button, Slider, SliderTrack, SliderFilledTrack,
} from '@chakra-ui/react'

import matamaskicon from './img/logo/matamaskicon.png';

const contractAddress = "0x0DA580405B03764EB10435E10E506574ffDC6eCb"; // Replace with the actual contract address

function ListPage() {
  const [address, setAddress] = useState('');

  useEffect(() => {
    if (window.ethereum && window.ethereum.selectedAddress) {
      // MetaMask is connected
      const selectedAddress = window.ethereum.selectedAddress;
      console.log(`Connected to MetaMask with address: ${selectedAddress}`);
    } else {
      // MetaMask is not connected
      console.log('MetaMask is not connected');
    }
  }, []);

  async function connectToMetaMask() {
    try {
      // Check if MetaMask is installed
      if (window.ethereum) {
        // Request account access
        const Accounts = await window.ethereum.request({
          method: 'eth_requestAccounts',
        });

        setAddress(Accounts[0]);
        console.log('Connected to MetaMask!', Accounts);
      } else {
        console.error(
          'MetaMask not found. Please install MetaMask to use this application.',
        );
      }
    } catch (error) {
      console.error(error);
    }
  }

  return (
    <ChakraProvider>
      <div className="App">
        <div className="connectBtns">
          <Button colorScheme='teal' variant='outline' onClick={connectToMetaMask}>
            Connect To MetaMask
          </Button>
          <div className="icon-img">
            <img src={matamaskicon}/>
          </div>
        </div>
        <div className="display">
          <p className="key">
            Address: <span className="value">{address}</span>
          </p>
        </div>
      </div>
    </ChakraProvider>
  )
}

export default ListPage;