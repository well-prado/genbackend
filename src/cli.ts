#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { generateBackend } from './generator/backendGenerator';
import { startServer } from './server';
import { type GeneratorConfig } from './types';

// Load environment variables
dotenv.config();

const program = new Command();

// Set up CLI metadata
program
  .name('genbackend')
  .description('Generate backend services from natural language descriptions')
  .version('0.1.0');

// Main command to generate backend
program
  .argument('<prompt>', 'Natural language description of the backend service')
  .option('-o, --output <directory>', 'Output directory', './src')
  .option('-m, --model <model>', 'OpenAI model to use', 'gpt-4o')
  .option('-v, --verbose', 'Enable verbose output')
  .option('-s, --start', 'Start the server after generating')
  .action(async (prompt: string, options: any) => {
    const config: GeneratorConfig = {
      openaiApiKey: process.env.OPENAI_API_KEY,
      model: options.model,
      outputDir: options.output,
      verbose: options.verbose
    };

    if (!config.openaiApiKey) {
      console.error(chalk.red('Error: OPENAI_API_KEY environment variable not set.'));
      console.log('Please set your OpenAI API key using:');
      console.log(chalk.cyan('export OPENAI_API_KEY=your_api_key_here'));
      console.log('Or create a .env file with OPENAI_API_KEY=your_api_key_here');
      process.exit(1);
    }

    console.log(chalk.blue('🚀 Generating backend from prompt:'));
    console.log(chalk.yellow(`"${prompt}"`));
    console.log(chalk.blue('Using model:'), chalk.yellow(config.model || 'gpt-4-turbo'));
    console.log(chalk.blue('Output directory:'), chalk.yellow(config.outputDir));

    try {
      // Ensure output directory exists
      const outputDir = path.resolve(process.cwd(), config.outputDir || './src');
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      // Generate the backend
      const result = await generateBackend(prompt, config);

      if (!result.success || !result.data) {
        console.error(chalk.red('❌ Failed to generate backend:'), result.error);
        process.exit(1);
      }

      console.log(chalk.green('✅ Backend generated successfully!'));
      console.log(chalk.blue('Generated:'));
      console.log(chalk.yellow(`- ${result.data.nodes.length} nodes`));
      console.log(chalk.yellow(`- ${result.data.workflows.length} workflows`));
      console.log(chalk.yellow(`- ${result.data.endpoints.length} API endpoints`));

      // Start the server if requested
      if (options.start) {
        console.log(chalk.blue('🚀 Starting server...'));
        startServer();
      } else {
        console.log(chalk.blue('To start the server, run:'));
        console.log(chalk.cyan('npm start'));
      }
    } catch (error) {
      console.error(chalk.red('❌ Error:'), error);
      process.exit(1);
    }
  });

// Command to just start the server with existing generated code
program
  .command('start')
  .description('Start the server with existing generated code')
  .action(() => {
    console.log(chalk.blue('🚀 Starting server...'));
    startServer();
  });

// Parse command line arguments
program.parse(process.argv);

// If no arguments provided, display help
if (process.argv.length === 2) {
  program.help();
} 