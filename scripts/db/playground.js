/*
Use this file to test out interating with the leveldb via the js models
*/

// Initialize the point databse
require('./init')

// now use the db models to check the leveldb database
const File = require('../../db/models/file');

(async() => {
  const allFiles = await File.allBy('ul_status', File.UPLOADING_STATUS_UPLOADED)
  files = allFiles.map((file) => file._attributes)
  console.log(files)

  console.log(`Find file ${files[0].id}: `)
  const fileById = await File.findBy('id', files[0].id)
  console.log(fileById)
})()