from typing import List, Dict, Any
import os
from langchain_openai import ChatOpenAI
from langchain_core.messages import BaseMessage

from .base import BaseLLM

class OpenAILLM(BaseLLM):
    """OpenAI implementation of the LLM interface."""
    
    def __init__(self, model_name: str = "gpt-4", temperature: float = 0.7):
        self.model_name = model_name
        self.temperature = temperature
        self.llm = None
        
    def initialize(self) -> None:
        """Initialize the OpenAI LLM."""
        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key:
            raise ValueError("OPENAI_API_KEY environment variable is not set")
            
        self.llm = ChatOpenAI(
            model=self.model_name,
            temperature=self.temperature,
            openai_api_key=api_key,
        )
        
    def invoke(self, messages: List[BaseMessage], tools: List[Dict[str, Any]] = None) -> BaseMessage:
        """Invoke the OpenAI LLM with messages and optional tools."""
        if not self.llm:
            self.initialize()
            
        return self.llm.invoke(
            messages,
            tools=tools
        )
        
    def get_model_name(self) -> str:
        """Get the name of the OpenAI model being used."""
        return self.model_name
