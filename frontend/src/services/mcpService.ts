import api from './api';

export interface McpManifestTool {
  name: string;
  scope: string;
  description: string;
}

export interface McpManifest {
  server: string;
  transport: string;
  endpoint: string;
  role: string;
  tool_count: number;
  tools: McpManifestTool[];
}

export interface McpInsights {
  connected: boolean;
  manifest: McpManifest;
  health: {
    status?: string;
    database?: string;
    user_count?: number;
  };
  highlights: string[];
}

export const mcpService = {
  async getStatus() {
    const response = await api.get('/mcp-tools/status');
    return response.data;
  },

  async getManifest() {
    const response = await api.get<McpManifest>('/mcp-tools/manifest');
    return response.data;
  },

  async getInsights() {
    const response = await api.get<McpInsights>('/mcp-tools/insights');
    return response.data;
  },
};
