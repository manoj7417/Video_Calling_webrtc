#!/usr/bin/env node

/**
 * Cross-Browser WebRTC Test Script
 * 
 * This script tests the WebRTC signaling server for cross-browser compatibility
 * and provides a simple way to verify that the server is working correctly.
 */

import { io } from 'socket.io-client';

// Test configuration
const SERVER_URL = process.env.SERVER_URL || 'http://localhost:8080';
const TEST_USER_ID = 'test-user-' + Math.random().toString(36).substr(2, 9);
const TEST_USER_NAME = 'Test User';

console.log('🧪 Cross-Browser WebRTC Test Script');
console.log('=====================================');
console.log(`Server URL: ${SERVER_URL}`);
console.log(`Test User ID: ${TEST_USER_ID}`);
console.log('');

// Test browser compatibility endpoint
async function testBrowserCompatibility() {
    console.log('🔍 Testing browser compatibility endpoint...');

    try {
        const response = await fetch(`${SERVER_URL}/api/browser/compatibility`);
        const data = await response.json();

        console.log('✅ Browser compatibility endpoint working');
        console.log(`   Browser: ${data.browser}`);
        console.log(`   Version: ${data.version}`);
        console.log(`   WebRTC Compatible: ${data.webrtcCompatible}`);
        console.log(`   Features: ${data.features?.join(', ') || 'None'}`);
        if (data.reason) {
            console.log(`   Reason: ${data.reason}`);
        }
        console.log('');

        return data.webrtcCompatible;
    } catch (error) {
        console.error('❌ Browser compatibility test failed:', error.message);
        return false;
    }
}

// Test health endpoint
async function testHealthEndpoint() {
    console.log('🏥 Testing health endpoint...');

    try {
        const response = await fetch(`${SERVER_URL}/health`);
        const data = await response.json();

        console.log('✅ Health endpoint working');
        console.log(`   Status: ${data.status}`);
        console.log(`   Environment: ${data.environment}`);
        console.log(`   Active Users: ${data.activeUsers}`);
        console.log(`   Active Calls: ${data.activeCalls}`);
        console.log(`   Buffered Offers: ${data.bufferedOffers}`);
        console.log('');

        return true;
    } catch (error) {
        console.error('❌ Health endpoint test failed:', error.message);
        return false;
    }
}

// Test WebRTC status endpoint
async function testWebRTCStatus() {
    console.log('📡 Testing WebRTC status endpoint...');

    try {
        const response = await fetch(`${SERVER_URL}/api/webrtc/status`);
        const data = await response.json();

        console.log('✅ WebRTC status endpoint working');
        console.log(`   Server: ${data.server}`);
        console.log(`   Active Connections: ${data.activeConnections}`);
        console.log(`   Active Users: ${data.activeUsers}`);
        console.log(`   Active Calls: ${data.activeCalls}`);
        console.log(`   Buffered Offers: ${data.bufferedOffers}`);
        console.log('');

        return true;
    } catch (error) {
        console.error('❌ WebRTC status test failed:', error.message);
        return false;
    }
}

// Test Socket.IO connection
function testSocketConnection() {
    return new Promise((resolve) => {
        console.log('🔌 Testing Socket.IO connection...');

        const socket = io(SERVER_URL, {
            transports: ['websocket', 'polling'],
            timeout: 10000
        });

        const timeout = setTimeout(() => {
            console.error('❌ Socket.IO connection timeout');
            socket.disconnect();
            resolve(false);
        }, 10000);

        socket.on('connect', () => {
            clearTimeout(timeout);
            console.log('✅ Socket.IO connection successful');
            console.log(`   Socket ID: ${socket.id}`);
            console.log('');

            // Test user registration
            socket.emit('register', {
                userId: TEST_USER_ID,
                userName: TEST_USER_NAME
            });

            socket.on('registered', (data) => {
                console.log('✅ User registration successful');
                console.log(`   User ID: ${data.userId}`);
                console.log(`   Socket ID: ${data.socketId}`);
                console.log(`   Browser: ${data.browser || 'Unknown'}`);
                console.log(`   Version: ${data.version || 'Unknown'}`);
                console.log(`   WebRTC Compatible: ${data.webrtcCompatible}`);
                console.log('');

                socket.disconnect();
                resolve(true);
            });

            socket.on('connect_error', (error) => {
                clearTimeout(timeout);
                console.error('❌ Socket.IO connection error:', error.message);
                resolve(false);
            });
        });
    });
}

