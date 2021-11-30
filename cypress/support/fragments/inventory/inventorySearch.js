import { MultiColumnList, Checkbox, MultiColumnListCell, MultiSelect } from '../../../../interactors';

export default class InventorySearch {
  static #effectiveLocationInput = MultiSelect({ 'id': 'multiselect-6' });
  static effectiveLocation = {
    // add new effective location inputs as needed
    'mainLibrary': 'Main Library'
  }

  static #firstResultCheckbox = MultiColumnListCell({ 'row': 0, 'columnIndex': 0 }).find(Checkbox());

  static getFirstResultCheckbox() {
    return this.#firstResultCheckbox;
  }

  static getSearchResults() {
    return MultiColumnList();
  }

  static byEffectiveLocation(values = [this.effectiveLocation.mainLibrary]) {
    return InventorySearch.#effectiveLocationInput.select(values);
  }
}
