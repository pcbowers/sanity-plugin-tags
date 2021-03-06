declare module 'part:@sanity/base/client' {
  import type {ClientConfig, SanityClient} from '@sanity/client'

  type StudioClient = SanityClient & {withConfig: (config: Partial<ClientConfig>) => SanityClient}

  const client: StudioClient
  export default client
}

declare module 'part:tags/components/select' {
  const CustomSelectComponents: SelectComponents
  export default CustomSelectComponents
}

declare module 'part:tags/components/input' {
  const Input: JSX.Element
  export default Input
}

declare module 'part:@sanity/form-builder' {
  import PropTypes from 'prop-types'
  import React from 'react'
  import {SanityDocument} from '@sanity/types'

  interface WithDocumentProps<Doc extends SanityDocument = SanityDocument> {
    document: Doc
  }

  export function withDocument<T extends WithDocumentProps = WithDocumentProps>(
    ComposedComponent: React.ComponentType<T>
  ): {
    new (props: T, context: any): {
      _input: any
      _didShowFocusWarning: boolean
      state: {
        document: Record<string, unknown>
      }
      unsubscribe: () => void
      componentWillUnmount(): void
      focus(): void
      setRef: (input: any) => void
      render(): JSX.Element
      context: any
      setState<K extends never>(
        state:
          | {}
          | ((prevState: Readonly<{}>, props: Readonly<Omit<T, 'document'>>) => {} | Pick<{}, K>)
          | Pick<{}, K>,
        callback?: () => void
      ): void
      forceUpdate(callback?: () => void): void
      readonly props: Readonly<Omit<T, 'document'>> &
        Readonly<{
          children?: React.ReactNode
        }>
      refs: {
        [key: string]: React.ReactInstance
      }
      componentDidMount?(): void
      shouldComponentUpdate?(
        nextProps: Readonly<Omit<T, 'document'>>,
        nextState: Readonly<{}>,
        nextContext: any
      ): boolean
      componentDidCatch?(error: Error, errorInfo: React.ErrorInfo): void
      getSnapshotBeforeUpdate?(
        prevProps: Readonly<Omit<T, 'document'>>,
        prevState: Readonly<{}>
      ): any
      componentDidUpdate?(
        prevProps: Readonly<Omit<T, 'document'>>,
        prevState: Readonly<{}>,
        snapshot?: any
      ): void
      componentWillMount?(): void
      UNSAFE_componentWillMount?(): void
      componentWillReceiveProps?(nextProps: Readonly<Omit<T, 'document'>>, nextContext: any): void
      UNSAFE_componentWillReceiveProps?(
        nextProps: Readonly<Omit<T, 'document'>>,
        nextContext: any
      ): void
      componentWillUpdate?(
        nextProps: Readonly<Omit<T, 'document'>>,
        nextState: Readonly<{}>,
        nextContext: any
      ): void
      UNSAFE_componentWillUpdate?(
        nextProps: Readonly<Omit<T, 'document'>>,
        nextState: Readonly<{}>,
        nextContext: any
      ): void
    }
    displayName: string
    contextTypes: {
      formBuilder: PropTypes.Requireable<any>
    }
    contextType?: React.Context<any>
  }
}
