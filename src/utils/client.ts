import {useClient as useSanityClient} from 'sanity'
import {ListenOptions, SanityClient} from '@sanity/client'

/**
 * Default listen options to be used with the `listen` method provided by the sanity client
 */
export const listenOptions: ListenOptions = {
  includeResult: false,
  includePreviousRevision: false,
  visibility: 'query',
  events: ['welcome', 'mutation', 'reconnect'],
}

export function useClient(): SanityClient {
  return useSanityClient({apiVersion: '2023-02-01'})
}
