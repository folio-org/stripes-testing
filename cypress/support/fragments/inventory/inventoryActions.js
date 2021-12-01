import { Button } from '../../../../interactors';


export default {
  open: () => { return Button('Actions').click(); },
  options: {
    saveUUIDs: Button('Save instances UUIDs'),
    saveCQLQuery: Button('Save instances CQL query'),
    exportMARC: Button('Export instances (MARC)'),
    showSelectedRecords: Button('Show selected records'),
  },
  optionsIsDisabled: (array) => {
    return array.forEach((element) => {
      cy.expect(element.is({ disabled: true }));
    });
  },
  optionsIsEnabled: (array) => {
    return array.forEach((element) => {
      cy.expect(element.is({ disabled: false }));
    });
  },
};
