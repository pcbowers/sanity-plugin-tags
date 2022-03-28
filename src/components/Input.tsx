import React, {forwardRef, useCallback, useState, useEffect} from 'react'

import {withDocument} from 'part:@sanity/form-builder'
import {FormField} from '@sanity/base/components'
import PatchEvent, {set, unset} from '@sanity/form-builder/PatchEvent'
import sanityClient from 'part:@sanity/base/client'

import {useId} from '@reach/auto-id'

import {Observable} from 'rxjs'

import * as SelectComponents from 'part:tags/components/select'
import CreatableSelect from 'react-select/creatable'
import Select from 'react-select'

import type {StringSchemaType, Path, Marker, SanityDocument} from '@sanity/types'
import type {FormFieldPresence} from '@sanity/base/presence'
import type {Props, GroupBase} from 'react-select'

type Tag = {label: string; value: string; _id?: string; [key: string]: any}
type ReferenceTag = {_type: 'reference'; _ref: string}
type ObjectTag = {[key: string]: any} & {_ref?: never}

type InputValue = ObjectTag | ObjectTag[] | ReferenceTag | ReferenceTag[] | null | undefined

type InputProps = {
  type: StringSchemaType & {
    options?: SchemaOptions
  }
  level: number
  value: InputValue
  document: SanityDocument
  readOnly: boolean | null
  onChange: (patchEvent: PatchEvent) => void
  onFocus: (path?: Path | React.FocusEvent<any>) => void
  onBlur?: () => void
  markers: Marker[]
  presence: FormFieldPresence[]
}

interface TagsFromRelatedDocumentsInput<GetObservable extends boolean> {
  document: string
  field: string
  isMulti: boolean
  label: string
  value: string
  getObservable: GetObservable
}

interface TagsFromReferenceInput<GetObservable extends boolean> {
  document: string
  label: string
  value: string
  getObservable: GetObservable
}

type PredefinedTagsInput = Tag[] | (() => Promise<Tag[]>)

interface SchemaOptions {
  predefinedTags: PredefinedTagsInput
  includeFromReference: boolean | string
  includeFromRelatedDocuments: boolean | string
  customLabel: string
  customValue: string
  allowCreate: boolean
  onCreate: (inputValue: string) => Tag
  reactSelectOptions?: Props<Tag, boolean, GroupBase<Tag>>
}

const getPredefinedTags = async (
  callback: PredefinedTagsInput,
  customLabel: string,
  customValue: string
): Promise<Tag[]> => {
  if (callback instanceof Function) {
    return callback()
  }

  return new Promise((resolve) =>
    resolve(
      callback.map((value) => {
        value._label_temp = value.label
        value._value_temp = value.value
        value.label = value[customLabel]
        value.value = value[customValue]
        return value
      })
    )
  )
}

interface ReferencesInput<IsMulti, GetObservable> {
  references: string[]
  label: string
  value: string
  isMulti: IsMulti
  getObservable: GetObservable
}

const getReferences = <IsMulti extends boolean, GetObservable extends boolean>({
  references,
  label = 'label',
  value = 'value',
  isMulti,
  getObservable,
}: ReferencesInput<IsMulti, GetObservable>): GetObservable extends false
  ? Promise<IsMulti extends true ? Tag[] : Tag>
  : Observable<IsMulti extends true ? Tag[] : Tag> => {
  const query = `
  *[ _id in $references && defined(@[$label]) && defined(@[$value])]${isMulti ? '[0]' : ''} {
    _id,
    "value": @[$value],
    "label": @[$label]
  }
  `
  if (getObservable) return sanityClient.listen(query, {references, label, value})
  return sanityClient.fetch(query, {references, label, value})
}

const getTagsFromReference = <GetObservable extends boolean>({
  document,
  label = 'label',
  value = 'value',
  getObservable,
}: TagsFromReferenceInput<GetObservable>): GetObservable extends true
  ? Observable<Tag[]>
  : Promise<Tag[]> => {
  const query = `
  *[ _type == $document && defined(@[$label]) && defined(@[$value])] {
    _id,
    "value": @[$value],
    "label": @[$label]
  }
  `

  if (getObservable) sanityClient.listen(query, {document, label, value})
  return sanityClient.fetch(query, {document, label, value})
}

