from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Any
import os
import json
import logging
import traceback
from langchain_core.messages import HumanMessage, AIMessage, ToolMessage
from src.agent.graph import graph

# Set up logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class QueryInput(BaseModel):
    input: str

@app.get("/")
def root():
    return {"message": "RoSE LangGraph Agent API"}

@app.post("/run")
async def run_agent(request: Request):
    """Run the agent with the given input."""
    try:
        # Get request data
        data = await request.json()
        user_input = data.get("input", "")
        
        if not user_input:
            return JSONResponse(
                status_code=400,
                content={"error": "No input provided"}
            )
        
        # Create initial state
        state = {
            "messages": [
                HumanMessage(content=user_input)
            ],
            "pending_response": None,
            "iteration_count": 0
        }
        
        try:
            # Run the agent
            result = graph.invoke(state)
            
            # Extract messages
            messages = result.get("messages", [])
            if not messages:
                return JSONResponse(
                    status_code=500,
                    content={"error": "No response from agent"}
                )
            
            # Get the last assistant message
            last_assistant_msg = next(
                (msg for msg in reversed(messages) 
                 if isinstance(msg, AIMessage)), 
                None
            )
            
            if not last_assistant_msg:
                return JSONResponse(
                    status_code=500,
                    content={"error": "No assistant response found"}
                )
            
            # Properly serialize each message with all fields
            serialized_messages = []
            for msg in messages:
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
            
            logger.debug(f"Serialized messages: {json.dumps(serialized_messages, indent=2)}")
            
            return JSONResponse(content={
                "response": last_assistant_msg.content,
                "messages": serialized_messages
            })
            
        except Exception as e:
            logger.error(f"Error in run_agent: {str(e)}")
            logger.error(f"Traceback: {traceback.format_exc()}")
            return JSONResponse(
                status_code=500,
                content={"error": f"Agent error: {str(e)}"}
            )
            
    except Exception as e:
        logger.error(f"Error processing request: {str(e)}")
        return JSONResponse(
            status_code=400,
            content={"error": f"Invalid request: {str(e)}"}
        )

@app.get("/health")
async def health():
    return {"status": "ok"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
