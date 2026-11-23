#!/usr/bin/env node
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createSeanceMcpServer } from "./server.js";

const server = createSeanceMcpServer();
const transport = new StdioServerTransport();
await server.connect(transport);
console.error("[seance-mcp] Server started on stdio");
