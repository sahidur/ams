# AMS - Attendance Management System

## Project Overview
Full-stack project and workforce management system with role-based authentication, project tracking, and AI-powered face recognition attendance.

## Tech Stack
- **Framework**: Next.js 14 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: NextAuth.js
- **Animations**: Framer Motion
- **Face Recognition**: face-api.js (TensorFlow.js based)
- **Tables**: TanStack Table (React Table v8)
- **File Upload**: react-dropzone

## Features
- [x] Beautiful landing page with animations
- [x] Role-based authentication (Admin, HO User, Trainer, Student, Basic User)
- [x] User registration with approval workflow
- [x] Project management (CRUD)
- [x] Branch management with CSV import
- [x] Batch management with trainer assignment
- [x] AI-powered face recognition attendance

## User Roles
1. **Admin**: Full system access, user management, project management
2. **HO User**: Head Office user with reporting access
3. **Trainer**: Manages batches, classes, and attendance
4. **Student**: Views own attendance and class schedules
5. **Basic User**: Limited access

## Database Schema
- Users (with roles and approval status)
- Projects (name, donor, duration, cohorts)
- Cohorts (under projects)
- Branches (division, district, upazila, branch name)
- Batches (under branches/cohorts with trainer)
- Classes (under batches)
- Attendance (with face recognition data)
- Face Encodings (for AI recognition)

## Development Commands
```bash
npm run dev      # Start development server
npm run build    # Build for production
npm run start    # Start production server
npx prisma studio # Open Prisma database GUI
```

## Environment Variables
Required in `.env`:
```
DATABASE_URL="postgresql://..."
NEXTAUTH_SECRET="your-secret"
NEXTAUTH_URL="http://localhost:3000"
```
