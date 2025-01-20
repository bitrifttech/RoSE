import logging
import traceback
import json
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import os
from pathlib import Path
from langchain_openai import ChatOpenAI
from langchain.agents import AgentExecutor, create_openai_functions_agent
from langchain_core.prompts import MessagesPlaceholder, ChatPromptTemplate
from langchain_core.messages import HumanMessage, AIMessage, SystemMessage
from langchain.callbacks.base import BaseCallbackHandler
from langchain.memory import ConversationSummaryMemory
import traceback

from tools.agent_tools import get_agent_tools
from prompts.system import get_agent_prompt

# Configure logging
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Store for conversation memories
memory_store = {}

def get_memory(session_id: str, llm):
    """Get or create a conversation memory for a session"""
    if session_id not in memory_store:
        memory_store[session_id] = ConversationSummaryMemory(
            llm=llm,
            max_token_limit=2000,
            return_messages=True
        )
    return memory_store[session_id]

# Custom callback handler for detailed logging
class DetailedLogger(BaseCallbackHandler):
    def on_llm_start(self, serialized, prompts, **kwargs):
        logger.info(f"LLM started with prompts: {prompts}")
        
    def on_llm_end(self, response, **kwargs):
        logger.info(f"LLM ended with response: {response}")
        
    def on_llm_error(self, error, **kwargs):
        logger.error(f"LLM error: {error}")
        
    def on_tool_start(self, serialized, input_str, **kwargs):
        logger.info(f"Tool started: {serialized['name']} with input: {input_str}")
        
    def on_tool_end(self, output, **kwargs):
        logger.info(f"Tool ended with output: {output}")
        
    def on_tool_error(self, error, **kwargs):
        logger.error(f"Tool error: {error}")
        
    def on_chain_start(self, serialized, inputs, **kwargs):
        logger.info(f"Chain started with inputs: {inputs}")
        
    def on_chain_end(self, outputs, **kwargs):
        logger.info(f"Chain ended with outputs: {outputs}")
        
    def on_chain_error(self, error, **kwargs):
        logger.error(f"Chain error: {error}")
        
    def on_text(self, text, **kwargs):
        logger.info(f"Text: {text}")

app = FastAPI()

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class QueryInput(BaseModel):
    input: str
    session_id: str = "default"  # Add session_id field with default value

@app.get("/")
async def root():
    logger.info("Root endpoint called")
    return {"status": "ok", "message": "RoSE Agent API server is running"}

def format_chat_history(messages):
    """Format chat messages for logging"""
    formatted = []
    for msg in messages:
        if isinstance(msg, (HumanMessage, AIMessage, SystemMessage)):
            formatted.append({
                "role": msg.__class__.__name__.replace("Message", "").lower(),
                "content": msg.content
            })
        else:
            formatted.append(str(msg))
    return formatted

@app.post("/run")
async def run_agent(query: QueryInput):
    logger.info("="*50)
    logger.info(f"New request received: {query.input}")
    logger.info("="*50)
    
    if agent_executor is None:
        logger.error("Agent executor not initialized")
        raise HTTPException(
            status_code=500,
            detail="Agent failed to initialize. Check server logs for details."
        )
    
    try:
        # Get memory for this session
        memory = get_memory(query.session_id, llm)
        
        # Get chat history
        memory_vars = memory.load_memory_variables({})
        chat_history = memory_vars.get("history", [])
        
        # Log chat history in a readable format
        logger.info(f"Loaded chat history: {format_chat_history(chat_history)}")
        
        # Execute the agent with the input and history
        logger.info("Starting agent execution...")
        result = agent_executor.invoke({
            "input": query.input,
            "chat_history": chat_history
        })
        logger.info("Agent execution completed")
        
        # Extract and log the output
        output = result.get("output", "No output generated")
        logger.info(f"Agent output: {output}")
        
        # Save the interaction to memory
        memory.save_context(
            {"input": query.input},
            {"output": output}
        )
        
        # Log updated chat history
        updated_history = memory.load_memory_variables({}).get("history", [])
        logger.info(f"Updated chat history: {format_chat_history(updated_history)}")
        
        # Check if there's intermediate thought process or tool usage
        intermediate_steps = result.get("intermediate_steps", [])
        actions = []
        
        for step in intermediate_steps:
            if len(step) >= 2:  # Should have action and output
                action, action_output = step
                actions.append({
                    "tool": action.tool,
                    "tool_input": action.tool_input,
                    "output": str(action_output)
                })
        
        # Return both the final output and any intermediate actions
        return {
            "result": {
                "text": output,
                "actions": actions
            }
        }
        
    except Exception as e:
        logger.error("="*50)
        logger.error("AGENT EXECUTION FAILED")
        logger.error("="*50)
        logger.error(f"Error type: {type(e)}")
        logger.error(f"Error message: {str(e)}")
        logger.error("Traceback:")
        logger.error(traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))

# Initialize the agent components
try:
    logger.info("="*50)
    logger.info("Starting agent initialization")
    logger.info("="*50)
    
    # Initialize the LLM
    logger.info("Initializing LLM...")
    logger.info(f"OpenAI API Key present: {'OPENAI_API_KEY' in os.environ}")
    llm = ChatOpenAI(
        model="gpt-4o-mini",
        temperature=0.7,
        callbacks=[DetailedLogger()],
    )
    logger.info("LLM initialized successfully")
    
    # Get tools
    logger.info("Initializing agent tools...")
    tools = get_agent_tools()
    for tool in tools:
        logger.info(f"Initialized tool: {tool.name} - {tool.description}")
    logger.info(f"Total tools initialized: {len(tools)}")
    
    # Create the prompt template with chat history
    logger.info("Creating prompt template...")
    prompt = get_agent_prompt()  # Get the prompt from system.py
    logger.info("Prompt template created successfully")
    
    # Create the agent
    logger.info("Creating agent...")
    agent = create_openai_functions_agent(llm, tools, prompt)
    logger.info("Agent created successfully")
    
    # Create the agent executor
    logger.info("Creating agent executor...")
    agent_executor = AgentExecutor(
        agent=agent,
        tools=tools,
        verbose=True,
        handle_parsing_errors=True,
        callbacks=[DetailedLogger()],
    )
    logger.info("Agent executor created successfully")
    
    logger.info("="*50)
    logger.info("Agent initialization complete!")
    logger.info("="*50)
    
except Exception as e:
    logger.error("="*50)
    logger.error("AGENT INITIALIZATION FAILED")
    logger.error("="*50)
    logger.error(f"Error type: {type(e)}")
    logger.error(f"Error message: {str(e)}")
    logger.error("Traceback:")
    logger.error(traceback.format_exc())
    agent_executor = None

if __name__ == "__main__":
    import uvicorn
    logger.info("Starting server...")
    uvicorn.run(app, host="0.0.0.0", port=8000)
