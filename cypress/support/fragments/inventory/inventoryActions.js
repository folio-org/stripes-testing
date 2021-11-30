import { Button } from '../../../../interactors';


export const open = () => { return Button('Actions').click(); };
export const options = {
  saveUUIDs: Button('Save instances UUIDs'),
  saveCQLQuery: Button('Save instances CQL query'),
  exportMARC: Button('Export instances (MARC)'),
  showSelectedRecords: Button('Show selected records'),
};

export const optionsIsDisabled = (array) => {
  return array.forEach((element) => {
    cy.expect(element.is({ disabled: true }));
  });
};


export const optionsIsEnabled = (array) => {
  return array.forEach((element) => {
    cy.expect(element.is({ disabled: false }));
  });
};
