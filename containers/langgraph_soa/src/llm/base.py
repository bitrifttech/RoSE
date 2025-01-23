from abc import ABC, abstractmethod
from typing import List, Dict, Any
from langchain_core.messages import BaseMessage

class BaseLLM(ABC):
    """Base class for LLM implementations."""
    
    @abstractmethod
    def initialize(self) -> None:
        """Initialize the LLM with necessary configurations."""
        pass
    
    @abstractmethod
    def invoke(self, messages: List[BaseMessage], tools: List[Dict[str, Any]] = None) -> BaseMessage:
        """Invoke the LLM with messages and optional tools.
        
        Args:
            messages: List of messages in the conversation
            tools: Optional list of tool configurations
            
        Returns:
            Response message from the LLM
        """
        pass
    
    @abstractmethod
    def get_model_name(self) -> str:
        """Get the name of the model being used."""
        pass
