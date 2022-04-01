import {withDocument} from 'part:@sanity/form-builder'

import * as SelectComponents from 'part:tags/components/select'
import {FormField} from '@sanity/base/components'
import PatchEvent, {set, unset} from '@sanity/form-builder/PatchEvent'
import React from 'react'
import {useId} from '@reach/auto-id'
import CreatableSelect from 'react-select/creatable'
import Select from 'react-select'
import {from} from 'rxjs'
import {map, switchMap, tap} from 'rxjs/operators'

import {isSchemaMulti, isSchemaReference, client, listenOptions, filterUniqueTags} from '../utils'

import {ReferenceCreateWarning, ReferencePredefinedWarning} from './ReferenceWarnings'

import {ListenEvent} from '@sanity/client'

import type {Observable} from 'rxjs'
import type {
  Tag,
  GeneralTag,
  GeneralSubscription,
  RefTag,
  PredefinedTags,
  InputProps,
  UnrefinedTags,
  SelectProps,
} from '../types'

interface PrepareTagInput {
  customLabel: string
  customValue: string
}

const prepareTag = ({customLabel, customValue}: PrepareTagInput) => {
  return (tag: GeneralTag) => {
    const tempTag: Tag = {
      ...tag,
      _label_temp: tag.label,
      _value_temp: tag.value,
      label: tag[customLabel],
      value: tag[customValue],
    }
    return tempTag
  }
}

interface RevertTagInput {
  customLabel: string
  customValue: string
  isReference: boolean
}

const revertTag = ({customLabel, customValue, isReference}: RevertTagInput) => {
  return (tag: Tag): RefTag | GeneralTag => {
    if (!isReference) {
      const tempTag: GeneralTag = {
        ...tag,
        [customValue]: tag.value,
        [customLabel]: tag.label,
        label: tag._label_temp,
        value: tag._value_temp,
      }

      delete tempTag['_label_temp']
      delete tempTag['_value_temp']
      if (tempTag.label === undefined) delete tempTag['label']
      if (tempTag.value === undefined) delete tempTag['value']

      return tempTag
    }

    const tempTag: RefTag = {
      _ref: tag._id,
      _type: 'reference',
    }

    return tempTag
  }
}

interface PrepareTagsInput<TagsType extends UnrefinedTags = UnrefinedTags> {
  tags: TagsType
  customLabel: string
  customValue: string
}

const getTagType = <TagsType extends UnrefinedTags>({
  tags,
  customLabel,
  customValue,
}: PrepareTagsInput<TagsType>) => {
  return tags
}

// getTagType({tags: {_ref: "tasdf", _type: "reference"}, customValue: "asdf", customLabel: "asdf"})

const prepareTags = async ({tags, customLabel, customValue}: PrepareTagsInput) => {
  // if tags are undefined
  if (tags === undefined || tags === null) return undefined

  if (Array.isArray(tags)) {
    // if tags are empty array
    if (!tags.length) return [] as Tag[]

    // if tags are multiple references
    if ('_ref' in tags[0] && '_type' in tags[0]) {
      const refTags: GeneralTag[] = await client.fetch('*[_id in $refs]', {
        refs: tags.map((tag) => tag._ref),
      })
      return refTags.map(prepareTag({customLabel, customValue}))
    }

    // if tags are multiple objects
    return tags.map(prepareTag({customLabel, customValue}))
  }

  // if tags are single reference
  if ('_ref' in tags && '_type' in tags) {
    const refTag: GeneralTag = await client.fetch('*[_id == $ref][0]', {ref: tags._ref})

    return prepareTag({customLabel, customValue})(refTag)
  }

  // if tags are single object
  return prepareTag({customLabel, customValue})(tags)
}

const prepareTagsAsList = async (preparedTagsOptions: PrepareTagsInput) => {
  const preparedTags = await prepareTags(preparedTagsOptions)

  if (preparedTags === undefined) return []
  if (!Array.isArray(preparedTags)) return [preparedTags]
  return preparedTags
}

interface RevertTagsInput {
  tags: Tag[] | Tag | undefined
  customLabel: string
  customValue: string
  isMulti: boolean
  isReference: boolean
}

const revertTags = ({tags, customLabel, customValue, isMulti, isReference}: RevertTagsInput) => {
  // if tags are undefined
  if (tags === undefined) return undefined

  if (isMulti) {
    // ensure it is actually an array
    if (!Array.isArray(tags)) tags = [tags]

    return tags.map(revertTag({customLabel, customValue, isReference}))
  }

  if (Array.isArray(tags)) tags = tags[0]
  return revertTag({customLabel, customValue, isReference})(tags)
}

type LoadingOptions = {[key: string]: boolean}
interface UseLoadingInput {
  initialLoadingOptions?: LoadingOptions
  initialState?: boolean
}

