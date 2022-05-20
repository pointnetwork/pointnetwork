// nolib, web3js or ethers.
let lib = 'nolib';

// web3.js or ethers provider.
let provider = null;

let selectedAccount = null;

function handleLibOptions() {
  const options = document.querySelectorAll('input[name="lib"]');
  options.forEach(option => {
    option.addEventListener('change', function(ev) {
      if (this.checked) {
        lib = this.value;
        const usingEl = document.querySelector('#using');
        usingEl.textContent = this.value;
      }

      setProvider();
    });
  });
}

function setup() {
  const reqAcctBtn = document.querySelector('#requestAccounts');
  reqAcctBtn.addEventListener('click', () => handleRequest('requestAccounts'));

  const getBalanceBtn = document.querySelector('#getBalance');
  getBalanceBtn.addEventListener('click', () => handleRequest('getBalance'));

  const getBlockBtn = document.querySelector('#getBlockNumber');
  getBlockBtn.addEventListener('click', () => handleRequest('getBlockNumber'));

  const sendTxBtn = document.querySelector('#sendTransaction');
  sendTxBtn.addEventListener('click', () => handleRequest('sendTransaction'));

  const getTxReceiptBtn = document.querySelector('#getReceipt');
  getTxReceiptBtn.addEventListener('click', () => handleRequest('getReceipt'));

  const rpcReqBtn = document.querySelector('#rpc_req_btn');
  rpcReqBtn.addEventListener('click', () => handleRequest('sendRpc'));

  const solSendBtn = document.querySelector('#sol_send_btn');
  solSendBtn.addEventListener('click', () => handleRequest('solanaSignAndSend'));

  const callSendBtn = document.querySelector('#call_send_btn');
    callSendBtn.addEventListener('click', () => handleRequest('contractCall'));
}

function setProvider() {
  if (!window.ethereum) {
    alert('You need Point SDK');
    return;
  }

  if (lib === 'nolib') return;

  if (lib === 'ethers') {
    provider = new ethers.providers.Web3Provider(window.ethereum);
  } else if (lib === 'web3js') {
    provider = new Web3(window.ethereum);
  } else {
    alert('Unknown lib option');
  }
}

// Main
handleLibOptions();
setup();

function getOutEl(method) {
  switch (method) {
    case 'requestAccounts':
      return document.querySelector('#selectedAccount');
    case 'getBalance':
      return document.querySelector('#balance');
    case 'getBlockNumber':
      return document.querySelector('#blockNumber');
    case 'sendTransaction':
      return document.querySelector('#txHash');
    case 'getReceipt':
      return document.querySelector('#txReceipt');
    case 'sendRpc':
      return document.querySelector('#rpc_result')
    case 'solanaSignAndSend':
      return document.querySelector('#sol_result')
    case 'contractCall':
      return document.querySelector('#call_result')
    default:
      return null;
  }
}

function decimalToHex(dec) {
  return '0x' + dec.toString(16)
}

function ethToWei(eth) {
  return eth * 1e18;
}

