from abc import ABC, abstractmethod
from typing import List, Dict, Any, Optional
from langchain_core.messages import BaseMessage

class BaseLLM(ABC):
    """Base class for LLM implementations.
    
    This class defines a standard interface for all LLM implementations,
    ensuring that LLM-specific differences are handled internally rather
    than in the agent graph.
    """
    
    @abstractmethod
    def initialize(self) -> None:
        """Initialize the LLM with necessary configurations."""
        pass
    
    @abstractmethod
    def invoke(self, messages: List[BaseMessage], tools: List[Dict[str, Any]] = None) -> BaseMessage:
        """Invoke the LLM with messages and optional tools.
        
        This method should handle all LLM-specific formatting internally,
        providing a consistent interface to the agent graph.
        
        Args:
            messages: List of messages in the conversation
            tools: Optional list of tool configurations in a standard format
                   (will be converted to LLM-specific format internally)
            
        Returns:
            Response message from the LLM with standardized tool call format
        """
        pass
    
    @abstractmethod
    def get_model_name(self) -> str:
        """Get the name of the model being used."""
        pass
    
    def set_request_id(self, request_id: str) -> None:
        """Set a request ID for logging and tracking.
        
        Args:
            request_id: A unique identifier for the current request
        """
        self.request_id = request_id
    
    def format_tool_calls(self, tool_calls: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Format tool calls to a standardized format.
        
        This method can be used to convert LLM-specific tool call formats
        to a standardized format used by the agent graph.
        
        Args:
            tool_calls: Tool calls in LLM-specific format
            
        Returns:
            Tool calls in standardized format
        """
        return tool_calls
