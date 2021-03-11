let events = require('events')
let progressEventEmitter = new events.EventEmitter()

const FILE_QUEUED_EVENT = 'FileQueuedEvent'
let socket

progress = {
  files: []
}

module.exports = {
  setSocket: setSocket,
  progressEventEmitter: progressEventEmitter,
  FILE_QUEUED_EVENT: FILE_QUEUED_EVENT,
}

function setSocket(_socket){
  socket = _socket
  socket.send(JSON.stringify(progress))
}

function _pubSocket() {
  if(socket) socket.send(JSON.stringify(progress))
}

function updateStatus(fileName) {
  progress.files.push(fileName)
}

progressEventEmitter.on(FILE_QUEUED_EVENT, (fileName) => {
  updateStatus(fileName)
  _pubSocket()
})