# WebSocket API Documentation

## Connection
Connect to the WebSocket server at: `ws://localhost:3000/shell`

## Message Format

### Client to Server Messages

#### Input Command
Send terminal input:
```json
{
  "type": "input",
  "data": "command string"
}
```

#### Terminal Resize
Update terminal dimensions:
```json
{
  "type": "resize",
  "data": {
    "cols": number,
    "rows": number
  }
}
```

### Server to Client Messages

#### Command Output
Receive command output:
```json
{
  "type": "output",
  "data": "output string"
}
```

#### Connection Status
Receive initial connection information:
```json
{
  "type": "connected",
  "data": {
    "shell": "string",
    "cwd": "string"
  }
}
```

## Example Usage

### JavaScript
```javascript
const ws = new WebSocket('ws://localhost:3000/shell');

ws.onopen = () => {
  console.log('Connected to shell');
};

ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  switch (message.type) {
    case 'output':
      console.log('Received output:', message.data);
      break;
    case 'connected':
      console.log('Shell session started:', message.data);
      break;
  }
};

// Send command
ws.send(JSON.stringify({
  type: 'input',
  data: 'ls -la'
}));

// Update terminal size
ws.send(JSON.stringify({
  type: 'resize',
  data: {
    cols: 80,
    rows: 24
  }
}));
```

## Error Handling

### Connection Errors
- Handle WebSocket connection errors through the `onerror` event
- Implement reconnection logic if needed
- Check connection status through `onclose` event

### Message Errors
- Always wrap message parsing in try-catch blocks
- Validate message format before processing
- Handle unknown message types gracefully

## Best Practices

1. **Connection Management**
   - Implement heartbeat mechanism
   - Handle reconnection gracefully
   - Clean up resources on disconnect

2. **Message Handling**
   - Buffer large messages if needed
   - Implement message queuing for rapid commands
   - Handle backpressure appropriately

3. **Error Recovery**
   - Implement exponential backoff for reconnections
   - Log connection issues for debugging
   - Maintain session state for recovery
