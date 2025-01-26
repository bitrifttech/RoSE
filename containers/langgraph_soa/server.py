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
from src.agent.graph import agent
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
        
        # Pass request ID to LLM if supported
        if hasattr(current_llm_config.llm, 'set_request_id'):
            current_llm_config.llm.set_request_id(request_id)
        
        # Log current LLM configuration
        logger.info(f"[Request: {request_id}] 🚀 Starting request with LLM API: {current_llm_config.llm_type}, Model: {current_llm_config.model_name}")
        
        # Extract input and session ID
        user_input = data.get("input", "")
        session_id = data.get("session_id", "default")
        
        if not user_input:
            return JSONResponse(
                status_code=400,
                content={"error": "No input provided"}
            )
        
        # Create initial state with chat history
        state = {
            "messages": [
                HumanMessage(content=user_input)
            ],
            "pending_response": None,
            "chat_history": [],
            "session_id": session_id
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
            
            # Extract tool calls and responses
            tool_calls = []
            current_tool_call = None
            
            for msg in messages:
                if isinstance(msg, AIMessage):
                    tool_calls_data = msg.additional_kwargs.get('tool_calls', [])
                    for tc in tool_calls_data:
                        current_tool_call = {
                            'id': tc.get('id'),
                            'name': tc.get('function', {}).get('name'),
                            'arguments': tc.get('function', {}).get('arguments'),
                            'response': None
                        }
                        tool_calls.append(current_tool_call)
                elif isinstance(msg, ToolMessage) and current_tool_call and msg.tool_call_id == current_tool_call['id']:
                    current_tool_call['response'] = msg.content
            
            response = {
                'response': last_message.content if last_message else "No response generated",
                'tool_calls': tool_calls,
                'session_id': session_id
            }
            
            # Update chat history
            chat_history = result.get("chat_history", [])
            chat_histories[session_id] = chat_history
            
            # Filter out the original message from the response
            filtered_messages = [msg for msg in messages if not (
                isinstance(msg, HumanMessage) and 
                msg.content == user_input
            ) and not isinstance(msg, SystemMessage)]  # Also filter out system messages
            
            # Deduplicate messages while preserving order
            seen_contents = set()
            deduplicated_messages = []
            for msg in filtered_messages:
                # Create a hashable key from message content and type
                msg_key = (
                    msg.__class__.__name__,
                    msg.content,
                    # Handle tool messages specially
                    getattr(msg, 'tool_call_id', None) if isinstance(msg, ToolMessage) else None,
                    getattr(msg, 'name', None) if isinstance(msg, ToolMessage) else None
                )
                
                if msg_key not in seen_contents:
                    seen_contents.add(msg_key)
                    deduplicated_messages.append(msg)
            
            # Properly serialize each message with all fields
            serialized_messages = []
            for msg in deduplicated_messages:
                msg_dict = {
                    "role": msg.__class__.__name__.replace("Message", "").lower(),
                    "content": msg.content
                }
                
                # Add tool-specific fields for tool messages
                if isinstance(msg, ToolMessage):
                    msg_dict.update({
                        "tool_call_id": getattr(msg, "tool_call_id", None),
                        "name": getattr(msg, "name", None)
                    })
                
                # Add any additional kwargs (like tool_calls)
                if hasattr(msg, "additional_kwargs") and msg.additional_kwargs:
                    msg_dict.update(msg.additional_kwargs)
                
                serialized_messages.append(msg_dict)
            
            logger.debug(f"[Request: {request_id}] Serialized messages: {json.dumps(serialized_messages, indent=2)}")
            logger.debug(f"[Request: {request_id}] Chat history for session {session_id}: {json.dumps(chat_history, indent=2)}")
            
            # Ensure we have at least one message in the response
            if not serialized_messages:
                serialized_messages = [{
                    "role": "ai",
                    "content": last_message.content
                }]
            
            response.update({
                "messages": serialized_messages,
                "chat_history": chat_history
            })
            
            return JSONResponse(content=response)
            
        except Exception as e:
            logger.error(f"[Request: {request_id}] Error in run_agent: {str(e)}")
            logger.error(f"[Request: {request_id}] Traceback: {traceback.format_exc()}")
            return JSONResponse(
                status_code=500,
                content={"error": f"Agent error: {str(e)}"}
            )
            
    except Exception as e:
        logger.error(f"[Request: {request_id}] Error processing request: {str(e)}")
        return JSONResponse(
            status_code=400,
            content={"error": f"Invalid request: {str(e)}"}
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
async def update_llm_config(config: LLMConfigInput):
    """Update LLM configuration."""
    global current_llm_config
    global agent
    
    try:
        # Create new config
        new_config = LLMConfig(
            llm_type=config.llm_type,
            model_name=config.model_name,
            temperature=config.temperature,
            additional_params=config.additional_params
        )
        
        # Try to create LLM with new config to validate it
        LLMFactory.create_llm(new_config)
        
        # If successful, update current config and recreate agent
        current_llm_config = new_config
        agent = agent.__class__(llm_config=current_llm_config)
        
        return {"status": "success", "config": current_llm_config.to_dict()}
    except Exception as e:
        logger.error(f"Error updating LLM config: {str(e)}\n{traceback.format_exc()}")
        raise HTTPException(status_code=400, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
