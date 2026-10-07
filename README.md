# PharmaSOFT - Modern Pharmacy Management System

A modern, offline-first Pharmacy Management System designed for the Tunisian market, built with a monorepo architecture using Turborepo.

## 🏗️ Architecture Overview

This project is a **monorepo** containing multiple applications and shared packages:

### Applications

#### 🖥️ `apps/desktop` - Electron Desktop Application
- **Purpose**: Offline POS (Point of Sale) station for pharmacy operations
- **Tech Stack**: 
  - Electron 28.0.0
  - React 19.2.0
  - Vite 7.3.0
  - TypeScript
- **Features**:
  - Offline-first architecture
  - Native desktop performance
  - Cross-platform support (Windows, macOS, Linux)

#### 🌐 `apps/web` - Next.js Web Dashboard
- **Purpose**: Responsive admin dashboard for analytics and management
- **Tech Stack**:
  - Next.js 16.1.0 (App Router)
  - React 19
  - TypeScript
  - Tailwind CSS
- **Features**:
  - Server-side rendering
  - Responsive design
  - Real-time analytics

### Shared Packages

#### 🎨 `packages/ui` - Shared Component Library
- Shared React components with Tailwind CSS
- Consistent UI across desktop and web applications
- TypeScript support

#### 🗄️ `packages/database` - Database Layer
- **ORM**: Prisma 6.0.0
- **Database**: SQLite (configurable)
- Shared database schema and client
- Type-safe database operations

## 📦 Project Structure

```
pharmasoft/
├── apps/
│   ├── desktop/          # Electron POS application
│   │   ├── electron/     # Main and preload processes
│   │   ├── src/          # React application
│   │   ├── dist/         # Built application
│   │   └── package.json
│   └── web/              # Next.js dashboard
│       ├── src/
│       │   └── app/      # App router pages
│       └── package.json
├── packages/
│   ├── ui/               # Shared component library
│   │   └── src/
│   │       └── index.tsx
│   └── database/         # Prisma database layer
│       ├── prisma/
│       │   └── schema.prisma
│       └── src/
│           └── index.ts
├── package.json          # Root package.json with workspaces
├── turbo.json           # Turborepo configuration
└── README.md
```

## 🚀 Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm (v10 or higher)

### Installation

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Generate Prisma client**:
   ```bash
   cd packages/database
   npm run generate
   ```

### Development

#### Run all applications in development mode:
```bash
npm run dev
```

#### Run specific applications:

**Desktop application**:
```bash
cd apps/desktop
npm run dev
```

**Web dashboard**:
```bash
cd apps/web
npm run dev
```

### Building

#### Build all applications:
```bash
npm run build
```

This will:
1. Build the database package (generate Prisma client)
2. Build the UI component library
3. Build the Next.js web dashboard
4. Build the Electron desktop application (including installer)

#### Build specific applications:

**Desktop application**:
```bash
cd apps/desktop
npm run build
```
This creates:
- `dist/desktop Setup 0.0.0.exe` - Windows installer
- `dist/win-unpacked/` - Unpacked Windows application

**Web dashboard**:
```bash
cd apps/web
npm run build
```

## 🛠️ Technologies

### Monorepo Management
- **Turborepo 2.7.0**: High-performance build system for monorepos
- **npm workspaces**: Package management across the monorepo

### Frontend
- **React 19**: Latest React with improved performance
- **TypeScript 5.9**: Type safety across all applications
- **Tailwind CSS 3.0**: Utility-first CSS framework
- **Vite 7.3**: Fast build tool and dev server

### Backend & Database
- **Prisma 6.0**: Modern ORM with type safety
- **SQLite**: Embedded database (easily configurable for PostgreSQL/MySQL)

### Desktop
- **Electron 28.0**: Build cross-platform desktop apps
- **electron-builder 24.9**: Package and build desktop installers

### Web
- **Next.js 16.1**: React framework with App Router
- **Server-side rendering**: Improved performance and SEO

## 📝 Available Scripts

### Root Level

- `npm run build` - Build all packages and applications
- `npm run dev` - Run all applications in development mode
- `npm run lint` - Lint all packages
- `npm run format` - Format code using Prettier

### Desktop App (`apps/desktop`)

- `npm run dev` - Start Electron app in development mode
- `npm run build` - Build and package the Electron application
- `npm run lint` - Lint the desktop application
- `npm run preview` - Preview the Vite build

### Web App (`apps/web`)

- `npm run dev` - Start Next.js development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Lint the web application

### Database Package (`packages/database`)

- `npm run generate` - Generate Prisma client
- `npm run push` - Push schema changes to database
- `npm run build` - Build TypeScript files

## 🔧 Configuration

### Turbo Configuration (`turbo.json`)

The monorepo uses Turborepo for efficient builds:
- **Build pipeline**: Dependencies are built in the correct order
- **Caching**: Build outputs are cached for faster rebuilds
- **Parallel execution**: Independent tasks run in parallel

### Database Configuration

Edit `packages/database/prisma/schema.prisma` to:
- Change database provider (sqlite, postgresql, mysql)
- Update database connection URL
- Modify schema models

## 🎯 Next Steps

1. **Database Schema**: Customize the Prisma schema in `packages/database/prisma/schema.prisma` to match your pharmacy requirements (products, inventory, sales, customers, etc.)

2. **UI Components**: Build reusable components in `packages/ui/src/` for buttons, forms, tables, etc.

3. **Desktop App Features**:
   - Implement POS interface
   - Add offline data synchronization
   - Build inventory management screens

4. **Web Dashboard**:
   - Create analytics dashboards
   - Build admin panels
   - Implement reporting features

5. **API Integration**: Add API routes in Next.js or create a separate backend service

## 📄 License

This project is private and proprietary.

## 🤝 Contributing

This is a private project. For development guidelines, please contact the project maintainer.

## 🤖 Assistant Workflow

When collaborating with an AI coding assistant on this repository:
- Continue with the next reasonable implementation step without asking for repeated confirmation.
- Only stop to ask for input when the request is ambiguous, a destructive action is required, or there is a real blocker.
- After making changes, run the relevant verification steps and summarize the result.

---

**Built with ❤️ for Tunisian Pharmacies**
