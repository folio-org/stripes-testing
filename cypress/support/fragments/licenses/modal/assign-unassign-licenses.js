import {
  Button,
  including,
  Modal,
  MultiColumnListRow,
  MultiColumnListCell,
  TextField,
} from '../../../../../interactors';

const assignUnassignModal = Modal('Select license');
const searchField = TextField({ id: 'input-license-search' });
const searchButton = Button('Search');

export default {
  verifyModalIsShown() {
    cy.expect(assignUnassignModal.exists());
  },

  searchForLicense(licenseName) {
    cy.do([searchField.fillIn(licenseName), searchButton.click()]);
    cy.expect(MultiColumnListRow({ content: including(licenseName) }).exists());
    cy.wait(3000);
  },

  selectLicenseFromSearch(licenseName) {
    cy.do(
      MultiColumnListRow({ index: 0 })
        .find(MultiColumnListCell({ content: including(licenseName) }))
        .click(),
    );
  },
};
