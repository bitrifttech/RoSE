import os
import logging
from pathlib import Path
from dotenv import load_dotenv

logger = logging.getLogger(__name__)

def load_env_variables():
    """Load environment variables from .env file.
    
    This function attempts to load environment variables from:
    1. The .env file in the current directory
    2. The .env file in the parent directory
    3. The .env file in the root directory
    """
    # Try to load from current directory
    if load_dotenv():
        logger.info("Loaded environment variables from .env in current directory")
        return True
    
    # Try to load from parent directory
    parent_env = Path("../.env")
    if parent_env.exists() and load_dotenv(parent_env):
        logger.info("Loaded environment variables from .env in parent directory")
        return True
    
    # Try to load from root directory
    root_env = Path("/Users/trips/bitrift/RoSE/.env")
    if root_env.exists() and load_dotenv(root_env):
        logger.info("Loaded environment variables from .env in root directory")
        return True
    
    logger.warning("Could not find .env file")
    return False

def get_api_key(provider: str) -> str:
    """Get API key for a specific provider.
    
    Args:
        provider: The provider name (openai, anthropic, deepseek)
        
    Returns:
        The API key if found, empty string otherwise
    """
    key_mapping = {
        'openai': 'OPENAI_API_KEY',
        'anthropic': 'ANTHROPIC_API_KEY',
        'deepseek': 'DEEPSEEK_API_KEY',
        'cerebras': 'CEREBRAS_API_KEY'
    }
    
    env_var = key_mapping.get(provider.lower())
    if not env_var:
        logger.warning(f"Unknown provider: {provider}")
        return ""
    
    api_key = os.environ.get(env_var, "")
    if not api_key:
        logger.warning(f"API key for {provider} not found in environment variables")
    
    return api_key 