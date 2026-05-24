#!/usr/bin/env node
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createServer } from './server.js';

async function main() {
  const server = createServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('[publish-mcp] Server started on stdio');
}

main().catch((err) => {
  console.error('[publish-mcp] Fatal error:', err);
  process.exit(1);
});
