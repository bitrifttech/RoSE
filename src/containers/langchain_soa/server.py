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
from langchain_core.prompts import MessagesPlaceholder
from langchain_core.messages import HumanMessage, AIMessage
from langchain.callbacks.base import BaseCallbackHandler
import traceback

from tools.agent_tools import get_agent_tools
from prompts.system import get_agent_prompt

# Configure logging
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

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

# Initialize the agent components
try:
    logger.info("="*50)
    logger.info("Starting agent initialization")
    logger.info("="*50)
    
    # Initialize the LLM
    logger.info("Initializing LLM...")
    logger.info(f"OpenAI API Key present: {'OPENAI_API_KEY' in os.environ}")
    llm = ChatOpenAI(
        model="gpt-4o",
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
    
    # Create the prompt template
    logger.info("Creating prompt template...")
    prompt = get_agent_prompt()
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

class QueryInput(BaseModel):
    input: str

@app.get("/")
async def root():
    logger.info("Root endpoint called")
    return {"status": "ok", "message": "RoSE Agent API server is running"}

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
        # Execute the agent with the input
        logger.info("Starting agent execution...")
        result = agent_executor.invoke({"input": query.input})
        logger.info("Agent execution completed")
        logger.debug(f"Full result: {json.dumps(result, indent=2)}")
        
        # Extract the relevant output
        output = result.get("output", "No output generated")
        logger.info(f"Final output: {output}")
        
        return {"result": {"text": output}}
    except Exception as e:
        logger.error("="*50)
        logger.error("AGENT EXECUTION FAILED")
        logger.error("="*50)
        logger.error(f"Error type: {type(e)}")
        logger.error(f"Error message: {str(e)}")
        logger.error("Traceback:")
        logger.error(traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    logger.info("Starting server...")
    uvicorn.run(app, host="0.0.0.0", port=8001)
