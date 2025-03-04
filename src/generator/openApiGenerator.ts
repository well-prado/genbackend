import type { GeneratedBackend, OpenAPISpec, GeneratedEndpoint, EndpointParameter, EndpointResponse } from '../types';
import { logger } from '../utils/logger';

/**
 * Generate an OpenAPI specification from the generated backend
 */
export function generateOpenAPISpec(backend: GeneratedBackend): OpenAPISpec {
  try {
    logger.log('Generating OpenAPI specification...');

    // Create the base OpenAPI spec
    const spec: OpenAPISpec = {
      openapi: '3.0.0',
      info: {
        title: backend.name,
        description: backend.description,
        version: backend.version
      },
      servers: [
        {
          url: '/api'
        }
      ],
      paths: {},
      components: {
        schemas: {}
      }
    };

    // Add paths for each endpoint
    for (const endpoint of backend.endpoints) {
      addEndpointToSpec(spec, endpoint);
    }

    return spec;
  } catch (error) {
    logger.error('Error generating OpenAPI spec:', error);

    // Return a minimal valid spec in case of error
    return {
      openapi: '3.0.0',
      info: {
        title: backend.name || 'Generated API',
        description: 'Error generating complete specification',
        version: backend.version || '0.1.0'
      },
      servers: [{ url: '/api' }],
      paths: {}
    };
  }
}

/**
 * Add an endpoint to the OpenAPI specification
 */
function addEndpointToSpec(spec: OpenAPISpec, endpoint: GeneratedEndpoint): void {
  // Normalize the path for OpenAPI (remove /api prefix if present)
  let path = endpoint.path;
  if (path.startsWith('/api')) {
    path = path.substring(4);
  }

  // Ensure the path starts with a slash
  if (!path.startsWith('/')) {
    path = '/' + path;
  }

  // Initialize the path object if it doesn't exist
  if (!spec.paths[path]) {
    spec.paths[path] = {};
  }

  // Convert method to lowercase (OpenAPI convention)
  const method = endpoint.method.toLowerCase();

  // Create the operation object
  const operation: any = {
    summary: endpoint.description,
    description: endpoint.description,
    responses: {}
  };

  // Add parameters if they exist
  if (endpoint.parameters && endpoint.parameters.length > 0) {
    operation.parameters = endpoint.parameters.map(param => convertParameter(param));

    // Handle body parameters separately (OpenAPI 3.0 uses requestBody)
    const bodyParams = endpoint.parameters.filter(p => p.in === 'body');
    if (bodyParams.length > 0) {
      operation.requestBody = {
        description: bodyParams[0].description,
        required: bodyParams[0].required,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              // This is a simplification - in a real implementation, 
              // you would need to build a proper schema
              properties: {}
            }
          }
        }
      };

      // Remove body parameters from the parameters array
      operation.parameters = operation.parameters.filter((p: any) => p.in !== 'body');
    }
  }

  // Add responses
  if (endpoint.responses && endpoint.responses.length > 0) {
    for (const response of endpoint.responses) {
      operation.responses[response.status.toString()] = convertResponse(response);
    }
  } else {
    // Add a default response if none provided
    operation.responses['200'] = {
      description: 'Successful operation'
    };
  }

  // Add the operation to the path
  spec.paths[path][method] = operation;
}

/**
 * Convert an endpoint parameter to OpenAPI format
 */
function convertParameter(param: EndpointParameter): any {
  // Handle body parameters separately in the calling function
  if (param.in === 'body') {
    return {
      name: param.name,
      in: param.in,
      description: param.description,
      required: param.required
    };
  }

  // Regular parameter
  return {
    name: param.name,
    in: param.in,
    description: param.description,
    required: param.required,
    schema: {
      type: param.type
    }
  };
}

/**
 * Convert an endpoint response to OpenAPI format
 */
function convertResponse(response: EndpointResponse): any {
  const result: any = {
    description: response.description
  };

  if (response.schema) {
    result.content = {
      'application/json': {
        schema: response.schema
      }
    };
  }

  return result;
} 