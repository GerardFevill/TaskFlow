import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { registerProjectTools } from './tools/projects.js';
import { registerTicketTools } from './tools/tickets.js';
import { registerTaskTools } from './tools/tasks.js';
import { registerCommentTools } from './tools/comments.js';
import { registerStatsTools } from './tools/stats.js';
import { registerAgileTools } from './tools/agile.js';
import { registerActivityTools } from './tools/activity.js';

const server = new McpServer({
  name: 'taskflow',
  version: '1.0.0',
});

registerProjectTools(server);
registerTicketTools(server);
registerTaskTools(server);
registerCommentTools(server);
registerStatsTools(server);
registerAgileTools(server);
registerActivityTools(server);

const transport = new StdioServerTransport();
await server.connect(transport);
