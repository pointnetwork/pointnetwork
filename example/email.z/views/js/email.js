const web3 = new Web3('ws://localhost:7545')
document.body.onload = addElement;

function addElement() {
  const newDiv = document.createElement("div");
  const newContent = document.createTextNode(`Successfully loaded external email js file for ${to}`);
  newDiv.appendChild(newContent);
  const currentDiv = document.getElementById("div1");
  currentDiv.parentNode.insertBefore(newDiv, currentDiv);
}

function encrypt() {
  let body = document.getElementById("body");
  origValue = body.value
  // TODO AES encryption would be here...
  body.value = `${origValue} >>> ENCRYPTED!!`
  return true
}

async function subscribeToSendEmailEvent(emailContractAddress) {
  // TODO fetch the artifact from Identiy kv + storage
  // const abi = [{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"to","type":"address"},{"indexed":false,"internalType":"string","name":"message","type":"string"}],"name":"SendEmail","type":"event"},{"inputs":[{"internalType":"address","name":"to","type":"address"},{"internalType":"string","name":"message","type":"string"}],"name":"send","outputs":[{"internalType":"bool","name":"result","type":"bool"}],"stateMutability":"nonpayable","type":"function"}]
  console.log({storage_get_by_ikv});

  const abi = storage_get_by_ikv('email.z', 'zweb/contracts/abi/Email');

  console.log({abi})

  email = new web3.eth.Contract(abi, emailContractAddress)

  emails = await email.getPastEvents("SendEmail", {fromBlock: 0, toBlock: 'latest'})
  console.log(`SendEmail Count: ${emails.length}`)

  subscribeLogEvent(email, 'SendEmail')
}

// a list for saving subscribed event instances
const subscribedEvents = {}

// Subscriber method
const subscribeLogEvent = (contract, eventName) => {
  const eventJsonInterface = web3.utils._.find(
    contract._jsonInterface,
    o => o.name === eventName && o.type === 'event',
  )
  const subscription = web3.eth.subscribe('logs', {
    address: contract.options.address,
    topics: [eventJsonInterface.signature]
  }, (error, result) => {
    if (!error) {
      const eventObj = web3.eth.abi.decodeLog(
        eventJsonInterface.inputs,
        result.data,
        result.topics.slice(1)
      )
      // TODO: Hook this up to the Notification UI
      console.log(`You have Point Network Mail! :) ${eventName}!`, eventObj)
    }
  })
  subscribedEvents[eventName] = subscription
}

(() => {
  subscribeToSendEmailEvent(emailContractAddress)
})()