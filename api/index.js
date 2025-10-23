// Vercel serverless function entry point
const app = require('../phonebook_backend/index')

// Vercel expects a function that handles (req, res)
module.exports = (req, res) => {
  // Let Express handle the request
  return app(req, res)
}
