const web3 = new Web3('ws://localhost:7545')

function addEmailNotificationElement(messageId) {
  // For now build a simple link that navigates to the show page.
  // <a href='/show?messageid=123456'>Email</a>
  const emailNotificationDiv = document.createElement("div");
  emailNotificationDiv.setAttribute("class", "emailNotification");
  const emailNotificationContent = document.createTextNode(`You have Point Network Mail!! ${messageId}`);
  const emailLink = document.createElement("a")
  emailLink.setAttribute('href', `/show?messageid=${messageId}`)
  emailLink.appendChild(emailNotificationContent)
  emailNotificationDiv.appendChild(emailLink);
  const notifcations = document.getElementById("notifications");
  notifcations.parentNode.insertBefore(emailNotificationDiv, notifcations);
}

function encrypt() {
  let body = document.getElementById("body");
  origValue = body.value
  // TODO AES encryption would be here...
  body.value = `${origValue} >>> ENCRYPTED!!`
  return true
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

async function subscribeToSendEmailEvent(emailContractAddress, emailContractAbi) {
  const {abi} = JSON.parse(sanitizeJson(emailContractAbi))

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
      console.log(`You have Point Network Mail! :) ${eventName}!`, eventObj)

      // Show the notification on the UI
      addEmailNotificationElement(eventObj.message)
    }
  })
  subscribedEvents[eventName] = subscription
}

(() => {
  subscribeToSendEmailEvent(emailContractAddress, emailContractAbi)
})()