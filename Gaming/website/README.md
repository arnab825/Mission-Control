This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## System Requirements

To run Mission Control's local AI features, your system must meet the following minimum requirements:

- **OS**: Windows 10/11 or modern Linux distributions
- **GPU**: NVIDIA GTX or RTX series graphics card (Strictly required for TensorRT local inference)
- **RAM**: Minimum 16GB system memory recommended
- **Storage**: SSD with at least 5GB free space for models

## AI Gaming Blog (Gaming Intel) Pipeline

Mission Control incorporates an automated, AI-driven gaming intelligence blog section designed to run alongside standard documentation:

- **AI Generation Route**: `/api/blogs/generate` fetches real-time updates from five major RSS feeds (IGN, Kotaku, Eurogamer, AnandTech, Tom's Hardware) and generates comprehensive technical articles using the NVIDIA NIM API (`meta/llama-3.1-70b-instruct`).
- **Data Persistence**: To prevent data loss in Vercel's ephemeral serverless environments, generated articles are written directly to Sanity CMS (using a secure `SANITY_API_TOKEN` editor token) instead of the local filesystem.
- **Nightly Scheduling**: Configured via `vercel.json` to execute automatically every night at **02:00 AM IST (20:30 UTC)**. The endpoint is protected against unauthorized invocation using a custom `CRON_SECRET` bearer token handshake.
- **Clean Schema Separation**: 
  - **Blogs**: Queried from the `gamingPost` document type and shown under the *Gaming Intel* tab at `/blog` and `/blog/gaming/[slug]`.
  - **Documentation**: Handled separately via the `doc` schema in Sanity and rendered under `/docs` and `/docs/[slug]`.