const convertTagsToDefault = (
  tags: Tag | Tag[] | undefined,
  isReference: boolean,
  isMulti: boolean
) => {
  if (isMulti) {
    if (tags === undefined) return []
    if (isReference) return tags.map((tag) => ({_type: 'reference', _ref: tag._id}))
    return tags.map((tag) => {
      tag.label = tag._label_temp
      tag.value = tag._value_temp
      if (!tag.label) delete tag['label']
      if (!tag.value) delete tag['value']
      if (!tag._id) delete tag['_id']
      delete tag['_label_temp']
      delete tag['_value_temp']
      return tag
    })
  }

  if (tags === undefined) return undefined
  if (isReference) return {_type: 'reference', _ref: (tags as Tag)._id}

  const tag = {
    ...(tags as Tag),
    label: (tags as Tag)._label_temp,
    value: (tags as Tag)._value_temp,
  }

  if (!tag.label) delete tag['label']
  if (!tag.value) delete tag['value']
  if (!tag._id) delete tag['_id']
  delete tag['_label_temp']
  delete tag['_value_temp']
  return tag
}

// Generate observable to watch for other fields
const getTagsFromRelatedDocuments = <GetObservable extends boolean>({
  document,
  field = 'tags',
  isMulti = true,
  label = 'label',
  value = 'value',
  getObservable,
}: TagsFromRelatedDocumentsInput<GetObservable>): GetObservable extends true
  ? Observable<Tag[]>
  : Promise<Tag[]> => {
  const query = `
  *[
    _type == $document &&
    defined(@[$field]) &&
    defined(@[$field][]) == $isMulti &&
    (
      (!$isMulti && defined(@[$field]->[$label]) && defined(@[$field]->[$value])) ||
      (!$isMulti && defined(@[$field][$label]) && defined(@[$field][$value])) ||
      ($isMulti && defined(@[$field][]->[$label]) && defined(@[$field][]->[$value])) ||
      ($isMulti && defined(@[$field][][$label]) && defined(@[$field][][$value]))
    ) 
  ][$field]${isMulti ? '[]' : ''} {
    _type != 'reference' => @{"label": @[$label], "value": @[$value], _id},
    _type == 'reference' => @->{"label": @[$label], "value": @[$value], _id}
  }
  `

  if (getObservable) return sanityClient.listen(query, {document, field, isMulti, label, value})
  return sanityClient.fetch(query, {document, field, isMulti, label, value})
}

// Flatten and filter tags by uniqueness
const getUniqueTags = (tags: Tag[]): Tag[] => {
  if (!tags) tags = []
  console.log(tags)
  const flattenedTags = tags.flat(Infinity)

  return flattenedTags.filter((value, index) => {
    const _value = JSON.stringify(value)
    return (
      index ===
      flattenedTags.flat(Infinity).findIndex((obj) => {
        return JSON.stringify(obj) === _value
      })
    )
  })
}

const manipulateValueToTags = <IsMulti extends boolean, GetObservable extends boolean>(
  value: InputValue,
  isMulti: IsMulti,
  customLabel: string,
  customValue: string,
  getObservable: GetObservable
): GetObservable extends true
  ? Observable<Tag> | Observable<Tag[]> | Observable<unknown>
  : Promise<Tag | Tag[] | undefined> => {
  if (isMulti && Array.isArray(value)) {
    if (value[0] && value[0]._ref !== undefined)
      if (getObservable) {
        // @ts-ignore
        return getReferences({
          references: value.map((value) => value._ref),
          label: customLabel,
          value: customValue,
          isMulti: true,
          getObservable: true,
        })
      } else {
        // @ts-ignore
        return getReferences({
          references: value.map((value) => value._ref),
          label: customLabel,
          value: customValue,
          isMulti: true,
          getObservable: false,
        })
      }

    if (getObservable) {
      // @ts-ignore
      return new Observable<Tag[]>((subscriber) =>
        subscriber.next(
          value.map((value) => {
            value._label_temp = value.label
            value._value_temp = value.value
            value.label = value[customLabel]
            value.value = value[customValue]
            return value
          })
        )
      )
    } else {
      // @ts-ignore
      return value.map((value) => {
        value._label_temp = value.label
        value._value_temp = value.value
        value.label = value[customLabel]
        value.value = value[customValue]
        return value
      }) as Tag[]
    }
  }

  if (value && value.hasOwnProperty('_ref')) {
    if (getObservable) {
      // @ts-ignore
      return getReferences({
        references: [(value as ReferenceTag)._ref],
        label: customLabel,
        value: customValue,
        isMulti: false,
        getObservable: true,
      })
    } else {
      // @ts-ignore
      return getReferences({
        references: [(value as ReferenceTag)._ref],
        label: customLabel,
        value: customValue,
        isMulti: false,
        getObservable: false,
      })
    }
  }

  if (value) {
    let newValue: Tag = {
      ...value,
      _label_temp: (value as Tag).label,
      _value_temp: (value as Tag)?.value,
      label: value[customLabel],
      value: value[customValue],
    }

    if (getObservable) {
      // @ts-ignore
      return new Observable<Tag>((subscriber) => subscriber.next(newValue))
    }

    // @ts-ignore
    return newValue
  }
  if (getObservable) {
    // @ts-ignore
    return new Observable((subscriber) => subscriber.next(undefined))
  }

  // @ts-ignore
  return undefined
}

