from langgraph.graph import StateGraph, END
from langgraph.prebuilt import ToolNode
from langchain_core.messages import HumanMessage, AIMessage, SystemMessage, ToolMessage
from langchain_core.chat_history import BaseChatMessageHistory
from langchain_community.chat_message_histories import ChatMessageHistory
from typing import TypedDict, Annotated, Sequence, Union, List, Dict, Any, Callable, Literal, Optional
import operator
import logging
import json

from tools.agent_tools import get_agent_tools
from src.prompts.system import get_system_prompt
from src.llm.factory import LLMFactory
from src.config.llm_config import DEFAULT_CONFIG

# Set up logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

class AgentState(TypedDict, total=False):
    messages: Annotated[Sequence[Union[HumanMessage, AIMessage, SystemMessage, ToolMessage]], operator.add]
    chat_history: Annotated[List[Dict[str, str]], operator.add]
    pending_response: Optional[AIMessage]
    session_id: str

class AgentGraph:
    """Main agent graph implementation."""
    
    def __init__(self, llm_config=DEFAULT_CONFIG):
        """Initialize the agent graph with specified LLM configuration."""
        self.llm = LLMFactory.create_llm(llm_config)
        self.tools = get_agent_tools()
        self.chat_histories: Dict[str, ChatMessageHistory] = {}
        
        # Create system message with tool descriptions
        tool_descriptions = "\n".join(f"- {tool.name}: {tool.description}" for tool in self.tools)
        self.system_msg = get_system_prompt(tool_descriptions)
        
        # Initialize the graph
        self._create_graph()
        
    def get_chat_history(self, session_id: str) -> ChatMessageHistory:
        """Get or create a chat history for the given session ID."""
        if session_id not in self.chat_histories:
            self.chat_histories[session_id] = ChatMessageHistory()
        return self.chat_histories[session_id]
        
    def _should_continue(self, state: AgentState) -> Literal["tool", END]:
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
            if pending_response and pending_response.additional_kwargs.get('tool_calls'):
                logger.debug(f"Found pending response with tool calls")
                return "tool"
            
            # Only continue if the last message is an AI message with tool calls
            if isinstance(last_message, AIMessage):
                tool_calls = last_message.additional_kwargs.get('tool_calls', [])
                if tool_calls and not any(isinstance(m, ToolMessage) for m in messages):
                    logger.debug(f"Found tool calls in last message")
                    return "tool"
                logger.debug("AI message with no new tool calls, ending")
                return END
                
            logger.debug("Non-AI message or all tools executed, ending")
            return END
        except Exception as e:
            logger.error(f"Error in should_continue: {str(e)}", exc_info=True)
            raise
            
    def _call_llm(self, state: AgentState) -> AgentState:
        """Call the LLM with the current messages."""
        try:
            messages = state["messages"]
            session_id = state.get("session_id", "default")
            chat_history = self.get_chat_history(session_id)
            
            # Add system message to start of conversation if needed
            if len(messages) == 1 and isinstance(messages[0], HumanMessage):
                messages = [SystemMessage(content=self.system_msg)] + messages
                state["messages"] = messages
                
            # Get full conversation history
            all_messages = list(chat_history.messages) + messages
            logger.debug(f"Full conversation history: {all_messages}")
                
            # Create a list of tool configurations for the model
            tools_for_model = [{
                "function": {
                    "name": tool.name,
                    "description": tool.description,
                    "parameters": tool.args_schema.schema()
                }
            } for tool in self.tools]
            
            logger.debug(f"Using tools: {json.dumps(tools_for_model, indent=2)}")
            
            # Call the model with tool configurations and chat history
            response = self.llm.invoke(
                all_messages,
                tools=tools_for_model
            )
            response_info = {
                'content': response.content,
                'kwargs': response.additional_kwargs
            }
            logger.debug(f"LLM response: {json.dumps(response_info, indent=2)}")
            
            # Check for duplicate response
            if any(
                isinstance(msg, AIMessage) and 
                msg.content == response.content and 
                msg.additional_kwargs == response.additional_kwargs 
                for msg in messages
            ):
                logger.debug("Duplicate response detected, not adding to messages")
                return {
                    "messages": messages,
                    "pending_response": None,
                    "chat_history": state["chat_history"],
                    "session_id": session_id
                }
            
            # If there are tool calls, don't add the response yet - wait for tool responses
            if response.additional_kwargs.get('tool_calls'):
                logger.debug("Found tool calls, storing in pending_response")
                return {
                    "messages": messages,
                    "pending_response": response,
                    "chat_history": state["chat_history"],
                    "session_id": session_id
                }
            
            # Add response to chat history
            chat_history.add_message(response)
            
            logger.debug("No tool calls, adding response to messages")
            return {
                "messages": messages + [response],
                "pending_response": None,
                "chat_history": state["chat_history"],
                "session_id": session_id
            }
        except Exception as e:
            logger.error(f"Error in call_llm: {str(e)}", exc_info=True)
            raise
            
    def _call_tool(self, state: AgentState) -> AgentState:
        """Execute tool calls from the last message."""
        try:
            messages = state["messages"]
            session_id = state.get("session_id", "default")
            chat_history = self.get_chat_history(session_id)
            
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
                return {
                    "messages": messages,
                    "pending_response": None,
                    "chat_history": state["chat_history"],
                    "session_id": session_id
                }
                
            # Execute each tool call
            new_messages = []
            if pending_response and not any(
                isinstance(msg, AIMessage) and 
                msg.content == pending_response.content and 
                msg.additional_kwargs == pending_response.additional_kwargs 
                for msg in messages
            ):
                new_messages.append(pending_response)
                chat_history.add_message(pending_response)
            
            for tool_call in tool_calls:
                try:
                    # Skip if we've already processed this tool call
                    if any(msg for msg in messages if isinstance(msg, ToolMessage) and getattr(msg, 'tool_call_id', None) == tool_call.get('id')):
                        logger.debug(f"Skipping already processed tool call: {tool_call.get('id')}")
                        continue
                    
                    # Extract tool call info
                    tool_call_id = tool_call.get('id')
                    function_info = tool_call.get('function', {})
                    action = function_info.get('name')
                    args_str = function_info.get('arguments', '{}')
                    
                    logger.debug(f"Processing tool call: {tool_call_id} - {action}")
                    
                    if not action or not tool_call_id:
                        logger.warning(f"Invalid tool call format: {tool_call}")
                        tool_msg = ToolMessage(
                            content="<tool_result>Invalid tool call format</tool_result>",
                            tool_call_id=tool_call_id or "unknown",
                            name=action or "unknown"
                        )
                        new_messages.append(tool_msg)
                        chat_history.add_message(tool_msg)
                        continue
                    
                    # Parse arguments
                    try:
                        args = json.loads(args_str)
                        logger.debug(f"Parsed arguments: {json.dumps(args, indent=2)}")
                    except json.JSONDecodeError:
                        logger.error(f"Failed to parse tool arguments: {args_str}")
                        tool_msg = ToolMessage(
                            content=f"<tool_result>Failed to parse tool arguments: {args_str}</tool_result>",
                            tool_call_id=tool_call_id,
                            name=action
                        )
                        new_messages.append(tool_msg)
                        chat_history.add_message(tool_msg)
                        continue
                    
                    logger.debug(f"Executing tool: {action} with args: {args}")
                    
                    # Execute the tool
                    tool_to_use = next((t for t in self.tools if t.name == action), None)
                    if tool_to_use is None:
                        error_msg = f"Tool {action} not found"
                        logger.error(error_msg)
                        tool_msg = ToolMessage(
                            content=f"<tool_result>{error_msg}</tool_result>",
                            tool_call_id=tool_call_id,
                            name=action
                        )
                        new_messages.append(tool_msg)
                        chat_history.add_message(tool_msg)
                        continue
                        
                    try:
                        # Execute tool and format result
                        tool_result = tool_to_use.invoke(args)
                        
                        # Format tool result for Claude
                        tool_msg = ToolMessage(
                            content=tool_result,
                            tool_call_id=tool_call_id,
                            name=action,
                            additional_kwargs={
                                "type": "tool_result",
                                "tool_use_id": tool_call_id,
                                "content": tool_result
                            }
                        )
                        
                        new_messages.append(tool_msg)
                        chat_history.add_message(tool_msg)
                        logger.debug(f"Tool execution successful: {tool_result}")
                        
                    except Exception as e:
                        error_msg = f"Error executing tool {action}: {str(e)}"
                        logger.error(error_msg)
                        tool_msg = ToolMessage(
                            content=error_msg,
                            tool_call_id=tool_call_id,
                            name=action,
                            additional_kwargs={
                                "type": "tool_result",
                                "tool_use_id": tool_call_id,
                                "content": error_msg,
                                "is_error": True
                            }
                        )
                        new_messages.append(tool_msg)
                        chat_history.add_message(tool_msg)
                        
                except Exception as e:
                    error_msg = f"Error processing tool call: {str(e)}"
                    logger.error(error_msg, exc_info=True)
                    tool_msg = ToolMessage(
                        content=f"<tool_result>Error: {error_msg}</tool_result>",
                        tool_call_id=tool_call.get('id', 'unknown'),
                        name=tool_call.get('function', {}).get('name', 'unknown')
                    )
                    new_messages.append(tool_msg)
                    chat_history.add_message(tool_msg)
            
            # Ensure we have a response for each new tool call
            tool_call_ids = {tc.get('id') for tc in tool_calls if tc.get('id')}
            response_ids = {msg.tool_call_id for msg in new_messages if isinstance(msg, ToolMessage)}
            
            missing_ids = tool_call_ids - response_ids
            if missing_ids:
                logger.warning(f"Missing responses for tool calls: {missing_ids}")
                for missing_id in missing_ids:
                    tool_call = next(tc for tc in tool_calls if tc.get('id') == missing_id)
                    action = tool_call.get('function', {}).get('name', 'unknown')
                    tool_msg = ToolMessage(
                        content=f"<tool_result>No response received for tool call</tool_result>",
                        tool_call_id=missing_id,
                        name=action
                    )
                    new_messages.append(tool_msg)
                    chat_history.add_message(tool_msg)
            
            logger.debug(f"Final message count: {len(messages + new_messages)}")
            # Return all messages including the original messages and new tool responses
            return {
                "messages": messages + new_messages,
                "pending_response": None,
                "chat_history": state["chat_history"],
                "session_id": session_id
            }
        except Exception as e:
            logger.error(f"Error in call_tool: {str(e)}", exc_info=True)
            raise
            
    def _create_graph(self) -> None:
        """Create and compile the workflow graph."""
        workflow = StateGraph(AgentState)
        
        # Define the nodes
        workflow.add_node("agent", self._call_llm)
        workflow.add_node("tool", self._call_tool)
        
        # Add conditional edges
        workflow.add_conditional_edges(
            "agent",
            self._should_continue,
            {
                "tool": "tool",
                END: END
            }
        )
        
        # Add edge from tool back to agent
        workflow.add_edge("tool", "agent")
        
        # Set entry point
        workflow.set_entry_point("agent")
        
        # Compile with validation
        self.graph = workflow.compile()
        
    def run(self, state: AgentState) -> AgentState:
        """Run the agent graph with the given state."""
        return self.graph.invoke(state)

# Create default instance
agent = AgentGraph()
