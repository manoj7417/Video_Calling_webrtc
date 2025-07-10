/**
 * Cross-Browser WebRTC Compatibility Test Script
 * Run this in different browsers to test WebRTC support and compatibility
 */

class WebRTCTest {
    constructor() {
        this.results = {
            browser: this.detectBrowser(),
            webRTCSupported: false,
            getUserMediaSupported: false,
            peerConnectionSupported: false,
            mediaDevicesSupported: false,
            permissionsSupported: false,
            iceServers: [],
            constraints: {},
            errors: []
        };
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

    async runTests() {
        console.log('🔍 Starting WebRTC compatibility tests...');
        console.log(`🌐 Browser: ${this.results.browser}`);
        console.log(`📱 User Agent: ${navigator.userAgent}`);

        // Test 1: Basic WebRTC support
        await this.testBasicSupport();

        // Test 2: Media devices support
        await this.testMediaDevices();

        // Test 3: Peer connection support
        await this.testPeerConnection();

        // Test 4: Permissions API
        await this.testPermissions();

        // Test 5: Media constraints
        await this.testMediaConstraints();

        // Test 6: ICE servers
        await this.testICEServers();

        // Display results
        this.displayResults();

        return this.results;
    }

    async testBasicSupport() {
        console.log('\n📋 Test 1: Basic WebRTC Support');

        // Check for WebRTC objects
        const hasRTCPeerConnection = !!(window.RTCPeerConnection || window.webkitRTCPeerConnection);
        const hasGetUserMedia = !!(navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.msGetUserMedia);
        const hasMediaDevices = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);

        this.results.webRTCSupported = hasRTCPeerConnection && (hasGetUserMedia || hasMediaDevices);
        this.results.getUserMediaSupported = hasGetUserMedia || hasMediaDevices;
        this.results.peerConnectionSupported = hasRTCPeerConnection;
        this.results.mediaDevicesSupported = hasMediaDevices;

        console.log(`✅ RTCPeerConnection: ${hasRTCPeerConnection}`);
        console.log(`✅ getUserMedia: ${hasGetUserMedia || hasMediaDevices}`);
        console.log(`✅ mediaDevices: ${hasMediaDevices}`);
    }

    async testMediaDevices() {
        console.log('\n📋 Test 2: Media Devices Support');

        if (!navigator.mediaDevices) {
            console.log('❌ mediaDevices not supported');
            this.results.errors.push('mediaDevices not supported');
            return;
        }

        try {
            // Test enumerateDevices
            const devices = await navigator.mediaDevices.enumerateDevices();
            const videoDevices = devices.filter(device => device.kind === 'videoinput');
            const audioDevices = devices.filter(device => device.kind === 'audioinput');

            console.log(`✅ Video devices found: ${videoDevices.length}`);
            console.log(`✅ Audio devices found: ${audioDevices.length}`);

            if (videoDevices.length === 0) {
                this.results.errors.push('No video devices found');
            }
            if (audioDevices.length === 0) {
                this.results.errors.push('No audio devices found');
            }

        } catch (error) {
            console.log(`❌ Error enumerating devices: ${error.message}`);
            this.results.errors.push(`Device enumeration failed: ${error.message}`);
        }
    }

    async testPeerConnection() {
        console.log('\n📋 Test 3: Peer Connection Support');

        try {
            const config = {
                iceServers: [
                    { urls: 'stun:stun.l.google.com:19302' }
                ]
            };

            const pc = new RTCPeerConnection(config);

            // Test basic methods
            const offer = await pc.createOffer();
            console.log('✅ createOffer() works');

            await pc.setLocalDescription(offer);
            console.log('✅ setLocalDescription() works');

            await pc.setRemoteDescription(offer);
            console.log('✅ setRemoteDescription() works');

            pc.close();
            console.log('✅ PeerConnection creation and basic operations work');

        } catch (error) {
            console.log(`❌ PeerConnection test failed: ${error.message}`);
            this.results.errors.push(`PeerConnection failed: ${error.message}`);
        }
    }

    async testPermissions() {
        console.log('\n📋 Test 4: Permissions API');

        if (!navigator.permissions) {
            console.log('❌ Permissions API not supported');
            this.results.errors.push('Permissions API not supported');
            return;
        }

        try {
            // Test camera permission
            const cameraPermission = await navigator.permissions.query({ name: 'camera' });
            console.log(`✅ Camera permission state: ${cameraPermission.state}`);

            // Test microphone permission
            const micPermission = await navigator.permissions.query({ name: 'microphone' });
            console.log(`✅ Microphone permission state: ${micPermission.state}`);

            this.results.permissionsSupported = true;

        } catch (error) {
            console.log(`❌ Permissions API test failed: ${error.message}`);
            this.results.errors.push(`Permissions API failed: ${error.message}`);
        }
    }

