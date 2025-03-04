import OpenAI from 'openai';
import type { GeneratorConfig, GenerationResult } from '../types';
import { logger } from '../utils/logger';

/**
 * Parse the user's natural language prompt into structured data
 */
export async function parsePrompt(
  prompt: string,
  config: GeneratorConfig
): Promise<GenerationResult> {
  try {
    // Validate input
    if (!prompt || prompt.trim().length === 0) {
      return {
        success: false,
        error: 'Empty prompt provided'
      };
    }

    // Initialize OpenAI client
    if (!config.openaiApiKey) {
      return {
        success: false,
        error: 'OpenAI API key is required'
      };
    }

    const openai = new OpenAI({
      apiKey: config.openaiApiKey
    });

    // Create the system prompt
    const systemPrompt = `You are an expert backend architect specializing in nanoservice-ts. 
Your task is to analyze the user's request and generate a structured representation of the backend they need.
You should identify:
1. The required nodes (small, single-responsibility units)
2. The workflows that connect these nodes
3. The API endpoints that should be exposed

Think of nodes as individual functions that perform a specific task. Workflows are sequences of nodes that are executed to fulfill a request.

Respond with valid JSON in the following format:
{
  "name": "short-service-name",
  "description": "Description of the backend service",
  "nodes": [
    {
      "name": "node-name",
      "type": "data-processor|validator|external-api|database|transformer",
      "description": "What this node does",
      "inputs": [{"name": "inputName", "type": "string|number|boolean|object", "description": "What this input is for"}],
      "outputs": [{"name": "outputName", "type": "string|number|boolean|object", "description": "What this output represents"}]
    }
  ],
  "workflows": [
    {
      "name": "workflow-name",
      "description": "What this workflow does",
      "nodes": ["node-name-1", "node-name-2"],
      "endpoints": [
        {
          "path": "/api/resource",
          "method": "GET|POST|PUT|DELETE",
          "description": "What this endpoint does",
          "parameters": [
            {"name": "paramName", "in": "path|query|body|header", "required": true, "type": "string", "description": "Parameter description"}
          ],
          "responses": [
            {"status": 200, "description": "Success response", "schema": {"type": "object", "properties": {"key": {"type": "string"}}}}
          ]
        }
      ]
    }
  ]
}`;

    // Log what we're doing
    logger.log('Parsing prompt with OpenAI...');

    // Make the API call to OpenAI
    const completion = await openai.chat.completions.create({
      model: config.model || 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: systemPrompt
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.2, // Lower temperature for more deterministic output
      max_tokens: 2500, // Adjust as needed
      response_format: { type: 'json_object' } // Ensure JSON response
    });

    const content = completion.choices[0]?.message.content;

    if (!content) {
      return {
        success: false,
        error: 'No content in OpenAI response'
      };
    }

    // Parse the response
    try {
      const parsedData = JSON.parse(content);

      // Basic validation
      if (!parsedData.name || !parsedData.workflows || !Array.isArray(parsedData.workflows)) {
        return {
          success: false,
          error: 'Invalid data format in OpenAI response'
        };
      }

      // Log success
      logger.log(`Successfully parsed prompt`);
      logger.log(`Service name: ${parsedData.name}`);
      logger.log(`Nodes: ${parsedData.nodes?.length || 0}`);
      logger.log(`Workflows: ${parsedData.workflows.length}`);

      return {
        success: true,
        data: parsedData
      };
    } catch (parseError) {
      logger.error('Error parsing OpenAI response:', parseError);
      return {
        success: false,
        error: 'Failed to parse OpenAI response as JSON'
      };
    }
  } catch (error) {
    logger.error('Error in parsePrompt:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
} 