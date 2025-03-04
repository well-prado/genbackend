import { NodeMap } from '@nanoservice-ts/runner';
import ApiCall from '@nanoservice-ts/api-call';
import IfElse from '@nanoservice-ts/if-else';
import fs from 'fs';
import path from 'path';
import { type NodeMap as NodeMapType } from './types';
import { logger } from './utils/logger';

const nodeMap = new NodeMap();

/**
 * Initialize built-in nodes
 */
function initializeBuiltInNodes(): void {
  // Register built-in nodes
  nodeMap.addNode('@nanoservice-ts/api-call', new ApiCall());
  nodeMap.addNode('@nanoservice-ts/if-else', new IfElse());

  logger.log('Initialized built-in nodes');
}

/**
 * Initialize custom generated nodes
 */
function initializeCustomNodes(): void {
  const nodesDir = path.join(process.cwd(), 'dist', 'nodes');

  // Skip if directory doesn't exist
  if (!fs.existsSync(nodesDir)) {
    logger.warn('Compiled nodes directory does not exist');
    return;
  }

  // Only look for compiled JS files
  const nodeFiles = fs.readdirSync(nodesDir)
    .filter(file => file.endsWith('.js'));

  let loadedCount = 0;

  // Require and register each node
  for (const file of nodeFiles) {
    try {
      const nodePath = path.join(nodesDir, file);
      // Use require to load the compiled node
      const NodeClass = require(nodePath).default;

      if (NodeClass) {
        const nodeName = file.replace(/\.js$/, '');
        nodeMap.addNode(nodeName, new NodeClass());
        loadedCount++;
      }
    } catch (error) {
      logger.error(`Error loading node from file ${file}:`, error);
    }
  }

  logger.log(`Initialized ${loadedCount} custom nodes`);
}

/**
 * Initialize all nodes
 */
export function initializeNodes(): NodeMapType {
  initializeBuiltInNodes();
  initializeCustomNodes();

  return nodeMap as unknown as NodeMapType;
}

/**
 * Get the node map
 */
export function getNodeMap(): NodeMapType {
  return nodeMap as unknown as NodeMapType;
}

export default {
  initializeNodes,
  getNodeMap
}; 