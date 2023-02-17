import {SanityClient} from '@sanity/client'
import {GeneralTag, RefinedTags, RefTag, Tag, UnrefinedTags} from '../types'
import {get, isPlainObject, setAtPath} from './helpers'

interface PrepareTagInput {
  customLabel?: string
  customValue?: string
}

/**
 * Prepares tags for react-select
 * @param customLabel a string with a custom label key to be swapped on the tag
 * @param customValue a string with a custom value key to be swapped on the tag
 * @returns a formatted tag that can be used with react-select without overriding custom labels or values
 */
const prepareTag = ({customLabel = 'label', customValue = 'value'}: PrepareTagInput) => {
  return (tag: GeneralTag) => {
    const tempTag: Tag = {
      ...tag,
      _type: 'tag',
      _key: tag.value,
      _labelTemp: tag.label,
      _valueTemp: tag.value,
      label: get(tag, customLabel),
      value: get(tag, customValue),
    }
    return tempTag
  }
}

interface RevertTagInput<IsReference extends boolean = boolean> {
  customLabel?: string
  customValue?: string
  isReference: IsReference
}

/**
 * Reverts tag for saving to sanity
 * @param customLabel a string with a custom label key to be swapped on the tag
 * @param customValue a string with a custom value key to be swapped on the tag
 * @param isReference whether or not the tag should be saved as a reference or an object
 * @returns a formatted tag that restores any custom labels or values while also preparing the tag to be saved by sanity
 */
function revertTag<IsReference extends true>(
  params: RevertTagInput<IsReference>
): (tag: Tag) => RefTag
function revertTag<IsReference extends false>(
  params: RevertTagInput<IsReference>
): (tag: Tag) => GeneralTag
function revertTag<IsReference extends boolean>(
  params: RevertTagInput<IsReference>
): (tag: Tag) => RefTag | GeneralTag
function revertTag<IsReference extends boolean>({
  customLabel = 'label',
  customValue = 'value',
  isReference,
}: RevertTagInput<IsReference>) {
  return (tag: Tag): RefTag | GeneralTag => {
    if (isReference === true) {
      const tempTag: RefTag = {
        _ref: tag._id,
        _type: 'reference',
      }

      return tempTag
    }

    const tempTag: GeneralTag = {
      ...tag,
      label: tag._labelTemp,
      value: tag._valueTemp,
    }

    setAtPath(tempTag, customLabel, tag.label)
    setAtPath(tempTag, customValue, tag.value)

    delete tempTag._labelTemp
    delete tempTag._valueTemp
    if (tempTag.label === undefined) delete tempTag.label
    if (tempTag.value === undefined) delete tempTag.value

    return tempTag
  }
}

interface PrepareTagsInput<TagType extends UnrefinedTags = UnrefinedTags> {
  client: SanityClient
  tags: TagType
  customLabel?: string
  customValue?: string
}

/**
 * Prepares a list of tag(s) for react-select
 * @param tags A list of tags that need to be prepared for react-select (general objects or references)
 * @returns A prepared list of tag(s) that preserves any custom labels or values
 */
export const prepareTags = async <TagType extends UnrefinedTags>({
  client,
  tags,
  customLabel = 'label',
  customValue = 'value',
}: PrepareTagsInput<TagType>): Promise<RefinedTags> => {
  const prepare = prepareTag({customLabel, customValue})

  // undefined single
  if (tags === undefined || tags === null) return undefined

  // undefined array
  if (Array.isArray(tags) && !tags.length) return []

  // reference array
  if (Array.isArray(tags) && '_ref' in tags[0] && '_type' in tags[0])
    if ('_ref' in tags[0] && '_type' in tags[0]) {
      return (
        await client.fetch('*[_id in $refs]', {
          refs: tags.map((tag) => tag._ref),
        })
      ).map(prepare)
    }

  // object array
  if (Array.isArray(tags)) return tags.map(prepare)

  // reference singleton
  if (isPlainObject(tags) && '_ref' in tags && '_type' in tags)
    return prepare(await client.fetch('*[_id == $ref][0]', {ref: tags._ref}))

  // object singleton
  return prepare(tags)
}

/**
 * Prepares a list of tags for react-select
 * @param tags A list of tags or single tag that need to be prepared for react-select (general objects or references)
 * @returns A prepared list of tags that preserves any custom labels or values
 */
export const prepareTagsAsList = async <TagType extends UnrefinedTags>(
  preparedTagsOptions: PrepareTagsInput<TagType>
): Promise<Tag[]> => {
  const preparedTags = await prepareTags(preparedTagsOptions)

  if (preparedTags === undefined) return []
  if (!Array.isArray(preparedTags)) return [preparedTags]
  return preparedTags
}

interface RevertTagsInput<
  IsReference extends boolean = boolean,
  IsMulti extends boolean = boolean
> {
  tags: RefinedTags
  customLabel?: string
  customValue?: string
  isMulti: IsMulti
  isReference: IsReference
}

/**
 * Reverts tag(s) for saving to sanity
 * @param customLabel a string with a custom label key to be swapped on the tag(s)
 * @param customValue a string with a custom value key to be swapped on the tag(s)
 * @param isReference whether or not the tag(s) should be saved as a reference or an object
 * @returns a formatted list of tag(s) that restores any custom labels or values while also preparing the tag(s) to be saved by sanity
 */
export function revertTags<IsReference extends true, IsMulti extends true>(
  params: RevertTagsInput<IsReference, IsMulti>
): RefTag[]
export function revertTags<IsReference extends true, IsMulti extends false>(
  params: RevertTagsInput<IsReference, IsMulti>
): RefTag | undefined
export function revertTags<IsReference extends false, IsMulti extends true>(
  params: RevertTagsInput<IsReference, IsMulti>
): GeneralTag[]
export function revertTags<IsReference extends false, IsMulti extends false>(
  params: RevertTagsInput<IsReference, IsMulti>
): GeneralTag | undefined
export function revertTags<IsReference extends boolean, IsMulti extends false>(
  params: RevertTagsInput<IsReference, IsMulti>
): RefTag | GeneralTag | undefined
export function revertTags<IsReference extends boolean, IsMulti extends true>(
  params: RevertTagsInput<IsReference, IsMulti>
): RefTag[] | GeneralTag[]
export function revertTags<IsReference extends false, IsMulti extends boolean>(
  params: RevertTagsInput<IsReference, IsMulti>
): GeneralTag | GeneralTag[] | undefined
export function revertTags<IsReference extends true, IsMulti extends boolean>(
  params: RevertTagsInput<IsReference, IsMulti>
): RefTag | RefTag[] | undefined
export function revertTags<IsReference extends boolean, IsMulti extends boolean>(
  params: RevertTagsInput<IsReference, IsMulti>
): UnrefinedTags
export function revertTags<IsReference extends boolean, IsMulti extends boolean>({
  tags,
  customLabel = 'label',
  customValue = 'value',
  isMulti,
  isReference,
}: RevertTagsInput<IsReference, IsMulti>): UnrefinedTags {
  const revert = revertTag({customLabel, customValue, isReference})

  // if tags are undefined
  if (tags === undefined) return undefined

  if (isMulti) {
    // ensure it is actually an array
    const tagsArray = Array.isArray(tags) ? tags : [tags]

    // revert and return array
    return tagsArray.map(revert)
  }

  // not multi, so ensure is a single tag
  const tag = Array.isArray(tags) ? tags[0] : tags

  // revert tag
  return revert(tag)
}
