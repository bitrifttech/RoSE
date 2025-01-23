from typing import List, Dict, Any
import os
from langchain_anthropic import ChatAnthropic
from langchain_core.messages import BaseMessage

from .base import BaseLLM

class AnthropicLLM(BaseLLM):
    """Anthropic (Claude) implementation of the LLM interface."""
    
    def __init__(self, model_name: str = "claude-3-opus-20240229", temperature: float = 0.7):
        self.model_name = model_name
        self.temperature = temperature
        self.llm = None
        
    def initialize(self) -> None:
        """Initialize the Anthropic LLM."""
        api_key = os.getenv("ANTHROPIC_API_KEY")
        if not api_key:
            raise ValueError("ANTHROPIC_API_KEY environment variable is not set")
            
        self.llm = ChatAnthropic(
            model=self.model_name,
            temperature=self.temperature,
            anthropic_api_key=api_key,
        )
        
    def invoke(self, messages: List[BaseMessage], tools: List[Dict[str, Any]] = None) -> BaseMessage:
        """Invoke the Anthropic LLM with messages and optional tools."""
        if not self.llm:
            self.initialize()
            
        return self.llm.invoke(
            messages,
            tools=tools
        )
