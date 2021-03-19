import { HTML } from "@bigtest/interactor";
import { or } from "@bigtest/interactor";
import { Button } from "@folio/stripes-testing/interactors";

function createInventory(config, title) {
  return {
    description: 'Create a single inventory item via fast-add',
    action: async () => {
      await Button({
        id: `app-list-item-clickable-${app}-module`,
        visible: or(false, true),
      }).click();
      await isPresent({ name: app }).exists();
    },
  };
}
function createNInventory(config, title, itemCount = 1) {
  return {
    description: "",
  };
}
