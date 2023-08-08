const MAPI_TOKEN = "YOUR_TOKEN";
const SPACE_ID = "YOUR_SPACE_ID";

const StoryblokClient = require("storyblok-js-client");

// Initialize the client with the oauth token
const Storyblok = new StoryblokClient({
  oauthToken: MAPI_TOKEN,
});

const master_component = "master_content_type"; // component name

// get master component schema
async function getMasterComponentSchema() {
  let res = await Storyblok.get(`spaces/${SPACE_ID}/components/`);
  let master = res.data.components.filter((c) => {
    return c.name == master_component;
  });
  return master[0].schema;
}

// get all content types other than master
async function getAllContentTypes() {
  let res = await Storyblok.get(`spaces/${SPACE_ID}/components/`);
  let content_types = res.data.components.filter((c) => {
    return !c.is_nestable && c.name != master_component;
  });
  return content_types;
}

// update all content types according to master
async function main_script() {
  try {
    let all_content_types = await getAllContentTypes();
    let master_schema = await getMasterComponentSchema();

    let master_keys = Object.keys(master_schema);

    // Separation of Master Fields and Tabs just for making it a bit cleaner
    let master_fields_keys = [];
    let master_tabs_keys = [];

    master_keys.map((k) => {
      if (master_schema[k].type == "tab") {
        master_tabs_keys.push(k);
      } else {
        master_fields_keys.push(k);
      }
    });

    // Loop through all content types
    all_content_types.map(async (c) => {
      // Component Schema
      let schema = c.schema;

      // Keys for the component
      let keys = Object.keys(schema);

      // Map the normal fields and overwrite those
      master_fields_keys.map((k) => {
        schema[k] = master_schema[k];
      });

      // Handle the tabs
      master_tabs_keys.map((k) => {
        // If a tab is not present, add it
        if (!keys.includes(k)) {
          schema[k] = master_schema[k];

          // If tab is present
        } else {
          // Update the tabs name
          schema[k].display_name = master_schema[k].display_name;

          // Then get all the keys inside the tab of master component
          let tab_keys = schema[k].keys;

          // And add the ones that are not present in the components tab keys
          master_schema[k].keys.map((k_k) => {
            if (!tab_keys.includes(k_k)) {
              schema[k].keys.push(k_k);
            }
          });
        }
      });

      c.schema = schema;

      // Update component in the space
      await Storyblok.put(`spaces/${SPACE_ID}/components/${c.id}`, {
        component: c,
      });
    });
  } catch (error) {
    console.log(error);
  }
}

main_script();
