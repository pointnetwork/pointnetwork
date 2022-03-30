import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import Web3 from 'web3';

let web3Provider;
// Modern dapp browsers...
if (window.ethereum) {
  console.log('window.ethereum');
  web3Provider = window.ethereum;
  // Request account access
  window.ethereum.request({ method: "eth_requestAccounts" }).then(result =>{
    console.log('eth_requestAccounts result:');
    console.log(result);
  })
  .catch(error => {
    // User denied account access...
    console.error("User denied account access")
  });;
}
// Legacy dapp browsers...
else if (window.web3) {
  console.log('window.web3');
  web3Provider = window.web3.currentProvider;
}
// If no injected web3 instance is detected, fall back to Ganache
else {
  console.log('ganache');
  web3Provider = new Web3.providers.HttpProvider('http://localhost:7545');
}
const web3 = new Web3(web3Provider);
window.web3Provider = web3Provider;
window.web3API = web3;

const point = {
  contract: {
    call: () => {},
    send: () => {}
  },
  storage: {
    getString: () => {},
    putString: () => {},
    postFile: () => {},
  },
  identity: {
    ownerToIdentity: () => {
      return {data: {identity: 'TBD'}}
    }
  },
  wallet: {
    address: async () => {
      const addr = (await window.web3Provider.request({ method: "eth_requestAccounts" }))[0];
      return {data: {address: addr}}
    }
  }
}

if(window.point == undefined){
  window.point = point;
}else{
  window.point.wallet.address = point.wallet.address;
}
//window.point = point;


window.web3Provider.on('accountsChanged', function (accounts) {
  // Time to reload your interface with accounts[0]!
  window.location.reload(false);
});


ReactDOM.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
  document.getElementById('root')
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
