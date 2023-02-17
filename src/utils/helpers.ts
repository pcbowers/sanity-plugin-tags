import {InputType, Tag} from '../types'

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
export const filterUniqueTags = (tags: Tag[] = []): Tag[] => {
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

/**
 * Get value from object through string/array path
 * @param obj The object with the key you want to retrieve
 * @param path The path (either a string or an array of strings) to the key (i.e. a.b.c or ['a', 'b', 'c'])
 * @param defaultValue A value to return
 * @returns The value at the end of the path or a default value
 */
export const get = <DefaultValue extends unknown>(
  object: Record<string, unknown> | unknown,
  path: string | string[],
  defaultValue?: DefaultValue
): any => {
  if (!object) return defaultValue

  let props: string[] | boolean = false
  let prop: string | undefined

  if (Array.isArray(path)) props = path.slice(0)
  if (typeof path === 'string') props = path.split('.')
  if (!Array.isArray(props)) throw new Error('path must be an array or a string')

  let obj: object | unknown = object
  while (props.length) {
    prop = props.shift()
    if (!prop) return defaultValue
    if (!obj) return defaultValue
    if (obj === null || typeof obj !== 'object' || Array.isArray(obj)) return defaultValue
    if (!(prop in obj)) return defaultValue
    obj = (obj as {[key: string]: unknown})[prop]
  }

  return obj
}

/**
 * Checks to make sure the prop passed is not a prototype
 * @param prop A string defining a prop
 * @returns True if not prototype, else false
 */
function prototypeCheck(prop: string) {
  if (prop === '__proto__' || prop === 'constructor' || prop === 'prototype') return false
  return true
}

/**
 * Set value from object through string/array path
 * @param obj The object you want to add to
 * @param path The path to store the new value (either a string or an array of strings) to the key (i.e. a.b.c or ['a', 'b', 'c'])
 * @param value The value to add to the object
 * @returns True or false defining whether it is sucessfully added
 */
export const setAtPath = <Value extends unknown>(
  object: Record<string, unknown>,
  path: string | string[],
  value: Value
): boolean => {
  let props: string[] | boolean = false

  if (Array.isArray(path)) props = path.slice(0)
  if (typeof path === 'string') props = path.split('.')
  if (!Array.isArray(props)) throw new Error('path must be an array or a string')

  const lastProp = props.pop()
  if (!lastProp) return false
  if (!prototypeCheck(lastProp)) throw new Error('setting of prototype values not supported')

  let thisProp: string | undefined
  let obj = object
  while ((thisProp = props.shift())) {
    if (!prototypeCheck(thisProp)) throw new Error('setting of prototype values not supported')
    if (!thisProp) return false
    if (!(thisProp in obj)) obj[thisProp] = {}
    obj = obj[thisProp] as Record<string, unknown>
    if (!obj || typeof obj !== 'object') return false
  }

  obj[lastProp] = value

  return true
}

export function isPlainObject(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === 'object' &&
    value !== null &&
    value.constructor === Object &&
    Object.prototype.toString.call(value) === '[object Object]'
  )
}
