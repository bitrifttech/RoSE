from typing import List, Dict, Any, Optional
import os
from openai import OpenAI
from langchain_core.messages import BaseMessage, HumanMessage, AIMessage, SystemMessage
from langchain_core.language_models.chat_models import BaseChatModel
from langchain_core.outputs import ChatGeneration, ChatResult

from .base import BaseLLM

class DeepSeekChat(BaseChatModel):
    """Custom implementation of DeepSeek chat model using OpenAI SDK."""
    
    api_key: Optional[str] = None
    model_name: str = "deepseek-chat"
    temperature: float = 0.7
    client: Optional[OpenAI] = None
    
    def __init__(self, api_key: str, model_name: str = "deepseek-chat", temperature: float = 0.7):
        super().__init__()
        self.api_key = api_key
        self.model_name = model_name
        self.temperature = temperature
        self.client = OpenAI(
            api_key=api_key,
            base_url="https://api.deepseek.com/v1"
        )
        
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
        messages_dict = [self._convert_message_to_dict(m) for m in messages]
        
        response = self.client.chat.completions.create(
            model=self.model_name,
            messages=messages_dict,
            temperature=self.temperature,
            stop=stop,
            **kwargs
        )
        
        message = response.choices[0].message
        
        generation = ChatGeneration(
            message=AIMessage(content=message.content),
            generation_info=dict(finish_reason=response.choices[0].finish_reason)
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
            model_name=self.model_name,
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
        
    def get_model_name(self) -> str:
        """Get the name of the model being used."""
        return self.model_name
