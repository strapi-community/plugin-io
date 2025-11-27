#!/usr/bin/env node
const io = require('socket.io-client');

const token = process.argv[2];
console.log('🔌 Connecting to http://localhost:1337');
console.log(`🔐 Token: ${token ? 'Yes' : 'No'}\n`);

const socket = io('http://localhost:1337', {
  auth: token ? { token } : undefined,
  transports: ['websocket', 'polling']
});

socket.on('connect', () => {
  console.log('✅ Connected:', socket.id);
  
  // Test room join
  socket.emit('join-room', 'test-room', (response) => {
    console.log('📋 Join room:', response);
  });
  
  // Test get rooms
  setTimeout(() => {
    socket.emit('get-rooms', (response) => {
      console.log('📋 My rooms:', response);
    });
  }, 500);
  
  // Test private message
  setTimeout(() => {
    socket.emit('private-message', {
      to: socket.id,
      message: 'Test message'
    }, (response) => {
      console.log('📨 Private message:', response);
    });
  }, 1000);
  
  // Disconnect after tests
  setTimeout(() => {
    console.log('\n✅ All tests completed');
    socket.disconnect();
    process.exit(0);
  }, 2000);
});

socket.on('private-message', (data) => {
  console.log('📨 Received private message:', data);
});

socket.on('connect_error', (error) => {
  console.error('❌ Connection error:', error.message);
  process.exit(1);
});

// Listen for content-type events
['article', 'post', 'session'].forEach(ct => {
  ['create', 'update', 'delete'].forEach(action => {
    socket.on(`${ct}:${action}`, (data) => {
      console.log(`\n🔔 ${ct}:${action}`, data);
    });
  });
});

console.log('👂 Listening for events...\n');
