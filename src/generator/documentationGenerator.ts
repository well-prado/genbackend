import ejs from 'ejs';
import fs from 'fs';
import path from 'path';
import type { GeneratedBackend } from '../types';
import { logger } from '../utils/logger';

/**
 * Render HTML documentation for the generated backend
 */
export async function renderDocumentation(backend: GeneratedBackend): Promise<string> {
  try {
    logger.log('Rendering documentation...');

    // Get the template path
    const templatePath = path.join(process.cwd(), 'src', 'templates', 'documentation.ejs');

    // Check if the template exists, if not, create it
    if (!fs.existsSync(templatePath)) {
      const templateDir = path.dirname(templatePath);
      if (!fs.existsSync(templateDir)) {
        fs.mkdirSync(templateDir, { recursive: true });
      }
      fs.writeFileSync(templatePath, getDefaultTemplate(), 'utf8');
      logger.log('Created default documentation template');
    }

    // Read the template
    const template = fs.readFileSync(templatePath, 'utf8');

    // Render the template with the backend data
    const html = ejs.render(template, {
      backend,
      title: `${backend.name} API Documentation`,
      description: backend.description,
      version: backend.version,
      date: new Date().toISOString().split('T')[0]
    });

    return html;
  } catch (error) {
    logger.error('Error rendering documentation:', error);

    // Return a simple HTML page in case of error
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Error - API Documentation</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 40px; line-height: 1.6; }
            .error { color: red; border: 1px solid red; padding: 20px; border-radius: 5px; }
          </style>
        </head>
        <body>
          <h1>Error Generating Documentation</h1>
          <div class="error">
            <p>There was an error generating the documentation:</p>
            <p>${error instanceof Error ? error.message : 'Unknown error'}</p>
          </div>
          <p>Please check the server logs for more information.</p>
        </body>
      </html>
    `;
  }
}

/**
 * Get the default EJS template for documentation
 */
function getDefaultTemplate(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title><%= title %></title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 1200px;
      margin: 0 auto;
      padding: 20px;
    }
    header {
      background-color: #f8f9fa;
      padding: 20px;
      border-radius: 5px;
      margin-bottom: 30px;
      border-left: 5px solid #0366d6;
    }
    h1 {
      margin-top: 0;
      color: #0366d6;
    }
    h2 {
      margin-top: 40px;
      padding-bottom: 10px;
      border-bottom: 1px solid #eaecef;
      color: #0366d6;
    }
    h3 {
      margin-top: 30px;
      color: #0366d6;
    }
    .endpoint {
      background-color: #f8f9fa;
      padding: 20px;
      border-radius: 5px;
      margin-bottom: 20px;
      border-left: 5px solid #28a745;
    }
    .endpoint h3 {
      margin-top: 0;
      display: flex;
      align-items: center;
    }
    .method {
      display: inline-block;
      padding: 5px 10px;
      border-radius: 5px;
      color: white;
      font-weight: bold;
      margin-right: 10px;
      min-width: 60px;
      text-align: center;
    }
    .get { background-color: #0366d6; }
    .post { background-color: #28a745; }
    .put { background-color: #f9c513; }
    .delete { background-color: #d73a49; }
    .path {
      font-family: monospace;
      font-size: 1.1em;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 20px 0;
    }
    th, td {
      text-align: left;
      padding: 12px;
      border-bottom: 1px solid #eaecef;
    }
    th {
      background-color: #f8f9fa;
    }
    code {
      font-family: SFMono-Regular, Consolas, "Liberation Mono", Menlo, monospace;
      background-color: #f6f8fa;
      padding: 2px 5px;
      border-radius: 3px;
    }
    .response-code {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 3px;
      color: white;
      font-weight: bold;
      min-width: 40px;
      text-align: center;
      margin-right: 10px;
    }
    .code-200, .code-201, .code-204 { background-color: #28a745; }
    .code-400, .code-404 { background-color: #f9c513; }
    .code-500 { background-color: #d73a49; }
    footer {
      margin-top: 50px;
      padding-top: 20px;
      border-top: 1px solid #eaecef;
      text-align: center;
      color: #6a737d;
    }
  </style>
</head>
<body>
  <header>
    <h1><%= backend.name %> API Documentation</h1>
    <p><%= backend.description %></p>
    <p><strong>Version:</strong> <%= backend.version %> | <strong>Generated:</strong> <%= date %></p>
  </header>

  <main>
    <h2>API Endpoints</h2>
    
    <% if (backend.endpoints && backend.endpoints.length > 0) { %>
      <% backend.endpoints.forEach(endpoint => { %>
        <div class="endpoint">
          <h3>
            <span class="method <%= endpoint.method.toLowerCase() %>"><%= endpoint.method %></span>
            <span class="path"><%= endpoint.path %></span>
          </h3>
          <p><%= endpoint.description %></p>
          
          <% if (endpoint.parameters && endpoint.parameters.length > 0) { %>
            <h4>Parameters</h4>
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Located in</th>
                  <th>Type</th>
                  <th>Required</th>
                  <th>Description</th>
                </tr>
              </thead>
              <tbody>
                <% endpoint.parameters.forEach(param => { %>
                  <tr>
                    <td><code><%= param.name %></code></td>
                    <td><%= param.in %></td>
                    <td><code><%= param.type %></code></td>
                    <td><%= param.required ? 'Yes' : 'No' %></td>
                    <td><%= param.description %></td>
                  </tr>
                <% }); %>
              </tbody>
            </table>
          <% } %>
          
          <% if (endpoint.responses && endpoint.responses.length > 0) { %>
            <h4>Responses</h4>
            <table>
              <thead>
                <tr>
                  <th>Status</th>
                  <th>Description</th>
                </tr>
              </thead>
              <tbody>
                <% endpoint.responses.forEach(response => { %>
                  <tr>
                    <td>
                      <span class="response-code code-<%= response.status %>"><%= response.status %></span>
                    </td>
                    <td><%= response.description %></td>
                  </tr>
                <% }); %>
              </tbody>
            </table>
          <% } %>
        </div>
      <% }); %>
    <% } else { %>
      <p>No endpoints defined yet.</p>
    <% } %>

    <h2>Nodes</h2>
    <% if (backend.nodes && backend.nodes.length > 0) { %>
      <ul>
        <% backend.nodes.forEach(node => { %>
          <li>
            <strong><%= node.name %></strong> (<%= node.type %>)
          </li>
        <% }); %>
      </ul>
    <% } else { %>
      <p>No nodes defined yet.</p>
    <% } %>

    <h2>Workflows</h2>
    <% if (backend.workflows && backend.workflows.length > 0) { %>
      <ul>
        <% backend.workflows.forEach(workflow => { %>
          <li>
            <strong><%= workflow.name %></strong>: <%= workflow.description %>
          </li>
        <% }); %>
      </ul>
    <% } else { %>
      <p>No workflows defined yet.</p>
    <% } %>
  </main>

  <footer>
    <p>Generated by Generative Backend Builder</p>
  </footer>
</body>
</html>`;
} 