// Test cross-browser signaling
function testCrossBrowserSignaling() {
    return new Promise((resolve) => {
        console.log('🌐 Testing cross-browser signaling...');

        // Create two socket connections to simulate different browsers
        const socket1 = io(SERVER_URL, {
            transports: ['websocket'],
            extraHeaders: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
        });

        const socket2 = io(SERVER_URL, {
            transports: ['websocket'],
            extraHeaders: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0'
            }
        });

        let testCompleted = false;

        const completeTest = (success) => {
            if (!testCompleted) {
                testCompleted = true;
                socket1.disconnect();
                socket2.disconnect();
                resolve(success);
            }
        };

        const timeout = setTimeout(() => {
            console.error('❌ Cross-browser signaling test timeout');
            completeTest(false);
        }, 15000);

        socket1.on('connect', () => {
            console.log('✅ Socket 1 (Chrome) connected');
            socket1.emit('register', {
                userId: 'chrome-user',
                userName: 'Chrome User'
            });
        });

        socket2.on('connect', () => {
            console.log('✅ Socket 2 (Firefox) connected');
            socket2.emit('register', {
                userId: 'firefox-user',
                userName: 'Firefox User'
            });
        });

        socket1.on('registered', () => {
            console.log('✅ Chrome user registered');

            // Wait a bit for both users to register
            setTimeout(() => {
                const callId = 'test-call-' + Date.now();
                console.log(`📞 Initiating test call: ${callId}`);

                socket1.emit('initiateCall', {
                    callId,
                    callerId: 'chrome-user',
                    calleeId: 'firefox-user',
                    callerName: 'Chrome User'
                });
            }, 1000);
        });

        socket2.on('registered', () => {
            console.log('✅ Firefox user registered');
        });

        socket2.on('incomingCall', (data) => {
            console.log('✅ Incoming call received by Firefox user');
            console.log(`   Call ID: ${data.callId}`);
            console.log(`   Caller: ${data.callerName}`);
            console.log(`   Caller Browser: ${data.callerBrowser?.browser || 'Unknown'}`);
            console.log(`   Caller Compatible: ${data.callerCompatible}`);

            // Accept the call
            socket2.emit('acceptCall', { callId: data.callId });
        });

        socket1.on('callAccepted', (data) => {
            console.log('✅ Call accepted by Chrome user');
            console.log(`   Callee Browser: ${data.calleeBrowser?.browser || 'Unknown'}`);
            console.log(`   Callee Compatible: ${data.calleeCompatible}`);

            // End the test call
            setTimeout(() => {
                socket1.emit('endCall', { callId: data.callId });
                console.log('✅ Test call ended');
                clearTimeout(timeout);
                completeTest(true);
            }, 2000);
        });

        socket1.on('connect_error', (error) => {
            console.error('❌ Socket 1 connection error:', error.message);
            clearTimeout(timeout);
            completeTest(false);
        });

        socket2.on('connect_error', (error) => {
            console.error('❌ Socket 2 connection error:', error.message);
            clearTimeout(timeout);
            completeTest(false);
        });
    });
}

// Main test function
async function runTests() {
    console.log('🚀 Starting cross-browser WebRTC tests...\n');

    const results = {
        health: false,
        webrtcStatus: false,
        browserCompatibility: false,
        socketConnection: false,
        crossBrowserSignaling: false
    };

    // Run all tests
    results.health = await testHealthEndpoint();
    results.webrtcStatus = await testWebRTCStatus();
    results.browserCompatibility = await testBrowserCompatibility();
    results.socketConnection = await testSocketConnection();
    results.crossBrowserSignaling = await testCrossBrowserSignaling();

    // Print results summary
    console.log('📊 Test Results Summary');
    console.log('=======================');
    console.log(`Health Endpoint: ${results.health ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`WebRTC Status: ${results.webrtcStatus ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`Browser Compatibility: ${results.browserCompatibility ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`Socket Connection: ${results.socketConnection ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`Cross-Browser Signaling: ${results.crossBrowserSignaling ? '✅ PASS' : '❌ FAIL'}`);
    console.log('');

    const passedTests = Object.values(results).filter(result => result).length;
    const totalTests = Object.keys(results).length;

    console.log(`Overall Result: ${passedTests}/${totalTests} tests passed`);

    if (passedTests === totalTests) {
        console.log('🎉 All tests passed! Your WebRTC server is ready for cross-browser testing.');
        console.log('');
        console.log('📝 Next Steps:');
        console.log('1. Open http://localhost:8080 in different browsers');
        console.log('2. Register users with different names');
        console.log('3. Test video calls between Chrome, Firefox, Safari, and Edge');
        console.log('4. Check the browser compatibility information displayed');
        console.log('5. Verify that calls work across different browser combinations');
    } else {
        console.log('⚠️ Some tests failed. Please check the server configuration.');
        process.exit(1);
    }
}

// Run tests if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    runTests().catch(error => {
        console.error('❌ Test execution failed:', error);
        process.exit(1);
    });
}

export { runTests }; 