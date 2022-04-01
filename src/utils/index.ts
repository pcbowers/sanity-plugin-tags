import sanityClient from 'part:@sanity/base/client'

export {filterUniqueTags, isSchemaReference, isSchemaMulti} from './helpers'

export const client: import('@sanity/client/sanityClient').SanityClient = sanityClient.withConfig({
  apiVersion: '2022-03-28',
})

export const listenOptions: import('@sanity/client/sanityClient').ListenOptions = {
  includeResult: false,
  includePreviousRevision: false,
  visibility: 'query',
  events: ['welcome', 'mutation', 'reconnect'],
}
