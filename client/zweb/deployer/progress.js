let events = require('events')
let progressEventEmitter = new events.EventEmitter()

const FILE_QUEUED_EVENT = 'FileQueuedEvent'

progress = {
  files: ['']
}

module.exports = {
  getProgressForDeployment: getProgressForDeployment,
  progressEventEmitter: progressEventEmitter,
  FILE_QUEUED_EVENT: FILE_QUEUED_EVENT
}

function getProgressForDeployment(){
  return progress
}

progressEventEmitter.on(FILE_QUEUED_EVENT, (fileName) => {
  progress.files.push(fileName)
})