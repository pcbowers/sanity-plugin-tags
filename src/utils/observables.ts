import {prepareTagsAsList, client, listenOptions, filterUniqueTags} from '../utils'
import {from, defer, pipe, Observable} from 'rxjs'
import {map, switchMap} from 'rxjs/operators'

interface RefineTagsPipeInput {
  customLabel?: string
  customValue?: string
}

/**
 * A custom pipe function that can be used in an observable pipe to refine tags
 * @param customLabel a string with a custom label key to be swapped on the tag(s)
 * @param customValue a string with a value label key to be swapped on the tag(s)
 * @returns A custom pipe function
 */
const refineTagsPipe = ({customLabel = 'label', customValue = 'value'}: RefineTagsPipeInput) =>
  pipe(
    map((val) => (Array.isArray(val) ? val.flat(Infinity) : val) as UnrefinedTags),
    switchMap((val) => prepareTagsAsList({tags: val, customLabel, customValue})),
    map((val) => filterUniqueTags(val))
  )

interface GetGeneralObservableInput {
  query: string
  params: {
    [key: string]: any
  }
  customLabel?: string
  customValue?: string
}

/**
 * A generic observable that will watch a query and return refined tags
 * @param query A GROQ query for the sanity client
 * @param params A list of GROQ params for the sanity client
 * @param customLabel a string with a custom label key to be swapped on the tag(s)
 * @param customValue a string with a value label key to be swapped on the tag(s)
 * @returns An observable that watches for any changes on the query and params
 */
const getGeneralObservable = ({
  query,
  params,
  customLabel = 'label',
  customValue = 'value',
}: GetGeneralObservableInput) => {
  return client.listen<UnrefinedTags>(query, params, listenOptions).pipe(
    switchMap(() => client.fetch<UnrefinedTags>(query, params)),
    refineTagsPipe({customLabel, customValue})
  )
}

interface GetSelectedTagsInput<IsMulti extends boolean = boolean> {
  tags: UnrefinedTags
  isMulti: IsMulti
  customLabel?: string
  customValue?: string
}

/**
 * Manipulate the selected tags into a list of refined tags
 * @param tags A list or singleton of RefTag or GeneralTag that will act as the selected tags for react-select
 * @param customLabel a string with a custom label key to be swapped on the tag(s)
 * @param customValue a string with a value label key to be swapped on the tag(s)
 * @returns An observable that returns pre-refined tags received from the predefined tags option
 */
export function getSelectedTags<IsMulti extends true>(
  params: GetSelectedTagsInput<IsMulti>
): Observable<Tag[]>
export function getSelectedTags<IsMulti extends false>(
  params: GetSelectedTagsInput<IsMulti>
): Observable<Tag>
export function getSelectedTags<IsMulti extends boolean>(
  params: GetSelectedTagsInput<IsMulti>
): Observable<Tag | Tag[]>
export function getSelectedTags<IsMulti extends boolean>({
  tags,
  isMulti,
  customLabel = 'label',
  customValue = 'value',
}: GetSelectedTagsInput<IsMulti>): Observable<Tag | Tag[]> {
  const tagFunction = async () => tags
  return defer(() => from(tagFunction())).pipe(
    refineTagsPipe({customLabel, customValue}),
    map((val) => (isMulti ? val : val[0]))
  )
}

/**
 * Takes a function that can possibly return singleton tags and forces it to return an array of tags
 * @param predefinedTags A function that returns an unrefined tag(s)
 * @returns A list of the tags
 */
const predefinedTagWrapper = async (
  predefinedTags:
    | (() => Promise<GeneralTag | GeneralTag[] | RefTag | RefTag[]>)
    | (() => GeneralTag | GeneralTag[] | RefTag | RefTag[])
): Promise<GeneralTag[] | RefTag[]> => {
  const tags = await predefinedTags()
  if (!Array.isArray(tags)) return [tags]
  return tags
}

interface GetPredefinedTagsInput {
  predefinedTags: PredefinedTags
  customLabel?: string
  customValue?: string
}

/**
 * Manipulate the predefined tags into a list of refined tags
 * @param predefinedTags A list or singleton of RefTag or GeneralTag that will act as predefined tags for react-select
 * @param customLabel a string with a custom label key to be swapped on the tag(s)
 * @param customValue a string with a value label key to be swapped on the tag(s)
 * @returns An observable that returns pre-refined tags received from the predefined tags option
 */
export const getPredefinedTags = ({
  predefinedTags,
  customLabel = 'label',
  customValue = 'value',
}: GetPredefinedTagsInput): Observable<Tag[]> => {
  const tagFunction =
    predefinedTags instanceof Function ? predefinedTags : async () => predefinedTags

  return defer(() =>
    from(predefinedTagWrapper(tagFunction)).pipe(refineTagsPipe({customLabel, customValue}))
  )
}

interface GetTagsFromReferenceInput {
  document: string
  customLabel?: string
  customValue?: string
}

/**
 * Observes changes to a referenced document and returns refined tags
 * @param document a string that matches a document type in the sanity schema
 * @param customLabel a string with a custom label key to be swapped on the tag(s)
 * @param customValue a string with a value label key to be swapped on the tag(s)
 * @returns An observable that returns pre-refined tags received from the referenced document
 */
export const getTagsFromReference = ({
  document,
  customLabel = 'label',
  customValue = 'value',
}: GetTagsFromReferenceInput): Observable<Tag[]> => {
  const query = `
  *[ _type == $document && defined(@[$customLabel]) && defined(@[$customValue])] {
    _id,
    "value": @[$customValue],
    "label": @[$customLabel]
  }
  `

  const params = {document, customLabel, customValue}

  return getGeneralObservable({
    query,
    params,
    customLabel,
    customValue,
  })
}

interface GetTagsFromRelatedInput {
  document: string
  field: string
  isMulti: boolean
  customLabel?: string
  customValue?: string
}

/**
 * Observes changes to related objects and returns refined tags
 * @param document a string that matches the current document type
 * @param field a string that matches the name of the field to pull from
 * @param isMulti whether or not the related field is an array or an object
 * @param customLabel a string with a custom label key to be swapped on the tag(s)
 * @param customValue a string with a value label key to be swapped on the tag(s)
 * @returns An observable that returns pre-refined tags received from the related field within the document
 */
export const getTagsFromRelated = ({
  document,
  field,
  isMulti,
  customLabel = 'label',
  customValue = 'value',
}: GetTagsFromRelatedInput): Observable<Tag[]> => {
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

  return getGeneralObservable({
    query,
    params,
    customLabel,
    customValue,
  })
}
