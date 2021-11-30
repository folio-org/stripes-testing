import { MultiColumnList, Checkbox, MultiColumnListCell, MultiSelect } from '../../../../interactors';

const effectiveLocation = {
  // add new effective location inputs as needed
  mainLibrary: 'Main Library'
};
const effectiveLocationInput = MultiSelect({ id: 'multiselect-6' });

export default {
  firstResultCheckbox : () => MultiColumnListCell({ row: 0, columnIndex: 0 }).find(Checkbox()),
  getSearchResults : () => MultiColumnList(),
  byEffectiveLocation: (values) => effectiveLocationInput.select(values ?? [effectiveLocation.mainLibrary])
};
