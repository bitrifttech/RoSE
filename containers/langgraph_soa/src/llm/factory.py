from typing import Dict, Type
from .base import BaseLLM
from .openai_llm import OpenAILLM

class LLMFactory:
    """Factory for creating LLM instances."""
    
    _llm_types: Dict[str, Type[BaseLLM]] = {
        "openai": OpenAILLM
    }
    
    @classmethod
    def register_llm(cls, name: str, llm_class: Type[BaseLLM]) -> None:
        """Register a new LLM implementation."""
        cls._llm_types[name] = llm_class
        
    @classmethod
    def create_llm(cls, llm_type: str, **kwargs) -> BaseLLM:
        """Create an instance of the specified LLM type."""
        if llm_type not in cls._llm_types:
            raise ValueError(f"Unknown LLM type: {llm_type}")
            
        llm_class = cls._llm_types[llm_type]
        llm = llm_class(**kwargs)
        llm.initialize()
        return llm
        
    @classmethod
    def get_available_llms(cls) -> Dict[str, Type[BaseLLM]]:
        """Get all registered LLM types."""
        return cls._llm_types.copy()