const isTagReference = (value: InputValue): boolean => {
  if (Array.isArray(value) && value[0]?._ref) return true
  if (!Array.isArray(value) && value?._ref) return true
  return false
}

const useLoading = (
  initialState: {[key: string]: boolean} = {}
): [boolean, {[key: string]: boolean}, (properties: {[key: string]: boolean}) => void] => {
  const [loadingOptions, setLoadingOptions] = useState(initialState)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let loaded = false
    for (const option in loadingOptions) {
      if (loadingOptions[option]) loaded = true
    }

    setIsLoading(loaded)
  }, [loadingOptions])

  const setLoadingOption = useCallback((properties: {[key: string]: boolean}) => {
    setLoadingOptions((oldValue) => {
      return {...oldValue, ...properties}
    })
  }, [])

  return [isLoading, loadingOptions, setLoadingOption]
}

const useOptions = (
  initialState: Tag[] = []
): [Tag[], {[key: string]: Tag[]}, (properties: {[key: string]: Tag[]}) => void] => {
  const [options, setOptions] = useState(initialState)
  const [groupOptions, setGroupOptions] = useState({
    predefinedTags: [],
  } as {[key: string]: Tag[]})

  useEffect(() => {
    let opts: Tag[] = []
    for (const group in groupOptions) {
      if (Array.isArray(groupOptions[group])) opts.push(...groupOptions[group])
    }

    setOptions(getUniqueTags(opts))
  }, [groupOptions])

  const setGroupOption = useCallback((properties: {[key: string]: Tag[]}) => {
    setGroupOptions((oldValue) => ({...oldValue, ...properties}))
  }, [])

  return [options, groupOptions, setGroupOption]
}

