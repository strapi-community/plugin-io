#!/usr/bin/env node
/**
 * Test Client for Entity-Specific Subscriptions
 * Tests the new entity subscription feature
 * 
 * Usage:
 *   node test-entity-subscriptions.js
 */

const { io } = require('socket.io-client');

const SERVER_URL = 'http://localhost:1337';
const JWT_TOKEN = process.env.JWT_TOKEN || null;

console.log('🧪 Entity Subscription Test Client\n');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

// Connect to server
const socket = io(SERVER_URL, {
  auth: JWT_TOKEN ? { token: JWT_TOKEN } : undefined,
  transports: ['websocket', 'polling']
});

socket.on('connect', () => {
  console.log('✅ Connected to server');
  console.log(`   Socket ID: ${socket.id}\n`);
  
  runTests();
});

socket.on('connect_error', (error) => {
  console.error('❌ Connection error:', error.message);
  process.exit(1);
});

socket.on('disconnect', (reason) => {
  console.log(`\n🔴 Disconnected: ${reason}`);
});

// Test entity events
socket.on('session:create', (data) => {
  console.log('\n📢 Received session:create event:');
  console.log(JSON.stringify(data, null, 2));
});

socket.on('session:update', (data) => {
  console.log('\n📢 Received session:update event:');
  console.log(JSON.stringify(data, null, 2));
});

socket.on('session:delete', (data) => {
  console.log('\n📢 Received session:delete event:');
  console.log(JSON.stringify(data, null, 2));
});

async function runTests() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log('📝 Running Entity Subscription Tests\n');
  
  // Test 0: Subscribe to ALL session events (for create events)
  console.log('Test 0: Subscribe to ALL session events (to catch creates)');
  socket.on('session:create', (data) => {
    console.log('\n🎉 Received session:create event!');
    console.log(JSON.stringify(data, null, 2));
  });
  console.log('✅ Listening for session:create events\n');
  
  await sleep(500);
  
  // Test 1: Subscribe to specific session
  console.log('Test 1: Subscribe to session with ID 94');
  socket.emit('subscribe-entity', { uid: 'api::session.session', id: 94 }, (response) => {
    if (response.success) {
      console.log(`✅ Successfully subscribed to: ${response.room}`);
    } else {
      console.log(`❌ Subscription failed: ${response.error}`);
    }
  });
  
  await sleep(1000);
  
  // Test 2: Subscribe to another session
  console.log('\nTest 2: Subscribe to session with ID 95');
  socket.emit('subscribe-entity', { uid: 'api::session.session', id: 95 }, (response) => {
    if (response.success) {
      console.log(`✅ Successfully subscribed to: ${response.room}`);
    } else {
      console.log(`❌ Subscription failed: ${response.error}`);
    }
  });
  
  await sleep(1000);
  
  // Test 3: Get current subscriptions
  console.log('\nTest 3: Get all entity subscriptions');
  socket.emit('get-entity-subscriptions', (response) => {
    if (response.success) {
      console.log(`✅ Current subscriptions (${response.subscriptions.length}):`);
      response.subscriptions.forEach(sub => {
        console.log(`   - ${sub.room} (uid: ${sub.uid}, id: ${sub.id})`);
      });
    } else {
      console.log(`❌ Failed to get subscriptions: ${response.error}`);
    }
  });
  
  await sleep(1000);
  
  // Test 4: Invalid subscription (should fail)
  console.log('\nTest 4: Try invalid subscription (should fail)');
  socket.emit('subscribe-entity', { uid: 'invalid::format', id: 999 }, (response) => {
    if (response.success) {
      console.log(`⚠️  Unexpected success: ${response.room}`);
    } else {
      console.log(`✅ Correctly rejected: ${response.error}`);
    }
  });
  
  await sleep(1000);
  
  // Test 5: Unsubscribe
  console.log('\nTest 5: Unsubscribe from session 94');
  socket.emit('unsubscribe-entity', { uid: 'api::session.session', id: 94 }, (response) => {
    if (response.success) {
      console.log(`✅ Successfully unsubscribed from: ${response.room}`);
    } else {
      console.log(`❌ Unsubscribe failed: ${response.error}`);
    }
  });
  
  await sleep(1000);
  
  // Test 6: Verify unsubscribe
  console.log('\nTest 6: Verify subscriptions after unsubscribe');
  socket.emit('get-entity-subscriptions', (response) => {
    if (response.success) {
      console.log(`✅ Remaining subscriptions (${response.subscriptions.length}):`);
      if (response.subscriptions.length === 0) {
        console.log('   (none)');
      } else {
        response.subscriptions.forEach(sub => {
          console.log(`   - ${sub.room} (uid: ${sub.uid}, id: ${sub.id})`);
        });
      }
    }
  });
  
  await sleep(2000);
  
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('\n✅ Tests completed!');
  console.log('\n📝 Next steps:');
  console.log('   1. 🆕 CREATE a new session → Will trigger session:create event');
  console.log('   2. ✏️  UPDATE session with ID 94 or 95 → Will trigger session:update event');
  console.log('   3. 🗑️  DELETE a session → Will trigger session:delete event');
  console.log('   4. Press Ctrl+C to exit\n');
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Keep process alive
process.on('SIGINT', () => {
  console.log('\n\n👋 Closing connection...');
  socket.disconnect();
  process.exit(0);
});

