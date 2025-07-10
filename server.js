import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import helmet from 'helmet';
import compression from 'compression';

// Load environment variables
dotenv.config();

const app = express();
const server = createServer(app);

// Security middleware with WebRTC-friendly settings
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", "data:", "blob:"],
            mediaSrc: ["'self'", "blob:"],
            connectSrc: ["'self'", "wss:", "ws:", "https:", "http:"],
            frameSrc: ["'self'"],
            objectSrc: ["'none'"],
            upgradeInsecureRequests: []
        }
    },
    crossOriginEmbedderPolicy: false, // Disable for WebRTC
    crossOriginResourcePolicy: { policy: "cross-origin" } // Allow cross-origin for WebRTC
}));

// Compression middleware
app.use(compression());

// Production CORS configuration
const corsOrigins = process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(',').map(origin => origin.trim())
    : ["http://localhost:3000", "http://localhost:5173", "https://upcresources.com"];

console.log('CORS Origins:', corsOrigins);

// Configure CORS for Socket.io with enhanced cross-browser support
const io = new Server(server, {
    cors: {
        origin: corsOrigins,
        methods: ["GET", "POST", "OPTIONS"],
        credentials: true,
        allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"]
    },
    transports: ['websocket', 'polling'],
    allowEIO3: true,
    pingTimeout: 60000,
    pingInterval: 25000,
    upgradeTimeout: 10000,
    maxHttpBufferSize: 1e8 // 100MB for large SDP messages
});

app.use(cors({
    origin: corsOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve static files
app.use(express.static('public'));

// Store active calls and user connections
const activeUsers = new Map(); // userId -> socketId
const activeCalls = new Map(); // callId -> { caller: userId, callee: userId, status: 'pending'|'active'|'ended' }
const socketUsers = new Map(); // socketId -> userId
const browserInfo = new Map(); // socketId -> { browser, version, userAgent }

// Add offer buffer for handling race conditions
const offerBuffer = new Map(); // callId -> { offer, fromSocketId, toSocketId, timestamp }

// Cleanup interval for expired offers (5 minutes)
setInterval(() => {
    const now = Date.now();
    const expiredOffers = [];

    for (const [callId, offerData] of offerBuffer.entries()) {
        if (now - offerData.timestamp > 5 * 60 * 1000) { // 5 minutes
            expiredOffers.push(callId);
        }
    }

    expiredOffers.forEach(callId => {
        offerBuffer.delete(callId);
        console.log(`🧹 Cleaned up expired offer for call: ${callId}`);
    });
}, 60000); // Check every minute

// Browser detection utility
function detectBrowser(userAgent) {
    const ua = userAgent.toLowerCase();

    if (ua.includes('chrome') && !ua.includes('edg')) {
        return { browser: 'chrome', version: extractVersion(ua, 'chrome') };
    } else if (ua.includes('firefox')) {
        return { browser: 'firefox', version: extractVersion(ua, 'firefox') };
    } else if (ua.includes('safari') && !ua.includes('chrome')) {
        return { browser: 'safari', version: extractVersion(ua, 'safari') };
    } else if (ua.includes('edge') || ua.includes('edg')) {
        return { browser: 'edge', version: extractVersion(ua, 'edge') };
    } else {
        return { browser: 'unknown', version: 'unknown' };
    }
}

function extractVersion(ua, browser) {
    const regex = new RegExp(`${browser}[/\\s]([\\d.]+)`);
    const match = ua.match(regex);
    return match ? match[1] : 'unknown';
}

// WebRTC compatibility checker
function getWebRTCCompatibility(browser, version) {
    const compatibility = {
        chrome: { minVersion: '56', features: ['unified-plan', 'rtp-sender', 'rtp-receiver'] },
        firefox: { minVersion: '52', features: ['unified-plan', 'rtp-sender', 'rtp-receiver'] },
        safari: { minVersion: '11', features: ['unified-plan'] },
        edge: { minVersion: '79', features: ['unified-plan', 'rtp-sender', 'rtp-receiver'] }
    };

    const browserCompat = compatibility[browser];
    if (!browserCompat) return { compatible: false, reason: 'Unsupported browser' };

    const versionNum = parseFloat(version);
    const minVersionNum = parseFloat(browserCompat.minVersion);

    return {
        compatible: versionNum >= minVersionNum,
        features: browserCompat.features,
        reason: versionNum < minVersionNum ? `Version ${version} is below minimum ${browserCompat.minVersion}` : null
    };
}

// Basic health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        environment: process.env.NODE_ENV || 'development',
        activeUsers: activeUsers.size,
        activeCalls: activeCalls.size,
        bufferedOffers: offerBuffer.size,
        timestamp: new Date().toISOString()
    });
});

