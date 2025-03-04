import express, { type Express, type Request, type Response, NextFunction } from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import swaggerUi from 'swagger-ui-express';
import fs from 'fs';
import path from 'path';
import { initializeNodes, getNodeMap } from './nodes';
import { initializeWorkflows } from './workflows';
import { renderDocumentation } from './generator/documentationGenerator';
import { GeneratedBackend, GeneratorConfig } from './types';
import { logger } from './utils/logger';
import http from 'http';
import WebSocket from 'ws';
import { v4 as uuid } from 'uuid';
import { generateBackend } from './generator/backendGenerator';

const PORT = process.env.PORT || 4000;

// Global state to store the generated backend
let generatedBackend: GeneratedBackend | null = null;

/**
 * Initialize the HTTP server with all routes and middleware
 */
export function initializeServer(): { app: Express, server: http.Server } {
  const app = express();
  const server = http.createServer(app);

  // Initialize WebSocket server
  const wss = new WebSocket.Server({ server, path: '/ws' });

  // Store WSS on the server object for access from other routes
  (server as any).wss = wss;

  // Middleware
  app.use(cors());
  app.use(bodyParser.json());
  app.use(bodyParser.urlencoded({ extended: true }));

  // Load generated backend data if available
  try {
    const dataPath = path.join(process.cwd(), 'src', 'generator', 'generated-backend.json');
    if (fs.existsSync(dataPath)) {
      const data = fs.readFileSync(dataPath, 'utf8');
      generatedBackend = JSON.parse(data) as GeneratedBackend;
      logger.log(`Loaded generated backend: ${generatedBackend.name}`);
    }
  } catch (error) {
    logger.error('Error loading generated backend data:', error);
  }

  // WebSocket connection handling
  wss.on('connection', (ws: WebSocket) => {
    const socketId = uuid();
    logger.log(`WebSocket connected: ${socketId}`);

    // Handle messages from clients
    ws.on('message', (message: string) => {
      try {
        const data = JSON.parse(message.toString());
        logger.log(`WebSocket message from ${socketId}:`, data);

        // Find the WebSocketHandler node and call it
        const nodeMap = getNodeMap();
        const handler = nodeMap['websocket-handler'];

        if (handler) {
          // Create a basic context
          const ctx = {
            id: uuid(),
            config: {},
            logger,
            request: {
              socket: ws
            }
          };

          // Call the handler
          handler.handle(ctx, {
            action: 'message',
            socketId,
            message: data
          }).then(() => {
            logger.log('WebSocket message handled successfully');
          }).catch((error: Error) => {
            logger.error('Error handling WebSocket message:', error);
          });
        } else {
          logger.error('WebSocketHandler node not found');
        }
      } catch (error: unknown) {
        logger.error('Error processing WebSocket message:', error);
      }
    });

    // Handle disconnection
    ws.on('close', () => {
      logger.log(`WebSocket disconnected: ${socketId}`);

      // Find the WebSocketHandler node and call it
      const nodeMap = getNodeMap();
      const handler = nodeMap['websocket-handler'];

      if (handler) {
        // Create a basic context
        const ctx = {
          id: uuid(),
          config: {},
          logger,
          request: {}
        };

        // Call the handler
        handler.handle(ctx, {
          action: 'disconnect',
          socketId
        }).catch((error: Error) => {
          logger.error('Error handling WebSocket disconnect:', error);
        });
      }
    });
  });

  // API routes
  app.get('/', (req: Request, res: Response) => {
    res.json({
      message: 'Generative Backend Builder API',
      version: '0.1.0',
      docs: '/docs',
      preview: '/preview',
      chat: '/chat'
    });
  });

  // Preview endpoint
  app.get('/preview', (req: Request, res: Response) => {
    if (!generatedBackend) {
      return res.status(404).json({
        error: 'No generated backend found',
        message: 'Generate a backend first using the CLI'
      });
    }

    res.json(generatedBackend);
  });

  // Documentation endpoint
  app.get('/docs', async (req: Request, res: Response) => {
    if (!generatedBackend) {
      return res.status(404).json({
        error: 'No generated backend found',
        message: 'Generate a backend first using the CLI'
      });
    }

    try {
      const html = await renderDocumentation(generatedBackend);
      res.send(html);
    } catch (error) {
      res.status(500).json({
        error: 'Failed to render documentation',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Swagger documentation
  app.use('/api-docs', swaggerUi.serve);
  app.get('/api-docs', (req: Request, res: Response, next: NextFunction) => {
    if (!generatedBackend) {
      return res.redirect('/');
    }

    try {
      const swaggerFilePath = path.join(process.cwd(), 'src', 'generator', 'swagger.json');
      if (!fs.existsSync(swaggerFilePath)) {
        return res.status(404).json({
          error: 'Swagger definition not found',
          message: 'Generate a backend first using the CLI'
        });
      }

      const swaggerDocument = JSON.parse(fs.readFileSync(swaggerFilePath, 'utf8'));
      return swaggerUi.setup(swaggerDocument)(req, res, next);
    } catch (error) {
      return res.status(500).json({
        error: 'Failed to load Swagger definition',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Chat app endpoint
  app.get('/chat', (req: Request, res: Response) => {
    logger.log('GET /chat - Serving chat UI');

    // Get the ChatUI node
    const nodeMap = getNodeMap();

    // Log available nodes
    logger.log('Available nodes:', Object.keys(nodeMap));

    // Enhanced chat UI HTML with backend generation capabilities
    const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Backend Generator Chat</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <style>
            .messages-container {
                height: 50vh;
                overflow-y: auto;
            }
            .message {
                padding: 8px 12px;
                margin: 4px 0;
                border-radius: 8px;
                max-width: 70%;
            }
            .user-message {
                background-color: #3b82f6;
                color: white;
                margin-left: auto;
            }
            .other-message {
                background-color: #e5e7eb;
                color: #1f2937;
            }
            .system-message {
                background-color: #4ade80;
                color: #1f2937;
                max-width: 100%;
                margin: 8px 0;
            }
            .generation-panel {
                margin-top: 20px;
                padding: 15px;
                border-radius: 8px;
                background-color: #f3f4f6;
            }
            .generation-input {
                height: 100px;
            }
        </style>
    </head>
    <body class="flex flex-col min-h-screen bg-gray-100">
        <header class="py-4 px-6 bg-white shadow-md flex justify-between items-center">
            <h1 class="text-2xl font-bold">Generative Backend Builder</h1>
            <div>
                <a href="/docs" class="text-blue-500 hover:text-blue-700 mr-4" target="_blank">Docs</a>
                <a href="/api-docs" class="text-blue-500 hover:text-blue-700 mr-4" target="_blank">API</a>
                <a href="/preview" class="text-blue-500 hover:text-blue-700" target="_blank">Preview</a>
            </div>
        </header>
        
        <main class="flex-grow p-6">
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div class="bg-white rounded-lg shadow-md p-4">
                    <h2 class="text-xl font-semibold mb-4">Chat</h2>
                    <div id="messages" class="messages-container mb-4"></div>
                    
                    <div class="flex gap-2">
                        <input type="text" id="messageInput" 
                            class="flex-grow p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" 
                            placeholder="Type your message...">
                        <button id="sendButton" 
                            class="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500">
                            Send
                        </button>
                    </div>
                </div>
                
                <div class="bg-white rounded-lg shadow-md p-4">
                    <h2 class="text-xl font-semibold mb-4">Generate Backend</h2>
                    <div class="generation-panel">
                        <div class="mb-4">
                            <label for="backendPrompt" class="block text-sm font-medium text-gray-700 mb-2">Describe your backend:</label>
                            <textarea id="backendPrompt" 
                                class="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 generation-input"
                                placeholder="Example: Create a todo list API with endpoints to add, list, update, and delete tasks. Include validation for task data."></textarea>
                        </div>
                        <div class="flex justify-between">
                            <div>
                                <label for="modelSelect" class="block text-sm font-medium text-gray-700 mb-1">Model:</label>
                                <select id="modelSelect" class="p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                                    <option value="gpt-4o">GPT-4o</option>
                                    <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
                                </select>
                            </div>
                            <button id="generateButton" 
                                class="bg-green-500 text-white px-6 py-2 rounded-md hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500">
                                Generate Backend
                            </button>
                        </div>
                    </div>
                    
                    <div id="generationStatus" class="mt-4 hidden">
                        <div class="p-4 border border-blue-300 bg-blue-50 rounded-md">
                            <h3 class="font-semibold text-blue-800">Generating backend...</h3>
                            <div class="mt-2">
                                <div class="w-full bg-gray-200 rounded-full h-2.5">
                                    <div id="progressBar" class="bg-blue-600 h-2.5 rounded-full" style="width: 0%"></div>
                                </div>
                                <p id="statusText" class="text-sm text-gray-600 mt-2">Initializing...</p>
                            </div>
                        </div>
                    </div>
                    
                    <div id="generationResult" class="mt-4 hidden">
                        <div class="p-4 border border-green-300 bg-green-50 rounded-md">
                            <h3 class="font-semibold text-green-800">Backend generated successfully!</h3>
                            <div class="mt-2">
                                <p class="text-sm text-gray-600">Your backend has been generated and is ready to use.</p>
                                <div class="mt-3 flex space-x-2">
                                    <a href="/docs" class="inline-flex items-center px-3 py-1 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500" target="_blank">
                                        View Documentation
                                    </a>
                                    <a href="/api-docs" class="inline-flex items-center px-3 py-1 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500" target="_blank">
                                        API Explorer
                                    </a>
                                    <a href="/preview" class="inline-flex items-center px-3 py-1 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500" target="_blank">
                                        Preview JSON
                                    </a>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </main>

        <script>
            // Store user data
            const username = prompt('Enter your username:') || 'User_' + Math.floor(Math.random() * 1000);
            
            // Connect to WebSocket
            const socket = new WebSocket(\`\${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${req.headers.host}/ws\`);
            
            socket.onopen = () => {
                addSystemMessage('Connected to chat server');
                // Send join message
                socket.send(JSON.stringify({
                    type: 'join',
                    username: username
                }));
            };
            
            socket.onmessage = (event) => {
                const data = JSON.parse(event.data);
                
                if (data.type === 'message') {
                    addMessage(data.username, data.text, data.username === username);
                } else if (data.type === 'system') {
                    addSystemMessage(data.text);
                } else if (data.type === 'generation-update') {
                    updateGenerationStatus(data);
                }
            };
            
            socket.onclose = () => {
                addSystemMessage('Disconnected from chat server');
            };
            
            // UI Functions
            function addMessage(username, text, isUser) {
                const messagesDiv = document.getElementById('messages');
                const messageEl = document.createElement('div');
                messageEl.className = \`message \${isUser ? 'user-message' : 'other-message'}\`;
                
                const usernameSpan = document.createElement('div');
                usernameSpan.className = 'font-bold text-sm';
                usernameSpan.textContent = username;
                
                const textSpan = document.createElement('div');
                textSpan.textContent = text;
                
                messageEl.appendChild(usernameSpan);
                messageEl.appendChild(textSpan);
                messagesDiv.appendChild(messageEl);
                
                // Scroll to bottom
                messagesDiv.scrollTop = messagesDiv.scrollHeight;
            }
            
            function addSystemMessage(text) {
                const messagesDiv = document.getElementById('messages');
                const messageEl = document.createElement('div');
                messageEl.className = 'text-center text-gray-500 text-sm my-2';
                messageEl.textContent = text;
                messagesDiv.appendChild(messageEl);
                
                // Scroll to bottom
                messagesDiv.scrollTop = messagesDiv.scrollHeight;
            }
            
            function addGenerationMessage(text) {
                const messagesDiv = document.getElementById('messages');
                const messageEl = document.createElement('div');
                messageEl.className = 'system-message';
                messageEl.textContent = text;
                messagesDiv.appendChild(messageEl);
                
                // Scroll to bottom
                messagesDiv.scrollTop = messagesDiv.scrollHeight;
            }
            
            function updateGenerationStatus(data) {
                const generationStatus = document.getElementById('generationStatus');
                const progressBar = document.getElementById('progressBar');
                const statusText = document.getElementById('statusText');
                const generationResult = document.getElementById('generationResult');
                
                if (data.status === 'in-progress') {
                    generationStatus.classList.remove('hidden');
                    generationResult.classList.add('hidden');
                    progressBar.style.width = data.progress + '%';
                    statusText.textContent = data.message;
                } else if (data.status === 'complete') {
                    generationStatus.classList.add('hidden');
                    generationResult.classList.remove('hidden');
                    addGenerationMessage('Backend generated successfully: ' + data.backendName);
                } else if (data.status === 'error') {
                    generationStatus.classList.add('hidden');
                    statusText.textContent = data.message;
                    addSystemMessage('Error generating backend: ' + data.message);
                }
            }
            
            // Event Listeners
            document.getElementById('sendButton').addEventListener('click', sendMessage);
            document.getElementById('messageInput').addEventListener('keydown', (e) => {
                if (e.key === 'Enter') sendMessage();
            });
            
            document.getElementById('generateButton').addEventListener('click', generateBackend);
            
            function sendMessage() {
                const input = document.getElementById('messageInput');
                const message = input.value.trim();
                
                if (message) {
                    // Send to server
                    socket.send(JSON.stringify({
                        type: 'message',
                        username: username,
                        text: message
                    }));
                    
                    // Clear input
                    input.value = '';
                }
            }
            
            function generateBackend() {
                const promptInput = document.getElementById('backendPrompt');
                const modelSelect = document.getElementById('modelSelect');
                const prompt = promptInput.value.trim();
                const model = modelSelect.value;
                
                if (!prompt) {
                    alert('Please enter a description for your backend');
                    return;
                }
                
                // Show the generation status panel
                document.getElementById('generationStatus').classList.remove('hidden');
                document.getElementById('generationResult').classList.add('hidden');
                document.getElementById('progressBar').style.width = '5%';
                document.getElementById('statusText').textContent = 'Starting generation...';
                
                // Send the generation request
                fetch('/api/generate', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        prompt,
                        model,
                        username
                    })
                })
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        // Generation was started successfully
                        addSystemMessage('Backend generation started. Please wait...');
                    } else {
                        document.getElementById('generationStatus').classList.add('hidden');
                        addSystemMessage('Error: ' + data.error);
                    }
                })
                .catch(error => {
                    document.getElementById('generationStatus').classList.add('hidden');
                    addSystemMessage('Error: ' + error.message);
                });
                
                // Also broadcast to the chat that we're generating a backend
                socket.send(JSON.stringify({
                    type: 'message',
                    username: username,
                    text: 'I started generating a backend with prompt: ' + prompt
                }));
            }
        </script>
    </body>
    </html>
    `;

    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  });

  // API route for backend generation
  app.post('/api/generate', async (req: Request, res: Response) => {
    const { prompt, model, username } = req.body;

    logger.log(`POST /api/generate - Generating backend from prompt: ${prompt}`);

    if (!prompt) {
      return res.status(400).json({
        success: false,
        error: 'Missing prompt'
      });
    }

    // Find connected WebSockets to send updates to
    const wss = (server as any).wss;
    const broadcastUpdate = (data: Record<string, any>) => {
      if (wss && wss.clients) {
        wss.clients.forEach((client: WebSocket) => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({
              type: 'generation-update',
              ...data
            }));
          }
        });
      }
    };

    try {
      // Set up the config for backend generation
      const config: GeneratorConfig = {
        openaiApiKey: process.env.OPENAI_API_KEY,
        model: model || 'gpt-4o',
        outputDir: './src',
        verbose: true
      };

      // Send initial update
      broadcastUpdate({
        status: 'in-progress',
        progress: 10,
        message: 'Parsing prompt and generating structure...'
      });

      // Start the generation process
      generateBackend(prompt, config)
        .then((result) => {
          if (result.success && result.data) {
            // Send success update
            broadcastUpdate({
              status: 'complete',
              backendName: result.data.name,
              endpoints: result.data.endpoints.length
            });

            logger.log(`Backend generation complete: ${result.data.name}`);
          } else {
            // Send error update
            broadcastUpdate({
              status: 'error',
              message: result.error || 'Unknown error'
            });

            logger.error('Backend generation failed:', result.error);
          }
        })
        .catch((error: Error) => {
          // Send error update
          broadcastUpdate({
            status: 'error',
            message: error.message || 'Unknown error'
          });

          logger.error('Backend generation error:', error);
        });

      // Respond immediately that we've started the generation
      return res.json({
        success: true,
        message: 'Backend generation started'
      });
    } catch (error) {
      logger.error('Error in /api/generate endpoint:', error);
      return res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  return { app, server };
}

/**
 * Start the server and listen on the specified port
 */
export function startServer(): void {
  const { app, server } = initializeServer();

  // Initialize nodes and workflows
  initializeNodes();
  initializeWorkflows();

  // Register hardcoded routes for our API endpoints
  registerHardcodedRoutes(app);

  server.listen(PORT, () => {
    logger.log(`Server running on http://localhost:${PORT}`);
    logger.log(`API Documentation: http://localhost:${PORT}/docs`);
    logger.log(`Swagger UI: http://localhost:${PORT}/api-docs`);
    logger.log(`Backend Preview: http://localhost:${PORT}/preview`);
    logger.log(`Chat App: http://localhost:${PORT}/chat`);
  });
}

/**
 * Register hardcoded routes for testing purposes
 */
function registerHardcodedRoutes(app: Express): void {
  // GET /api/movies - List all movies
  app.get('/api/movies', (req: Request, res: Response) => {
    logger.log('GET /api/movies - Listing all movies');
    res.json({
      movies: [
        {
          name: "Inception",
          description: "A thief who steals corporate secrets through dream-sharing technology",
          releaseYear: 2010
        },
        {
          name: "The Shawshank Redemption",
          description: "Two imprisoned men bond over a number of years",
          releaseYear: 1994
        },
        {
          name: "The Godfather",
          description: "The aging patriarch of an organized crime dynasty",
          releaseYear: 1972
        }
      ]
    });
  });

  // POST /api/movies - Add a new movie
  app.post('/api/movies', (req: Request, res: Response) => {
    logger.log('POST /api/movies - Adding a new movie');
    const { name, description, releaseYear } = req.body;

    if (!name || !description || !releaseYear) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'Please provide name, description, and releaseYear'
      });
    }

    res.json({
      success: true,
      movie: { name, description, releaseYear }
    });
  });

  logger.log('Registered hardcoded API routes for testing');
}

/**
 * Update the generated backend data
 */
export function updateGeneratedBackend(backend: GeneratedBackend): void {
  generatedBackend = backend;

  // Save to file for persistence
  try {
    const dataPath = path.join(process.cwd(), 'src', 'generator');
    if (!fs.existsSync(dataPath)) {
      fs.mkdirSync(dataPath, { recursive: true });
    }

    fs.writeFileSync(
      path.join(dataPath, 'generated-backend.json'),
      JSON.stringify(backend, null, 2),
      'utf8'
    );
  } catch (error) {
    logger.error('Error saving generated backend data:', error);
  }
}

// If this file is run directly, start the server
if (require.main === module) {
  startServer();
} 