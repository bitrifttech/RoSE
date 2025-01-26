from typing import List, Dict, Any
import os
import logging
from langchain_anthropic import ChatAnthropic
from langchain_core.messages import BaseMessage, AIMessage, ToolMessage

from .base import BaseLLM

# Set up logging with consistent format
logger = logging.getLogger(__name__)

class AnthropicLLM(BaseLLM):
    """Anthropic (Claude) implementation of the LLM interface using LangChain."""
    
    def __init__(self, model_name: str = "claude-3-opus-20240229", temperature: float = 0.7, max_tokens: int = 4096):
        self.model_name = model_name
        self.temperature = temperature
        self.max_tokens = max_tokens
        self.llm = None
        self.request_id = None
        
    def set_request_id(self, request_id: str):
        """Set the request ID for logging."""
        self.request_id = request_id
        
    def _format_tools_for_anthropic(self, tools: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Format tools to match Anthropic's expected schema."""
        if not tools:
            return None
            
        formatted_tools = []
        for tool in tools:
            # Extract the function details
            function = tool["function"]
            
            # Get parameters schema and remove $schema field if present
            parameters = function["parameters"].copy()
            parameters.pop("$schema", None)
            
            # Format tool according to Anthropic's schema
            formatted_tool = {
                "name": function["name"],
                "description": function["description"],
                "input_schema": parameters
            }
            formatted_tools.append(formatted_tool)
            
        logger.debug(f"Formatted tools for Anthropic: {formatted_tools}")
        return formatted_tools
        
    def _format_messages_for_anthropic(self, messages: List[BaseMessage]) -> List[BaseMessage]:
        """Format messages to match Anthropic's expected schema."""
        formatted_messages = []
        
        for msg in messages:
            if isinstance(msg, ToolMessage):
                # Format tool message as a user message with tool_result content
                formatted_msg = {
                    "role": "user",
                    "content": [{
                        "type": "tool_result",
                        "tool_use_id": msg.tool_call_id,
                        "content": msg.content
                    }]
                }
                if msg.additional_kwargs.get("is_error"):
                    formatted_msg["content"][0]["is_error"] = True
            else:
                # Keep other messages as is
                formatted_msg = {
                    "role": msg.__class__.__name__.replace("Message", "").lower(),
                    "content": msg.content
                }
            formatted_messages.append(formatted_msg)
            
        logger.debug(f"Formatted messages: {formatted_messages}")
        return formatted_messages
        
    def initialize(self) -> None:
        """Initialize the Anthropic client."""
        api_key = os.getenv("ANTHROPIC_API_KEY")
        if not api_key:
            raise ValueError("ANTHROPIC_API_KEY environment variable is not set")
            
        self.llm = ChatAnthropic(
            model=self.model_name,
            temperature=self.temperature,
            max_tokens=self.max_tokens,
            anthropic_api_key=api_key,
        )
        
        log_prefix = f"[Request: {self.request_id}]" if self.request_id else ""
        logger.info(f"{log_prefix} Initialized Anthropic client with model {self.model_name}")
        
    def invoke(self, messages: List[BaseMessage], tools: List[Dict[str, Any]] = None) -> BaseMessage:
        """Invoke the Anthropic LLM with messages and optional tools."""
        if not self.llm:
            self.initialize()
            
        log_prefix = f"[Request: {self.request_id}]" if self.request_id else ""
        logger.info(f"{log_prefix} Making API call to Anthropic with model {self.model_name}")
        
        # Format tools if present
        formatted_tools = None
        if tools:
            formatted_tools = self._format_tools_for_anthropic(tools)
            logger.debug(f"{log_prefix} Using tools: {formatted_tools}")
            
        # Format messages to ensure tool results are properly ordered
        formatted_messages = self._format_messages_for_anthropic(messages)
        logger.debug(f"{log_prefix} Formatted messages: {formatted_messages}")
            
        try:
            response = self.llm.invoke(
                formatted_messages,
                tools=formatted_tools
            )
            return response
        except Exception as e:
            logger.error(f"{log_prefix} Error in Anthropic API call: {str(e)}")
            raise
        
    def get_model_name(self) -> str:
        """Get the name of the model being used."""
        return self.model_name
