import { Button, TextField, MultiColumnListCell } from '../../../../interactors';

export default {
  clickViewAllButton() {
    cy.do(Button('View all').click());
  },

  searchJobProfileByName() {
    cy.do(TextField({ id: 'input-job-logs-search' }).fillIn('FAT-742'));
    cy.do(Button('Search').click());
  },

  checkStatusOfJobProfile() {
    cy.get('[data-row-index="row-0"]').should('contain.text', 'Completed');
  },

  waitUntilSearchJobProfile(jobProfileName) {
    cy.expect(MultiColumnListCell(jobProfileName).exists());
  },

  selectJobProfile() {
    cy.get(MultiColumnListCell({ 'row': 0, 'columnIndex': 0 })).click();
  },

  checkCreatedItems() {
    cy.expect(MultiColumnListCell({ 'row': 0, 'columnIndex': 3 }).has({ value: 'Created' }));
  }
};
