# HackPSU Auth Service

A centralized authentication service for the HackPSU ecosystem, providing secure user authentication and session management across multiple subdomain applications.

## Project Overview

The HackPSU Auth Service serves as the single source of truth for user authentication within the HackPSU platform. It provides a unified login experience with support for multiple authentication providers and manages user sessions across all HackPSU subdomain applications through secure session cookies.

**Target Users:** HackPSU event participants, volunteers, team members, and administrators
**Primary Use Cases:**

- Centralized authentication for hackathon participants
- Role-based access control for HackPSU team members
- Secure session management across multiple applications
- OAuth integration with popular development platforms

**Key Capabilities:**

- Multi-provider authentication (Email/Password, Google, GitHub, Microsoft)
- JWT-based role verification and access control
- Cross-subdomain session management
- Password reset functionality
- User analytics and tracking integration

## Tech Stack

### Core Framework

- **Next.js 15** - Full-stack React framework with App Router for server-side rendering and API routes
- **React 19** - Modern UI library with concurrent features and improved performance
- **TypeScript** - Type-safe development with comprehensive type definitions

### Styling & UI Components

- **Tailwind CSS 4** - Utility-first CSS framework for rapid UI development
- **shadcn/ui** - High-quality, accessible React components built on Radix UI primitives
- **Radix UI** - Unstyled, accessible UI components for complex interactions
- **Lucide React** - Beautiful, customizable SVG icons optimized for React

### Authentication & Backend Integration

- **Firebase Authentication** - Google's authentication service with multi-provider support
- **Firebase Admin SDK** - Server-side Firebase operations for session cookie management
- **JWT Decode** - Client-side JWT token parsing for role extraction and validation

### Form Handling & Validation

- **React Hook Form** - Performant forms library with minimal re-renders
- **Zod** - TypeScript-first schema validation for form data and API responses

### Analytics & Monitoring

- **PostHog** - Product analytics and user behavior tracking for both client and server-side events

### Development Tools

- **ESLint** - Code linting with Next.js optimized configuration
- **Prettier** - Consistent code formatting across the codebase

## Architecture & Design Decisions

### Authentication Strategy

- **Hybrid Authentication Flow**: Combines Firebase client-side authentication with server-side session cookies
- **Multi-Provider Support**: OAuth integration with Google, GitHub, and Microsoft for developer convenience
- **Role-Based Access Control**: JWT custom claims system for fine-grained permission management
- **Cross-Domain Sessions**: Secure HTTP-only cookies with `.hackpsu.org` domain for subdomain sharing

### Next.js App Router Structure

- **API Routes**: RESTful endpoints for session management (`/api/sessionLogin`, `/api/sessionLogout`, `/api/sessionUser`)
- **Server Components**: Leverage React Server Components for improved performance and SEO
- **Client Components**: Strategic use of client-side rendering for interactive authentication forms
- **Middleware**: CORS handling and request preprocessing for cross-origin authentication

### State Management

- **React Context**: Centralized authentication state management through `FirebaseProvider`
- **Firebase State Sync**: Real-time authentication state synchronization between client and server
- **Session Persistence**: Automatic session restoration and token refresh handling

### Security Architecture

- **JWT Custom Claims**: Role-based permissions encoded in Firebase ID tokens
- **CORS Protection**: Strict origin validation for HackPSU subdomains only
- **Secure Cookies**: HTTP-only, secure, SameSite cookies for session management
- **Token Validation**: Server-side verification of Firebase ID tokens before session creation

### Performance Optimizations

- **Turbopack**: Next.js 15 bundler for faster development builds
- **Code Splitting**: Automatic route-based code splitting with dynamic imports
- **Suspense Boundaries**: React Suspense for graceful loading states
- **Memoization**: Strategic use of React hooks for expensive operations

## Getting Started

### Prerequisites

- Node.js 18+ and Yarn package manager
- Firebase project with Authentication enabled
- Environment variables for Firebase configuration

### Installation

1. Clone the repository and install dependencies:

   ```bash
   git clone <repository-url>
   cd auth
   yarn install
   ```

2. Configure environment variables:

   ```bash
   cp .env.example .env.local
   # Add your Firebase configuration and service account credentials
   ```

3. Start the development server:
   ```bash
   yarn dev
   ```

### Available Scripts

- `yarn dev` - Start development server with Turbopack
- `yarn build` - Create production build
- `yarn start` - Run production server
- `yarn lint` - Run ESLint code analysis
- `yarn format` - Format code with Prettier

### Environment Setup

Required environment variables:

- `NEXT_PUBLIC_FIREBASE_*` - Firebase client configuration
- `FIREBASE_SERVICE_ACCOUNT_*` - Firebase Admin SDK credentials
- `NEXT_PUBLIC_POSTHOG_KEY` - PostHog analytics key

## Project Structure

```
src/
├── app/                          # Next.js App Router
│   ├── api/                      # API route handlers
│   │   ├── sessionLogin/         # Create session cookie
│   │   ├── sessionLogout/        # Clear session cookie
│   │   └── sessionUser/          # Validate session
│   ├── login/                    # Authentication pages
│   ├── reset-password/           # Password reset flow
│   ├── layout.tsx                # Root layout with providers
│   ├── page.tsx                  # Home page with auth status
│   └── middleware.ts             # CORS and request handling
├── common/
│   ├── config/                   # Configuration modules
│   │   ├── environment.ts        # Environment variable handling
│   │   └── firebase.ts           # Firebase client initialization
│   └── context/
│       └── FirebaseProvider.tsx  # Authentication context provider
├── components/
│   └── ui/                       # Reusable UI components (shadcn/ui)
└── lib/
    ├── firebaseAdmin.ts          # Firebase Admin SDK setup
    └── utils.ts                  # Utility functions
```

## Key Features

### Authentication Methods

- **Email/Password Authentication** - Traditional login with account creation fallback
- **OAuth Providers** - Google, GitHub, and Microsoft single sign-on
- **Password Reset** - Secure email-based password recovery
- **Account Creation** - Automatic user registration for new email addresses

### Session Management

- **Cross-Domain Sessions** - Secure session sharing across HackPSU subdomains
- **Automatic Token Refresh** - Transparent JWT token renewal
- **Session Validation API** - Server-side session verification endpoints
- **Secure Logout** - Complete session cleanup across all applications

### User Experience

- **Responsive Design** - Optimized for desktop and mobile devices
- **Loading States** - Comprehensive loading indicators and error handling
- **Return URL Support** - Redirect users to intended destination after authentication
- **Visual Feedback** - Clear success and error messaging

### Developer Experience

- **Type Safety** - Comprehensive TypeScript coverage
- **Component Library** - Consistent UI components with shadcn/ui
- **Development Tools** - Hot reload, linting, and formatting automation
- **Analytics Integration** - Built-in user behavior tracking

## Deployment

The application is configured for deployment on Vercel with automatic builds from the main branch. Environment variables must be configured in the deployment platform with the same keys as local development.

## Contributing

### Code Standards

- **TypeScript**: All new code must include proper type definitions
- **ESLint**: Follow the configured linting rules without exceptions
- **Prettier**: Use automated formatting for consistent code style
- **Component Structure**: Follow established patterns for new UI components

### Development Workflow

- Create feature branches from main
- Ensure all tests pass and linting is clean
- Follow conventional commit message format
- Submit pull requests for code review
