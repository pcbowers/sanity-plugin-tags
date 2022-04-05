/**
 *
 * @param type type prop passed by sanity to input components
 * @returns boolean defining whether the schema is an array or not
 */
export const isSchemaMulti = (type: InputType): boolean => {
  return type.jsonType !== 'object'
}

/**
 *
 * @param type type prop passed by sanity to input components
 * @returns boolean defining whether the schema is a reference or not
 */
export const isSchemaReference = (type: InputType): boolean => {
  return 'to' in type || ('of' in type && type.of[0] && 'to' in type.of[0])
}

/**
 *
 * @param tags an array of tags (i.e. { label: string, value: string })
 * @returns a filtered and flattened version of the initial tags array by uniqueness
 */
export const filterUniqueTags = (tags: Tag[]): Tag[] => {
  if (!tags) tags = []

  return tags.flat(Infinity).filter((firstTag, index) => {
    const firstTagStringified = JSON.stringify({label: firstTag.label, value: firstTag.value})

    return (
      index ===
      tags.flat(Infinity).findIndex((secondTag) => {
        return (
          JSON.stringify({label: secondTag.label, value: secondTag.value}) === firstTagStringified
        )
      })
    )
  })
}
