from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Any
import os
import json
import logging
import traceback
from langchain_core.messages import HumanMessage, AIMessage, ToolMessage, SystemMessage
from src.agent.graph import agent, ProjectState
from src.llm.factory import LLMFactory
from src.config.llm_config import LLMConfig, DEFAULT_CONFIG

# Set up logging
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s [%(levelname)s] %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)
logger = logging.getLogger(__name__)

# Global variables
chat_histories: Dict[str, List[Dict[str, str]]] = {}
current_llm_config: LLMConfig = DEFAULT_CONFIG

# Create LLM instance on startup
LLMFactory.create_llm(current_llm_config)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:8090", "http://localhost:3000"],  # Allow both dev and prod origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class QueryInput(BaseModel):
    input: str
    session_id: str = "default"  # Add session ID to support multiple conversations

class LLMConfigInput(BaseModel):
    llm_type: str
    model_name: str
    temperature: float = 0.7
    additional_params: Dict[str, Any] = None

@app.get("/")
def root():
    return {"message": "RoSE LangGraph Agent API"}

@app.post("/run")
async def run_agent(request: Request):
    """Run the agent with the given input."""
    try:
        # Get request data
        data = await request.json()
        
        # Generate request ID
        request_id = os.urandom(4).hex()
        logger.info(f"[Request: {request_id}] 🚀 Starting request with LLM API: {current_llm_config.llm_type}, Model: {current_llm_config.model_name}")
        
        # Pass request ID to LLM
        if current_llm_config.llm and hasattr(current_llm_config.llm, 'set_request_id'):
            current_llm_config.llm.set_request_id(request_id)
        
        # Extract input and session ID
        user_input = data.get("input", "")
        session_id = data.get("session_id", "default")
        phase = data.get("phase", "requirements")  # Default to requirements phase
        
        if not user_input:
            return JSONResponse(
                status_code=400,
                content={"error": "No input provided"}
            )
        
        # Create initial state with all fields for multi-agent support
        state = {
            "messages": [
                HumanMessage(content=user_input)
            ],
            "pending_response": None,
            "chat_history": [],
            "session_id": session_id,
            "current_phase": phase,
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
            "pending_manager_review": True  # Start with manager review
        }
        
        # Run the agent
        try:
            result = agent.run(state)
            
            # Format the response
            messages = result["messages"]
            last_message = next(
                (msg for msg in reversed(messages) if isinstance(msg, AIMessage)), 
                None
            )
            
            # Prepare artifacts for response
            artifacts = {
                "requirements": result.get("requirements", []),
                "architecture_decisions": result.get("architecture_decisions", []),
                "code_components": result.get("code_components", {}),
                "test_results": result.get("test_results", []),
                "documentation": result.get("documentation", {})
            }
            
            response = {
                "response": last_message.content if last_message else "",
                "phase": result.get("current_phase", phase),
                "artifacts": artifacts
            }
            
            logger.info(f"[Request: {request_id}] ✅ Request completed successfully")
            return JSONResponse(content=response)
            
        except Exception as e:
            error_msg = f"Error running agent: {str(e)}"
            logger.error(f"[Request: {request_id}] ❌ {error_msg}")
            logger.error(traceback.format_exc())
            return JSONResponse(
                status_code=500,
                content={"error": error_msg}
            )
    except Exception as e:
        error_msg = f"Error processing request: {str(e)}"
        logger.error(error_msg)
        logger.error(traceback.format_exc())
        return JSONResponse(
            status_code=500,
            content={"error": error_msg}
        )

@app.get("/health")
async def health():
    return {"status": "ok"}

@app.get("/api/llm/available")
async def get_available_llms():
    """Get available LLM APIs and their models."""
    llm_info = {
        'openai': {
            'name': 'OpenAI',
            'models': ['gpt-3.5-turbo', 'gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo']
        },
        'anthropic': {
            'name': 'Anthropic',
            'models': ['claude-3-5-sonnet-20241022', 'claude-3-5-haiku-20241022', 'claude-3-opus-20240229']
        },
        'deepseek': {
            'name': 'DeepSeek',
            'models': ['deepseek-chat', 'deepseek-coder', 'deepseek-reasoner']
        }
    }
    
    return {
        'available_llms': llm_info,
        'current_config': current_llm_config.to_dict()
    }

@app.get("/api/llm/config")
async def get_llm_config():
    """Get current LLM configuration."""
    return current_llm_config.to_dict()

@app.post("/api/llm/config")
async def update_llm_config(config_input: LLMConfigInput):
    """Update the LLM configuration."""
    global current_llm_config
    
    try:
        # Create new config
        new_config = LLMConfig(
            llm_type=config_input.llm_type,
            model_name=config_input.model_name,
            temperature=config_input.temperature,
            additional_params=config_input.additional_params
        )
        
        # Create new LLM instance
        new_llm = LLMFactory.create_llm(new_config)
        
        # Update global config
        current_llm_config = new_config
        
        # Log the change
        logger.info(f"LLM configuration updated: {current_llm_config.to_dict()}")
        
        return JSONResponse(content={
            "status": "success",
            "config": current_llm_config.to_dict()
        })
    except Exception as e:
        logger.error(f"Error updating LLM config: {str(e)}")
        return JSONResponse(
            status_code=500,
            content={"error": f"Failed to update LLM configuration: {str(e)}"}
        )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
