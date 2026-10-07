Prompt: "Act as a Senior Full-Stack Architect specialized in offline-first applications. We are building a modern Pharmacy Management System (PMS) for the Tunisian market. The solution must comprise an Electron-based desktop application for offline POS operations and a Next.js web dashboard for analytics. The architecture must rely on a Monorepo structure."

Étape 1 : Architecture (Le Squelette)
Traduction du prompt de création de la structure de fichiers.

Prompt 1: Project Initialization "Initialize a new Monorepo project using Turborepo.

The workspace structure should include the following directories:

apps/desktop: An Electron application using React and Vite (intended for the offline POS station).

apps/web: A Next.js application (intended for the responsive admin dashboard).

packages/ui: A shared component library utilizing Tailwind CSS.

packages/database: A package to manage the database layer using Prisma ORM.

Ensure all dependencies are installed and the project successfully compiles using npm run build."
