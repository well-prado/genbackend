import express, { type Express, type Request, type Response, NextFunction } from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import swaggerUi from 'swagger-ui-express';
import fs from 'fs';
import path from 'path';
import { initializeNodes } from './nodes';
import { initializeWorkflows } from './workflows';
import { renderDocumentation } from './generator/documentationGenerator';
import { GeneratedBackend } from './types';
import { logger } from './utils/logger';

const PORT = process.env.PORT || 4000;

// Global state to store the generated backend
let generatedBackend: GeneratedBackend | null = null;

/**
 * Initialize the HTTP server with all routes and middleware
 */
export function initializeServer(): Express {
  const app = express();

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

  // API routes
  app.get('/', (req: Request, res: Response) => {
    res.json({
      message: 'Generative Backend Builder API',
      version: '0.1.0',
      docs: '/docs',
      preview: '/preview'
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

  return app;
}

/**
 * Start the server and listen on the specified port
 */
export function startServer(): void {
  const app = initializeServer();

  // Initialize nodes and workflows
  initializeNodes();
  initializeWorkflows();

  // Register hardcoded routes for our API endpoints
  registerHardcodedRoutes(app);

  app.listen(PORT, () => {
    logger.log(`Server running on http://localhost:${PORT}`);
    logger.log(`API Documentation: http://localhost:${PORT}/docs`);
    logger.log(`Swagger UI: http://localhost:${PORT}/api-docs`);
    logger.log(`Backend Preview: http://localhost:${PORT}/preview`);
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