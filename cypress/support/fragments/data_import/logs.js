import { Button, TextField, MultiColumnListCell } from '../../../../interactors';

export default {
  // TODO search file by id
  searchJobProfileByName(fileName) {
    cy.do([
      Button('View all').click(),
      TextField({ id: 'input-job-logs-search' }).fillIn(fileName),
      Button('Search').click()
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
