import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { signalingRouter } from './signaling/signaling';

const port = Number(process.env.PORT) || 8080;

const server = createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', timestamp: new Date().toISOString() }));
    return;
  }
  res.writeHead(404);
  res.end('Not Found');
});

const wss = new WebSocketServer({ server, path: '/ws' });

wss.on('connection', (ws: WebSocket) => {
  console.log('WebSocket connection opened');
  signalingRouter.handleConnection(ws);

  ws.on('message', (data: Buffer) => {
    signalingRouter.handleMessage(ws, data.toString());
  });

  ws.on('close', () => {
    console.log('WebSocket connection closed');
    signalingRouter.handleDisconnection(ws);
  });

  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
  });
});

server.listen(port, () => {
  console.log(`🚀 Signaling server starting on port ${port}...`);
  console.log(`✅ Signaling server running at http://localhost:${port}`);
  console.log(`📡 WebSocket endpoint: ws://localhost:${port}/ws`);
});

