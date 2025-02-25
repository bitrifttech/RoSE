from typing import List, Dict, Any, Optional
import os
import logging
import json
from langchain_openai import ChatOpenAI
from langchain_core.messages import BaseMessage, AIMessage

from .base import BaseLLM

logger = logging.getLogger(__name__)

class OpenAILLM(BaseLLM):
    """OpenAI implementation of the LLM interface."""
    
    def __init__(self, model_name: str = "gpt-4", temperature: float = 0.7, max_tokens: int = 4096):
        self.model_name = model_name
        self.temperature = temperature
        self.max_tokens = max_tokens
        self.llm = None
        self.request_id = None
        
    def _format_tools_for_openai(self, tools: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Format tools to match OpenAI's expected schema."""
        if not tools:
            return None
            
        formatted_tools = []
        for tool in tools:
            formatted_tool = {
                "type": "function",
                "function": tool["function"]
            }
            formatted_tools.append(formatted_tool)
            
        log_prefix = f"[Request: {self.request_id}]" if self.request_id else ""
        logger.debug(f"{log_prefix} Formatted tools for OpenAI: {formatted_tools}")
        return formatted_tools
        
    def initialize(self) -> None:
        """Initialize the OpenAI LLM."""
        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key:
            raise ValueError("OPENAI_API_KEY environment variable is not set")
            
        self.llm = ChatOpenAI(
            model=self.model_name,
            temperature=self.temperature,
            max_tokens=self.max_tokens,
            openai_api_key=api_key,
        )
        
        log_prefix = f"[Request: {self.request_id}]" if self.request_id else ""
        logger.info(f"{log_prefix} Initialized OpenAI client with model {self.model_name}")
        
    def invoke(self, messages: List[BaseMessage], tools: List[Dict[str, Any]] = None) -> BaseMessage:
        """Invoke the OpenAI LLM with messages and optional tools."""
        if not self.llm:
            self.initialize()
            
        log_prefix = f"[Request: {self.request_id}]" if self.request_id else ""
        logger.info(f"{log_prefix} Making API call to OpenAI with model {self.model_name}")
            
        # Format tools if present
        formatted_tools = None
        if tools:
            formatted_tools = self._format_tools_for_openai(tools)
            logger.debug(f"{log_prefix} Using tools: {formatted_tools}")
            
        try:
            response = self.llm.invoke(
                messages,
                tools=formatted_tools
            )
            
            # Log the response for debugging
            if isinstance(response, AIMessage):
                logger.debug(f"{log_prefix} OpenAI response: {json.dumps({'content': response.content, 'kwargs': response.additional_kwargs}, indent=2, default=str)}")
            
            return response
        except Exception as e:
            logger.error(f"{log_prefix} Error in OpenAI API call: {str(e)}")
            raise
        
    def get_model_name(self) -> str:
        """Get the name of the OpenAI model being used."""
        return self.model_name
