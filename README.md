# WebRTC Signaling Server

A standalone WebRTC signaling server for video calling functionality, optimized for Digital Ocean App Platform deployment. This server handles the signaling process for WebRTC peer connections, including call initiation, offer/answer exchange, and ICE candidate relay.

## 🎯 Optimized for Digital Ocean App Platform

This signaling server is specifically configured for Digital Ocean App Platform deployment, not droplets. It includes:

- ✅ App Platform-specific configuration
- ✅ Port 8080 (App Platform standard)
- ✅ Environment variable setup
- ✅ Automatic SSL/HTTPS support
- ✅ Built-in monitoring and logging

## Features

- ✅ Real-time WebRTC signaling
- ✅ Call initiation and management
- ✅ ICE candidate relay
- ✅ Screen sharing support
- ✅ User presence tracking
- ✅ Automatic reconnection handling
- ✅ Offer buffering for race conditions
- ✅ Health check endpoints
- ✅ Production-ready with security headers
- ✅ Graceful shutdown handling

## Quick Start

### Prerequisites

- Digital Ocean App Platform account
- Git repository with your code

### Deployment

1. **Digital Ocean App Platform Deployment (Recommended)**
   
   Follow the detailed guide in `DIGITAL_OCEAN_APP_DEPLOYMENT.md`

2. **Local Development**
   
   ```bash
   npm install
   cp env.example .env
   # Edit .env file
   npm run dev
   ```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | `8080` |
| `HOST` | Server host | `0.0.0.0` |
| `NODE_ENV` | Environment | `development` |
| `CORS_ORIGINS` | Comma-separated allowed origins | `http://localhost:3000,http://localhost:5173` |

## API Endpoints

### Health Check
```
GET /health
```
Returns server status and statistics.

### API Status
```
GET /api/status
```
Returns detailed server information.

### WebRTC Status
```
GET /api/webrtc/status
```
Returns WebRTC-specific statistics.

## Socket.IO Events

### Client to Server

| Event | Data | Description |
|-------|------|-------------|
| `register` | `{ userId, userName }` | Register user |
| `initiateCall` | `{ callId, callerId, calleeId, callerName }` | Start a call |
| `acceptCall` | `{ callId }` | Accept incoming call |
| `rejectCall` | `{ callId }` | Reject incoming call |
| `endCall` | `{ callId }` | End active call |
| `offer` | `{ callId, offer }` | Send WebRTC offer |
| `answer` | `{ callId, answer }` | Send WebRTC answer |
| `iceCandidate` | `{ callId, candidate }` | Send ICE candidate |
| `screenShareStatus` | `{ callId, isSharing }` | Update screen share status |
| `requestOffer` | `{ callId, targetUserId }` | Request offer for reconnection |

### Server to Client

| Event | Data | Description |
|-------|------|-------------|
| `registered` | `{ userId, socketId }` | Registration confirmation |
| `incomingCall` | `{ callId, callerId, callerName, callerSocketId }` | Incoming call notification |
| `callAccepted` | `{ callId }` | Call accepted notification |
| `callRejected` | `{ callId }` | Call rejected notification |
| `callEnded` | `{ callId }` | Call ended notification |
| `callError` | `{ error, callId, code }` | Call error notification |
| `offer` | `{ callId, offer }` | WebRTC offer |
| `answer` | `{ callId, answer }` | WebRTC answer |
| `iceCandidate` | `{ callId, candidate }` | ICE candidate |
| `screenShareStatus` | `{ callId, isSharing }` | Screen share status |
| `requestOffer` | `{ callId, targetUserId }` | Request for offer |
| `onlineUsers` | `string[]` | List of online users |
| `userStatusChange` | `{ userId, isOnline }` | User status change |

## Deployment on Digital Ocean App Platform

For detailed deployment instructions, see `DIGITAL_OCEAN_APP_DEPLOYMENT.md`

### Quick Steps:

1. **Create App Platform App**
   - Go to Digital Ocean App Platform
   - Create new app
   - Connect your repository
   - Select `webrtc-signaling-server` directory

2. **Configure Environment Variables**
   ```
   NODE_ENV=production
   PORT=8080
   HOST=0.0.0.0
   CORS_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
   ```

3. **Set Build and Run Commands**
   - Build: `npm install --production`
   - Run: `npm start`

4. **Deploy**
   - Click deploy
   - Wait for deployment to complete
   - Test health endpoint: `https://your-app.ondigitalocean.app/health`

## Monitoring and Logs

### App Platform Monitoring

- View logs in the Digital Ocean App Platform dashboard
- Monitor performance and errors
- Set up alerts for downtime

### Health Checks

- `https://your-app.ondigitalocean.app/health`
- `https://your-app.ondigitalocean.app/api/status`

## Security Considerations

1. **Firewall**: Only allow necessary ports
2. **SSL**: Always use HTTPS in production
3. **CORS**: Configure allowed origins properly
4. **Rate Limiting**: Consider adding rate limiting for production
5. **Authentication**: Implement proper user authentication
6. **Monitoring**: Set up monitoring and alerting

## Troubleshooting

### Common Issues

1. **Connection Refused**: Check if server is running and port is open
2. **CORS Errors**: Verify CORS_ORIGINS configuration
3. **Memory Issues**: Monitor memory usage with `pm2 monit`
4. **SSL Issues**: Check certificate validity and configuration

### Debug Mode

```bash
# Run in debug mode
DEBUG=* npm start
```

## Performance Optimization

1. **Load Balancing**: Use multiple instances with PM2
2. **Redis**: Consider using Redis for session storage
3. **Monitoring**: Set up monitoring with PM2 Plus or similar
4. **Logging**: Implement structured logging for production

## License

MIT License - feel free to use this in your projects. 