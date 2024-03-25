import { useState, useRef } from "react";
import { ethers } from "ethers";
import LemonSwap from "./artifacts/contracts/LemonSwap.sol/LemonSwap.json";
import IERC20 from "./artifacts/@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol/ERC20Upgradeable.json";
import IUniswapV3Pool from "./artifacts/@uniswap/v3-core/contracts/interfaces/IUniswapV3Pool.sol/IUniswapV3Pool.json";
import "./App.css"
import React, { useEffect } from "react";
import BigNumber from "bignumber.js";
import { 
  ChakraProvider, NumberInput, NumberInputField, Select, Button, Slider, SliderTrack, SliderFilledTrack,
} from '@chakra-ui/react'

import matamaskicon from './img/logo/matamaskicon.png';
import oplogo from './img/logo/oplogo.png';
import usdclogo from './img/logo/usdclogo.png';

const contractAddress = "0x0DA580405B03764EB10435E10E506574ffDC6eCb"; // Replace with the actual contract address


function TickToPrice(
	consultPrice0,
	wantDecimals,
	borrowDecimals,
	isToken0,
) {
  console.log(consultPrice0, wantDecimals, borrowDecimals, isToken0);
  let tickBase0 = new BigNumber(1.0001);
  let consultPrice = new BigNumber(consultPrice0);
  let tickBase = tickBase0 ** consultPrice;
	let decimalBase = new BigNumber(1);
  let tmp = new BigNumber(10);
	if (wantDecimals > borrowDecimals) {
		decimalBase = tmp ** (wantDecimals - borrowDecimals);
	} else if (wantDecimals < borrowDecimals) {
		decimalBase = tmp ** (borrowDecimals - wantDecimals);
	}
	let oppositeBase = new BigNumber(1);
	let estimatePrice = tickBase * decimalBase;
  console.log(estimatePrice, oppositeBase / estimatePrice);
	if (isToken0) {
		estimatePrice = oppositeBase / estimatePrice;
	}
	return estimatePrice.toFixed(3);
}

