import { capabilities, probeTcp } from './tcp.js';
const byId = id => document.getElementById(id);
const log = (text) => {
  const timestamp = new Date().toISOString();
  byId('log').textContent += `[${timestamp}] ${text}\n`;
};
for (const [name, value] of Object.entries(capabilities())) {
  const label = document.createElement('dt');
  const result = document.createElement('dd');
  label.textContent = name;
  result.textContent = value;
  byId('capabilities').append(label, result);
}
log('Ready. No network request has been made.');
byId('probe-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const button = byId('probe-button');
  button.disabled = true;
  byId('status').textContent = 'Connecting…';
  const host = byId('host').value;
  const port = byId('port').value;
  log(`TCP attempt → ${host}:${port}`);
  try {
    const result = await probeTcp(host, port);
    byId('status').textContent = `Connected: ${result.elapsedMs} ms`;
    log(`SUCCESS ${JSON.stringify(result)}`);
  } catch (error) {
    const message = `${error?.name || 'Error'}: ${error?.message || String(error)}`;
    byId('status').textContent = `Failed: ${message}`;
    log(`FAIL ${message}`);
  } finally {
    button.disabled = false;
  }
});
