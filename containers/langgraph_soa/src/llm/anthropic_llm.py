from typing import List, Dict, Any, Optional
import os
import logging
import json
from langchain_anthropic import ChatAnthropic
from langchain_core.messages import BaseMessage, AIMessage, ToolMessage, HumanMessage, SystemMessage

from .base import BaseLLM

# Set up logging with consistent format
logger = logging.getLogger(__name__)

class AnthropicLLM(BaseLLM):
    """Anthropic (Claude) implementation of the LLM interface using LangChain."""
    
    def __init__(self, model_name: str = "claude-3-5-sonnet-20241022", temperature: float = 0.7, max_tokens: int = 4096):
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
            
        log_prefix = f"[Request: {self.request_id}]" if self.request_id else ""
        logger.debug(f"{log_prefix} Formatted tools for Anthropic: {formatted_tools}")
        return formatted_tools
        
    def _format_messages_for_anthropic(self, messages: List[BaseMessage]) -> List[Dict[str, Any]]:
        """Format messages to match Anthropic's expected schema."""
        formatted_messages = []
        
        # If no messages provided, return a default user message
        if not messages:
            logger.warning("No messages provided to format for Anthropic. Adding a default user message.")
            return [{"role": "user", "content": [{"type": "text", "text": "Hello"}]}]
        
        # Track tool calls that need responses
        pending_tool_calls = {}
        tool_messages_by_id = {}
        
        # First pass: collect all messages and track tool calls and tool messages
        for i, msg in enumerate(messages):
            if isinstance(msg, AIMessage) and msg.additional_kwargs.get('tool_calls'):
                for tool_call in msg.additional_kwargs['tool_calls']:
                    pending_tool_calls[tool_call['id']] = {
                        'tool_call': tool_call,
                        'ai_message_index': i
                    }
            elif isinstance(msg, ToolMessage):
                tool_messages_by_id[msg.tool_call_id] = msg
        
        # Second pass: format messages and handle tool results
        i = 0
        while i < len(messages):
            msg = messages[i]
            
            if isinstance(msg, AIMessage):
                # Format AI message
                content_blocks = []
                
                # Add text content if present
                if msg.content:
                    content_blocks.append({"type": "text", "text": str(msg.content)})
                
                # Add tool calls if present
                tool_call_ids = []
                if msg.additional_kwargs.get("tool_calls"):
                    for tool_call in msg.additional_kwargs["tool_calls"]:
                        tool_use = {
                            "type": "tool_use",
                            "id": tool_call["id"],
                            "name": tool_call["function"]["name"],
                            "input": json.loads(tool_call["function"]["arguments"])
                        }
                        content_blocks.append(tool_use)
                        tool_call_ids.append(tool_call["id"])
                
                # Only add the message if it has content
                if content_blocks:
                    formatted_msg = {
                        "role": "assistant",
                        "content": content_blocks
                    }
                    formatted_messages.append(formatted_msg)
                
                    # If this message has tool calls, the next message must be a user message with tool results
                    if tool_call_ids:
                        # Collect all tool results for these tool calls
                        tool_results = []
                        for tool_id in tool_call_ids:
                            if tool_id in tool_messages_by_id:
                                tool_msg = tool_messages_by_id[tool_id]
                                tool_results.append({
                                    "type": "tool_result",
                                    "tool_use_id": tool_id,
                                    "content": str(tool_msg.content)
                                })
                        
                        # If we have tool results, add them as a user message
                        if tool_results:
                            formatted_messages.append({
                                "role": "user",
                                "content": tool_results
                            })
            elif isinstance(msg, ToolMessage):
                # Tool messages are handled in the AI message processing
                pass
            elif isinstance(msg, SystemMessage):
                # Format system message
                formatted_msg = {
                    "role": "system",
                    "content": [{"type": "text", "text": str(msg.content)}]
                }
                formatted_messages.append(formatted_msg)
            elif isinstance(msg, HumanMessage):
                # Format human message as user
                formatted_msg = {
                    "role": "user",
                    "content": [{"type": "text", "text": str(msg.content)}]
                }
                formatted_messages.append(formatted_msg)
            else:
                # Format other messages generically
                role = msg.__class__.__name__.replace("Message", "").lower()
                # Map roles correctly
                if role == "human":
                    role = "user"
                
                formatted_msg = {
                    "role": role,
                    "content": [{"type": "text", "text": str(msg.content)}]
                }
                formatted_messages.append(formatted_msg)
            
            i += 1
        
        # Ensure we have at least one message
        if not formatted_messages:
            logger.warning("No formatted messages were created. Adding a default user message.")
            formatted_messages.append({
                "role": "user", 
                "content": [{"type": "text", "text": "Hello"}]
            })
        
        # Log the formatted messages for debugging
        log_prefix = f"[Request: {self.request_id}]" if self.request_id else ""
        logger.debug(f"{log_prefix} Formatted messages for Anthropic: {json.dumps(formatted_messages, indent=2, default=str)}")
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
        formatted_tools = self._format_tools_for_anthropic(tools) if tools else None
        
        # Process messages
        processed_messages = []
        system_message = None
        
        # First pass: collect system message and clean history
        for msg in messages:
            if isinstance(msg, SystemMessage):
                # Keep only the last system message
                system_message = msg
            else:
                processed_messages.append(msg)
        
        # Add system message at the beginning if present
        if system_message:
            processed_messages.insert(0, system_message)
        
        # Ensure we have at least one message
        if not processed_messages and not system_message:
            logger.warning(f"{log_prefix} No messages provided to invoke. Adding a default human message.")
            processed_messages.append(HumanMessage(content="Hello"))
            
        # Format messages for Anthropic
        formatted_messages = self._format_messages_for_anthropic(processed_messages)
        logger.debug(f"{log_prefix} Formatted messages: {formatted_messages}")
            
        try:
            response = self.llm.invoke(
                formatted_messages,
                tools=formatted_tools
            )
            
            # Extract text content from response
            if isinstance(response.content, list):
                # For structured responses with multiple content blocks
                text_content = ""
                tool_calls = []
                
                for block in response.content:
                    if block.get("type") == "text":
                        text_content += block.get("text", "")
                    elif block.get("type") == "tool_use":
                        tool_calls.append({
                            "id": block.get("id"),
                            "name": block.get("name"),
                            "function": {
                                "name": block.get("name"),
                                "arguments": json.dumps(block.get("input", {}))
                            }
                        })
                
                # Create AIMessage with proper content
                response = AIMessage(
                    content=text_content,
                    additional_kwargs={"tool_calls": tool_calls} if tool_calls else {}
                )
            
            # Log the response for debugging
            logger.debug(f"{log_prefix} Anthropic response: {json.dumps({'content': response.content, 'kwargs': response.additional_kwargs}, indent=2, default=str)}")
            
            return response
            
        except Exception as e:
            logger.error(f"{log_prefix} Error in Anthropic API call: {str(e)}")
            raise
        
    def get_model_name(self) -> str:
        """Get the name of the model being used."""
        return self.model_name
