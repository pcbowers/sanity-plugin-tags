# sanity-plugin-tags

A multi-tag input for sanity studio

## Install

`sanity install tags`

## Implementation

```javascript
{
  name: "tags",
  type: "tags",
  title: "Tags",
  options: {
    // uses a different path than 'tags' when doing fetchFromOthers
    tagsPath: "tags",
    // whether or not the menu should close once an item is selected
    closeMenuOnSelect: false,
    // get tags specified in other documents
    fetchFromOthers: true,
    // whether or not tags should be allowed to be created
    create: true,
    // provide preset options to be added to the select list
    options: [],
    // allows one to modify the value and label of created items
    onCreate: async (label) => ({
      label,
      value: label.toLowerCase().replace(/\W/g, "-")
    })
  }
},
```

## Acknowledgements

This plugin is based off of [sanity-plugin-autocomplete-tags](https://github.com/rosnovsky/sanity-plugin-autocomplete-tags), though it enhances it by adding a couple additional options while improving support for default sanity values like `initialValues` and `readOnly`.
