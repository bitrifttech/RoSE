#!/usr/bin/env python3
"""
Test script for the refactored multi-agent system.
This script tests the basic functionality of the refactored system
before implementing additional agents.
"""

import logging
import json
from langchain_core.messages import HumanMessage, AIMessage
from src.agent.graph import agent, ProjectState
from src.config.llm_config import LLMConfig
from src.llm.factory import LLMFactory
from src.llm.mock_llm import MockLLM
from src.config.env_loader import load_env_variables

# Set up logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

def test_basic_functionality():
    """Test that the refactored system works with the new ProjectState."""
    
    # Load environment variables
    load_env_variables()
    
    # Configure the mock LLM
    mock_config = LLMConfig(
        llm_type="mock",
        model_name="mock-model",
        temperature=0.7
    )
    
    # Create the LLM instance
    mock_llm = LLMFactory.create_llm(mock_config)
    
    # Update the agent's LLM configuration
    agent.coding_agent.llm = mock_llm
    
    # Create initial state with all fields for multi-agent support
    state = {
        "messages": [
            HumanMessage(content="Write a simple Python function to calculate the factorial of a number.")
        ],
        "pending_response": None,
        "chat_history": [],
        "session_id": "test-session",
        "current_phase": "requirements",
        # Multi-agent specific fields
        "requirements": [],
        "architecture_decisions": [],
        "code_components": {},
        "test_results": [],
        "documentation": {},
        # Feedback fields
        "error_logs": [],
        "architecture_feedback": [],
        "code_feedback": [],
        "test_feedback": [],
        "documentation_feedback": [],
        "pending_manager_review": True
    }
    
    # Run the agent
    logger.info("Running agent with refactored state...")
    result = agent.run(state)
    
    # Check that we got a response
    messages = result["messages"]
    last_message = next(
        (msg for msg in reversed(messages) if isinstance(msg, AIMessage)), 
        None
    )
    
    if last_message:
        logger.info(f"Agent response: {last_message.content[:200]}...")
        logger.info(f"Current phase: {result.get('current_phase', 'unknown')}")
        return True
    else:
        logger.error("No response from agent")
        return False

if __name__ == "__main__":
    success = test_basic_functionality()
    if success:
        print("✅ Test passed: The refactored system works correctly.")
    else:
        print("❌ Test failed: The refactored system did not produce a response.") 