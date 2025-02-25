from langgraph.graph import StateGraph, END
from langchain_core.messages import HumanMessage, AIMessage, SystemMessage, ToolMessage
from langchain_community.chat_message_histories import ChatMessageHistory
from typing import TypedDict, Annotated, Sequence, Union, List, Dict, Any, Literal, Optional
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

# Expanded state for multi-agent support
class ProjectState(TypedDict, total=False):
    messages: Annotated[Sequence[Union[HumanMessage, AIMessage, SystemMessage, ToolMessage]], operator.add]
    chat_history: Annotated[List[Dict[str, str]], operator.add]
    pending_response: Optional[AIMessage]
    session_id: str
    # Multi-agent specific fields
    requirements: List[Dict[str, str]]
    architecture_decisions: List[Dict[str, Any]]
    code_components: Dict[str, str]
    test_results: List[Dict[str, Any]]
    documentation: Dict[str, str]
    current_phase: str
    # Fields for feedback and error handling
    error_logs: List[Dict[str, str]]
    architecture_feedback: List[Dict[str, str]]
    code_feedback: List[Dict[str, str]]
    test_feedback: List[Dict[str, str]]
    documentation_feedback: List[Dict[str, str]]
    pending_manager_review: bool

# Keep AgentState for backward compatibility
class AgentState(ProjectState):
    """Legacy state type for backward compatibility."""
    pass

class BaseAgent:
    """Base class for shared agent functionality."""
    
    def __init__(self, llm_config=DEFAULT_CONFIG, system_prompt: str = ""):
        self.llm = LLMFactory.create_llm(llm_config)
        self.tools = get_agent_tools()
        self.chat_histories: Dict[str, ChatMessageHistory] = {}
        tool_descriptions = "\n".join(f"- {tool.name}: {tool.description}" for tool in self.tools)
        self.base_system_prompt = get_system_prompt(tool_descriptions)
        self.system_prompt = f"{self.base_system_prompt}\n{system_prompt}" if system_prompt else self.base_system_prompt

    def get_chat_history(self, session_id: str) -> ChatMessageHistory:
        """Get or create chat history for a session."""
        if session_id not in self.chat_histories:
            self.chat_histories[session_id] = ChatMessageHistory()
        return self.chat_histories[session_id]

    def process(self, state: AgentState) -> AgentState:
        """Default processing logic, to be overridden by specialized agents."""
        try:
            messages = state["messages"]
            session_id = state.get("session_id", "default")
            chat_history = self.get_chat_history(session_id)

            # Add system message if not present
            if len(messages) == 1 and isinstance(messages[0], HumanMessage):
                messages = [SystemMessage(content=self.system_prompt)] + messages
                state["messages"] = messages

            # Combine chat history with current messages
            all_messages = list(chat_history.messages) + messages
            
            # Prepare tools in standard format
            tools_for_model = [{
                "function": {
                    "name": tool.name,
                    "description": tool.description,
                    "parameters": tool.args_schema.schema()
                }
            } for tool in self.tools]

            # Invoke the LLM - each LLM implementation handles its specific formatting
            response = self.llm.invoke(all_messages, tools=tools_for_model)
            logger.debug(f"LLM response: {json.dumps({'content': response.content, 'kwargs': response.additional_kwargs}, indent=2, default=str)}")

            # Check for duplicate response
            if any(isinstance(msg, AIMessage) and msg.content == response.content and 
                   msg.additional_kwargs == response.additional_kwargs for msg in messages):
                logger.debug("Duplicate response detected")
                return {**state, "pending_response": None}

            # Handle tool calls
            if response.additional_kwargs.get('tool_calls'):
                logger.debug("Found tool calls, storing in pending_response")
                return {**state, "pending_response": response}

            # Add response to chat history and return updated state
            chat_history.add_message(response)
            return {**state, "messages": messages + [response], "pending_response": None}
        except Exception as e:
            logger.error(f"Error in process: {str(e)}", exc_info=True)
            raise

class CodingAgent(BaseAgent):
    """Current single agent for coding tasks."""
    
    def __init__(self, llm_config=DEFAULT_CONFIG):
        super().__init__(llm_config, system_prompt="You are a coding assistant.")

