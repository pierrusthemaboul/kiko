#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Prevent dotenv from printing any logs to stdout which break the MCP protocol
delete process.env.DOTENV_CONFIG_DEBUG;
delete process.env.DOTENV_CONFIG_QUIET;
dotenv.config({ path: path.join(__dirname, "../../.env"), quiet: true, debug: false });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Error: Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const server = new Server(
  {
    name: "supabase-mcp-server",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

/**
 * List available tools.
 */
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "execute_sql",
        description: "Run a SQL query against the Supabase database. Use this for data analysis, reporting, and maintenance.",
        inputSchema: {
          type: "object",
          properties: {
            sql: {
              type: "string",
              description: "The SQL query to execute. Be careful with destructive operations.",
            },
          },
          required: ["sql"],
        },
      },
      {
        name: "list_tables",
        description: "List all public tables in the Supabase database.",
        inputSchema: {
          type: "object",
          properties: {},
        },
      },
      {
        name: "get_table_schema",
        description: "Get the schema (columns, types) of a specific table.",
        inputSchema: {
          type: "object",
          properties: {
            table_name: {
              type: "string",
              description: "The name of the table to inspect.",
            },
          },
          required: ["table_name"],
        },
      },
    ],
  };
});

/**
 * Handle tool calls.
 */
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case "execute_sql": {
        const { sql } = z.object({ sql: z.string() }).parse(args);
        
        // Use the execute_sql RPC function that was created in production
        const { data, error } = await supabase.rpc("execute_sql", { query: sql });
        
        if (error) {
          return {
            content: [{ type: "text", text: `Error: ${error.message}` }],
            isError: true,
          };
        }

        return {
          content: [{ type: "text", text: typeof data === 'string' ? data : JSON.stringify(data, null, 2) }],
        };
      }

      case "list_tables": {
        // Use the execute_sql RPC to get all tables from information_schema
        const { data, error } = await supabase.rpc("execute_sql", { 
          query: "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE' ORDER BY table_name" 
        });

        if (error) {
          return {
            content: [{ type: "text", text: `Error fetching tables: ${error.message}` }],
            isError: true,
          };
        }

        return {
          content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
        };
      }

      case "get_table_schema": {
        const { table_name } = z.object({ table_name: z.string() }).parse(args);
        const { data, error } = await supabase.rpc("execute_sql", { 
          query: `SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = '${table_name}' AND table_schema = 'public' ORDER BY ordinal_position;` 
        });

        if (error) {
          return {
            content: [{ type: "text", text: `Error fetching schema for ${table_name}: ${error.message}` }],
            isError: true,
          };
        }

        return {
          content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        content: [{ type: "text", text: `Invalid arguments: ${error.errors.map(e => e.message).join(", ")}` }],
        isError: true,
      };
    }
    return {
      content: [{ type: "text", text: `Error: ${error.message}` }],
      isError: true,
    };
  }
});

/**
 * Start the server using stdio transport.
 */
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
});