// API status endpoint
app.get('/api/status', (req, res) => {
    res.json({
        server: 'webrtc-signaling-server',
        version: '1.0.0',
        status: 'running',
        environment: process.env.NODE_ENV || 'development',
        uptime: process.uptime(),
        timestamp: new Date().toISOString()
    });
});

// WebRTC signaling endpoint
app.get('/api/webrtc/status', (req, res) => {
    res.json({
        server: 'webrtc-signaling-server',
        activeConnections: io.engine.clientsCount,
        activeUsers: activeUsers.size,
        activeCalls: activeCalls.size,
        bufferedOffers: offerBuffer.size
    });
});

// Browser compatibility endpoint
app.get('/api/browser/compatibility', (req, res) => {
    const userAgent = req.headers['user-agent'];
    const browserInfo = detectBrowser(userAgent);
    const compatibility = getWebRTCCompatibility(browserInfo.browser, browserInfo.version);

    res.json({
        browser: browserInfo.browser,
        version: browserInfo.version,
        userAgent: userAgent,
        webrtcCompatible: compatibility.compatible,
        features: compatibility.features,
        reason: compatibility.reason
    });
});

io.on('connection', (socket) => {
    console.log(`🔌 Socket connected: ${socket.id}`);

    // Detect browser on connection
    const userAgent = socket.handshake.headers['user-agent'];
    const browser = detectBrowser(userAgent);
    browserInfo.set(socket.id, browser);

    console.log(`🌐 Browser detected: ${browser.browser} ${browser.version}`);

    // User authentication and registration
    socket.on('register', (userData) => {
        const { userId, userName } = userData;

        // Remove user from any previous socket connection
        for (const [socketId, oldUserId] of socketUsers.entries()) {
            if (oldUserId === userId && socketId !== socket.id) {
                console.log(`🔄 User ${userId} reconnecting from ${socketId} to ${socket.id}`);
                socketUsers.delete(socketId);
                activeUsers.delete(userId);
                browserInfo.delete(socketId);
                break;
            }
        }

        // Register new connection
        activeUsers.set(userId, socket.id);
        socketUsers.set(socket.id, userId);

        console.log(`✅ User registered: ${userName} (${userId}) on socket ${socket.id} using ${browser.browser} ${browser.version}`);

        // Check WebRTC compatibility
        const compatibility = getWebRTCCompatibility(browser.browser, browser.version);

        // Notify user of successful registration with browser info
        socket.emit('registered', {
            userId,
            socketId: socket.id,
            browser: browser.browser,
            version: browser.version,
            webrtcCompatible: compatibility.compatible,
            features: compatibility.features,
            reason: compatibility.reason
        });

        // Send list of online users (optional)
        const onlineUsers = Array.from(activeUsers.keys());
        socket.emit('onlineUsers', onlineUsers);

        // Broadcast user status change
        socket.broadcast.emit('userStatusChange', { userId, isOnline: true });
    });

    // Initiate a video call
    socket.on('initiateCall', (data) => {
        const { callId, callerId, calleeId, callerName } = data;
        const calleeSocketId = activeUsers.get(calleeId);

        console.log(`📞 Call initiated: ${callerId} calling ${calleeId} (Call ID: ${callId})`);

        if (!calleeSocketId) {
            socket.emit('callError', {
                error: 'User is not online',
                callId,
                code: 'USER_OFFLINE'
            });
            return;
        }

        // Get browser compatibility for both users
        const callerBrowser = browserInfo.get(socket.id);
        const calleeBrowser = browserInfo.get(calleeSocketId);

        const callerCompat = getWebRTCCompatibility(callerBrowser.browser, callerBrowser.version);
        const calleeCompat = getWebRTCCompatibility(calleeBrowser.browser, calleeBrowser.version);

        // Store call information with browser compatibility
        activeCalls.set(callId, {
            caller: callerId,
            callee: calleeId,
            status: 'pending',
            callerSocketId: socket.id,
            calleeSocketId: calleeSocketId,
            callerBrowser: callerBrowser,
            calleeBrowser: calleeBrowser,
            callerCompatible: callerCompat.compatible,
            calleeCompatible: calleeCompat.compatible,
            createdAt: Date.now()
        });

        // Send call invitation to callee with browser compatibility info
        io.to(calleeSocketId).emit('incomingCall', {
            callId,
            callerId,
            callerName,
            callerSocketId: socket.id,
            callerBrowser: callerBrowser,
            callerCompatible: callerCompat.compatible
        });

        console.log(`📡 Call invitation sent to ${calleeId} (${calleeBrowser.browser} ${calleeBrowser.version})`);
    });

    // Accept a call
    socket.on('acceptCall', (data) => {
        const { callId } = data;
        const call = activeCalls.get(callId);

        if (!call) {
            socket.emit('callError', {
                error: 'Call not found',
                callId,
                code: 'CALL_NOT_FOUND'
            });
            return;
        }

        // Update call status
        call.status = 'active';
        activeCalls.set(callId, call);

        console.log(`✅ Call accepted: ${callId}`);

        // Check if there's a buffered offer for this call
        const bufferedOffer = offerBuffer.get(callId);
        if (bufferedOffer) {
            console.log(`📦 Delivering buffered offer for call: ${callId}`);
            socket.emit('offer', {
                callId,
                offer: bufferedOffer.offer
            });
            offerBuffer.delete(callId);
        }

        // Notify both parties that call is accepted with browser compatibility info
        io.to(call.callerSocketId).emit('callAccepted', {
            callId,
            calleeBrowser: call.calleeBrowser,
            calleeCompatible: call.calleeCompatible
        });
        io.to(call.calleeSocketId).emit('callAccepted', {
            callId,
            callerBrowser: call.callerBrowser,
            callerCompatible: call.callerCompatible
        });
    });

    // Reject a call
    socket.on('rejectCall', (data) => {
        const { callId } = data;
        const call = activeCalls.get(callId);

        if (!call) {
            socket.emit('callError', {
                error: 'Call not found',
                callId,
                code: 'CALL_NOT_FOUND'
            });
            return;
        }

        console.log(`❌ Call rejected: ${callId}`);

        // Notify caller that call was rejected
        io.to(call.callerSocketId).emit('callRejected', { callId });

        // Clean up call data
        activeCalls.delete(callId);
        offerBuffer.delete(callId);
    });

    // End a call
    socket.on('endCall', (data) => {
        const { callId } = data;
        const call = activeCalls.get(callId);

        if (!call) {
            return; // Call might already be ended
        }

        console.log(`📴 Call ended: ${callId}`);

        // Notify both parties that call ended
        io.to(call.callerSocketId).emit('callEnded', { callId });
        io.to(call.calleeSocketId).emit('callEnded', { callId });

        // Clean up call data
        activeCalls.delete(callId);
        offerBuffer.delete(callId);
    });

    // WebRTC signaling: Send offer
    socket.on('offer', (data) => {
        const { callId, offer } = data;
        const call = activeCalls.get(callId);

        if (!call) {
            console.log(`⚠️ Offer received for non-existent call: ${callId}`);
            return;
        }

        const targetSocketId = socket.id === call.callerSocketId
            ? call.calleeSocketId
            : call.callerSocketId;

        console.log(`📤 Sending offer for call: ${callId}`);

        // Check if target is ready to receive offer
        const targetSocket = io.sockets.sockets.get(targetSocketId);
        if (targetSocket && targetSocket.connected) {
            io.to(targetSocketId).emit('offer', { callId, offer });
            console.log(`✅ Offer delivered to ${targetSocketId}`);
        } else {
            // Buffer the offer if target is not ready
            offerBuffer.set(callId, {
                offer,
                fromSocketId: socket.id,
                toSocketId: targetSocketId,
                timestamp: Date.now()
            });
            console.log(`📦 Offer buffered for call: ${callId}`);
        }
    });

    // WebRTC signaling: Send answer
    socket.on('answer', (data) => {
        const { callId, answer } = data;
        const call = activeCalls.get(callId);

        if (!call) {
            console.log(`⚠️ Answer received for non-existent call: ${callId}`);
            return;
        }

        const targetSocketId = socket.id === call.callerSocketId
            ? call.calleeSocketId
            : call.callerSocketId;

        console.log(`📤 Sending answer for call: ${callId}`);
        io.to(targetSocketId).emit('answer', { callId, answer });
    });

    // WebRTC signaling: Send ICE candidate
    socket.on('iceCandidate', (data) => {
        const { callId, candidate } = data;
        const call = activeCalls.get(callId);

        if (!call) {
            console.log(`⚠️ ICE candidate received for non-existent call: ${callId}`);
            return;
        }

        const targetSocketId = socket.id === call.callerSocketId
            ? call.calleeSocketId
            : call.callerSocketId;

        console.log(`🧊 Sending ICE candidate for call: ${callId}`);
        io.to(targetSocketId).emit('iceCandidate', { callId, candidate });
    });

    // Screen sharing status
    socket.on('screenShareStatus', (data) => {
        const { callId, isSharing } = data;
        const call = activeCalls.get(callId);

        if (!call) {
            return;
        }

        const targetSocketId = socket.id === call.callerSocketId
            ? call.calleeSocketId
            : call.callerSocketId;

        console.log(`🖥️ Screen share status for call: ${callId} - ${isSharing ? 'sharing' : 'stopped'}`);
        io.to(targetSocketId).emit('screenShareStatus', { callId, isSharing });
    });

    // Request offer (for reconnection scenarios)
    socket.on('requestOffer', (data) => {
        const { callId, targetUserId } = data;
        const call = activeCalls.get(callId);

        if (!call) {
            socket.emit('callError', {
                error: 'Call not found',
                callId,
                code: 'CALL_NOT_FOUND'
            });
            return;
        }

        const targetSocketId = activeUsers.get(targetUserId);
        if (targetSocketId) {
            console.log(`🔄 Requesting offer for call: ${callId}`);
            io.to(targetSocketId).emit('requestOffer', { callId, targetUserId: socketUsers.get(socket.id) });
        }
    });

    // Handle disconnection
    socket.on('disconnect', (reason) => {
        const userId = socketUsers.get(socket.id);

        if (userId) {
            console.log(`🔌 User ${userId} disconnected: ${reason}`);

            // Remove user from active users
            activeUsers.delete(userId);
            socketUsers.delete(socket.id);
            browserInfo.delete(socket.id);

            // End any active calls for this user
            for (const [callId, call] of activeCalls.entries()) {
                if (call.caller === userId || call.callee === userId) {
                    console.log(`📴 Ending call ${callId} due to user disconnect`);

                    const otherSocketId = call.caller === userId
                        ? call.calleeSocketId
                        : call.callerSocketId;

                    if (otherSocketId) {
                        io.to(otherSocketId).emit('callEnded', { callId });
                    }

                    activeCalls.delete(callId);
                    offerBuffer.delete(callId);
                }
            }

            // Broadcast user status change
            socket.broadcast.emit('userStatusChange', { userId, isOnline: false });
        }

        console.log(`🔌 Socket ${socket.id} disconnected: ${reason}`);
    });
});

// Error handling for uncaught exceptions
process.on('uncaughtException', (error) => {
    console.error('❌ Uncaught Exception:', error);
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('🛑 SIGTERM received, shutting down gracefully');
    server.close(() => {
        console.log('✅ Server closed');
        process.exit(0);
    });
});

process.on('SIGINT', () => {
    console.log('🛑 SIGINT received, shutting down gracefully');
    server.close(() => {
        console.log('✅ Server closed');
        process.exit(0);
    });
});

const PORT = process.env.PORT || 8080;
const HOST = process.env.HOST || '0.0.0.0';

server.listen(PORT, HOST, () => {
    console.log(`🚀 WebRTC Signaling Server running on ${HOST}:${PORT}`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🔗 CORS Origins: ${corsOrigins.join(', ')}`);
    console.log(`🌐 Cross-browser WebRTC compatibility enabled`);
}); 