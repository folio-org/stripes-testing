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
  HTML,
  including,
} from '../../../../../interactors';
import {
  COMMON_BUTTON_LABELS,
  DEFAULT_WAIT_TIME,
  RESULTS_PANE_CHOOSE_FILTER_MESSAGE,
} from '../../../constants';
import FiltersPane from '../../filtersPane';

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
  verifyModalElements({ expandedFilters = [], collapsedFilters = [] } = {}) {
    const organizationsPane = selectOrganizationModal.find(Pane('Organizations'));

    cy.expect([
      searchField.has({ selectedFilterText: 'All', value: '' }),
      searchButton.has({ disabled: true }),
      filtersPane.find(Button(COMMON_BUTTON_LABELS.RESET_ALL)).has({ disabled: true }),
      organizationsPane.has({ subtitle: 'Enter search criteria to start search' }),
      organizationsPane.find(HTML(including(RESULTS_PANE_CHOOSE_FILTER_MESSAGE))).exists(),
      closeButton.has({ disabled: false }),
      selectOrganizationModal.find(Button({ icon: 'times' })).has({ disabled: false }),
    ]);
    FiltersPane.assertFilterAccordions(filtersPane, expandedFilters, { expanded: true });
    FiltersPane.assertFilterAccordions(filtersPane, collapsedFilters, { expanded: false });
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