const handlerFuncs = {
  requestAccounts: async function(lib) {
    if (lib === 'ethers') {
      return await provider.send("eth_requestAccounts", []);
    }
    if (lib === 'web3js') {
      return await provider.eth.requestAccounts();
    }
    return await window.ethereum.request({ method: "eth_requestAccounts" });
  },
  getBalance: async function(lib) {
    if (lib === 'ethers') {
      const resp = await provider.getBalance(selectedAccount);
      return ethers.utils.formatEther(resp);
    }
    if (lib === 'web3js') {
      const resp = await provider.eth.getBalance(selectedAccount);
      return provider.utils.fromWei(resp, 'ether');
    }
    return await window.ethereum.request({ method: "eth_getBalance", params: [selectedAccount, "latest"] });
  },
  getBlockNumber: async function(lib) {
    if (lib === 'ethers') {
      return await provider.getBlockNumber();
    }
    if (lib === 'web3js') {
      return await provider.eth.getBlockNumber();
    }
    return await window.ethereum.request({ method: "eth_blockNumber" });
  },
  sendTransaction: async function(lib) {
    const to = document.querySelector('#to').value;
    const valueEth = document.querySelector('#amount').value;
    if (lib === 'ethers') {
      const signer = provider.getSigner();
      const resp = await signer.sendTransaction({
        from: selectedAccount,
        to,
        value: ethers.utils.parseEther(valueEth),
      });
      return resp;
    }
    if (lib === 'web3js') {
      const resp = await provider.eth.sendTransaction({
        from: selectedAccount,
        to,
        value: provider.utils.toWei(valueEth, 'ether'),
      });
      return resp;
    }
    const resp = await window.ethereum.request({
      method: "eth_sendTransaction",
      params: [{
        from: selectedAccount,
        to,
        value: decimalToHex(ethToWei(valueEth)),
        gas: "0x76c0",
        gasPrice: "0x9184e72a000",
        data: "0xd46e8dd67c5d32be8d46e8dd67c5d32be8058bb8eb970870f072445675058bb8eb970870f072445675"
      }],
    });
    return resp;
  },
  getReceipt: async function(lib) {
    const hash = document.querySelector('#hash').value;
    if (lib === 'ethers') {
      const resp = await provider.getTransactionReceipt(hash);
      delete resp.logs;
      delete resp.logsBloom;
      return resp;
    }
    if (lib === 'web3js') {
      const resp = await provider.eth.getTransactionReceipt(hash);
      delete resp.logs;
      delete resp.logsBloom;
      return resp;
    }
    const resp = await window.ethereum.request({ method: "eth_getTransactionReceipt", params: [hash] });
      delete resp.logs;
      delete resp.logsBloom;
      return resp;
  },
  sendRpc: async function() {
    const {method, params} = JSON.parse(document.getElementById("rpc_request").value)
    if (!method) {
        throw new Error('Method id required')
    }
    return window.ethereum.request({method, params})
  },
  solanaSignAndSend: async function() {
    const to = document.querySelector('#sol_to').value;
    const lamports = Number(document.querySelector('#sol_lamports').value);

    const {publicKey} = await window.solana.connect()

    const toPubkey = new solanaWeb3.PublicKey(to)
    const fromPubkey = new solanaWeb3.PublicKey(publicKey)

    const transaction = new solanaWeb3.Transaction()
    transaction.add(
      solanaWeb3.SystemProgram.transfer({
          fromPubkey,
          toPubkey,
          lamports
      })
    )

    return window.solana.signAndSendTransaction(transaction)
  },
  contractCall: async function () {
    const contract = document.querySelector('#call_contract').value;
    const method = document.querySelector('#call_method').value;
    const params = document.querySelector('#call_params').value;
    const value = document.querySelector('#call_value').value;

    const callRadio = document.getElementById("call_call")
    if (callRadio.checked) {
        return window.point.contract.call({
            contract,
            method,
            params: JSON.parse(params)
        })
    } else {
        return window.point.contract.send({
            contract,
            method,
            value,
            params: JSON.parse(params)
        })
    }
  }
};

async function handleRequest(method) {
  console.log(`[${lib}] sending ${method}...`);
  const out = getOutEl(method);
  try {
    const resp = await handlerFuncs[method](lib);
    console.log(`[${lib}] result ${JSON.stringify(resp, null, 2)}`);

    if (method === 'sendTransaction') {
      out.textContent = resp.transactionHash || resp.hash || resp;
    } else {
      out.textContent = JSON.stringify(resp, 2, null);
    }

    if (method === 'requestAccounts') {
      selectedAccount = resp[0]
    }
  } catch (err) {
    console.log(`[${lib}] "${method}" error:`, err);
    out.textContent = 'Error, check the console for details.';
  }
}