    async testMediaConstraints() {
        console.log('\n📋 Test 5: Media Constraints');

        const constraints = {
            audio: {
                echoCancellation: true,
                noiseSuppression: true,
                autoGainControl: true
            },
            video: {
                width: { ideal: 1280 },
                height: { ideal: 720 },
                frameRate: { ideal: 30 }
            }
        };

        this.results.constraints = constraints;

        try {
            const stream = await navigator.mediaDevices.getUserMedia(constraints);
            console.log('✅ Advanced constraints work');

            // Check stream tracks
            const videoTracks = stream.getVideoTracks();
            const audioTracks = stream.getAudioTracks();

            console.log(`✅ Video tracks: ${videoTracks.length}`);
            console.log(`✅ Audio tracks: ${audioTracks.length}`);

            // Stop all tracks
            stream.getTracks().forEach(track => track.stop());

        } catch (error) {
            console.log(`❌ Advanced constraints failed: ${error.message}`);

            // Try basic constraints
            try {
                const basicStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
                console.log('✅ Basic constraints work (fallback)');
                basicStream.getTracks().forEach(track => track.stop());
            } catch (fallbackError) {
                console.log(`❌ Basic constraints also failed: ${fallbackError.message}`);
                this.results.errors.push(`Media constraints failed: ${fallbackError.message}`);
            }
        }
    }

    async testICEServers() {
        console.log('\n📋 Test 6: ICE Servers');

        const iceServers = [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' },
            { urls: 'stun:stun2.l.google.com:19302' },
            { urls: 'stun:stun3.l.google.com:19302' },
            { urls: 'stun:stun4.l.google.com:19302' }
        ];

        this.results.iceServers = iceServers;

        try {
            const pc = new RTCPeerConnection({ iceServers });

            // Create a data channel to trigger ICE gathering
            const dc = pc.createDataChannel('test');

            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);

            // Wait for ICE gathering
            await new Promise((resolve) => {
                pc.onicegatheringstatechange = () => {
                    if (pc.iceGatheringState === 'complete') {
                        resolve();
                    }
                };
                // Timeout after 5 seconds
                setTimeout(resolve, 5000);
            });

            console.log(`✅ ICE gathering state: ${pc.iceGatheringState}`);
            console.log(`✅ ICE candidates generated: ${pc.localDescription.sdp.includes('c=IN IP4')}`);

            pc.close();

        } catch (error) {
            console.log(`❌ ICE servers test failed: ${error.message}`);
            this.results.errors.push(`ICE servers failed: ${error.message}`);
        }
    }

    displayResults() {
        console.log('\n📊 TEST RESULTS SUMMARY');
        console.log('='.repeat(50));

        console.log(`🌐 Browser: ${this.results.browser}`);
        console.log(`✅ WebRTC Supported: ${this.results.webRTCSupported}`);
        console.log(`✅ getUserMedia Supported: ${this.results.getUserMediaSupported}`);
        console.log(`✅ PeerConnection Supported: ${this.results.peerConnectionSupported}`);
        console.log(`✅ MediaDevices Supported: ${this.results.mediaDevicesSupported}`);
        console.log(`✅ Permissions API Supported: ${this.results.permissionsSupported}`);

        if (this.results.errors.length > 0) {
            console.log('\n❌ ERRORS FOUND:');
            this.results.errors.forEach((error, index) => {
                console.log(`${index + 1}. ${error}`);
            });
        } else {
            console.log('\n✅ No errors found - WebRTC should work properly!');
        }

        console.log('\n🎯 RECOMMENDATIONS:');
        if (this.results.webRTCSupported) {
            console.log('✅ This browser supports WebRTC');
            console.log('✅ You can use the provided webrtc-client.js');
        } else {
            console.log('❌ This browser does not support WebRTC');
            console.log('❌ Consider using a different browser or implementing fallbacks');
        }

        if (this.results.errors.length > 0) {
            console.log('⚠️  Some issues detected - check the error list above');
        }
    }
}

// Auto-run tests when script is loaded
if (typeof window !== 'undefined') {
    // Browser environment
    window.WebRTCTest = WebRTCTest;

    // Auto-run if this is the main script
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            const test = new WebRTCTest();
            test.runTests();
        });
    } else {
        const test = new WebRTCTest();
        test.runTests();
    }
} else {
    // Node.js environment
    module.exports = WebRTCTest;
}

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = WebRTCTest;
} 