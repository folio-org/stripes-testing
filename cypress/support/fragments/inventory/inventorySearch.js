import { MultiColumnList, MultiColumnListCell, MultiSelect, Pane } from '../../../../interactors';


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

  getUUIDsFromRequest(req) {
    const expectedUUIDs = [];
    req.response.body.ids.forEach((elem) => { expectedUUIDs.push(elem.id); });
    return expectedUUIDs;
  },

  verifySelectedRecords(selected) {
    cy.get('div[data-row-index]').then((el) => {
      const overall = el.length;
      cy.expect(Pane('Inventory').is({ subtitle: `${overall} records found${selected} records selected` }));
    });
  },
};
