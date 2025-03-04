import dotenv from 'dotenv';
import { startServer } from './server';
import { generateBackend } from './generator/backendGenerator';

// Load environment variables
dotenv.config();

// Export the main functions
export {
  startServer,
  generateBackend
};

// If this file is run directly, start the server
if (require.main === module) {
  startServer();
} 