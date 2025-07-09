# Digital Ocean App Platform Deployment Guide

This guide is specifically for deploying the WebRTC signaling server to Digital Ocean App Platform (not droplets).

## 🚀 Quick Deployment

### 1. Prepare Your Repository

Make sure your signaling server is in a separate repository or a subdirectory of your main project.

### 2. Create App in Digital Ocean

1. Go to Digital Ocean App Platform
2. Click "Create App"
3. Connect your repository
4. Select the `webrtc-signaling-server` directory as the source

### 3. Configure App Settings

#### Environment Variables
Add these environment variables in the App Platform dashboard:

```
NODE_ENV=production
PORT=8080
HOST=0.0.0.0
CORS_ORIGINS=https://yourdomain.com,https://www.yourdomain.com,http://localhost:3000,http://localhost:5173
```

#### Build Command
```
npm install --production
```

#### Run Command
```
npm start
```

### 4. Configure App Spec

Create an `app.yaml` file in your signaling server directory:

```yaml
name: webrtc-signaling-server
services:
- name: webrtc-signaling
  source_dir: /
  github:
    repo: your-username/your-repo
    branch: main
  run_command: npm start
  environment_slug: node-js
  instance_count: 1
  instance_size_slug: basic-xxs
  envs:
  - key: NODE_ENV
    value: production
  - key: PORT
    value: "8080"
  - key: HOST
    value: "0.0.0.0"
  - key: CORS_ORIGINS
    value: "https://yourdomain.com,https://www.yourdomain.com,http://localhost:3000,http://localhost:5173"
```

## 🔧 Configuration

### Environment Variables

| Variable | Value | Description |
|----------|-------|-------------|
| `NODE_ENV` | `production` | Environment mode |
| `PORT` | `8080` | App Platform uses port 8080 |
| `HOST` | `0.0.0.0` | Bind to all interfaces |
| `CORS_ORIGINS` | Your domains | Comma-separated allowed origins |

### Update Main Application

In your main application, set the signaling server URL to your App Platform URL:

```env
REACT_APP_SIGNALING_SERVER_URL=wss://your-app-name.ondigitalocean.app
```

## 📊 Monitoring

### Health Checks
- `https://your-app-name.ondigitalocean.app/health`
- `https://your-app-name.ondigitalocean.app/api/status`

### App Platform Logs
- View logs in the Digital Ocean App Platform dashboard
- Monitor performance and errors

## 🔒 Security

### CORS Configuration
Make sure to add your main application domain to `CORS_ORIGINS`:

```
CORS_ORIGINS=https://your-main-app.ondigitalocean.app,https://yourdomain.com
```

### SSL/HTTPS
App Platform automatically provides SSL certificates.

## 🧪 Testing

### 1. Health Check
```bash
curl https://your-app-name.ondigitalocean.app/health
```

### 2. Test Connection
Update the test script with your App Platform URL:

```javascript
const socket = io('wss://your-app-name.ondigitalocean.app', {
  transports: ['websocket'],
  timeout: 5000
});
```

## 🔧 Troubleshooting

### Common Issues

1. **Connection Refused**
   - Check if app is deployed and running
   - Verify environment variables are set correctly

2. **CORS Errors**
   - Update CORS_ORIGINS with your main app domain
   - Redeploy the app after changes

3. **Port Issues**
   - App Platform uses port 8080, not 3001
   - Make sure PORT=8080 in environment variables

### Debug Steps

1. Check app logs in Digital Ocean dashboard
2. Verify environment variables are set correctly
3. Test health endpoint
4. Check CORS configuration

## 📈 Scaling

### Horizontal Scaling
- Increase `instance_count` in app.yaml
- App Platform will automatically load balance

### Vertical Scaling
- Change `instance_size_slug` to larger sizes:
  - `basic-xxs` (512MB RAM)
  - `basic-xs` (1GB RAM)
  - `basic-s` (2GB RAM)

## 💰 Cost Optimization

- Start with `basic-xxs` for development
- Scale up only when needed
- Monitor usage in Digital Ocean dashboard

## ✅ Deployment Checklist

- [ ] App Platform app created
- [ ] Environment variables configured
- [ ] CORS_ORIGINS updated with your domains
- [ ] Main application updated with signaling server URL
- [ ] Health endpoint responding
- [ ] Connection tested between main app and signaling server

Your WebRTC signaling server is now ready for Digital Ocean App Platform! 🎉 