const useLoading = ({
  initialLoadingOptions = {},
  initialState = true,
}: UseLoadingInput): [boolean, LoadingOptions, (properties: LoadingOptions) => void] => {
  const [loadingOptions, setLoadingOptions] = React.useState(initialLoadingOptions)
  const [isLoading, setIsLoading] = React.useState(initialState)

  React.useEffect(() => {
    let loaded = false
    if (Object.keys(loadingOptions).length) {
      for (const option in loadingOptions) {
        if (loadingOptions[option]) loaded = true
      }
    }

    setIsLoading(loaded)
  }, [loadingOptions])

  const setLoadOption = React.useCallback((properties: LoadingOptions) => {
    setLoadingOptions((oldValue) => {
      return {...oldValue, ...properties}
    })
  }, [])

  return [isLoading, loadingOptions, setLoadOption]
}

type TagOptions = {[key: string]: Tag[]}
interface UseOptionsInput {
  initialState?: Tag[]
}

const useOptions = ({
  initialState = [],
}: UseOptionsInput): [Tag[], TagOptions, (properties: TagOptions) => void] => {
  const [options, setOptions] = React.useState(initialState)
  const [groupOptions, setGroupOptions] = React.useState({} as TagOptions)

  React.useEffect(() => {
    let opts: Tag[] = []
    for (const group in groupOptions) {
      if (Array.isArray(groupOptions[group])) opts.push(...groupOptions[group])
    }

    setOptions(filterUniqueTags(opts))
  }, [groupOptions])

  const setTagOption = React.useCallback((properties: TagOptions) => {
    setGroupOptions((oldValue) => ({...oldValue, ...properties}))
  }, [])

  return [options, groupOptions, setTagOption]
}

interface GetPredefinedTagsInput {
  predefinedTags: PredefinedTags
  customLabel: string
  customValue: string
  callback: (tags: Tag[]) => any
}

const getPredefinedTags = async ({
  predefinedTags,
  customLabel,
  customValue,
  callback,
}: GetPredefinedTagsInput) => {
  let tags: Tag[]
  if (predefinedTags instanceof Function) {
    tags = await prepareTagsAsList({
      tags: await predefinedTags(),
      customLabel,
      customValue,
    })
  } else {
    tags = await prepareTagsAsList({
      tags: predefinedTags,
      customLabel,
      customValue,
    })
  }

  return callback(tags)
}

interface GetTagsFromReferenceInput {
  document: string
  customLabel: string
  customValue: string
}

const getTagsFromReference = ({
  document,
  customLabel,
  customValue,
}: GetTagsFromReferenceInput): [string, any, Observable<ListenEvent<GeneralTag[]>>] => {
  const query = `
  *[ _type == $document && defined(@[$customLabel]) && defined(@[$customValue])] {
    _id,
    "value": @[$customValue],
    "label": @[$customLabel]
  }
  `

  const params = {document, customLabel, customValue}

  return [query, params, client.listen<GeneralTag[]>(query, params, listenOptions)]
}

interface GetTagsFromRelatedInput {
  document: string
  field: string
  isMulti: boolean
  customLabel: string
  customValue: string
}

const getTagsFromRelated = ({
  document,
  field,
  isMulti,
  customLabel,
  customValue,
}: GetTagsFromRelatedInput): [string, any, Observable<Tag[]>] => {
  const query = `
  *[
    _type == $document &&
    defined(@[$field]) &&
    defined(@[$field][]) == $isMulti &&
    (
      (!$isMulti && defined(@[$field]->[$customLabel]) && defined(@[$field]->[$customValue])) ||
      (!$isMulti && defined(@[$field][$customLabel]) && defined(@[$field][$customValue])) ||
      ($isMulti && defined(@[$field][]->[$customLabel]) && defined(@[$field][]->[$customValue])) ||
      ($isMulti && defined(@[$field][][$customLabel]) && defined(@[$field][][$customValue]))
    ) 
  ][$field]
  `

  const params = {document, field, isMulti, customLabel, customValue}
  return [
    query,
    params,
    client.listen(query, params, listenOptions).pipe(
      tap((val) => console.log(val)),
      switchMap((val: unknown) => from(client.fetch(query, params))),
      tap((val) => console.log(val)),
      map((val: GeneralTag[]) => val.flat(Infinity)),
      tap((val) => console.log(val)),
      switchMap((val: GeneralTag[]) =>
        from(
          prepareTagsAsList({
            tags: val,
            customLabel,
            customValue,
          })
        )
      ),
      tap((val) => console.log(val))
    ),
  ]
}

