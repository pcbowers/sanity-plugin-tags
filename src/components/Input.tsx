import React from 'react'
import {FormField} from '@sanity/base/components'
import PatchEvent, {set, unset} from '@sanity/form-builder/PatchEvent'
import {useId} from '@reach/auto-id'
import CreatableSelect from 'react-select/creatable'
import Select from 'react-select'

import {withDocument} from 'part:@sanity/form-builder'
import CustomSelectComponents from 'part:tags/components/select'

import {
  isSchemaMulti,
  isSchemaReference,
  useLoading,
  useOptions,
  prepareTags,
  revertTags,
  getSelectedTags,
  getPredefinedTags,
  getTagsFromReference,
  getTagsFromRelated,
} from '../utils'

import {ReferenceCreateWarning, ReferencePredefinedWarning} from './ReferenceWarnings'

// TODO: Allow reference creation inline
// TODO: Allow reference merging inline (stretch ??)
// TODO: Allow reference editing inline (stretch ??)
// TODO: Allow reference deleting inline (stretch ??)
// TODO: Allow object merging inline (stretch ??)
// TODO: Allow object editing inline (stretch ??)
// TODO: Allow object deleting inline (stretch ??)

export default withDocument(
  React.forwardRef<HTMLInputElement, InputProps>((props, ref: any) => {
    const [selected, setSelected] = React.useState<RefinedTags>(undefined)
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

    // get schema types (whether or not array, whether or not reference)
    const isMulti = isSchemaMulti(type)
    const isReference = isSchemaReference(type)

    // define all options passed to input
    const {
      predefinedTags = [],
      includeFromReference = false,
      includeFromRelated = false,
      customLabel = 'label',
      customValue = 'value',
      allowCreate = true,
      onCreate = async (val: string): Promise<GeneralTag> => ({
        [customLabel]: val,
        [customValue]: val,
      }),
      reactSelectOptions = {} as SelectProps<typeof isMulti>,
    } = type.options ? type.options : {}

    // check if reference warnings need to be generated
    const isReferenceCreateWarning = type.options && allowCreate && isReference
    const isReferencePredefinedWarning =
      type.options && !!type.options.predefinedTags && isReference

    // get all tag types when the component loads
    React.useEffect(() => {
      // set generic unsubscribe function in case not used later on
      const defaultSubscription = {
        unsubscribe: () => {},
      }

      let selectedSubscription: GeneralSubscription = defaultSubscription
      let predefinedSubscription: GeneralSubscription = defaultSubscription
      let relatedSubscription: GeneralSubscription = defaultSubscription
      let referenceSubscription: GeneralSubscription = defaultSubscription

      // set the loading state for each option group
      setLoadOption({
        selectedTags: true,
        predefinedTags: true,
        referenceTags: true,
        relatedTags: true,
      })

      // setup the selected observable
      selectedSubscription = getSelectedTags({
        tags: value,
        customLabel,
        customValue,
        isMulti,
      }).subscribe((tags) => {
        setSelected(tags)
        setLoadOption({selectedTags: false})
      })

      // setup the predefined observable
      predefinedSubscription = getPredefinedTags({
        predefinedTags,
        customLabel,
        customValue,
      }).subscribe((tags) => {
        setTagOption({predefinedTags: tags})
        setLoadOption({predefinedTags: false})
      })

      // if true, setup the reference observable
      if (typeof includeFromReference === 'string') {
        referenceSubscription = getTagsFromReference({
          document: includeFromReference,
          customLabel,
          customValue,
        }).subscribe((tags) => {
          setTagOption({referenceTags: tags})
          setLoadOption({referenceTags: false})
        })
      } else {
        setLoadOption({referenceTags: false})
      }

      // if true, setup the related observable
      if (typeof includeFromRelated === 'string') {
        relatedSubscription = getTagsFromRelated({
          document: document._type,
          field: includeFromRelated,
          isMulti,
          customLabel,
          customValue,
        }).subscribe((tags) => {
          setTagOption({relatedTags: tags})
          setLoadOption({relatedTags: false})
        })
      } else {
        setLoadOption({relatedTags: false})
      }

      // unsubscribe on unmount
      return () => {
        selectedSubscription.unsubscribe()
        predefinedSubscription.unsubscribe()
        relatedSubscription.unsubscribe()
        referenceSubscription.unsubscribe()
      }
    }, [])

    // when new options are created, use this to handle it
    const handleCreate = React.useCallback(
      async (inputValue: string) => {
        // since an await is used, briefly set the load state to true
        setLoadOption({handleCreate: true})

        // prepare the tag based on the option onCreate
        const newCreateValue = await prepareTags({
          customLabel,
          customValue,
          tags: await onCreate(inputValue),
        })

        // now that the option is created, pass to the handleChange function
        if (Array.isArray(selected)) handleChange([...selected, newCreateValue] as RefinedTags)
        else handleChange(newCreateValue)

        // unset the load state
        setLoadOption({handleCreate: false})
      },
      [onChange, selected]
    )

    // handle any change made to the select
    const handleChange = React.useCallback(
      (inputValue: RefinedTags) => {
        // set the new option
        setSelected(inputValue)

        // revert the tags to their initial values for saving
        const tagsForEvent = revertTags({
          tags: inputValue,
          customLabel,
          customValue,
          isMulti,
          isReference,
        })

        // save the values
        onChange(PatchEvent.from(tagsForEvent ? set(tagsForEvent) : unset(tagsForEvent)))
      },
      [onChange]
    )

    // create a unique id
    const inputId = useId()

    // set up the options for react-select
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

    // return the Select Component
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
          <CreatableSelect
            {...selectOptions}
            components={CustomSelectComponents as SelectComponents}
          />
        ) : (
          <Select {...selectOptions} components={CustomSelectComponents as SelectComponents} />
        )}
      </FormField>
    )
  })
)
