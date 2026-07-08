import { defineConfig } from 'sanity'
import { structureTool } from 'sanity/structure'
import { codeInput } from '@sanity/code-input'
import doc from './src/lib/sanity/doc'
import gamingPost from './src/lib/sanity/gamingPost'

export default defineConfig({
  name: 'default',
  title: 'Mission Control Admin',

  // These use the credentials you configured
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID as string,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET as string,

  // The base route where the studio will load
  basePath: '/studio',

  plugins: [structureTool(), codeInput()],

  schema: {
    types: [doc, gamingPost],
  },
})
