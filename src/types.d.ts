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
import type {Subscription, Observable} from 'rxjs'
import type {Props, GroupBase, SelectComponentsConfig} from 'react-select'
import type {ListenEvent} from '@sanity/client'
declare global {
  type GeneralSubscription = Subscription | {unsubscribe: () => any}

  interface RefTag {
    _ref: string
    _type: string
  }

  interface GeneralTag {
    [key: string]: any
  }

  interface Tag {
    label: string
    value: string
    [key: string]: any
  }

  type UnrefinedTags = RefTag | GeneralTag | RefTag[] | GeneralTag[] | undefined

  type RefinedTags = Tag | Tag[] | undefined

  type TagListenEvent = ListenEvent<GeneralTag[] | RefTag[]>
  type TagObserver = Observable<ListenEvent<GeneralTag[] | RefTag[]>>

  type PredefinedTags =
    | GeneralTag[]
    | RefTag[]
    | GeneralTag
    | RefTag
    | (() => Promise<GeneralTag[] | RefTag[] | GeneralTag | RefTag>)
    | (() => GeneralTag[] | RefTag[] | GeneralTag | RefTag)

  interface InputOptions {
    predefinedTags?: PredefinedTags
    includeFromReference?: false | string
    includeFromRelated?: false | string
    customLabel?: string
    customValue?: string
    allowCreate?: boolean
    onCreate?: (inputValue: string) => GeneralTag
    reactSelectOptions?: Props<Tag, boolean, GroupBase<Tag>>
  }

  type SelectProps<IsMulti extends boolean = true> = Props<Tag, IsMulti, GroupBase<Tag>>
  type SelectComponents<IsMulti extends boolean = true> = SelectComponentsConfig<
    Tag,
    IsMulti,
    GroupBase<Tag>
  >

  type InputType = (ArraySchemaType | ReferenceSchemaType | ObjectSchemaType) & {
    options?: InputOptions
  }

  type InputProps = {
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
}
