import { MultiColumnList, MultiColumnListCell, MultiSelect } from '../../../../interactors';


const effectiveLocationInput = MultiSelect({ id: 'multiselect-6' });

export const effectiveLocation = {
  // add new effective location inputs as needed
  mainLibrary: 'Main Library'
};

export const getSearchResult = (row, col) => MultiColumnListCell({ 'row': row ?? 0, 'column': col ?? 0 });
export const getAllSearchResults = () => MultiColumnList();
export const searchByEffectiveLocation = (values) => effectiveLocationInput.select(values ?? [effectiveLocation.mainLibrary]);
