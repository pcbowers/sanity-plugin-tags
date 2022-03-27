import Tags from "./components/Tags"

const inputSchema = {
  name: "tags",
  title: "Tags",
  type: "array",
  inputComponent: Tags,
  of: [{ type: "tag" }]
}

export default inputSchema
