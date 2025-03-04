import { type Step } from "@nanoservice-ts/helper";

// Type for a generated node
export interface GeneratedNode {
  name: string;
  type: string;
  code: string;
  filepath: string;
}

// Type for a generated workflow
export interface GeneratedWorkflow {
  name: string;
  description: string;
  steps: Step | undefined;
  filepath: string;
  endpoints: GeneratedEndpoint[];
}

// Type for a generated API endpoint
export interface GeneratedEndpoint {
  path: string;
  method: string;
  description: string;
  parameters?: EndpointParameter[];
  responses?: EndpointResponse[];
}

// Parameter for an API endpoint
export interface EndpointParameter {
  name: string;
  in: "path" | "query" | "body" | "header";
  required: boolean;
  type: string;
  description: string;
}

// Response from an API endpoint
export interface EndpointResponse {
  status: number;
  description: string;
  schema?: object;
}

// Overall structure of a generated backend
export interface GeneratedBackend {
  name: string;
  description: string;
  version: string;
  nodes: GeneratedNode[];
  workflows: GeneratedWorkflow[];
  endpoints: GeneratedEndpoint[];
}

// Configuration for the generator
export interface GeneratorConfig {
  openaiApiKey?: string;
  model?: string;
  outputDir?: string;
  verbose?: boolean;
}

// Mapping of node names to their classes
export interface NodeMap {
  [key: string]: any;
}

// Mapping of workflow names to their step definitions
export interface WorkflowMap {
  [key: string]: Step;
}

// Output from the AI text generation
export interface GenerationResult {
  success: boolean;
  error?: string;
  data?: GeneratedBackend;
}

// Swagger/OpenAPI specification type
export interface OpenAPISpec {
  openapi: string;
  info: {
    title: string;
    description: string;
    version: string;
  };
  servers: Array<{ url: string }>;
  paths: {
    [path: string]: {
      [method: string]: {
        summary: string;
        description: string;
        parameters?: any[];
        requestBody?: any;
        responses: {
          [statusCode: string]: {
            description: string;
            content?: any;
          };
        };
      };
    };
  };
  components?: {
    schemas?: Record<string, any>;
  };
} 