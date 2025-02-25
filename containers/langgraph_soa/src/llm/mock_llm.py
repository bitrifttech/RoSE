from typing import List, Dict, Any, Optional
import logging
from langchain_core.messages import BaseMessage, AIMessage

from .base import BaseLLM

logger = logging.getLogger(__name__)

class MockLLM(BaseLLM):
    """Mock implementation of the LLM interface for testing."""
    
    def __init__(self, model_name: str = "mock-model", temperature: float = 0.7, max_tokens: int = 4096):
        super().__init__(model_name, temperature)
        self.max_tokens = max_tokens
        self.request_id = None
        
    def initialize(self) -> None:
        """Initialize the mock LLM (no-op)."""
        logger.info("Initialized mock LLM for testing")
        
    def set_request_id(self, request_id: str) -> None:
        """Set the request ID for logging."""
        self.request_id = request_id
        
    def invoke(self, messages: List[BaseMessage], tools: Optional[List[Dict[str, Any]]] = None) -> AIMessage:
        """Mock invoke method that returns a predefined response."""
        logger.debug(f"[MockLLM] Invoking with {len(messages)} messages and {len(tools) if tools else 0} tools")
        
        # Check if there are tool definitions
        if tools:
            # Return a response with a tool call
            return AIMessage(
                content="I'll help you with that task. Let me use a tool to assist.",
                additional_kwargs={
                    "tool_calls": [
                        {
                            "id": "call_1",
                            "function": {
                                "name": "python_repl",
                                "arguments": "{\"code\": \"def factorial(n):\\n    if n == 0 or n == 1:\\n        return 1\\n    else:\\n        return n * factorial(n-1)\\n\\n# Example usage\\nprint(factorial(5))\"}"
                            }
                        }
                    ]
                }
            )
        
        # Default response without tool calls
        return AIMessage(
            content="Here's a Python function to calculate the factorial of a number:\n\n```python\ndef factorial(n):\n    if n == 0 or n == 1:\n        return 1\n    else:\n        return n * factorial(n-1)\n\n# Example usage\nprint(factorial(5))\n```\n\nThis function uses recursion to calculate the factorial. It first checks if the number is 0 or n == 1, in which case it returns 1 (as 0! = 1 and 1! = 1). Otherwise, it multiplies the number by the factorial of (n-1)."
        )
        
    def get_model_name(self) -> str:
        """Get the name of the model being used."""
        return self.model_name 