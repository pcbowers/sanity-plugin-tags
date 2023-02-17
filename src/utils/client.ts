import {useClient as useSanityClient} from 'sanity'
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

export const useClient = () => {
  const sanityClient = useSanityClient({apiVersion: '2023-02-01'})
  return sanityClient
}
