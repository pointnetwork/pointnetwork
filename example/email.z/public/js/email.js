
const web3 = new Web3('ws://localhost:7545')

function addEmailNotificationElement(to, messageId) {
  // For now build a simple link that navigates to the show page.
  // <div>New Email for 0xf99022.. with Id: <a href='/show?messageid=123456'>123456</a></div>
  const emailNotificationDiv = document.createElement("div");
  emailNotificationDiv.setAttribute("class", "notification formback");
  const emailNotificationContent = document.createTextNode(`New Email for ${to.substr(0,8)}... with Id: `);
  emailNotificationDiv.appendChild(emailNotificationContent)
  const emailMessageId = document.createTextNode(messageId);
  const emailLink = document.createElement("a")
  emailLink.setAttribute('href', `/show?messageid=${messageId}`)
  emailLink.appendChild(emailMessageId)
  emailNotificationDiv.appendChild(emailLink);
  const notifcations = document.getElementById("notifications");
  notifcations.parentNode.insertBefore(emailNotificationDiv, notifcations);
}

function sanitizeJson(input){
  var e = document.createElement('textarea')
  e.innerHTML = input
  return (e.value || '')
    .replace(/(\/\*.*?)"(.*?)"(.*?\*\/)/g, '$1\\"$2\\"$3')
    .replace(/\n/g, '\\n')
    .replace(/\t/g, '\\t')
    .replace(/"{(.*?)}"/g, (_, match) => `"{${ match.replace(/"/g, '\\"') }}"`)
}

async function subscribeToSendEmailEvent(emailContractAddress, emailContractAbi, walletAddress) {
  const {abi} = JSON.parse(sanitizeJson(emailContractAbi))

  email = new web3.eth.Contract(abi, emailContractAddress)

  emails = await email.getPastEvents("SendEmail", {fromBlock: 0, toBlock: 'latest'})
  console.log(`SendEmail Count: ${emails.length}`)

  subscribeLogEvent(email, 'SendEmail', walletAddress)
}

// a list for saving subscribed event instances
const subscribedEvents = {}

// Subscriber method
const subscribeLogEvent = (contract, eventName, walletAddress) => {
  console.log(`Subscribing to Email Events sent to wallet ${walletAddress}`)

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

      console.log(`New Email Event Emitted ${eventName}!`, eventObj)

      if(eventObj.to === walletAddress) {
        // Show the notification on the UI
        addEmailNotificationElement(eventObj.to, eventObj.encryptedMessageHash)
      }
    }
  })
  subscribedEvents[eventName] = subscription
}

(() => {
  subscribeToSendEmailEvent(emailContractAddress, emailContractAbi, walletAddress)
})()