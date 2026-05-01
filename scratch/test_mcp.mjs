import { spawn } from 'child_process';
const child = spawn('node', ['_agents/supabase-mcp-server/index.mjs'], { 
  cwd: 'c:/Users/Pierre/kiko',
  env: {
    ...process.env,
    SUPABASE_URL: 'http://127.0.0.1:54321',
    SUPABASE_SERVICE_ROLE_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBweG10bnVld2NpeGJibWhuenpjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTcyNjg5OTEyNywiZXhwIjoyMDQyNDc1MTI3fQ.Awhy_C5Qxb1lYn4CbJrvh6yWI5O6HBHD_W2Et85W0vQ'
  }
});
child.stdout.on('data', (data) => {
  console.log('STDOUT_RAW:', data.toString('hex'));
  console.log('STDOUT_TEXT:', data.toString());
});
child.stderr.on('data', (data) => {
  console.log('STDERR_TEXT:', data.toString());
});
child.stdin.write(JSON.stringify({
  jsonrpc: "2.0",
  id: 1,
  method: "initialize",
  params: {
    protocolVersion: "2024-11-05",
    capabilities: {},
    clientInfo: { name: "test", version: "1.0.0" }
  }
}) + "\n");
setTimeout(() => {
  child.kill();
  process.exit(0);
}, 3000);
