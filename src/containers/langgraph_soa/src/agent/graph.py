from langchain_openai import ChatOpenAI
from langgraph.graph import StateGraph, END
from langgraph.prebuilt import ToolNode
from langchain_core.messages import HumanMessage, AIMessage, SystemMessage, ToolMessage
from typing import TypedDict, Annotated, Sequence, Union, List, Dict, Any, Callable, Literal, Optional
import operator
import logging
import json

from tools.agent_tools import get_agent_tools
from src.prompts.system import get_system_prompt

# Set up logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

# Initialize components
logger.info("Initializing components...")

# Get tools
tools = get_agent_tools()

# Initialize the LLM
llm = ChatOpenAI(
    model="gpt-4o-mini",
    temperature=0.7,
)

# Create system message with tool descriptions
tool_descriptions = "\n".join(f"- {tool.name}: {tool.description}" for tool in tools)
system_msg = get_system_prompt(tool_descriptions)

# Define the state schema
class AgentState(TypedDict, total=False):
    messages: Annotated[Sequence[Union[HumanMessage, AIMessage, SystemMessage, ToolMessage]], operator.add]
    pending_response: Optional[AIMessage]

# Function to determine next step
def should_continue(state: AgentState) -> Literal["tool", END]:
    """Route to the next step based on the last message."""
    try:
        messages = state["messages"]
        if not messages:
            logger.debug("No messages in state")
            return END
            
        last_message = messages[-1]
        logger.debug(f"Last message type: {type(last_message)}")
        logger.debug(f"Last message content: {last_message}")
        
        # Check pending response first
        pending_response = state.get("pending_response")
        if pending_response:
            logger.debug(f"Found pending response with tool calls")
            if pending_response.additional_kwargs.get('tool_calls'):
                return "tool"
            return END
        
        # Then check last message
        if isinstance(last_message, AIMessage) and last_message.additional_kwargs.get('tool_calls'):
            logger.debug(f"Found tool calls in last message")
            return "tool"
            
        logger.debug("No tool calls found, ending")
        return END
    except Exception as e:
        logger.error(f"Error in should_continue: {str(e)}", exc_info=True)
        raise

# Function to call the LLM
def call_llm(state: AgentState) -> AgentState:
    """Call the LLM with the current messages."""
    try:
        messages = state["messages"]
        if len(messages) == 1 and isinstance(messages[0], HumanMessage):  # First message
            messages = [SystemMessage(content=system_msg)] + messages
            state["messages"] = messages
            
        message_info = [{
            'type': type(msg).__name__,
            'content': msg.content,
            'kwargs': msg.additional_kwargs
        } for msg in messages]
        logger.debug(f"Calling LLM with messages: {json.dumps(message_info, indent=2)}")
        
        # Create a list of tool configurations for the model
        tools_for_model = [{
            "type": "function",
            "function": {
                "name": tool.name,
                "description": tool.description,
                "parameters": tool.args_schema.schema()
            }
        } for tool in tools]
        
        logger.debug(f"Using tools: {json.dumps(tools_for_model, indent=2)}")
        
        # Call the model with tool configurations
        response = llm.invoke(messages, tools=tools_for_model)
        response_info = {
            'content': response.content,
            'kwargs': response.additional_kwargs
        }
        logger.debug(f"LLM response: {json.dumps(response_info, indent=2)}")
        
        # If there are tool calls, don't add the response yet - wait for tool responses
        if response.additional_kwargs.get('tool_calls'):
            logger.debug("Found tool calls, storing in pending_response")
            return {"messages": messages, "pending_response": response}
        
        logger.debug("No tool calls, adding response to messages")
        return {"messages": messages + [response], "pending_response": None}
    except Exception as e:
        logger.error(f"Error in call_llm: {str(e)}", exc_info=True)
        raise

# Function to call a tool
def call_tool(state: AgentState) -> AgentState:
    """Execute tool calls from the last message."""
    try:
        messages = state["messages"]
        # Get the pending response if it exists
        pending_response = state.get("pending_response")
        if pending_response:
            logger.debug("Using pending response for tool calls")
            last_message = pending_response
        else:
            logger.debug("Using last message for tool calls")
            last_message = messages[-1]
        
        # Get tool calls from the message
        tool_calls = last_message.additional_kwargs.get('tool_calls', [])
        logger.debug(f"Found tool calls: {json.dumps(tool_calls, indent=2)}")
        
        if not tool_calls:
            logger.warning("No tool calls found in message")
            return {"messages": messages, "pending_response": None}
            
        # Execute each tool call
        new_messages = [pending_response] if pending_response else []
        for tool_call in tool_calls:
            try:
                # Extract tool call info
                tool_call_id = tool_call.get('id')
                function_info = tool_call.get('function', {})
                action = function_info.get('name')
                args_str = function_info.get('arguments', '{}')
                
                logger.debug(f"Processing tool call: {tool_call_id} - {action}")
                
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
                    logger.debug(f"Parsed arguments: {json.dumps(args, indent=2)}")
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
                logger.debug(f"Tool execution result: {result}")
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
        
        if missing_ids:
            logger.warning(f"Missing tool responses for IDs: {missing_ids}")
        
        # Add error responses for any missing tool calls
        for missing_id in missing_ids:
            new_messages.append(
                ToolMessage(
                    content="Tool execution failed",
                    tool_call_id=missing_id,
                    name="unknown"
                )
            )
        
        logger.debug(f"Final message count: {len(messages + new_messages)}")
        # Return all messages including the original messages, the assistant's response with tool calls,
        # and all tool responses
        return {"messages": messages + new_messages, "pending_response": None}
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
