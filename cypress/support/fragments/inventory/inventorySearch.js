import { MultiColumnList, MultiColumnListCell, MultiSelect } from '../../../../interactors';


const effectiveLocationInput = MultiSelect({ id: 'multiselect-6' });

export default {
  effectiveLocation: {
    // add new effective location inputs as needed
    mainLibrary: 'Main Library'
  },
  getAllSearchResults: () => MultiColumnList(),
  getSearchResult: (row, col) => MultiColumnListCell({ 'row': row ?? 0, 'columnIndex': col ?? 0 }),

  searchByEffectiveLocation(values) {
    return effectiveLocationInput.select(values ?? [this.effectiveLocation.mainLibrary]);
  },
};
