/**
 * Cross-Browser WebRTC Client Implementation
 * Handles compatibility issues between Chrome, Firefox, Safari, and Edge
 */

class WebRTCClient {
    constructor(signalingServerUrl) {
        this.signalingServerUrl = signalingServerUrl;
        this.socket = null;
        this.localStream = null;
        this.remoteStream = null;
        this.peerConnection = null;
        this.currentCallId = null;
        this.isCaller = false;
        this.userId = null;
        this.userName = null;

        // Browser detection
        this.browser = this.detectBrowser();
        this.isChrome = this.browser === 'chrome';
        this.isFirefox = this.browser === 'firefox';
        this.isSafari = this.browser === 'safari';
        this.isEdge = this.browser === 'edge';

        // WebRTC configuration for cross-browser compatibility
        this.rtcConfig = {
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:stun1.l.google.com:19302' },
                { urls: 'stun:stun2.l.google.com:19302' },
                { urls: 'stun:stun3.l.google.com:19302' },
                { urls: 'stun:stun4.l.google.com:19302' }
            ],
            iceCandidatePoolSize: 10
        };

        // Media constraints optimized for cross-browser compatibility
        this.mediaConstraints = {
            audio: {
                echoCancellation: true,
                noiseSuppression: true,
                autoGainControl: true,
                sampleRate: 48000
            },
            video: {
                width: { ideal: 1280, max: 1920 },
                height: { ideal: 720, max: 1080 },
                frameRate: { ideal: 30, max: 60 }
            }
        };

        // Safari-specific constraints
        if (this.isSafari) {
            this.mediaConstraints.video = {
                width: { ideal: 1280 },
                height: { ideal: 720 },
                frameRate: { ideal: 30 }
            };
        }

        // Firefox-specific constraints
        if (this.isFirefox) {
            this.mediaConstraints.audio = {
                echoCancellation: true,
                noiseSuppression: true,
                autoGainControl: true
            };
        }

