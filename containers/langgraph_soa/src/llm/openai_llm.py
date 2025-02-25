from typing import List, Dict, Any, Optional
import os
import logging
import json
from langchain_openai import ChatOpenAI
from langchain_core.messages import BaseMessage, AIMessage

from .base import BaseLLM
from ..config.env_loader import get_api_key, load_env_variables

logger = logging.getLogger(__name__)

class OpenAILLM(BaseLLM):
    """OpenAI implementation of the LLM interface using LangChain."""
    
    def __init__(self, model_name: str = "gpt-4o-mini", temperature: float = 0.7, max_tokens: int = 4096):
        super().__init__(model_name, temperature)
        self.max_tokens = max_tokens
        self.llm = None
        self.request_id = None
        
    def initialize(self) -> None:
        """Initialize the OpenAI client."""
        # Load environment variables if not already loaded
        load_env_variables()
        
        # Get API key from environment
        api_key = get_api_key("openai")
        if not api_key:
            # For testing purposes, use a mock key if real key is not available
            logger.warning("Using mock OpenAI API key for testing")
            api_key = "sk-mock-key-for-testing"
        
        # Initialize the LangChain ChatOpenAI instance
        self.llm = ChatOpenAI(
            model=self.model_name,
            temperature=self.temperature,
            max_tokens=self.max_tokens,
            openai_api_key=api_key
        )
        
    def set_request_id(self, request_id: str) -> None:
        """Set the request ID for logging."""
        self.request_id = request_id
        
    def invoke(self, messages: List[BaseMessage], tools: Optional[List[Dict[str, Any]]] = None) -> AIMessage:
        """Invoke the OpenAI LLM with messages and optional tools."""
        if not self.llm:
            self.initialize()
            
        logger.debug(f"[OpenAI] Invoking with {len(messages)} messages and {len(tools) if tools else 0} tools")
        
        # Format tools for OpenAI if provided
        if tools:
            response = self.llm.invoke(messages, tools=tools)
        else:
            response = self.llm.invoke(messages)
            
        return response
        
    def get_model_name(self) -> str:
        """Get the name of the model being used."""
        return self.model_name