class AgentGraph:
    """Orchestrator for multi-agent workflow."""
    
    def __init__(self, llm_config=DEFAULT_CONFIG):
        self.coding_agent = CodingAgent(llm_config)
        self.tools = self.coding_agent.tools  # Reuse existing tool setup
        self._create_graph()

    def _should_continue(self, state: ProjectState) -> Literal["tool", END]:
        """Determine if tool execution is needed."""
        try:
            messages = state["messages"]
            if not messages:
                logger.debug("No messages in state")
                return END

            last_message = messages[-1]
            pending_response = state.get("pending_response")

            if pending_response and pending_response.additional_kwargs.get('tool_calls'):
                logger.debug("Pending response with tool calls")
                return "tool"

            if isinstance(last_message, AIMessage):
                tool_calls = last_message.additional_kwargs.get('tool_calls', [])
                if tool_calls and not any(isinstance(m, ToolMessage) for m in messages):
                    logger.debug("Found tool calls in last message")
                    return "tool"
                logger.debug("No new tool calls, ending")
                return END

            logger.debug("No AI message or tools executed, ending")
            return END
        except Exception as e:
            logger.error(f"Error in should_continue: {str(e)}", exc_info=True)
            raise

    def _call_tool(self, state: ProjectState) -> ProjectState:
        """Execute tool calls."""
        try:
            messages = state["messages"]
            session_id = state.get("session_id", "default")
            chat_history = self.coding_agent.get_chat_history(session_id)
            
            pending_response = state.get("pending_response")
            last_message = pending_response if pending_response else messages[-1]
            tool_calls = last_message.additional_kwargs.get('tool_calls', [])
            logger.debug(f"Found tool calls: {json.dumps(tool_calls, indent=2)}")
            
            if not tool_calls:
                logger.warning("No tool calls found")
                return {**state, "messages": messages, "pending_response": None}
                
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
                if any(msg for msg in messages if isinstance(msg, ToolMessage) and getattr(msg, 'tool_call_id', None) == tool_call.get('id')):
                    logger.debug(f"Skipping processed tool call: {tool_call.get('id')}")
                    continue
                    
                tool_call_id = tool_call.get('id')
                function_info = tool_call.get('function', {})
                action = function_info.get('name')
                args_str = function_info.get('arguments', '{}')
                
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
                    tool_result = tool_to_use.invoke(args)
                    tool_msg = ToolMessage(
                        content=str(tool_result),
                        tool_call_id=tool_call_id,
                        name=action,
                        additional_kwargs={
                            "type": "tool_result",
                            "tool_use_id": tool_call_id,
                            "content": str(tool_result)
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
            
            return {**state, "messages": messages + new_messages, "pending_response": None}
        except Exception as e:
            logger.error(f"Error in call_tool: {str(e)}", exc_info=True)
            raise

    def _route(self, state: ProjectState) -> str:
        """Enhanced routing for multi-agent workflow."""
        # Check for pending tool calls first
        if state.get("pending_response"):
            return "tool"
        
        # Basic phase-based routing (will be expanded in later steps)
        current_phase = state.get("current_phase", "requirements")
        logger.debug(f"Current phase: {current_phase}")
        
        # For now, just return END as we haven't implemented other agents yet
        return END  # Will expand for multi-agent logic in subsequent steps
    
    def _router_node(self, state: ProjectState) -> ProjectState:
        """Router node that will direct flow between agents."""
        logger.debug("Entering router node")
        
        # In future steps, this will determine which agent to call next
        # based on the current phase and other state information
        
        # For now, just pass through the state
        current_phase = state.get("current_phase", "requirements")
        logger.debug(f"Current phase in router: {current_phase}")
        
        # Update any phase transitions if needed
        # This will be expanded in later steps
        
        return state

    def _create_graph(self) -> None:
        """Create and compile the workflow graph."""
        workflow = StateGraph(ProjectState)  # Use ProjectState instead of AgentState
        
        workflow.add_node("agent", self.coding_agent.process)
        workflow.add_node("tool", self._call_tool)
        workflow.add_node("router", self._router_node)  # Use the router node function
        
        workflow.add_conditional_edges(
            "agent",
            self._should_continue,
            {"tool": "tool", END: "router"}
        )
        workflow.add_edge("tool", "agent")
        workflow.add_conditional_edges(
            "router",
            self._route,
            {"tool": "tool", END: END}
        )
        
        workflow.set_entry_point("agent")
        self.graph = workflow.compile()

    def run(self, state: ProjectState) -> ProjectState:
        """Run the agent graph with the given state."""
        return self.graph.invoke(state)

# Create default instance
agent = AgentGraph()
graph = agent.graph