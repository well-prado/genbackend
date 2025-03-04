# Generative Backend Builder

A Generative AI system that uses nanoservice-ts to auto-generate backend pipelines, nodes, workflows, API endpoints, and documentation.

## Overview

This project allows you to:

1. Describe the backend functionality you need in natural language
2. Automatically generate TypeScript code for nanoservice-ts nodes and workflows
3. Create API endpoints that implement your desired functionality
4. Generate comprehensive API documentation in a Swagger-like format

## Installation

```bash
# Clone this repository
git clone https://github.com/yourusername/genbackend.git
cd genbackend

# Install dependencies
npm install

# Build the project
npm run build
```

## Usage

### Command Line Interface

You can use the CLI to generate backend services from natural language descriptions:

```bash
# Using npx
npx genbackend "Generate an API that lists movies with name, description, and release year, and a second endpoint for adding new movies"

# Or if installed globally
genbackend "Generate an API that lists movies with name, description, and release year, and a second endpoint for adding new movies"
```

### Running the Generated Server

Once your backend is generated, you can start the server:

```bash
npm start
```

### Available Endpoints

After generation, your service will have the following endpoints:

- API Endpoints: `/api/<service-name>/<endpoint>`
- Documentation: `/docs`
- Preview: `/preview`

## Development

To run in development mode with hot reloading:

```bash
npm run dev
```

## Generated Project Structure

```
src/
  ├── nodes/           # Generated node files
  ├── workflows/       # Generated workflow definitions
  ├── generator/       # AI prompt parsing and code generation
  ├── templates/       # EJS templates for documentation
  └── index.ts         # Main server file
```

## Example

**Input Prompt:**

```
Generate an API that lists movies with name, description, and release year, and a second endpoint for adding new movies
```

**Output:**

- Generated API endpoints for listing and adding movies
- Auto-generated documentation
- JSON preview of all generated components

## License

MIT
