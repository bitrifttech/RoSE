# Python Integration Example

## Installation

```bash
pip install requests websockets
```

## Client Implementation

```python
import asyncio
import json
import websockets
import requests
from typing import Optional, List, Dict, Any, Union

class NovaClient:
    def __init__(self, base_url: str = 'http://localhost:3000'):
        self.base_url = base_url
        self.ws: Optional[websockets.WebSocketClientProtocol] = None

    # File Operations
    def list_files(self, path: str = '') -> List[Dict[str, Any]]:
        """List files in the specified directory."""
        try:
            response = requests.get(f'{self.base_url}/files/{path}')
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            raise Exception(f'Failed to list files: {str(e)}')

    def read_file(self, path: str) -> str:
        """Read contents of a file."""
        try:
            response = requests.get(f'{self.base_url}/files/{path}')
            response.raise_for_status()
            return response.json()['content']
        except requests.exceptions.RequestException as e:
            raise Exception(f'Failed to read file: {str(e)}')

    def create_file(self, path: str, content: str, is_directory: bool = False) -> Dict[str, str]:
        """Create a new file or directory."""
        try:
            response = requests.post(
                f'{self.base_url}/files/{path}',
                json={'content': content, 'isDirectory': is_directory}
            )
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            raise Exception(f'Failed to create file: {str(e)}')

    def update_file(self, path: str, content: str) -> Dict[str, str]:
        """Update contents of an existing file."""
        try:
            response = requests.put(
                f'{self.base_url}/files/{path}',
                json={'content': content}
            )
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            raise Exception(f'Failed to update file: {str(e)}')

    def delete_file(self, path: str) -> Dict[str, str]:
        """Delete a file or directory."""
        try:
            response = requests.delete(f'{self.base_url}/files/{path}')
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            raise Exception(f'Failed to delete file: {str(e)}')

    # Command Execution
    def execute_command(self, command: str, args: List[str] = None) -> Dict[str, str]:
        """Execute a shell command."""
        try:
            response = requests.post(
                f'{self.base_url}/execute',
                json={'command': command, 'args': args or []}
            )
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            raise Exception(f'Failed to execute command: {str(e)}')

    # Server Management
    def get_server_status(self) -> Dict[str, Union[bool, int]]:
        """Get current server status."""
        try:
            response = requests.get(f'{self.base_url}/server/status')
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            raise Exception(f'Failed to get server status: {str(e)}')

    def start_server(self, command: str = 'npm', args: List[str] = None) -> Dict[str, str]:
        """Start the app server."""
        try:
            response = requests.post(
                f'{self.base_url}/server/start',
                json={'command': command, 'args': args or ['start']}
            )
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            raise Exception(f'Failed to start server: {str(e)}')

    def stop_server(self) -> Dict[str, str]:
        """Stop the app server."""
        try:
            response = requests.post(f'{self.base_url}/server/stop')
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            raise Exception(f'Failed to stop server: {str(e)}')

    # WebSocket Terminal
    async def connect_shell(self, on_data, on_error):
        """Connect to the shell WebSocket."""
        ws_url = f"ws://{self.base_url.replace('http://', '')}/shell"
        try:
            async with websockets.connect(ws_url) as websocket:
                self.ws = websocket
                while True:
                    try:
                        message = await websocket.recv()
                        data = json.loads(message)
                        await on_data(data)
                    except json.JSONDecodeError as e:
                        await on_error(f'Failed to parse message: {str(e)}')
                    except websockets.exceptions.ConnectionClosed:
                        break
                    except Exception as e:
                        await on_error(str(e))
        except Exception as e:
            await on_error(f'WebSocket connection error: {str(e)}')
        finally:
            self.ws = None

    async def send_command(self, command: str):
        """Send a command through the WebSocket."""
        if self.ws:
            try:
                await self.ws.send(json.dumps({
                    'type': 'input',
                    'data': command
                }))
            except Exception as e:
                raise Exception(f'Failed to send command: {str(e)}')

    async def resize_terminal(self, cols: int, rows: int):
        """Resize the terminal."""
        if self.ws:
            try:
                await self.ws.send(json.dumps({
                    'type': 'resize',
                    'data': {'cols': cols, 'rows': rows}
                }))
            except Exception as e:
                raise Exception(f'Failed to resize terminal: {str(e)}')
```

## Usage Example

```python
import asyncio
from nova_client import NovaClient

async def main():
    client = NovaClient('http://localhost:3000')

    try:
        # List files
        files = client.list_files()
        print('Files:', files)

        # Create a file
        response = client.create_file('test.txt', 'Hello, World!')
        print('Create response:', response)

        # Execute a command
        result = client.execute_command('ls', ['-la'])
        print('Command output:', result)

        # WebSocket shell handlers
        async def on_data(message):
            print('Received:', message)

        async def on_error(error):
            print('Error:', error)

        # Connect to shell
        shell_task = asyncio.create_task(
            client.connect_shell(on_data, on_error)
        )

        # Send some commands
        await asyncio.sleep(1)  # Wait for connection
        await client.send_command('ls -la\n')
        await asyncio.sleep(2)  # Wait for output

        # Cleanup
        if client.ws:
            await client.ws.close()
        await shell_task

    except Exception as e:
        print('Error:', str(e))

if __name__ == '__main__':
    asyncio.run(main())
```

## Error Handling Example

```python
import asyncio
from functools import wraps
import time

def retry_operation(max_retries=3, delay=1):
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            last_exception = None
            for attempt in range(max_retries):
                try:
                    return func(*args, **kwargs)
                except Exception as e:
                    last_exception = e
                    if attempt < max_retries - 1:
                        time.sleep(delay * (2 ** attempt))
            raise last_exception
        return wrapper
    return decorator

class RobustNovaClient(NovaClient):
    @retry_operation()
    def list_files(self, path: str = ''):
        return super().list_files(path)

    async def create_reconnecting_shell(self, on_data, on_error):
        while True:
            try:
                await self.connect_shell(on_data, on_error)
            except Exception as e:
                await on_error(f'Connection lost: {str(e)}')
                await asyncio.sleep(5)  # Wait before reconnecting
```

## Async Context Manager Example

```python
class AsyncShellConnection:
    def __init__(self, client: NovaClient):
        self.client = client

    async def __aenter__(self):
        self.on_data_queue = asyncio.Queue()
        self.shell_task = asyncio.create_task(
            self.client.connect_shell(
                self._on_data,
                self._on_error
            )
        )
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if self.client.ws:
            await self.client.ws.close()
        await self.shell_task

    async def _on_data(self, message):
        await self.on_data_queue.put(message)

    async def _on_error(self, error):
        print('Shell error:', error)

    async def send_command(self, command: str):
        await self.client.send_command(command)

    async def get_output(self, timeout: float = None):
        try:
            return await asyncio.wait_for(
                self.on_data_queue.get(),
                timeout
            )
        except asyncio.TimeoutError:
            return None

# Usage
async def example_with_context():
    client = NovaClient()
    async with AsyncShellConnection(client) as shell:
        await shell.send_command('ls -la\n')
        while True:
            output = await shell.get_output(timeout=5.0)
            if output is None:
                break
            print('Output:', output)
```
