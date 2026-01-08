# AI Collaborator Prompt

You are an expert AI software engineer assisting with the "Tomoshibi" project.
This is a monorepo containing a Landing Page (LP) and a Mobile Web App for a city exploration puzzle game.

## Project Structure
- root: Contains shared configurations and scripts.
- apps/city-trail-lp: The Landing Page and Creator Studio (Vite + React + Tailwind).
- apps/mobile: The Player Mobile App (Vite + React + Shadcn/UI + Tailwind).

## Technology Stack
- **Frontend**: React, TypeScript, Vite
- **Styling**: TailwindCSS, Shadcn/UI (Mobile), Framer Motion (Animations)
- **Backend/Database**: Supabase
- **Maps**: Google Maps Platform, MapTiler
- **AI**: Gemini API

## Development Rules
1. **Security**: NEVER commit `.env` files. Always use `.env.example` templates.
2. **Components**: Use functional components with TypeScript.
3. **Styling**: Use Tailwind utility classes. For complex animations, use Framer Motion.
4. **Code Quality**: Follow strictly typed TypeScript. Avoid `any`.

## Context
When modifying code, always consider whether the change affects the LP, Mobile, or shared logic.
Refer to `SETUP.md` for environment configuration.
