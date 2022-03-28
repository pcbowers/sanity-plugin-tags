import Input from 'part:tags/components/input'

const inputSchema = {
  name: 'tags',
  title: 'Tags',
  type: 'array',
  inputComponent: Input,
  of: [{type: 'tag'}],
}

export default inputSchema
