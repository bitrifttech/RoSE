from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import json
import os
from pathlib import Path
from langchain.chains import LLMChain
from langchain_core.prompts import PromptTemplate
from langchain_openai import ChatOpenAI
import traceback

app = FastAPI()

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Get the directory where this file is located
CURRENT_DIR = Path(__file__).parent
JSON_FILE_PATH = CURRENT_DIR / "sa.json"

# Load the flow at startup
try:
    print(f"\nAttempting to load flow from: {JSON_FILE_PATH}")
    with open(JSON_FILE_PATH) as f:
        flow_data = json.load(f)
    
    # Create a simple chain from the flow data
    template = flow_data.get("template", "{input}")
    prompt = PromptTemplate(template=template, input_variables=["input"])
    llm = ChatOpenAI(temperature=0.7)
    flow = LLMChain(llm=llm, prompt=prompt)
    print("Flow loaded successfully!")
except Exception as e:
    print(f"\nError loading flow: {str(e)}")
    print(f"Error type: {type(e)}")
    print("Traceback:")
    print(traceback.format_exc())
    flow = None

class QueryInput(BaseModel):
    input: str

@app.get("/")
async def root():
    return {"status": "ok", "message": "Langflow API server is running"}

@app.post("/run")
async def run_flow(query: QueryInput):
    if flow is None:
        raise HTTPException(status_code=500, detail="Flow failed to load. Check server logs for details.")
    
    try:
        # Execute the flow with the input
        result = flow.invoke({"input": query.input})
        return {"result": result}
    except Exception as e:
        error_msg = f"Error executing flow: {str(e)}\nTraceback:\n{traceback.format_exc()}"
        print(error_msg)
        raise HTTPException(status_code=500, detail=error_msg)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
