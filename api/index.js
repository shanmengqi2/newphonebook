// Vercel serverless function entry point
const path = require('path')

// Set NODE_PATH to include phonebook_backend/node_modules
process.env.NODE_PATH = path.join(__dirname, '..', 'phonebook_backend', 'node_modules')
require('module').Module._initPaths()

// Import the Express app
let app
try {
  app = require('../phonebook_backend/index')
  console.log('Successfully loaded Express app')
} catch (error) {
  console.error('Error loading Express app:', error)
  // Return a simple error handler
  module.exports = (req, res) => {
    res.status(500).json({
      error: 'Failed to load application',
      message: error.message,
      stack: error.stack
    })
  }
  return
}

// Export the Express app
module.exports = app
