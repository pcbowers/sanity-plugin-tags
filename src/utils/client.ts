import {ListenOptions} from '@sanity/client'

/**
 * Default listen options to be used with the `listen` method provided by the sanity client
 */
export const listenOptions: ListenOptions = {
  includeResult: false,
  includePreviousRevision: false,
  visibility: 'query',
  events: ['welcome', 'mutation', 'reconnect'],
}
