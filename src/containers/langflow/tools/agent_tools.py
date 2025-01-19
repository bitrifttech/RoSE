# file: api_tools.py
import requests
from pydantic import Field
from typing import List, Dict, Any
import logging

from langchain.tools import BaseTool
from langchain.callbacks.manager import CallbackManagerForToolRun
import requests
import json
from pydantic import BaseModel, Field

# Configure logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

class FileOperationInput(BaseModel):
    path: str = Field(..., description="File or directory path relative to app directory")
    content: str | None = Field(None, description="Content for file operations")
    is_directory: bool | None = Field(False, description="Whether the path is a directory")

class MoveOperationInput(BaseModel):
    source: str = Field(..., description="Source path")
    destination: str = Field(..., description="Destination path")

class CommandExecutionInput(BaseModel):
    command: str = Field(..., description="Command to execute")
    args: List[str] = Field(default_factory=list, description="Command arguments")

class FileSystemTool(BaseTool):
    name: str = "file_system"
    description: str = """Tool for managing files and directories. Supports:
    1. Read file/directory: Pass only path
    2. Create/Update: Pass path and content (and is_directory=True for directories)
    3. Delete: Pass path and content='' (empty string) and is_directory flag"""
    args_schema: type[BaseModel] = FileOperationInput
    base_url: str = "http://host.docker.internal:8030"  # Host machine URL

    def _agenerate(
        self,
        path: str,
        content: str | None = None,
        is_directory: bool = False,
        run_manager: CallbackManagerForToolRun | None = None,
    ) -> str:
        """Use the tool asynchronously."""
        raise NotImplementedError("FileSystemTool does not support async")

    def _run(
        self,
        path: str,
        content: str | None = None,
        is_directory: bool = False,
        run_manager: CallbackManagerForToolRun | None = None,
    ) -> str:
        """Run the file system tool."""
        try:
            logger.debug(f"FileSystemTool._run called with: path='{path}', content={content!r}, is_directory={is_directory}")
            
            if content == "":
                # Delete operation (content must be empty string)
                if is_directory:
                    # Use /delete endpoint for directories
                    url = f"{self.base_url}/delete"
                    logger.debug(f"Deleting directory at URL: {url}")
                    logger.debug(f"Request data: {{'path': {path!r}}}")
                    response = requests.delete(url, json={"path": path})
                else:
                    # Use /files endpoint for files
                    url = f"{self.base_url}/files/{path.lstrip('/')}"
                    logger.debug(f"Deleting file at URL: {url}")
                    response = requests.delete(url)
                
                logger.debug(f"Delete response status: {response.status_code}")
                logger.debug(f"Delete response headers: {dict(response.headers)}")
                try:
                    logger.debug(f"Delete response body: {response.json()}")
                except:
                    logger.debug(f"Delete response text: {response.text}")
                
                if response.status_code == 200:
                    return json.dumps({"message": "Deleted successfully"})
            elif content is not None:
                # Create or update file/directory
                url = f"{self.base_url}/files/{path.lstrip('/')}"
                data = {"content": content, "isDirectory": is_directory}
                logger.debug(f"Creating/updating at URL: {url}")
                logger.debug(f"Request data: {data}")
                response = requests.post(url, json=data)
            else:
                # Read file or directory (content is None)
                url = f"{self.base_url}/files/{path.lstrip('/')}"
                logger.debug(f"Reading from URL: {url}")
                response = requests.get(url)
            
            response.raise_for_status()
            try:
                result = json.dumps(response.json(), indent=2)
                logger.debug(f"Operation successful. Result: {result}")
                return result
            except json.JSONDecodeError:
                logger.error(f"Failed to decode JSON response: {response.text}")
                return f"Error: Invalid JSON response: {response.text}"
            
        except requests.exceptions.RequestException as e:
            error_msg = f"Error performing file operation: {str(e)}"
            logger.error(error_msg)
            if hasattr(e, 'response'):
                logger.error(f"Response status: {e.response.status_code}")
                logger.error(f"Response headers: {dict(e.response.headers)}")
                try:
                    logger.error(f"Response body: {e.response.json()}")
                except:
                    logger.error(f"Response text: {e.response.text}")
            return error_msg

class MoveFileTool(BaseTool):
    name: str = "move_file"
    description: str = "Move a file or directory from source to destination"
    args_schema: type[BaseModel] = MoveOperationInput
    base_url: str = "http://host.docker.internal:8030"

    def _run(
        self,
        source: str,
        destination: str,
        run_manager: CallbackManagerForToolRun | None = None,
    ) -> str:
        """Run the move file tool."""
        url = f"{self.base_url}/move"
        data = {"source": source, "destination": destination}
        
        try:
            response = requests.post(url, json=data)
            response.raise_for_status()
            return f"Successfully moved {source} to {destination}"
        except requests.exceptions.RequestException as e:
            return f"Error moving file: {str(e)}"

class CommandExecutionTool(BaseTool):
    name: str = "execute_command"
    description: str = "Execute a shell command in the app directory"
    args_schema: type[BaseModel] = CommandExecutionInput
    base_url: str = "http://host.docker.internal:8030"

    def _run(
        self,
        command: str,
        args: List[str] = None,
        run_manager: CallbackManagerForToolRun | None = None,
    ) -> str:
        """Run the command execution tool."""
        url = f"{self.base_url}/execute"
        data = {"command": command, "args": args or []}
        
        try:
            response = requests.post(url, json=data)
            response.raise_for_status()
            return json.dumps(response.json(), indent=2)
        except requests.exceptions.RequestException as e:
            return f"Error executing command: {str(e)}"

def get_agent_tools() -> List[BaseTool]:
    """Get a list of all available agent tools."""
    return [
        FileSystemTool(),
        MoveFileTool(),
        CommandExecutionTool(),
    ]
