from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import os
from pathlib import Path
from langchain_openai import ChatOpenAI
from langchain.agents import AgentExecutor, create_openai_functions_agent
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain.memory import ConversationBufferMemory
import traceback

from tools.agent_tools import get_agent_tools

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
    print("\nInitializing agent components...")
    
    # Initialize the LLM
    llm = ChatOpenAI(
        model="gpt-4o",
        temperature=0.7,
    )
    
    # Get tools
    tools = get_agent_tools()
    
    # Create the prompt template
    prompt = ChatPromptTemplate.from_messages([
        ("system", """You are RoSE, an AI assistant with access to file system and command execution capabilities.
        Your purpose is to help users manage their development environment and execute tasks.
        Always be clear about what actions you're taking and provide helpful feedback.
        If you encounter errors, explain them clearly and suggest possible solutions."""),
        MessagesPlaceholder(variable_name="chat_history"),
        ("human", "{input}"),
        MessagesPlaceholder(variable_name="agent_scratchpad"),
    ])
    
    # Initialize conversation memory
    memory = ConversationBufferMemory(
        memory_key="chat_history",
        return_messages=True
    )
    
    # Create the agent
    agent = create_openai_functions_agent(llm, tools, prompt)
    
    # Create the agent executor
    agent_executor = AgentExecutor(
        agent=agent,
        tools=tools,
        memory=memory,
        verbose=True,
        handle_parsing_errors=True,
    )
    
    print("Agent components initialized successfully!")
except Exception as e:
    print(f"\nError initializing agent: {str(e)}")
    print(f"Error type: {type(e)}")
    print("Traceback:")
    print(traceback.format_exc())
    agent_executor = None

class QueryInput(BaseModel):
    input: str

@app.get("/")
async def root():
    return {"status": "ok", "message": "RoSE Agent API server is running"}

@app.post("/run")
async def run_agent(query: QueryInput):
    if agent_executor is None:
        raise HTTPException(
            status_code=500,
            detail="Agent failed to initialize. Check server logs for details."
        )
    
    try:
        # Execute the agent with the input
        result = agent_executor.invoke({"input": query.input})
        
        # Extract the relevant output
        output = result.get("output", "No output generated")
        
        return {"result": {"text": output}}
    except Exception as e:
        error_msg = f"Error executing agent: {str(e)}\nTraceback:\n{traceback.format_exc()}"
        print(error_msg)
        raise HTTPException(status_code=500, detail=error_msg)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