const Tags = forwardRef<HTMLInputElement, InputProps>((props, ref: any) => {
  const [isLoading, loadingOptions, setLoadingOptions] = useLoading({
    selected: true,
    predefinedTags: true,
    includeFromReference: true,
    includeFromRelatedDocuments: true,
  })
  const [options, groupOptions, setGroupOptions] = useOptions()
  const [selected, setSelected] = useState(undefined as Tag[] | Tag | undefined)

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

  const {
    predefinedTags,
    includeFromReference = false,
    includeFromRelatedDocuments = 'tags',
    customLabel = 'label',
    customValue = 'value',
    allowCreate = true,
    onCreate = async (value) => ({value, label: value}),
    reactSelectOptions = {},
  } = type.options as SchemaOptions

  const isMulti = type.name === 'tags' ? true : false
  const isReference = isTagReference(value)

  useEffect(() => {
    setLoadingOptions({
      selected: true,
      predefinedTags: true,
      includeFromReference: true,
      includeFromRelatedDocuments: true,
    })

    let populateIsCancelled = false
    let selectedSubscription = {unsubscribe: () => {}}
    let referenceSubscription = {unsubscribe: () => {}}
    let relatedSubscription = {unsubscribe: () => {}}

    async function populatePredefinedTags() {
      const tags = await getPredefinedTags(predefinedTags, customLabel, customValue)
      if (!populateIsCancelled) {
        setGroupOptions({fromPredefined: getUniqueTags(tags || [])})
        setLoadingOptions({predefinedTags: false})
      }
    }

    async function populateSelectedTags() {
      const tags = await manipulateValueToTags(value, isMulti, customLabel, customValue, false)

      if (!populateIsCancelled) {
        setSelected(tags)
        setLoadingOptions({selected: false})
      }
    }

    async function populateReferenceTags() {
      let tags: Tag[] = []
      if (typeof includeFromReference === 'string')
        tags = await getTagsFromReference({
          document: includeFromReference,
          label: customLabel,
          value: customValue,
          getObservable: false,
        })
      if (!populateIsCancelled) {
        if (tags) setGroupOptions({fromReference: getUniqueTags(tags)})
        setLoadingOptions({includeFromReference: false})
      }
    }

    async function populateRelatedTags() {
      let tags: Tag[] = []
      if (typeof includeFromRelatedDocuments === 'string')
        tags = await getTagsFromRelatedDocuments({
          document: document._type as string,
          field: includeFromRelatedDocuments,
          label: customLabel,
          value: customValue,
          isMulti,
          getObservable: false,
        })

      if (!populateIsCancelled) {
        setGroupOptions({fromRelated: getUniqueTags(tags)})
        setLoadingOptions({includeFromRelatedDocuments: false})
      }
    }

    populatePredefinedTags()
    populateSelectedTags()
    populateReferenceTags()
    populateRelatedTags()

    // selectedSubscription = manipulateValueToTags(
    //   value,
    //   isMulti,
    //   customLabel,
    //   customValue,
    //   true
    // ).subscribe((tags: Tag | Tag[] | undefined) => {
    //   setSelected(tags)
    // })

    // if (typeof includeFromReference === 'string')
    //   referenceSubscription = getTagsFromReference({
    //     document: includeFromReference,
    //     label: customLabel,
    //     value: customValue,
    //     getObservable: true,
    //   }).subscribe((tags) => {
    //     setGroupOptions({fromReference: getUniqueTags(tags)})
    //   })

    // if (typeof includeFromRelatedDocuments === 'string')
    //   referenceSubscription = getTagsFromRelatedDocuments({
    //     document: document._type as string,
    //     field: includeFromRelatedDocuments,
    //     label: customLabel,
    //     value: customValue,
    //     isMulti,
    //     getObservable: true,
    //   }).subscribe((tags) => {
    //     setGroupOptions({fromRelated: getUniqueTags(tags)})
    //   })

    return () => {
      populateIsCancelled = true
      selectedSubscription.unsubscribe()
      referenceSubscription.unsubscribe()
      relatedSubscription.unsubscribe()
    }
  }, [])

  const handleCreate = useCallback(
    async (value: string) => {
      // since the function to manipulate new tags could be asyncronous and take a while, mark loading as true
      setLoadingOptions({handleCreate: true})

      // format the new tag
      const newCreateValue = await onCreate(value)

      setSelected((curValue) => {
        let newValue: Tag | Tag[] | undefined
        if (Array.isArray(curValue)) {
          newValue = [...curValue, newCreateValue]
        } else {
          newValue = newCreateValue
        }

        let tagsForEvent = convertTagsToDefault(newValue, isReference, isMulti)
        onChange(PatchEvent.from(tagsForEvent ? set(tagsForEvent) : unset(tagsForEvent)))

        return newValue
      })

      // finish loading
      setLoadingOptions({handleCreate: false})
    },
    [onChange]
  )

  const handleChange = useCallback(
    (value: Tag[] | Tag) => {
      setSelected(value)

      let tagsForEvent = convertTagsToDefault(value, isReference, isMulti)
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
  }

  return (
    <FormField
      description={type.description}
      title={type.title}
      __unstable_markers={markers} // Handles all markers including validation
      __unstable_presence={presence} // Handles presence avatars
      inputId={inputId} // Allows the label to connect to the input field
    >
      {allowCreate ? (
        // @ts-ignore
        <CreatableSelect components={SelectComponents} {...selectOptions} />
      ) : (
        // @ts-ignore
        <Select components={SelectComponents} {...selectOptions} />
      )}
    </FormField>
  )
})

export default withDocument(Tags)
