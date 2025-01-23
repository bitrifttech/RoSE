from typing import Dict, Any, Optional
from dataclasses import dataclass, field
from ..llm.base import BaseLLM

@dataclass
class LLMConfig:
    """Configuration for LLM settings."""
    llm_type: str
    model_name: str
    temperature: float
    additional_params: Dict[str, Any] = None
    _llm: Optional[BaseLLM] = field(default=None, init=False)
    
    @property
    def llm(self) -> Optional[BaseLLM]:
        """Get the LLM instance."""
        return self._llm
        
    @llm.setter
    def llm(self, value: BaseLLM) -> None:
        """Set the LLM instance."""
        self._llm = value
    
    @classmethod
    def from_dict(cls, config: Dict[str, Any]) -> 'LLMConfig':
        """Create LLMConfig from a dictionary."""
        additional_params = config.copy()
        for key in ['llm_type', 'model_name', 'temperature']:
            additional_params.pop(key, None)
            
        return cls(
            llm_type=config['llm_type'],
            model_name=config['model_name'],
            temperature=config['temperature'],
            additional_params=additional_params
        )
        
    def to_dict(self) -> Dict[str, Any]:
        """Convert config to dictionary."""
        config = {
            'llm_type': self.llm_type,
            'model_name': self.model_name,
            'temperature': self.temperature,
        }
        if self.additional_params:
            config.update(self.additional_params)
        return config

# Default configuration
DEFAULT_CONFIG = LLMConfig(
    llm_type='openai',
    model_name='gpt-4-turbo-preview',
    temperature=0.7,
)
