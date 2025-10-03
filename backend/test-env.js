require('dotenv').config();

console.log('=== Environment Variables Test ===');
console.log('JWT_SECRET:', process.env.JWT_SECRET);
console.log('JWT_SECRET length:', process.env.JWT_SECRET ? process.env.JWT_SECRET.length : 'undefined');
console.log('JWT_REFRESH_SECRET:', process.env.JWT_REFRESH_SECRET);
console.log('MONGO_URI:', process.env.MONGO_URI ? 'Set' : 'Not set');
console.log('CLIENT_URL:', process.env.CLIENT_URL);
console.log('PORT:', process.env.PORT);
console.log('NODE_ENV:', process.env.NODE_ENV);

// Test JWT token generation
try {
  const jwt = require('jsonwebtoken');
  const testToken = jwt.sign({ id: 'test123' }, process.env.JWT_SECRET, { expiresIn: '1h' });
  console.log('✓ JWT token generation successful');
  console.log('Test token:', testToken.substring(0, 50) + '...');
} catch (error) {
  console.log('✗ JWT token generation failed:', error.message);
}