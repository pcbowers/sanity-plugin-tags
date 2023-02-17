import React, {forwardRef, useCallback, useEffect} from 'react'
import Select from 'react-select'
import CreatableSelect from 'react-select/creatable'
import StateManagedSelect from 'react-select/dist/declarations/src/stateManager'
import {set, unset, useClient, useFormValue} from 'sanity'
import {
  GeneralSubscription,
  GeneralTag,
  RefinedTags,
  SelectProps,
  Tag,
  TagsInputProps,
} from '../types'
import {isSchemaMulti, isSchemaReference, setAtPath} from '../utils/helpers'
import {useLoading, useOptions} from '../utils/hooks'
import {prepareTags, revertTags} from '../utils/mutators'
import {
  getPredefinedTags,
  getSelectedTags,
  getTagsFromReference,
  getTagsFromRelated,
} from '../utils/observables'
import {ReferenceCreateWarning, ReferencePredefinedWarning} from './ReferenceWarnings'

// TODO: Allow reference creation inline
// TODO: Allow reference merging inline (stretch ??)
// TODO: Allow reference editing inline (stretch ??)
// TODO: Allow reference deleting inline (stretch ??)
// TODO: Allow object merging inline (stretch ??)
// TODO: Allow object editing inline (stretch ??)
// TODO: Allow object deleting inline (stretch ??)

export const TagsInput = forwardRef<StateManagedSelect, TagsInputProps>(
  (props: TagsInputProps, ref: React.Ref<Select>) => {
    const client = useClient()
    const _type = useFormValue(['_type']) as string
    const [selected, setSelected] = React.useState<RefinedTags>(undefined)
    const [isLoading, , setLoadOption] = useLoading({})
    const [options, , setTagOption] = useOptions({})

    const {
      schemaType, // Schema information
      value, // Current field value
      readOnly, // Boolean if field is not editable
      onChange, // Method to handle patch events
    } = props

    // get schema types (whether or not array, whether or not reference)
    const isMulti = isSchemaMulti(schemaType)
    const isReference = isSchemaReference(schemaType)

    // define all options passed to input
    const {
      predefinedTags = [],
      includeFromReference = false,
      includeFromRelated = false,
      customLabel = 'label',
      customValue = 'value',
      allowCreate = true,
      onCreate = async (val: string): Promise<GeneralTag> => {
        const tag: GeneralTag = {}
        setAtPath(tag, customLabel, val)
        setAtPath(tag, customValue, val)
        return tag
      },
      checkValid = (inputValue: string, currentValues: string[]) =>
        !currentValues.includes(inputValue) && !!inputValue && inputValue.trim() === inputValue,
      reactSelectOptions = {} as SelectProps<typeof isMulti>,
    } = schemaType.options ? schemaType.options : {}

    // check if reference warnings need to be generated
    const isReferenceCreateWarning = schemaType.options && allowCreate && isReference
    const isReferencePredefinedWarning =
      schemaType.options && !!schemaType.options.predefinedTags && isReference

    // get all tag types when the component loads
    useEffect(() => {
      // set generic unsubscribe function in case not used later on
      const defaultSubscription: GeneralSubscription = {
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
        client,
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
        client,
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
          client,
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
      if (typeof includeFromRelated === 'string' && schemaType.type) {
        relatedSubscription = getTagsFromRelated({
          client,
          document: schemaType.type?.name,
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
          client,
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
    const handleChange = useCallback(
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
        onChange(tagsForEvent ? set(tagsForEvent) : unset(tagsForEvent))
      },
      [onChange]
    )

    // set up the options for react-select
    const selectOptions = {
      isLoading,
      ref,
      isMulti,
      options,
      value: selected,
      isValidNewOption: (inputValue: string, selectedValues: Tag[], selectedOptions: Tag[]) => {
        return checkValid(inputValue, [
          ...selectedOptions.map((opt) => opt.value),
          ...selectedValues.map((val) => val.value),
        ])
      },
      onCreateOption: handleCreate,
      onChange: handleChange,
      isDisabled: readOnly || isLoading,
      ...reactSelectOptions,
    } as SelectProps

    return (
      <>
        {isReferenceCreateWarning && <ReferenceCreateWarning />}
        {isReferencePredefinedWarning && <ReferencePredefinedWarning />}
        {allowCreate && !isReference ? (
          <CreatableSelect {...selectOptions} />
        ) : (
          <Select {...selectOptions} />
        )}
      </>
    )
  }
)
