import {
  Button,
  Checkbox,
  Modal,
  MultiColumnListCell,
  MultiColumnListRow,
  MultiSelect,
  MultiSelectMenu,
  MultiSelectOption,
  Pane,
  SearchField,
  Section,
  ValueChipRoot,
  including,
} from '../../../../../interactors';
import { COMMON_BUTTON_LABELS, DEFAULT_WAIT_TIME } from '../../../constants';

const selectOrganizationModal = Modal(including('Select Organization'));
const filtersPane = selectOrganizationModal.find(Pane('Search & filter'));
const searchField = selectOrganizationModal.find(SearchField({ id: 'input-record-search' }));
const searchButton = selectOrganizationModal.find(Button(COMMON_BUTTON_LABELS.SEARCH));
const saveButton = selectOrganizationModal.find(Button(COMMON_BUTTON_LABELS.SAVE));
const closeButton = selectOrganizationModal.find(Button(COMMON_BUTTON_LABELS.CLOSE));

const typesAccordionToggle = filtersPane.find(
  Button({ id: 'accordion-toggle-button-org-filter-organizationTypes' }),
);
const typesMultiSelect = filtersPane
  .find(Section({ id: 'org-filter-organizationTypes' }))
  .find(MultiSelect());

const searchOrganization = (organizationSearchValue, searchIndex) => {
  const searchActions = [];

  if (searchIndex) searchActions.push(searchField.selectIndex(searchIndex));
  searchActions.push(searchField.fillIn(organizationSearchValue), searchButton.click());

  cy.do(searchActions);
  cy.wait(5000);
};

export default {
  verifyModalView() {
    cy.expect([closeButton.has({ disabled: false, visible: true })]);
  },
  selectFromResultsList: (rowNumber = 0) => {
    cy.do(selectOrganizationModal.find(MultiColumnListRow({ index: rowNumber })).click());
  },
  findOrganization(organizationName) {
    searchOrganization(organizationName);
    this.selectFromResultsList();
  },
  filterByOrganizationStatus(status) {
    cy.do(filtersPane.find(Checkbox(status)).click());
    cy.wait(DEFAULT_WAIT_TIME);
  },
  selectOrganizations(organizationSearchValues = [], searchIndex) {
    organizationSearchValues.forEach((organizationSearchValue) => {
      searchOrganization(organizationSearchValue, searchIndex);
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
  expandTypesAccordion() {
    cy.do(typesAccordionToggle.click());
    cy.expect(typesMultiSelect.exists());
  },
  openTypesDropdown() {
    cy.do(typesMultiSelect.open());
  },
  verifyTypesDropdownOptions(types = []) {
    types.forEach((type) => {
      cy.expect(
        MultiSelectMenu()
          .find(MultiSelectOption(including(type)))
          .exists(),
      );
    });
  },
  selectOrganizationType(type) {
    cy.do(typesMultiSelect.choose([including(type)]));
    cy.wait(DEFAULT_WAIT_TIME);
  },
  verifySelectedOrganizationType(type) {
    cy.expect(typesMultiSelect.find(ValueChipRoot(type)).exists());
  },
  verifyOrganizationInResultsList(organizationName) {
    cy.expect(
      selectOrganizationModal
        .find(MultiColumnListCell({ content: including(organizationName) }))
        .exists(),
    );
  },
  selectOrganizationByName(organizationName) {
    cy.do(
      selectOrganizationModal
        .find(MultiColumnListCell({ content: including(organizationName) }))
        .click(),
    );
  },
};
