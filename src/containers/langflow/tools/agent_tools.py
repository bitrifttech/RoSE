# file: api_tools.py
import requests
from pydantic import Field
from typing import List, Dict, Any

from langchain.tools import BaseTool
from langchain.callbacks.manager import CallbackManagerForToolRun
import requests
import json
from pydantic import BaseModel, Field

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
    description: str = "Perform file system operations like reading, writing, and deleting files"
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
        url = f"{self.base_url}/files/{path.lstrip('/')}"
        
        try:
            if content is not None or is_directory:
                # Create or update file/directory
                data = {"content": content, "isDirectory": is_directory}
                response = requests.post(url, json=data)
            else:
                # Read file or directory
                response = requests.get(url)
            
            response.raise_for_status()
            return json.dumps(response.json(), indent=2)
            
        except requests.exceptions.RequestException as e:
            return f"Error performing file operation: {str(e)}"

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
