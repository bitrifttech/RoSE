from langchain_openai import ChatOpenAI
from langgraph.graph import StateGraph, END
from langgraph.prebuilt import ToolNode
from langchain_core.messages import HumanMessage, AIMessage, SystemMessage, ToolMessage
from typing import TypedDict, Annotated, Sequence, Union, List, Dict, Any, Callable, Literal
import operator
import logging
import json

from tools.agent_tools import get_agent_tools

# Set up logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

# Initialize components
logger.info("Initializing components...")

# Get tools
tools = get_agent_tools()

# Initialize the LLM
llm = ChatOpenAI(
    model="gpt-4o",
    temperature=0.7,
)

# Create system message with tool descriptions
tool_descriptions = "\n".join(f"- {tool.name}: {tool.description}" for tool in tools)
system_msg = f"""You are RoSE, an AI assistant with access to file system and command execution capabilities.
Your purpose is to help users manage their development environment and execute tasks.
Always be clear about what actions you're taking and provide helpful feedback.

You have access to these tools:
{tool_descriptions}

When you need to use a tool, use the tool's function call format."""

# Define the state schema
class AgentState(TypedDict):
    messages: Annotated[Sequence[Union[HumanMessage, AIMessage, SystemMessage, ToolMessage]], operator.add]

# Function to determine next step
def should_continue(state: AgentState) -> Literal["tool", END]:
    """Route to the next step based on the last message."""
    try:
        messages = state["messages"]
        if not messages:
            return END
            
        last_message = messages[-1]
        logger.debug(f"Last message type: {type(last_message)}")
        logger.debug(f"Last message content: {last_message}")
        
        if isinstance(last_message, AIMessage) and hasattr(last_message, 'additional_kwargs'):
            tool_calls = last_message.additional_kwargs.get('tool_calls', [])
            if tool_calls:
                logger.debug(f"Found tool calls: {tool_calls}")
                return "tool"
        return END
    except Exception as e:
        logger.error(f"Error in should_continue: {str(e)}", exc_info=True)
        raise

# Function to call the LLM
def call_llm(state: AgentState) -> AgentState:
    """Call the LLM with the current messages."""
    try:
        messages = state["messages"]
        if len(messages) == 1:  # First message
            messages = [SystemMessage(content=system_msg)] + messages
            
        logger.debug(f"Calling LLM with messages: {messages}")
        
        # Create a list of tool configurations for the model
        tools_for_model = [{
            "type": "function",
            "function": {
                "name": tool.name,
                "description": tool.description,
                "parameters": tool.args_schema.schema()
            }
        } for tool in tools]
        
        # Call the model with tool configurations
        response = llm.invoke(messages, tools=tools_for_model)
        logger.debug(f"LLM response: {response}")
        
        return {"messages": messages + [response]}
    except Exception as e:
        logger.error(f"Error in call_llm: {str(e)}", exc_info=True)
        raise

# Function to call a tool
def call_tool(state: AgentState) -> AgentState:
    """Execute tool calls from the last message."""
    try:
        messages = state["messages"]
        last_message = messages[-1]
        
        # Get tool calls from the message
        tool_calls = last_message.additional_kwargs.get('tool_calls', [])
        if not tool_calls:
            logger.warning("No tool calls found in message")
            return state
            
        # Execute each tool call
        new_messages = []
        for tool_call in tool_calls:
            try:
                # Extract tool call info
                tool_call_id = tool_call.get('id')
                function_info = tool_call.get('function', {})
                action = function_info.get('name')
                args_str = function_info.get('arguments', '{}')
                
                if not action or not tool_call_id:
                    logger.warning(f"Invalid tool call format: {tool_call}")
                    # Even for invalid calls, we need to send a response
                    new_messages.append(
                        ToolMessage(
                            content="Invalid tool call format",
                            tool_call_id=tool_call_id or "unknown",
                            name=action or "unknown"
                        )
                    )
                    continue
                
                # Parse arguments
                try:
                    args = json.loads(args_str)
                except json.JSONDecodeError:
                    logger.error(f"Failed to parse tool arguments: {args_str}")
                    new_messages.append(
                        ToolMessage(
                            content=f"Failed to parse tool arguments: {args_str}",
                            tool_call_id=tool_call_id,
                            name=action
                        )
                    )
                    continue
                
                logger.debug(f"Executing tool: {action} with args: {args}")
                
                # Execute the tool
                tool_to_use = next((t for t in tools if t.name == action), None)
                if tool_to_use is None:
                    error_msg = f"Tool {action} not found"
                    logger.error(error_msg)
                    new_messages.append(
                        ToolMessage(
                            content=error_msg,
                            tool_call_id=tool_call_id,
                            name=action
                        )
                    )
                    continue

                result = tool_to_use._run(**args)
                new_messages.append(
                    ToolMessage(
                        content=str(result),
                        tool_call_id=tool_call_id,
                        name=action
                    )
                )
                
            except Exception as e:
                error_msg = f"Error executing tool {action if 'action' in locals() else 'unknown'}: {str(e)}"
                logger.error(error_msg, exc_info=True)
                new_messages.append(
                    ToolMessage(
                        content=error_msg,
                        tool_call_id=tool_call_id if 'tool_call_id' in locals() else "unknown",
                        name=action if 'action' in locals() else "unknown"
                    )
                )
        
        # Ensure we have a response for each tool call
        tool_call_ids = {tc.get('id') for tc in tool_calls if tc.get('id')}
        response_ids = {msg.tool_call_id for msg in new_messages if isinstance(msg, ToolMessage)}
        missing_ids = tool_call_ids - response_ids
        
        # Add error responses for any missing tool calls
        for missing_id in missing_ids:
            new_messages.append(
                ToolMessage(
                    content="Tool execution failed",
                    tool_call_id=missing_id,
                    name="unknown"
                )
            )
        
        return {"messages": messages + new_messages}
    except Exception as e:
        logger.error(f"Error in call_tool: {str(e)}", exc_info=True)
        raise

# Create the workflow
workflow = StateGraph(AgentState)

# Define the nodes
workflow.add_node("agent", call_llm)
workflow.add_node("tool", call_tool)

# Add conditional edges
workflow.add_conditional_edges(
    "agent",
    should_continue,
    {
        "tool": "tool",
        END: END
    }
)

# Add edge from tool back to agent
workflow.add_edge("tool", "agent")

# Set entry point
workflow.set_entry_point("agent")

# Compile
graph = workflow.compile()
