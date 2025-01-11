# Windsurf File for Project

## Project Overview

### Project Name: DevUXPlatform

Description:

A developer-focused platform that facilitates user experience design through AI assistance, offering local execution for enhanced privacy. The platform seamlessly integrates with both local Ollama instances and remote APIs for AI-powered suggestions and design outputs.

Tech Stack:

*   **Frontend**: Next.js 14, TypeScript, Tailwind CSS, shadcn/UI, Radix UI, Lucide Icons
*   **Backend**: In-memory storage, local file system
*   **AI Models**: GPT-4o, local Ollama, remote API
*   **Development Tools**: V0 by Vercel, Claude AI, Cursor AI, Lovable, Bolt

Key Features:

*   AI-powered design suggestions
*   Local or remote LLM integration
*   Developer-centric UX design tools
*   Customizable design elements
*   Real-time design updates
*   Privacy-focused on local execution

## Project Structure

### Root Directory:

Contains the main configuration files and documentation.

### /frontend:

Contains all frontend-related code, including components, styles, and assets.

/components:

*   ProjectPage
*   DesignDashboard
*   SettingsPage
*   CodeEditor
*   PreviewArea
*   ChatWindow

/assets:

*   Logos
*   Icons
*   Images

/styles:

*   Base.css
*   TailwindConfig

### /backend:

Contains all backend-related code, including API routes and database models.

/controllers:

*   AIDesignController
*   ProjectManagementController

/models:

*   ProjectModel
*   UserModel

/routes:

*   api/projects
*   api/designs

/config:

Configuration files for environment variables and application settings.

### /tests:

Contains unit and integration tests for both frontend and backend.

*   frontend.test.js
*   backend.test.js

## Development Guidelines

### Coding Standards:

Follow standard TypeScript practices and maintain consistent usage of Tailwind CSS for all styling. Ensure comments and documentation accompany complex logic for clarity.

### Component Organization:

Components should be organized based on functionality and reusability, with shared components housed in a `common` directory under `/components`.

## Windsurf IDE Integration

### Setup Instructions:

1.  Clone the project repository.
2.  Install dependencies using `npm install`.
3.  Configure environment variables in `/config`.
4.  Run the development server using `npm run dev`.

### Key Commands:

*   **Run Dev Server**: `npm run dev`
*   **Build Project**: `npm run build`
*   **Run Tests**: `npm test`

## Additional Context

### User Roles:

*   **Developer**: Full access to design and AI tools.
*   **Admin**: Manage user accounts and configurations.
*   **Guest**: Limited access for viewing purposes.

### Accessibility Considerations:

Ensure all components are keyboard navigable and comply with WCAG 2.1 standards for an inclusive design approach.
