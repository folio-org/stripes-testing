import { Button, MultiColumnListCell, Selection } from '../../../../interactors';

export default {
  checkImportFile:(fileName) => {
    cy.do([
      Button('View all').click(),
      Button('Choose job profile').click(),
      Selection({ role: 'listbox' }).choose(fileName),
    ]);
  },

  waitUntilSearchJobProfile(jobProfileName) {
    cy.expect(MultiColumnListCell(jobProfileName).exists());
  },

  checkStatusOfJobProfile() {
    cy.expect(MultiColumnListCell({ 'row': 0, 'columnIndex': 2 }).has({ value: 'Completed' }));
  },

  selectJobProfile() {
    cy.get(MultiColumnListCell({ 'row': 0, 'columnIndex': 0 })).click();
  },

  checkCreatedItems() {
    cy.expect(MultiColumnListCell({ 'row': 0, 'columnIndex': 3 }).has({ value: 'Created' }));
  }
};
