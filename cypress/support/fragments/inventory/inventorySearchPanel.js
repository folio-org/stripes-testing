import { Checkbox, MultiColumnListCell, MultiSelect } from '../../../../interactors';

export default class InventorySearchPanel {
  static effectiveLocationInput = MultiSelect({ 'id': 'multiselect-6' });
  static effectiveLocationValues = {
    'mainLibrary': 'Main Library'
  }

  static #firstResultCheckbox = MultiColumnListCell({ 'row': 0, 'columnIndex': 0 }).find(Checkbox());

  static firstResultCheckbox() {
    return this.#firstResultCheckbox;
  }
}
