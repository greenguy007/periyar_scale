# Periyar Scale Web Client

Live weight monitoring dashboard for the Periyar Scale system.

## Features
- Real-time weight display
- Historical data charting
- WebSocket connection management
- Configurable server URL

## Deployment

This web client is deployed on Vercel and connects to the WebSocket server at:
`wss://periyar-scale-server.onrender.com/ws`

## Local Development

1. Open `index2.html` in a browser
2. Configure WebSocket server URL if needed
3. Click "Connect" to start monitoring

## Configuration

You can change the WebSocket server URL in the UI or modify the default in `app.js`:
```javascript
const savedServer = localStorage.getItem('wsServer') || 'wss://your-server.com/ws';
```
