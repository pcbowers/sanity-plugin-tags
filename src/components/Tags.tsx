import React, { forwardRef, useCallback, useState, useEffect } from "react"

import type WithDocument from "../../node_modules/@sanity/form-builder/dist/dts/utils/withDocument"
import { withDocument } from "part:@sanity/form-builder"
import { FormField } from "@sanity/base/components"
import PatchEvent, { set, unset } from "@sanity/form-builder/PatchEvent"
import documentStore from "part:@sanity/base/datastore/document"

import { StringSchemaType, Path, Marker, SanityDocument } from "@sanity/types"
import { FormFieldPresence } from "@sanity/base/presence"

import { useId } from "@reach/auto-id"
import CreatableSelect from "react-select/creatable"
import Select from "react-select"

type WithDocument = typeof WithDocument

type Options = {
  tagsPath?: string
  closeMenuOnSelect?: boolean
  fetchFromOthers?: boolean
  create?: boolean
  onCreate?: (value: string) => Promise<{ label: string; value: string }>
  options?: Tag[]
}

type Tag = { label: string; value: string }

type Props = {
  type: StringSchemaType & {
    options?: Options
  }
  focusPath?: Path
  level: number
  value: Tag | null | undefined
  placeholder: string
  document: SanityDocument
  readOnly: boolean | null
  onChange: (patchEvent: PatchEvent) => void
  onFocus: (path?: Path | React.FocusEvent<any>) => void
  onBlur?: () => void
  markers: Marker[]
  presence: FormFieldPresence[]
}

// Generate observable to watch for other fields
const getOptions = ({
  document,
  field = "tags"
}: {
  document: string
  field: string
}) => {
  const query = `*[_type == $document && defined(${field}) && count(${field}) > 0].${field}[]`
  return documentStore.listenQuery(query, { document })
}

// Flatten and filter tags by uniqueness
const getUniqueTags = (tags: Tag[]): Tag[] => {
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

const Tags = forwardRef<HTMLInputElement, Props>((props, ref: any) => {
  const {
    type, // Schema information
    value, // Current field value
    readOnly, // Boolean if field is not editable
    placeholder, // Placeholder text from the schema
    markers, // Markers including validation rules
    presence, // Presence information for collaborative avatars
    onFocus, // Method to handle focus state
    onBlur, // Method to handle blur state
    onChange, // Method to handle patch events
    document // The current document
  } = props

  const { options = {} } = type // get any options passed to type
  const {
    tagsPath = type.name as string, // uses a different path than 'tags' when doing fetchFromOthers
    closeMenuOnSelect = true, // whether or not the menu should close once an item is selected
    fetchFromOthers = true, // get tags specified in other documents
    create = true, // whether or not tags should be allowed to be created
    options: presetOptions = [], // provide preset options to be added to the select list
    onCreate = async (value) => ({ value, label: value }) // allows one to modify the value and label of created items
  } = options // get all possible options

  const [isLoading, setIsLoading] = useState(true)
  const [presetTags, setPresetTags] = useState([] as Tag[])
  const [selected, setSelected] = useState((!value ? [] : value) as Tag[])

  useEffect(() => {
    // since we're populating or repopulating options, make sure to mark loading as true
    setIsLoading(true)

    // if fetch from others is desired
    if (fetchFromOthers) {
      // create a subscription to listen for any changes to others
      const subscription = getOptions({
        document: document._type as string,
        field: tagsPath as string
      }).subscribe((allTags: Tag[]) => {
        // as changes occur, update the options with any new tags
        setPresetTags(getUniqueTags([...presetOptions, ...(allTags || [])]))

        // finish loading
        setIsLoading(false)
      })

      return () => subscription.unsubscribe()
    } else {
      // populate any preset options
      setPresetTags(presetOptions)

      // since no subscription is loaded, finish loading
      setIsLoading(false)
    }
  }, [])

  // handle any changes to the select input
  const handleChange = useCallback(
    (value: Tag[]) => {
      // the value is the entire select input
      setSelected(value)

      // push changes to the dataset
      onChange(PatchEvent.from(value ? set(value) : unset(value)))
    },
    [onChange]
  )

  const handleCreate = useCallback(
    async (value: string) => {
      // since the function to manipulate new tags could be asyncronous and take a while, mark loading as true
      setIsLoading(true)

      // format the new tag
      const newCreateValue = await onCreate(value)

      setSelected((curValue) => {
        // combine the new tag with any other selected tags
        const newValue = [...curValue, newCreateValue]

        // push changes to the dataset
        onChange(PatchEvent.from(newValue ? set(newValue) : unset(newValue)))

        // set the select value
        return newValue
      })

      // finish loading
      setIsLoading(false)
    },
    [onChange]
  )

  const inputId = useId()

  const selectOptions = {
    isLoading,
    closeMenuOnSelect,
    placeholder,
    onFocus,
    onBlur,
    ref,
    inputId,
    isMulti: true, // allow multiple tags
    value: selected, // pass values if editing or initial values are set
    options: presetTags, // allows for preset options
    onCreateOption: handleCreate, // allow one to change value when creating options
    onChange: handleChange, // handle the change
    isDisabled: readOnly || isLoading // disable if read only or loading
  }

  return (
    <FormField
      description={type.description} // Creates description from schema
      title={type.title} // Creates label from schema title
      __unstable_markers={markers} // Handles all markers including validation
      __unstable_presence={presence} // Handles presence avatars
      inputId={inputId} // Allows the label to connect to the input field
    >
      {create ? (
        <CreatableSelect {...selectOptions} />
      ) : (
        <Select {...selectOptions} />
      )}
    </FormField>
  )
})

export default withDocument(Tags) as WithDocument