export default withDocument(
  React.forwardRef<HTMLInputElement, InputProps>((props, ref: any) => {
    const [selected, setSelected] = React.useState<Tag | Tag[] | undefined>(undefined)
    const [isLoading, , setLoadOption] = useLoading({})
    const [options, , setTagOption] = useOptions({})

    const {
      type, // Schema information
      value, // Current field value
      readOnly, // Boolean if field is not editable
      markers, // Markers including validation rules
      presence, // Presence information for collaborative avatars
      onFocus, // Method to handle focus state
      onBlur, // Method to handle blur state
      onChange, // Method to handle patch events
      document, // The current document
    } = props

    const isMulti = isSchemaMulti(type)
    const isReference = isSchemaReference(type)

    const {
      predefinedTags = [],
      includeFromReference = false,
      includeFromRelated = false,
      customLabel = 'label',
      customValue = 'value',
      allowCreate = true,
      onCreate = async (value) => ({[customLabel]: value, [customValue]: value}),
      reactSelectOptions = {} as SelectProps<typeof isMulti>,
    } = type.options ? type.options : {}

    const isReferenceCreateWarning = type.options && allowCreate && isReference
    const isReferencePredefinedWarning =
      type.options && !!type.options.predefinedTags && isReference

    React.useEffect(() => {
      let cancelled = false
      let referenceSubscription: GeneralSubscription = {
        unsubscribe: () => {},
      }
      let relatedSubscription: GeneralSubscription = {
        unsubscribe: () => {},
      }
      setLoadOption({
        selectedTags: true,
        predefinedTags: true,
        referenceTags: true,
        relatedTags: true,
      })

      async function getSelectedTags() {
        const preparedTags = await prepareTags({
          tags: value,
          customLabel,
          customValue,
        })

        if (!cancelled) {
          setSelected(preparedTags)
          setLoadOption({selectedTags: false})
        }
      }

      getSelectedTags()

      getPredefinedTags({
        predefinedTags,
        customLabel,
        customValue,
        callback: (tags) => {
          if (!cancelled) {
            setTagOption({predefinedTags: tags})
            setLoadOption({predefinedTags: false})
          }
        },
      })

      if (typeof includeFromReference === 'string') {
        const [query, params, observable] = getTagsFromReference({
          document: includeFromReference,
          customLabel,
          customValue,
        })

        referenceSubscription = observable.subscribe(async (update) => {
          const preparedTags = await prepareTagsAsList({
            tags: await client.fetch(query, params),
            customLabel,
            customValue,
          })

          if (!cancelled) {
            setTagOption({referenceTags: preparedTags})
            setLoadOption({referenceTags: false})
          }
        })
      } else {
        setLoadOption({referenceTags: false})
      }

      if (typeof includeFromRelated === 'string') {
        const [query, params, observable] = getTagsFromRelated({
          document: document._type,
          field: includeFromRelated,
          isMulti,
          customLabel,
          customValue,
        })

        relatedSubscription = observable.subscribe((tags) => {
          console.log(tags)
          if (!cancelled) {
            setTagOption({relatedTags: tags})
            setLoadOption({relatedTags: false})
          }
        })
      } else {
        setLoadOption({relatedTags: false})
      }

      return () => {
        cancelled = true
        relatedSubscription.unsubscribe()
        referenceSubscription.unsubscribe()
      }
    }, [])

    const handleCreate = React.useCallback(
      async (value: string) => {
        setLoadOption({handleCreate: true})

        const newCreateValue = prepareTag({customLabel, customValue})(await onCreate(value))
        if (Array.isArray(selected)) handleChange([...selected, newCreateValue])
        else handleChange(newCreateValue)

        setLoadOption({handleCreate: false})
      },
      [onChange]
    )

    const handleChange = React.useCallback(
      (value: Tag[] | Tag | undefined) => {
        setSelected(value)

        let tagsForEvent = revertTags({
          tags: value,
          customLabel,
          customValue,
          isMulti,
          isReference,
        })

        onChange(PatchEvent.from(tagsForEvent ? set(tagsForEvent) : unset(tagsForEvent)))
      },
      [onChange]
    )

    const inputId = useId()

    const selectOptions = {
      isLoading,
      onFocus,
      onBlur,
      ref,
      inputId,
      isMulti,
      options,
      value: selected,
      onCreateOption: handleCreate,
      onChange: handleChange,
      isDisabled: readOnly || isLoading,
      ...reactSelectOptions,
    } as SelectProps

    return (
      <FormField
        description={type.description}
        title={type.title}
        __unstable_markers={markers}
        __unstable_presence={presence}
        inputId={inputId}
      >
        {isReferenceCreateWarning && <ReferenceCreateWarning />}
        {isReferencePredefinedWarning && <ReferencePredefinedWarning />}
        {allowCreate && !isReference ? (
          <CreatableSelect {...selectOptions} components={SelectComponents} />
        ) : (
          <Select {...selectOptions} components={SelectComponents} />
        )}
      </FormField>
    )
  })
)
