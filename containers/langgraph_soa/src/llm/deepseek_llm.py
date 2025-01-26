from typing import List, Dict, Any, Optional
import os
import logging
from langchain_openai import ChatOpenAI
from langchain_core.messages import BaseMessage

from .base import BaseLLM

logger = logging.getLogger(__name__)

class DeepSeekLLM(BaseLLM):
    """DeepSeek implementation of the LLM interface using LangChain."""
    
    def __init__(self, model_name: str = "deepseek-chat", temperature: float = 0.7):
        self.model_name = model_name
        self.temperature = temperature
        self.llm = None
        
    def _format_tools_for_deepseek(self, tools: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Format tools to match DeepSeek's expected schema (OpenAI-compatible)."""
        if not tools:
            return None
            
        formatted_tools = []
        for tool in tools:
            # DeepSeek expects OpenAI function calling format
            formatted_tool = {
                "type": "function",
                "function": {
                    "name": tool["function"]["name"],
                    "description": tool["function"]["description"],
                    "parameters": tool["function"]["parameters"]
                }
            }
            formatted_tools.append(formatted_tool)
            
        return formatted_tools
        
    def initialize(self) -> None:
        """Initialize the DeepSeek LLM."""
        api_key = os.getenv("DEEPSEEK_API_KEY")
        if not api_key:
            raise ValueError("DEEPSEEK_API_KEY environment variable is not set")
            
        self.llm = ChatOpenAI(
            model=self.model_name,
            temperature=self.temperature,
            openai_api_key=api_key,
            openai_api_base="https://api.deepseek.com/v1",
        )
        
        logger.info(f"Initialized DeepSeek client with model {self.model_name}")
        
    def invoke(self, messages: List[BaseMessage], tools: List[Dict[str, Any]] = None) -> BaseMessage:
        """Invoke the DeepSeek LLM with messages and optional tools."""
        if not self.llm:
            self.initialize()
            
        # Format tools if present
        if tools:
            tools = self._format_tools_for_deepseek(tools)
            
        try:
            logger.info(f"Making API call to DeepSeek with model {self.model_name}")
            response = self.llm.invoke(
                messages,
                tools=tools
            )
            return response
        except Exception as e:
            logger.error(f"Error in DeepSeek API call: {str(e)}")
            raise
        
    def get_model_name(self) -> str:
        """Get the name of the model being used."""
        return self.model_name
