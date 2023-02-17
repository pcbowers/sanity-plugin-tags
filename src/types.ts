import {
  ArrayOfObjectsInputProps,
  ArraySchemaType,
  ObjectInputProps,
  ObjectSchemaType,
  ReferenceSchemaType,
} from 'sanity'
import {GroupBase, Props, SelectComponentsConfig} from 'react-select'
import {Subscription} from 'rxjs'

export type GeneralSubscription = Subscription | {unsubscribe: () => any}

export interface RefTag {
  _ref: string
  _type: string
}

export interface GeneralTag {
  [key: string]: any
}

export interface Tag {
  _type: 'tag'
  _key: string
  label: string
  value: string
  [key: string]: any
}

export type UnrefinedTags = RefTag | GeneralTag | RefTag[] | GeneralTag[] | undefined

export type RefinedTags = Tag | Tag[] | undefined

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
  onCreate?: (inputValue: string) => GeneralTag | Promise<GeneralTag>
  checkValid?: (inputValue: string, currentValues: string[]) => boolean
  reactSelectOptions?: Props<Tag, boolean, GroupBase<Tag>>
}

export type SelectProps<IsMulti extends boolean = true> = Props<Tag, IsMulti, GroupBase<Tag>>
export type SelectComponents<IsMulti extends boolean = true> = SelectComponentsConfig<
  Tag,
  IsMulti,
  GroupBase<Tag>
>

export type InputType = (ArraySchemaType | ReferenceSchemaType | ObjectSchemaType) & {
  options?: InputOptions
}

type TagSchema = ObjectSchemaType & {options?: InputOptions}
type TagArraySchema = ArraySchemaType & {options?: InputOptions}
type TagRefSchema = ReferenceSchemaType & {options?: InputOptions}

export type TagsSchema = TagSchema | TagArraySchema | TagRefSchema

type TagInputProps = ObjectInputProps<Tag, TagSchema>
type TagArrayInputProps = ArrayOfObjectsInputProps<Tag, TagArraySchema>
type TagRefInputProps = ObjectInputProps<Tag, TagRefSchema>
type TagRefArrayInputProps = ArrayOfObjectsInputProps<Tag, TagArraySchema>

export type TagsInputProps =
  | TagInputProps
  | TagArrayInputProps
  | TagRefInputProps
  | TagRefArrayInputProps
