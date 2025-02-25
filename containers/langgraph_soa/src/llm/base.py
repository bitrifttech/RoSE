from abc import ABC, abstractmethod
from typing import List, Dict, Any, Optional, Protocol
from langchain_core.messages import BaseMessage, AIMessage

class BaseLLM(ABC):
    """Base class for LLM implementations.
    
    This class defines a standard interface for all LLM implementations,
    ensuring that LLM-specific differences are handled internally rather
    than in the agent graph.
    """
    
    def __init__(self, model_name: str, temperature: float = 0.7, **kwargs):
        """Initialize the LLM with model name and temperature."""
        self.model_name = model_name
        self.temperature = temperature
        
    @abstractmethod
    def initialize(self) -> None:
        """Initialize the LLM (e.g., load API keys, set up client)."""
        pass
    
    @abstractmethod
    def invoke(self, messages: List[BaseMessage], tools: Optional[List[Dict[str, Any]]] = None) -> AIMessage:
        """Invoke the LLM with messages and optional tools."""
        raise NotImplementedError("Subclasses must implement this method")
    
    @abstractmethod
    def get_model_name(self) -> str:
        """Get the name of the model being used."""
        pass
    
    def set_request_id(self, request_id: str) -> None:
        """Set the request ID for logging."""
        pass
    
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
