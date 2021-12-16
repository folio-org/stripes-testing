import { Button, TextField, MultiColumnListCell } from '../../../../interactors';

export default class Logs {
  static clickViewAllButton() {
    cy.do(Button('View all').click());
  }

  static searchJobProfileByName() {
    cy.do(TextField({ id: 'input-job-logs-search' }).fillIn('FAT-742'));
    cy.do(Button('Search').click());
  }

  static checkStatusOfJobProfile() {
    cy.get('[data-row-index="row-0"]').should('contain.text', 'Completed');
  }

  static waitUntilSearchJobProfile(jobProfileName) {
    cy.expect(MultiColumnListCell(jobProfileName).exists());
  }

  static selectJobProfile() {
    cy.get(MultiColumnListCell({ 'row': 0, 'columnIndex': 0 })).click();
  }

  static checkCreatedItems() {
    cy.expect(MultiColumnListCell({ 'row': 0, 'columnIndex': 3 }).has({ value: 'Created' }));
  }
}
