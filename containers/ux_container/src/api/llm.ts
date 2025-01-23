interface LLMConfig {
  llm_type: string;
  model_name: string;
  temperature: number;
  additional_params?: Record<string, any>;
}

interface LLMInfo {
  name: string;
  models: string[];
}

interface AvailableLLMsResponse {
  available_llms: Record<string, LLMInfo>;
  current_config: LLMConfig;
}

export async function getAvailableLLMs(): Promise<AvailableLLMsResponse> {
  const response = await fetch('http://localhost:8100/api/llm/available');
  if (!response.ok) {
    throw new Error('Failed to fetch available LLMs');
  }
  return response.json();
}

export async function getCurrentLLMConfig(): Promise<LLMConfig> {
  const response = await fetch('http://localhost:8100/api/llm/config');
  if (!response.ok) {
    throw new Error('Failed to fetch LLM config');
  }
  return response.json();
}

export async function updateLLMConfig(config: LLMConfig): Promise<{ status: string; config: LLMConfig }> {
  const response = await fetch('http://localhost:8100/api/llm/config', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(config),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to update LLM config');
  }
  
  return response.json();
}
