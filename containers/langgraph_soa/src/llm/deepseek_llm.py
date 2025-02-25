from typing import List, Dict, Any, Optional
import os
import logging
import json
from langchain_openai import ChatOpenAI
from langchain_core.messages import BaseMessage, AIMessage

from .base import BaseLLM

logger = logging.getLogger(__name__)

class DeepSeekLLM(BaseLLM):
    """DeepSeek implementation of the LLM interface using LangChain."""
    
    def __init__(self, model_name: str = "deepseek-chat", temperature: float = 0.7, max_tokens: int = 4096):
        self.model_name = model_name
        self.temperature = temperature
        self.max_tokens = max_tokens
        self.llm = None
        self.request_id = None
        
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
            
        log_prefix = f"[Request: {self.request_id}]" if self.request_id else ""
        logger.debug(f"{log_prefix} Formatted tools for DeepSeek: {formatted_tools}")
        return formatted_tools
        
    def initialize(self) -> None:
        """Initialize the DeepSeek LLM."""
        api_key = os.getenv("DEEPSEEK_API_KEY")
        if not api_key:
            raise ValueError("DEEPSEEK_API_KEY environment variable is not set")
            
        self.llm = ChatOpenAI(
            model=self.model_name,
            temperature=self.temperature,
            max_tokens=self.max_tokens,
            openai_api_key=api_key,
            openai_api_base="https://api.deepseek.com/v1",
        )
        
        log_prefix = f"[Request: {self.request_id}]" if self.request_id else ""
        logger.info(f"{log_prefix} Initialized DeepSeek client with model {self.model_name}")
        
    def invoke(self, messages: List[BaseMessage], tools: List[Dict[str, Any]] = None) -> BaseMessage:
        """Invoke the DeepSeek LLM with messages and optional tools."""
        if not self.llm:
            self.initialize()
            
        log_prefix = f"[Request: {self.request_id}]" if self.request_id else ""
        logger.info(f"{log_prefix} Making API call to DeepSeek with model {self.model_name}")
            
        # Format tools if present
        formatted_tools = None
        if tools:
            formatted_tools = self._format_tools_for_deepseek(tools)
            logger.debug(f"{log_prefix} Using tools: {formatted_tools}")
            
        try:
            response = self.llm.invoke(
                messages,
                tools=formatted_tools
            )
            
            # Log the response for debugging
            if isinstance(response, AIMessage):
                logger.debug(f"{log_prefix} DeepSeek response: {json.dumps({'content': response.content, 'kwargs': response.additional_kwargs}, indent=2, default=str)}")
            
            return response
        except Exception as e:
            logger.error(f"{log_prefix} Error in DeepSeek API call: {str(e)}")
            raise
        
    def get_model_name(self) -> str:
        """Get the name of the model being used."""
        return self.model_name
