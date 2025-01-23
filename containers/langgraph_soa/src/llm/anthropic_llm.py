from typing import List, Dict, Any
import os
import anthropic
import logging
from langchain_core.messages import BaseMessage, AIMessage

from .base import BaseLLM

# Set up logging with consistent format
logger = logging.getLogger(__name__)

class AnthropicLLM(BaseLLM):
    """Anthropic (Claude) implementation of the LLM interface."""
    
    def __init__(self, model_name: str = "claude-3-opus-20240229", temperature: float = 0.7, max_tokens: int = 4096):
        self.model_name = model_name
        self.temperature = temperature
        self.max_tokens = max_tokens
        self.client = None
        self.request_id = None
        
    def set_request_id(self, request_id: str):
        """Set the request ID for logging."""
        self.request_id = request_id
        
    def initialize(self) -> None:
        """Initialize the Anthropic client."""
        api_key = os.getenv("ANTHROPIC_API_KEY")
        if not api_key:
            raise ValueError("ANTHROPIC_API_KEY environment variable is not set")
            
        self.client = anthropic.Client(api_key=api_key)
        log_prefix = f"[Request: {self.request_id}]" if self.request_id else ""
        logger.info(f"{log_prefix} Initialized Anthropic client with model {self.model_name}")
        
    def invoke(self, messages: List[BaseMessage], tools: List[Dict[str, Any]] = None) -> BaseMessage:
        """Invoke the Anthropic LLM with messages and optional tools."""
        if not self.client:
            self.initialize()
            
        log_prefix = f"[Request: {self.request_id}]" if self.request_id else ""
        logger.info(f"{log_prefix} Making API call to Anthropic with model {self.model_name}")
        
        # Extract system message if present
        system_message = None
        other_messages = []
        for msg in messages:
            if msg.type == "system":
                system_message = msg.content
            else:
                other_messages.append(msg)
            
        # Convert remaining messages to Anthropic format
        anthropic_messages = []
        for msg in other_messages:
            if msg.type == "human":
                anthropic_messages.append({"role": "user", "content": msg.content})
            elif msg.type == "ai":
                anthropic_messages.append({"role": "assistant", "content": msg.content})
            
        # Format tools for Claude's API if present
        formatted_tools = None
        if tools:
            formatted_tools = []
            for tool in tools:
                # Extract the parameters schema
                params = tool["function"]["parameters"]
                # Remove the schema version if present as Claude doesn't expect it
                if "$schema" in params:
                    del params["$schema"]
                
                formatted_tool = {
                    "name": tool["function"]["name"],
                    "description": tool["function"]["description"],
                    "input_schema": params
                }
                formatted_tools.append(formatted_tool)
        
        # Create message
        response = self.client.messages.create(
            model=self.model_name,
            messages=anthropic_messages,
            system=system_message,
            temperature=self.temperature,
            max_tokens=self.max_tokens,
            tools=formatted_tools
        )
        
        # Convert response back to LangChain format
        return AIMessage(content=response.content[0].text)

    def get_model_name(self) -> str:
        """Get the name of the model being used."""
        return self.model_name
