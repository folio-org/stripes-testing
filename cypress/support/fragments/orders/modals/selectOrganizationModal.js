import { Button, Modal, SearchField, including } from '../../../../../interactors';
import SearchHelper from '../../finance/financeHelper';

const selectOrganizationModal = Modal(including('Select Organization'));
const searchField = selectOrganizationModal.find(SearchField({ id: 'input-record-search' }));
const searchButton = selectOrganizationModal.find(Button('Search'));
const closeButton = selectOrganizationModal.find(Button('Close'));

export default {
  verifyModalView() {
    cy.expect([closeButton.has({ disabled: false, visible: true })]);
  },
  findOrganization(organizationName) {
    cy.do([searchField.fillIn(organizationName), searchButton.click()]);
    cy.wait(5000);
    SearchHelper.selectFromResultsList();
  },
  closeModal() {
    cy.do(closeButton.click());
  },
};
