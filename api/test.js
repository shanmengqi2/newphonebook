// Simple test function to verify Vercel is executing Node.js
module.exports = (req, res) => {
  res.json({
    message: 'Test function works!',
    path: req.url,
    method: req.method
  })
}
