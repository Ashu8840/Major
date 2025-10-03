#!/usr/bin/env node

require('dotenv').config();

console.log('=== Backend API Test ===');
console.log('Environment Variables:');
console.log('JWT_SECRET:', process.env.JWT_SECRET ? '✓ Set' : '✗ Missing');
console.log('MONGO_URI:', process.env.MONGO_URI ? '✓ Set' : '✗ Missing');
console.log('PORT:', process.env.PORT || 'Using default');

// Test JWT token verification
if (process.env.JWT_SECRET) {
  try {
    const jwt = require('jsonwebtoken');
    const testToken = jwt.sign({ id: 'test123' }, process.env.JWT_SECRET, { expiresIn: '1h' });
    const decoded = jwt.verify(testToken, process.env.JWT_SECRET);
    console.log('JWT Test: ✓ Working');
  } catch (error) {
    console.log('JWT Test: ✗ Failed -', error.message);
  }
}

// Check if server can start
const express = require('express');
const app = express();

app.get('/test', (req, res) => {
  res.json({ 
    message: 'Backend is working!', 
    timestamp: new Date(),
    env: process.env.NODE_ENV 
  });
});

const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => {
  console.log(`✓ Test server running on port ${PORT}`);
  console.log(`✓ Visit: http://localhost:${PORT}/test`);
  
  // Auto-close after 5 seconds
  setTimeout(() => {
    server.close(() => {
      console.log('Test completed');
      process.exit(0);
    });
  }, 5000);
});

server.on('error', (error) => {
  console.log('✗ Server error:', error.message);
  process.exit(1);
});