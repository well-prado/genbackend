import fs from 'fs';
import path from 'path';
import type { Step } from '@nanoservice-ts/helper';
import type { WorkflowMap } from './types';
import { logger } from './utils/logger';

const workflows: WorkflowMap = {};

/**
 * Initialize custom generated workflows
 */
export function initializeWorkflows(): WorkflowMap {
  const workflowsDir = path.join(process.cwd(), 'dist', 'workflows');

  // Skip if directory doesn't exist
  if (!fs.existsSync(workflowsDir)) {
    logger.warn('Compiled workflows directory does not exist');
    return workflows;
  }

  // Only look for compiled JS files
  const workflowFiles = fs.readdirSync(workflowsDir)
    .filter(file => file.endsWith('.js'));

  let loadedCount = 0;

  // Require and register each workflow
  for (const file of workflowFiles) {
    try {
      const workflowPath = path.join(workflowsDir, file);
      // Use require to load the compiled workflow
      const workflow = require(workflowPath).default as Step;

      if (workflow) {
        const workflowName = file.replace(/\.js$/, '');
        workflows[workflowName] = workflow;
        loadedCount++;
      }
    } catch (error) {
      logger.error(`Error loading workflow from file ${file}:`, error);
    }
  }

  logger.log(`Initialized ${loadedCount} workflows`);
  return workflows;
}

/**
 * Get the workflow map
 */
export function getWorkflows(): WorkflowMap {
  return workflows;
}

export default {
  initializeWorkflows,
  getWorkflows
}; 