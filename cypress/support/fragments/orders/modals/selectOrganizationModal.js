import {
  Button,
  Checkbox,
  Modal,
  MultiColumnListRow,
  Pane,
  SearchField,
  including,
} from '../../../../../interactors';
import { COMMON_BUTTON_LABELS, DEFAULT_WAIT_TIME } from '../../../constants';
import SearchHelper from '../../finance/financeHelper';

const selectOrganizationModal = Modal(including('Select Organization'));
const filtersPane = selectOrganizationModal.find(Pane('Search & filter'));
const searchField = selectOrganizationModal.find(SearchField({ id: 'input-record-search' }));
const searchButton = selectOrganizationModal.find(Button(COMMON_BUTTON_LABELS.SEARCH));
const saveButton = selectOrganizationModal.find(Button(COMMON_BUTTON_LABELS.SAVE));
const closeButton = selectOrganizationModal.find(Button(COMMON_BUTTON_LABELS.CLOSE));

const searchOrganization = (organizationName) => {
  cy.do([searchField.fillIn(organizationName), searchButton.click()]);
  cy.wait(DEFAULT_WAIT_TIME);
};

export default {
  verifyModalView() {
    cy.expect([
      selectOrganizationModal.exists(),
      filtersPane.exists(),
      closeButton.has({ disabled: false, visible: true }),
    ]);
  },
  findOrganization(organizationName) {
    searchOrganization(organizationName);
    SearchHelper.selectFromResultsList();
  },
  filterByOrganizationStatus(status) {
    cy.do(filtersPane.find(Checkbox(status)).click());
    cy.wait(DEFAULT_WAIT_TIME);
  },
  selectOrganizations(organizationNames = []) {
    organizationNames.forEach((organizationName) => {
      searchOrganization(organizationName);
      cy.do(
        selectOrganizationModal
          .find(MultiColumnListRow({ index: 0 }))
          .find(Checkbox())
          .click(),
      );
    });
  },
  save() {
    cy.do(saveButton.click());
  },
  closeModal() {
    cy.do(closeButton.click());
  },
  verifyClosed() {
    cy.expect(selectOrganizationModal.absent());
  },
};
