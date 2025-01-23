from typing import List, Dict, Any, Optional, Union
import os
import json
import requests
from langchain_core.messages import BaseMessage, HumanMessage, AIMessage, SystemMessage
from langchain_core.language_models.chat_models import BaseChatModel
from langchain_core.outputs import ChatGeneration, ChatResult

from .base import BaseLLM

class DeepSeekChat(BaseChatModel):
    """Custom implementation of DeepSeek chat model."""
    
    api_url: str = "https://api.deepseek.com/v1/chat/completions"
    api_key: Optional[str] = None
    model_name: str = "deepseek-chat"
    temperature: float = 0.7
    
    def __init__(self, api_key: str, model_name: str = "deepseek-chat", temperature: float = 0.7):
        super().__init__()
        self.api_key = api_key
        self.model_name = model_name
        self.temperature = temperature
        
    def _convert_message_to_dict(self, message: BaseMessage) -> Dict[str, str]:
        if isinstance(message, SystemMessage):
            return {"role": "system", "content": message.content}
        elif isinstance(message, HumanMessage):
            return {"role": "user", "content": message.content}
        elif isinstance(message, AIMessage):
            return {"role": "assistant", "content": message.content}
        else:
            raise ValueError(f"Got unknown message type: {message}")
            
    def _generate(
        self,
        messages: List[BaseMessage],
        stop: Optional[List[str]] = None,
        run_manager: Optional[Any] = None,
        **kwargs: Any,
    ) -> ChatResult:
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {self.api_key}"
        }
        
        payload = {
            "model": self.model_name,
            "messages": [self._convert_message_to_dict(m) for m in messages],
            "temperature": self.temperature,
        }
        
        if stop:
            payload["stop"] = stop
            
        response = requests.post(
            self.api_url,
            headers=headers,
            json=payload,
        )
        response.raise_for_status()
        
        response_data = response.json()
        message = response_data["choices"][0]["message"]
        
        generation = ChatGeneration(
            message=AIMessage(content=message["content"]),
            generation_info=dict(finish_reason=response_data["choices"][0].get("finish_reason"))
        )
        return ChatResult(generations=[generation])
        
    @property
    def _llm_type(self) -> str:
        return "deepseek"

class DeepSeekLLM(BaseLLM):
    """DeepSeek implementation of the LLM interface."""
    
    def __init__(self, model_name: str = "deepseek-chat", temperature: float = 0.7):
        self.model_name = model_name
        self.temperature = temperature
        self.llm = None
        
    def initialize(self) -> None:
        """Initialize the DeepSeek LLM."""
        api_key = os.getenv("DEEPSEEK_API_KEY")
        if not api_key:
            raise ValueError("DEEPSEEK_API_KEY environment variable is not set")
            
        self.llm = DeepSeekChat(
            api_key=api_key,
            model=self.model_name,
            temperature=self.temperature,
        )
        
    def invoke(self, messages: List[BaseMessage], tools: List[Dict[str, Any]] = None) -> BaseMessage:
        """Invoke the DeepSeek LLM with messages and optional tools."""
        if not self.llm:
            self.initialize()
            
        return self.llm.invoke(
            messages,
            tools=tools
        )
