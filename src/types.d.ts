import type {
  ArraySchemaType,
  ReferenceSchemaType,
  ObjectSchemaType,
  Path,
  Marker,
  SanityDocument,
} from '@sanity/types'
import type {FormFieldPresence} from '@sanity/base/presence'
import type PatchEvent from '@sanity/form-builder/PatchEvent'
import type {Subscription} from 'rxjs'
import type {Props, GroupBase} from 'react-select'

export type GeneralSubscription = Subscription | {unsubscribe: () => any}

export interface RefTag {
  _ref: string
  _type: string
}

export interface GeneralTag {
  [key: string]: any
}

export interface Tag {
  label: string
  value: string
  [key: string]: any
}

export type UnrefinedTags = RefTag | GeneralTag | RefTag[] | GeneralTag[] | undefined

export type PredefinedTags =
  | GeneralTag[]
  | RefTag[]
  | GeneralTag
  | RefTag
  | (() => Promise<GeneralTag[] | RefTag[] | GeneralTag | RefTag>)
  | (() => GeneralTag[] | RefTag[] | GeneralTag | RefTag)

export interface InputOptions {
  predefinedTags?: PredefinedTags
  includeFromReference?: false | string
  includeFromRelated?: false | string
  customLabel?: string
  customValue?: string
  allowCreate?: boolean
  onCreate?: (inputValue: string) => GeneralTag
  reactSelectOptions?: Props<Tag, boolean, GroupBase<Tag>>
}

export type SelectProps<IsMulti extends boolean = false> = Props<Tag, IsMulti, GroupBase<Tag>>

export type InputType = (ArraySchemaType | ReferenceSchemaType | ObjectSchemaType) & {
  options?: InputOptions
}

export type InputProps = {
  type: InputType
  level: number
  value?: GeneralTag | GeneralTag[] | RefTag | RefTag[]
  document: SanityDocument
  readOnly: boolean | null
  onChange: (patchEvent: PatchEvent) => void
  onFocus: (path?: Path | React.FocusEvent<any>) => void
  onBlur?: () => void
  markers: Marker[]
  presence: FormFieldPresence[]
}
