from typing import Dict, Type, Optional

from .base import BaseLLM
from .openai_llm import OpenAILLM
from .anthropic_llm import AnthropicLLM
from .deepseek_llm import DeepSeekLLM
from .mock_llm import MockLLM
from ..config.llm_config import LLMConfig

class LLMFactory:
    """Factory for creating LLM instances."""
    
    _llm_registry: Dict[str, Type[BaseLLM]] = {
        'openai': OpenAILLM,
        'anthropic': AnthropicLLM,
        'deepseek': DeepSeekLLM,
        'mock': MockLLM,  # Add mock LLM for testing
    }
    
    @classmethod
    def register_llm(cls, name: str, llm_class: Type[BaseLLM]) -> None:
        """Register a new LLM implementation."""
        cls._llm_registry[name] = llm_class
        
    @classmethod
    def create_llm(cls, config: LLMConfig) -> BaseLLM:
        """Create an LLM instance based on configuration."""
        llm_class = cls._llm_registry.get(config.llm_type)
        if not llm_class:
            raise ValueError(f"Unknown LLM type: {config.llm_type}")
            
        llm = llm_class(
            model_name=config.model_name,
            temperature=config.temperature,
            **(config.additional_params or {})
        )
        
        # Initialize the LLM
        llm.initialize()
        
        # Store the LLM instance in the config for reuse
        config.llm = llm
        
        return llm

    @classmethod
    def get_available_llms(cls) -> Dict[str, Type[BaseLLM]]:
        """Get all registered LLM types."""
        return cls._llm_registry.copy()