function MainPage() {
  const [address, setAddress] = useState('');
  const [token0Balance, setToken0Balance] = useState(0);
  const [token1Balance, setToken1Balance] = useState(0);
  const [token0Allowance, setToken0Allowance] = useState(0);
  const [token1Allowance, setToken1Allowance] = useState(0);
  const [token0Decimal, setToken0Decimal] = useState(0);
  const [token1Decimal, setToken1Decimal] = useState(0);
  const [poolTick, setPoolTick] = useState(0);
  const [poolPrice, setPoolPrice] = useState(0);
  const [tickSpace, setTickSpace] = useState(0);
  const [selectTokenOffer, setSelectTokenOffer] = useState('');
  const [selectPoolUpperTick, setSelectPoolUpperTick] = useState(0);
  const [selectPoolUpperPrice, setSelectPoolUpperPrice] = useState(0);
  const [selectPoolLowerTick, setSelectPoolLowerTick] = useState(0);
  const [selectPoolLowerPrice, setSelectPoolLowerPrice] = useState(0);
  const [submitCheck, setSubmitCheck] = useState(0);
  const [submitAmount, setSubmitAmount] = useState(0);

  // Optimism
  // const uniswapPool = "0x1c3140ab59d6caf9fa7459c6f83d4b52ba881d36";
  // const token0Addr = "0x4200000000000000000000000000000000000042";
  // const token1Addr = "0x7f5c764cbc14f9669b88837ca1490cca17c31607";

  // Arbitrum
  const uniswapPool = "0x81c48d31365e6b526f6bbadc5c9aafd822134863";
  const token0Addr = "0x912ce59144191c1204e64559fe8253a0e49e6548";
  const token1Addr = "0xff970a61a04b1ca14834a43f5de4533ebddb5cc8";
  useEffect(() => {
    if (window.ethereum && window.ethereum.selectedAddress) {
      // MetaMask is connected
      const selectedAddress = window.ethereum.selectedAddress;
      console.log(`Connected to MetaMask with address: ${selectedAddress}`);
      connectToToken();
    } else {
      // MetaMask is not connected
      console.log('MetaMask is not connected');
    }
  }, []);

  async function connectToToken() {
    try {
      if (window.ethereum) {
        // Request account access
        const Accounts = await window.ethereum.request({
          method: 'eth_requestAccounts',
        });

        setAddress(Accounts[0]);
        console.log('Connected to MetaMask!', Accounts);

        const provider = new ethers.providers.Web3Provider(window.ethereum);
        const Signer = provider.getSigner();
        const OpContract = new ethers.Contract(token0Addr, IERC20.abi, Signer);
        OpContract.decimals().then((decimal) => {
          setToken0Decimal(decimal);
        });
        OpContract.balanceOf(Accounts[0]).then((balance) => {
          setToken0Balance(balance.toString());
        });
        OpContract.allowance(Accounts[0], contractAddress).then((amount) => {
          setToken0Allowance(amount.toString());
        });
        const UsdcContract = new ethers.Contract(token1Addr, IERC20.abi, Signer);
        UsdcContract.decimals().then((decimal) => {
          setToken1Decimal(decimal);
        });
        UsdcContract.balanceOf(Accounts[0]).then((balance) => {
          setToken1Balance(balance.toString());
        });
        UsdcContract.allowance(Accounts[0], contractAddress).then((amount) => {
          setToken1Allowance(amount.toString());
        });
      } else {
        console.error(
          'MetaMask not found. Please install MetaMask to use this application.',
        );
      }
    } catch (error) {
      console.error(error);
    }
  }

  function computeDisplayValue(baseDecimal, value) {
    let base = new BigNumber(10);
    let baseDecimalBig = base.pow(baseDecimal);
    let displayValue = new BigNumber(value).div(baseDecimalBig);
    return displayValue.toFixed(3);
  }

  function computeRealValue(baseDecimal, value) {
    let base = new BigNumber(10);
    let baseDecimalBig = base.pow(baseDecimal);
    let displayValue = new BigNumber(value).multipliedBy(baseDecimalBig);
    return displayValue.toFixed(0);
  }

  async function connectToMetaMask() {
    try {
      // Check if MetaMask is installed
      if (window.ethereum) {
        await connectToToken();
        await getTokenPrice();
      } else {
        console.error(
          'MetaMask not found. Please install MetaMask to use this application.',
        );
      }
    } catch (error) {
      console.error(error);
    }
  }

  async function getTokenPrice() {
    try {
      if (window.ethereum && window.ethereum.selectedAddress) {
        const provider = new ethers.providers.Web3Provider(window.ethereum);
        const Signer = provider.getSigner();
        const IUniswapV3PoolContract = new ethers.Contract(uniswapPool, IUniswapV3Pool.abi, Signer);
        if (!tickSpace) {
          console.log('tickSpacing', tickSpace);
          IUniswapV3PoolContract.tickSpacing().then((values) => {
            console.log(values);
            setTickSpace(values.toString());
          });
        }
        console.log('tokens', await IUniswapV3PoolContract.token0(), await IUniswapV3PoolContract.token1());
        IUniswapV3PoolContract.slot0().then((values) => {
          // console.log(values);
          if (values.length > 0) {
            setPoolTick(values[1].toString());
            let price = TickToPrice(
              values[1],
              token1Decimal,
              token0Decimal,
              false,
            );
            setPoolPrice(price);
          }
        });
      }
    } catch (error) {
      console.error(error);
    }
  }

  async function changeTokenOffer(event) {
    event.preventDefault();
    if (!poolTick || !tickSpace) {
      return;
    }
    setSelectTokenOffer(event.target.value);
    let bigTick = new BigNumber(poolTick);
    let bigTickSpace = new BigNumber(tickSpace);
    let tmp0, tmp1;
    if (selectTokenOffer === 'op') {
      tmp0 = bigTick.minus(bigTick.mod(bigTickSpace)).minus(bigTickSpace).toFixed(0)
      tmp1 = bigTick.minus(bigTick.mod(bigTickSpace)).minus(bigTickSpace.multipliedBy(3)).toFixed(0)
      setSelectPoolUpperTick(tmp0);
      setSelectPoolLowerTick(tmp1);
    } else {
      tmp0 = bigTick.minus(bigTick.mod(bigTickSpace)).plus(bigTickSpace).toFixed(0)
      tmp1 = bigTick.minus(bigTick.mod(bigTickSpace)).plus(bigTickSpace.multipliedBy(3)).toFixed(0)
      setSelectPoolLowerTick(tmp0);
      setSelectPoolUpperTick(tmp1);
    }
    let price2 = TickToPrice(
      tmp0,
      token1Decimal,
      token0Decimal,
      false,
    );
    setSelectPoolUpperPrice(price2);
    let price3 = TickToPrice(
      tmp1,
      token1Decimal,
      token0Decimal,
      false,
    );
    setSelectPoolLowerPrice(price3);
  }

  async function inputAmount(value) {
    setSubmitAmount(value);
    let dBase = new BigNumber(10);
    if (selectTokenOffer === 'op') {
      let tokenDecimal = new BigNumber(token0Decimal);
      tokenDecimal = dBase.pow(tokenDecimal);
      let submitAmount0 = new BigNumber(value);
      submitAmount0 = submitAmount0.multipliedBy(tokenDecimal);
      let token0Balance0 = new BigNumber(token0Balance);
      let token0Allowance0 = new BigNumber(token0Allowance);
      console.log('OP', submitAmount.toString(), submitAmount0.toString(), token0Balance0.toString(), token0Allowance0.toString());
      if (submitAmount0.isGreaterThan(token0Balance0)) {
        setSubmitCheck(-1);
      } else if (submitAmount0.isGreaterThan(token0Allowance0)) {
        setSubmitCheck(2);
      } else {
        setSubmitCheck(1);
      }
    } else {
      let tokenDecimal = new BigNumber(token1Decimal);
      tokenDecimal = dBase.pow(tokenDecimal);
      let submitAmount0 = new BigNumber(value);
      submitAmount0 = submitAmount0.multipliedBy(tokenDecimal);
      let token1Balance0 = new BigNumber(token1Balance);
      let token1Allowance0 = new BigNumber(token1Allowance);
      if (submitAmount0.isGreaterThan(token1Balance0)) {
        setSubmitCheck(-1);
      } else if (submitAmount0.isGreaterThan(token1Allowance0)) {
        setSubmitCheck(2);
      } else {
        setSubmitCheck(1);
      }
    }
  }

  const ApproveToken = async () => {
    try {
      if (window.ethereum) {
        const approveTokenAddr = selectTokenOffer === 'op' ? token0Addr : token1Addr;
        const provider = new ethers.providers.Web3Provider(window.ethereum);
        const Signer = provider.getSigner();
        let approveAmount = submitAmount;
        if (selectTokenOffer === 'op') {
          approveAmount = computeRealValue(token0Decimal, submitAmount);
        } else {
          approveAmount = computeRealValue(token1Decimal, submitAmount);
        }
        const Contract = new ethers.Contract(approveTokenAddr, IERC20.abi, Signer);
        const Tx = await Contract.approve(contractAddress, approveAmount);
        const TxRecit = await Tx.wait();
        await connectToMetaMask();
        setSubmitCheck(1);
        console.log('after :', TxRecit);
      } else {
        console.error(
          'MetaMask not found. Please install MetaMask to use this application.',
        );
      }
    } catch (error) {
      console.log(error);
      alert(error);
    }
  };


  const openPosition = async () => {
    try {
      if (window.ethereum) {
        const provider = new ethers.providers.Web3Provider(window.ethereum);
        const Signer = provider.getSigner();
        let approveAmount = submitAmount;
        if (selectTokenOffer === 'op') {
          approveAmount = computeRealValue(token0Decimal, submitAmount);
        } else {
          approveAmount = computeRealValue(token1Decimal, submitAmount);
        }
        const Contract = new ethers.Contract(contractAddress, LemonSwap.abi, Signer);
        console.log([uniswapPool, selectTokenOffer === 'op', approveAmount, poolTick, selectPoolUpperTick, selectPoolLowerTick]);
        const Tx = await Contract.openPosition([uniswapPool, true, approveAmount, -271560, -271680]);
        const TxRecit = await Tx.wait();
        console.log('after :', TxRecit);
      } else {
        console.error(
          'MetaMask not found. Please install MetaMask to use this application.',
        );
      }
    } catch (error) {
      console.log(error);
      alert(error);
    }
  };


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

          <div className="valueContainer">
            <p className="key">
              Select pair
            </p>
          </div>

          <div className="valueContainer">
            <p>
              <a href={`https://info.uniswap.org/#/optimism/pools/${uniswapPool}`} target="_blank">
                {uniswapPool}
              </a>
            </p>
          </div>

          <div className="valueContainer">
            <div className="icon-img">
              <img src={oplogo}/>
            </div>
            <p>{computeDisplayValue(token0Decimal, token0Balance)}</p>
            <div className="icon-img">
              <img src={usdclogo}/>
            </div>
            <p>{computeDisplayValue(token1Decimal, token1Balance)}</p>
          </div>

          <div className="valueContainer">
            <p>Optimism / USDC 0.3%</p>
            current price: {poolPrice}
          </div>

          {
            address ?
            <Select placeholder='Select option' onChange={(v) => changeTokenOffer(v)}>
              <option value='op'>OP</option>
              <option value='usdc'>USDC</option>
            </Select> : ''
          }
          {
            selectTokenOffer ?
              <div className="valueContainer">
                <p className="key">
                  Lower Price: <span>{selectPoolLowerPrice}</span>
                </p>
                <Slider 
                  aria-label='slider-ex-2' colorScheme='purple' min={0} max={10} defaultValue={10}
                >
                  <SliderTrack>
                    <SliderFilledTrack />
                  </SliderTrack>
                </Slider>
                <p className="key">
                  Upper Price: <span>{selectPoolUpperPrice}</span>
                </p>
              </div>
            : ''
          }
          {
            selectTokenOffer ?
              <div className="valueContainer">
                <p className="key">
                  Amount:
                </p>
                <NumberInput onChange={(v) => inputAmount(v)}>
                  <NumberInputField />
                </NumberInput>
              </div> 
            : ''
          }
          {
            selectTokenOffer && submitCheck === -1 ?
              <div className="valueContainer">
                <Button colorScheme='teal' variant='outline' width={"100%"} isDisabled={true}>
                  Insufficient funds
                </Button>
              </div> 
            : ''
          }
          {
            selectTokenOffer && submitCheck === 2 ?
              <div className="valueContainer">
                <Button colorScheme='teal' variant='outline' width={"100%"} onClick={() => ApproveToken()}>
                  Approve
                </Button>
              </div> 
            : ''
          }
          {
            selectTokenOffer && ( submitCheck === 0 || submitCheck === 1) ?
              <div className="valueContainer">
                {
                  submitCheck === 0 ?
                  <Button colorScheme='teal' variant='outline' width={"100%"} isDisabled={true}>
                    Submit
                  </Button>
                  :
                  <Button colorScheme='teal' variant='outline' width={"100%"} onClick={() => openPosition()}>
                    Submit
                  </Button>
                }
              </div> 
            : ''
          }
        </div>
      </div>
    </ChakraProvider>
  );
}

export default MainPage;