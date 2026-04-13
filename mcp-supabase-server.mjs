#!/usr/bin/env node

import { createMCPClient } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { spawn } from 'child_process';

class SupabaseMCPServer {
  constructor() {
    this.supabaseUrl = process.env.SUPABASE_URL || 'http://127.0.0.1:54321';
    this.supabaseAnonKey = process.env.SUPABASE_ANON_KEY || '';
    this.supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  }

  async start() {
    console.log('Starting Supabase MCP Server...');
    
    // Resources disponibles pour Supabase
    const resources = [
      {
        uri: 'supabase://config',
        name: 'Supabase Configuration',
        description: 'Current Supabase project configuration',
        mimeType: 'application/json'
      },
      {
        uri: 'supabase://database/status',
        name: 'Database Status',
        description: 'Database connection and status information',
        mimeType: 'application/json'
      },
      {
        uri: 'supabase://tables/list',
        name: 'Tables List',
        description: 'List of all tables in the database',
        mimeType: 'application/json'
      },
      {
        uri: 'supabase://functions/list',
        name: 'Edge Functions List',
        description: 'List of all edge functions',
        mimeType: 'application/json'
      }
    ];

    // Tools disponibles pour Supabase
    const tools = [
      {
        name: 'supabase_query',
        description: 'Execute SQL queries on Supabase database',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'SQL query to execute'
            },
            parameters: {
              type: 'array',
              description: 'Query parameters',
              items: { type: 'any' }
            }
          },
          required: ['query']
        }
      },
      {
        name: 'supabase_function_invoke',
        description: 'Invoke Supabase edge functions',
        inputSchema: {
          type: 'object',
          properties: {
            functionName: {
              type: 'string',
              description: 'Name of the edge function'
            },
            method: {
              type: 'string',
              enum: ['GET', 'POST', 'PUT', 'DELETE'],
              description: 'HTTP method'
            },
            body: {
              type: 'object',
              description: 'Request body'
            }
          },
          required: ['functionName', 'method']
        }
      },
      {
        name: 'supabase_storage_upload',
        description: 'Upload files to Supabase storage',
        inputSchema: {
          type: 'object',
          properties: {
            bucket: {
              type: 'string',
              description: 'Storage bucket name'
            },
            path: {
              type: 'string',
              description: 'File path in bucket'
            },
            file: {
              type: 'string',
              description: 'File content or path'
            },
            contentType: {
              type: 'string',
              description: 'MIME type of the file'
            }
          },
          required: ['bucket', 'path', 'file']
        }
      }
    ];

    return { resources, tools };
  }

  async executeQuery(query, parameters = []) {
    try {
      const { createClient } = require('@supabase/supabase-js');
      const supabase = createClient(this.supabaseUrl, this.supabaseServiceKey);
      
      const { data, error } = await supabase.rpc('execute_sql', {
        query: query,
        params: parameters
      });
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Query execution error:', error);
      throw error;
    }
  }

  async invokeFunction(functionName, method = 'POST', body = {}) {
    try {
      const response = await fetch(`${this.supabaseUrl}/functions/v1/${functionName}`, {
        method,
        headers: {
          'Authorization': `Bearer ${this.supabaseAnonKey}`,
          'Content-Type': 'application/json',
        },
        body: method !== 'GET' ? JSON.stringify(body) : undefined,
      });
      
      if (!response.ok) {
        throw new Error(`Function invocation failed: ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Function invocation error:', error);
      throw error;
    }
  }
}

// Démarrage du serveur
const server = new SupabaseMCPServer();
server.start().then(({ resources, tools }) => {
  console.log('Supabase MCP Server started successfully');
  console.log('Available resources:', resources.map(r => r.uri));
  console.log('Available tools:', tools.map(t => t.name));
}).catch(console.error);
