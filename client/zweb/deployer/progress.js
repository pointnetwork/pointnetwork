let events = require('events')
let progressEventEmitter = new events.EventEmitter()

const FILE_QUEUED_EVENT = 'FileQueuedEvent'

progress = {
  deployment_id: '945cef50-06ee-4767-b947-45a033ff5c56',
  files: []
}

module.exports = {
  getProgressForDeployment: getProgressForDeployment,
  progressEventEmitter: progressEventEmitter,
  FILE_QUEUED_EVENT: FILE_QUEUED_EVENT
}

function getProgressForDeployment(id){
  return progress
}

progressEventEmitter.on(FILE_QUEUED_EVENT, (fileName) => {
  progress.files.push(fileName)
})