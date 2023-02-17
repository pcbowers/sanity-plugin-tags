import {SchemaTypeDefinition} from 'sanity'
import {TagsInput} from '../components/TagsInput'

export const tagSchema: SchemaTypeDefinition = {
  name: 'tag',
  title: 'Tag',
  type: 'object',
  components: {
    input: TagsInput,
  },
  fields: [
    {
      name: 'value',
      type: 'string',
    },
    {
      name: 'label',
      type: 'string',
    },
  ],
}
