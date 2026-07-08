import { defineField, defineType } from 'sanity'

export default defineType({
  name: 'doc',
  title: 'Documentation',
  type: 'document',
  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      options: {
        source: 'title',
        maxLength: 96,
      },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'category',
      title: 'Category',
      type: 'string',
      description: 'The category to group this document under (e.g., General, NVIDIA API, Privacy).',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'content',
      title: 'Content',
      type: 'array',
      of: [
        { type: 'block' },
        { 
          type: 'image', 
          title: 'Image', 
          options: { hotspot: true },
          fields: [
            {
              name: 'alt',
              type: 'string',
              title: 'Alternative Text',
            }
          ]
        },
        {
          type: 'object',
          name: 'videoEmbed',
          title: 'Video Embed URL',
          fields: [
            {
              name: 'url',
              type: 'url',
              title: 'Video URL',
              description: 'Enter a direct .mp4 URL (or a YouTube/Vimeo embed URL)',
            }
          ]
        },
        {
          type: 'code',
          title: 'Code Block',
          options: {
            withFilename: true,
          }
        }
      ],
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'order',
      title: 'Order',
      type: 'number',
      initialValue: 0,
      validation: (Rule) => Rule.required().min(0),
    }),
  ],
})
