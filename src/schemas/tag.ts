import Input from 'part:tags/components/input'

const tag = {
  name: 'tag',
  title: 'Tag',
  type: 'object',
  inputComponent: Input,
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

export default tag
