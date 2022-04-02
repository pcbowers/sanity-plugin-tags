import sanityClient from 'part:@sanity/base/client'
import type {ListenOptions} from '@sanity/client'

export {filterUniqueTags, isSchemaReference, isSchemaMulti} from './helpers'
export {useLoading, useOptions} from './hooks'
export {prepareTags, prepareTagsAsList, revertTags} from './mutators'
export {
  getSelectedTags,
  getPredefinedTags,
  getTagsFromReference,
  getTagsFromRelated,
} from './observables'

/**
 * The default sanity client implemented by the sanity studio using API Version `2022-03-28`
 */
export const client = sanityClient.withConfig({
  apiVersion: '2022-03-28',
})

/**
 * Default listen options to be used with the `listen` method provided by the sanity client
 */
export const listenOptions: ListenOptions = {
  includeResult: false,
  includePreviousRevision: false,
  visibility: 'query',
  events: ['welcome', 'mutation', 'reconnect'],
}
