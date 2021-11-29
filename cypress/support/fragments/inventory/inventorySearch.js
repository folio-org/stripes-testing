import { MultiColumnList, Checkbox, MultiColumnListCell, MultiSelect } from '../../../../interactors';

export default class InventorySearch {
  static #effectiveLocationInput = MultiSelect({ 'id': 'multiselect-6' });
  static effectiveLocation = {
    'mainLibrary': 'Main Library'
  }

  static #firstResultCheckbox = MultiColumnListCell({ 'row': 0, 'columnIndex': 0 }).find(Checkbox());

  static getFirstResultCheckbox() {
    return this.#firstResultCheckbox;
  }

  static getResults() {
    return MultiColumnList();
  }

  static byEffectiveLocation(values) {
    return InventorySearch.#effectiveLocationInput.select(values);
  }
}