        this.setupEventHandlers();
    }

    detectBrowser() {
        const userAgent = navigator.userAgent.toLowerCase();

        if (userAgent.includes('chrome') && !userAgent.includes('edg')) {
            return 'chrome';
        } else if (userAgent.includes('firefox')) {
            return 'firefox';
        } else if (userAgent.includes('safari') && !userAgent.includes('chrome')) {
            return 'safari';
        } else if (userAgent.includes('edg')) {
            return 'edge';
        } else {
            return 'unknown';
        }
    }

    setupEventHandlers() {
        // Callback handlers
        this.onCallIncoming = null;
        this.onCallAccepted = null;
        this.onCallRejected = null;
        this.onCallEnded = null;
        this.onCallError = null;
        this.onLocalStream = null;
        this.onRemoteStream = null;
        this.onConnectionStateChange = null;
        this.onIceConnectionStateChange = null;
    }

    async connect(userId, userName) {
        try {
            this.userId = userId;
            this.userName = userName;

            // Connect to signaling server with cross-browser compatible options
            this.socket = io(this.signalingServerUrl, {
                transports: ['websocket', 'polling'],
                timeout: 20000,
                forceNew: true,
                reconnection: true,
                reconnectionAttempts: 5,
                reconnectionDelay: 1000
            });

            this.socket.on('connect', () => {
                console.log('Connected to signaling server');
                this.registerUser();
            });

            this.socket.on('disconnect', (reason) => {
                console.log('Disconnected from signaling server:', reason);
            });

            this.socket.on('connect_error', (error) => {
                console.error('Connection error:', error);
            });

            // Handle signaling events
            this.socket.on('registered', this.handleRegistered.bind(this));
            this.socket.on('incomingCall', this.handleIncomingCall.bind(this));
            this.socket.on('callAccepted', this.handleCallAccepted.bind(this));
            this.socket.on('callRejected', this.handleCallRejected.bind(this));
            this.socket.on('callEnded', this.handleCallEnded.bind(this));
            this.socket.on('callError', this.handleCallError.bind(this));
            this.socket.on('offer', this.handleOffer.bind(this));
            this.socket.on('answer', this.handleAnswer.bind(this));
            this.socket.on('iceCandidate', this.handleIceCandidate.bind(this));
            this.socket.on('requestOffer', this.handleRequestOffer.bind(this));

        } catch (error) {
            console.error('Failed to connect:', error);
            throw error;
        }
    }

    registerUser() {
        this.socket.emit('register', {
            userId: this.userId,
            userName: this.userName
        });
    }

    handleRegistered(data) {
        console.log('User registered:', data);
    }

    async initiateCall(calleeId, calleeName) {
        try {
            this.isCaller = true;
            this.currentCallId = this.generateCallId();

            console.log(`Initiating call to ${calleeName} (${calleeId})`);

            this.socket.emit('initiateCall', {
                callId: this.currentCallId,
                callerId: this.userId,
                calleeId: calleeId,
                callerName: this.userName
            });

            // Get local media stream
            await this.getLocalMediaStream();

        } catch (error) {
            console.error('Failed to initiate call:', error);
            throw error;
        }
    }

    async getLocalMediaStream() {
        try {
            // Try with advanced constraints first
            this.localStream = await navigator.mediaDevices.getUserMedia(this.mediaConstraints);

            // If successful, notify callback
            if (this.onLocalStream) {
                this.onLocalStream(this.localStream);
            }

            return this.localStream;

        } catch (error) {
            console.warn('Advanced constraints failed, trying basic constraints:', error);

            // Fallback to basic constraints for better compatibility
            const basicConstraints = {
                audio: true,
                video: true
            };

            try {
                this.localStream = await navigator.mediaDevices.getUserMedia(basicConstraints);

                if (this.onLocalStream) {
                    this.onLocalStream(this.localStream);
                }

                return this.localStream;

            } catch (fallbackError) {
                console.error('Failed to get media stream with basic constraints:', fallbackError);
                throw fallbackError;
            }
        }
    }

    handleIncomingCall(data) {
        console.log('Incoming call from:', data.callerName);

        if (this.onCallIncoming) {
            this.onCallIncoming(data);
        }
    }

    async acceptCall(callId) {
        try {
            this.currentCallId = callId;
            this.isCaller = false;

            console.log('Accepting call:', callId);

            // Get local media stream first
            await this.getLocalMediaStream();

            // Accept the call
            this.socket.emit('acceptCall', { callId });

        } catch (error) {
            console.error('Failed to accept call:', error);
            throw error;
        }
    }

    rejectCall(callId) {
        console.log('Rejecting call:', callId);
        this.socket.emit('rejectCall', { callId });
    }

    handleCallAccepted(data) {
        console.log('Call accepted:', data.callId);

        if (this.onCallAccepted) {
            this.onCallAccepted(data);
        }

        // Create peer connection if caller
        if (this.isCaller) {
            this.createPeerConnection();
            this.createOffer();
        }
    }

    handleCallRejected(data) {
        console.log('Call rejected:', data.callId);

        if (this.onCallRejected) {
            this.onCallRejected(data);
        }

        this.cleanup();
    }

    handleCallEnded(data) {
        console.log('Call ended:', data.callId);

        if (this.onCallEnded) {
            this.onCallEnded(data);
        }

        this.cleanup();
    }

    handleCallError(data) {
        console.error('Call error:', data);

        if (this.onCallError) {
            this.onCallError(data);
        }
    }

    createPeerConnection() {
        try {
            // Create RTCPeerConnection with cross-browser compatible configuration
            this.peerConnection = new RTCPeerConnection(this.rtcConfig);

            // Add local stream tracks
            if (this.localStream) {
                this.localStream.getTracks().forEach(track => {
                    this.peerConnection.addTrack(track, this.localStream);
                });
            }

            // Handle remote stream
            this.peerConnection.ontrack = (event) => {
                console.log('Received remote stream');
                this.remoteStream = event.streams[0];

                if (this.onRemoteStream) {
                    this.onRemoteStream(this.remoteStream);
                }
            };

            // Handle connection state changes
            this.peerConnection.onconnectionstatechange = () => {
                console.log('Connection state:', this.peerConnection.connectionState);

                if (this.onConnectionStateChange) {
                    this.onConnectionStateChange(this.peerConnection.connectionState);
                }
            };

            // Handle ICE connection state changes
            this.peerConnection.oniceconnectionstatechange = () => {
                console.log('ICE connection state:', this.peerConnection.iceConnectionState);

                if (this.onIceConnectionStateChange) {
                    this.onIceConnectionStateChange(this.peerConnection.iceConnectionState);
                }
            };

            // Handle ICE candidates with cross-browser compatibility
            this.peerConnection.onicecandidate = (event) => {
                if (event.candidate) {
                    console.log('Sending ICE candidate');

                    // Add delay for Safari compatibility
                    setTimeout(() => {
                        this.socket.emit('iceCandidate', {
                            callId: this.currentCallId,
                            candidate: event.candidate
                        });
                    }, this.isSafari ? 100 : 0);
                }
            };

            // Handle ICE gathering state
            this.peerConnection.onicegatheringstatechange = () => {
                console.log('ICE gathering state:', this.peerConnection.iceGatheringState);
            };

        } catch (error) {
            console.error('Failed to create peer connection:', error);
            throw error;
        }
    }

    async createOffer() {
        try {
            console.log('Creating offer...');

            // Create offer with cross-browser compatible options
            const offerOptions = {
                offerToReceiveAudio: true,
                offerToReceiveVideo: true,
                voiceActivityDetection: true
            };

            const offer = await this.peerConnection.createOffer(offerOptions);

            // Set local description
            await this.peerConnection.setLocalDescription(offer);

            // Wait for ICE gathering to complete (important for Safari)
            if (this.isSafari) {
                await this.waitForIceGathering();
            }

            console.log('Sending offer');
            this.socket.emit('offer', {
                callId: this.currentCallId,
                offer: this.peerConnection.localDescription
            });

        } catch (error) {
            console.error('Failed to create offer:', error);
            throw error;
        }
    }

    async handleOffer(data) {
        try {
            console.log('Received offer');

            // Create peer connection if not already created
            if (!this.peerConnection) {
                this.createPeerConnection();
            }

            // Set remote description
            await this.peerConnection.setRemoteDescription(new RTCSessionDescription(data.offer));

            // Create answer
            const answer = await this.peerConnection.createAnswer();
            await this.peerConnection.setLocalDescription(answer);

            // Wait for ICE gathering to complete (important for Safari)
            if (this.isSafari) {
                await this.waitForIceGathering();
            }

            console.log('Sending answer');
            this.socket.emit('answer', {
                callId: this.currentCallId,
                answer: this.peerConnection.localDescription
            });

        } catch (error) {
            console.error('Failed to handle offer:', error);
            throw error;
        }
    }

    async handleAnswer(data) {
        try {
            console.log('Received answer');

            // Set remote description
            await this.peerConnection.setRemoteDescription(new RTCSessionDescription(data.answer));

        } catch (error) {
            console.error('Failed to handle answer:', error);
            throw error;
        }
    }

    async handleIceCandidate(data) {
        try {
            console.log('Received ICE candidate');

            if (this.peerConnection && this.peerConnection.remoteDescription) {
                await this.peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate));
            } else {
                // Store candidate for later if remote description not set yet
                if (!this.pendingCandidates) {
                    this.pendingCandidates = [];
                }
                this.pendingCandidates.push(data.candidate);
            }

        } catch (error) {
            console.error('Failed to handle ICE candidate:', error);
        }
    }

    async handleRequestOffer(data) {
        try {
            console.log('Request for offer received');

            if (this.isCaller && this.peerConnection) {
                await this.createOffer();
            }

        } catch (error) {
            console.error('Failed to handle request offer:', error);
        }
    }

    async waitForIceGathering() {
        return new Promise((resolve) => {
            if (this.peerConnection.iceGatheringState === 'complete') {
                resolve();
            } else {
                const checkState = () => {
                    if (this.peerConnection.iceGatheringState === 'complete') {
                        resolve();
                    } else {
                        setTimeout(checkState, 100);
                    }
                };
                checkState();
            }
        });
    }

    endCall() {
        if (this.currentCallId) {
            console.log('Ending call:', this.currentCallId);
            this.socket.emit('endCall', { callId: this.currentCallId });
        }
        this.cleanup();
    }

    cleanup() {
        // Stop local stream tracks
        if (this.localStream) {
            this.localStream.getTracks().forEach(track => track.stop());
            this.localStream = null;
        }

        // Close peer connection
        if (this.peerConnection) {
            this.peerConnection.close();
            this.peerConnection = null;
        }

        // Reset state
        this.currentCallId = null;
        this.isCaller = false;
        this.remoteStream = null;
        this.pendingCandidates = null;

        console.log('WebRTC cleanup completed');
    }

    disconnect() {
        this.cleanup();

        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
        }
    }

    generateCallId() {
        return 'call_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    // Utility methods for debugging
    getConnectionStats() {
        if (this.peerConnection) {
            return {
                connectionState: this.peerConnection.connectionState,
                iceConnectionState: this.peerConnection.iceConnectionState,
                iceGatheringState: this.peerConnection.iceGatheringState,
                signalingState: this.peerConnection.signalingState
            };
        }
        return null;
    }

    getBrowserInfo() {
        return {
            browser: this.browser,
            userAgent: navigator.userAgent,
            webRTCSupported: !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia),
            rtcPeerConnectionSupported: !!(window.RTCPeerConnection || window.webkitRTCPeerConnection)
        };
    }
}

// Export for use in different module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = WebRTCClient;
} else if (typeof window !== 'undefined') {
    window.WebRTCClient = WebRTCClient;
} 