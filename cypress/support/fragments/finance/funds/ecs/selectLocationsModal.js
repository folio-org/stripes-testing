import {
  Button,
  Checkbox,
  Modal,
  MultiColumnList,
  MultiColumnListCell,
  Pane,
  SearchField,
  Section,
  Selection,
  SelectionList,
  including,
} from '../../../../../../interactors';
import { COMMON_BUTTON_LABELS } from '../../../../constants';

const modal = Modal('Select locations');
const searchAndFilterPane = modal.find(Pane({ id: including('filters-pane') }));
const locationsPane = modal.find(Pane('Locations'));
const affiliationSelection = Selection('Affiliation');
const searchField = SearchField({ id: 'input-record-search' });
const searchButton = Button(COMMON_BUTTON_LABELS.SEARCH);
const resetAllButton = Button(COMMON_BUTTON_LABELS.RESET_ALL);
const actionsButton = Button(COMMON_BUTTON_LABELS.ACTIONS);
const closeButton = Button(COMMON_BUTTON_LABELS.CLOSE);
const saveButton = Button(COMMON_BUTTON_LABELS.SAVE);

const locationAssignmentStatusSection = Section('Location assignment status');

export default {
  waitLoading() {
    cy.expect(modal.exists());
  },

  verifySharedLayout() {
    cy.expect([
      modal.exists(),
      searchAndFilterPane.exists(),
      locationsPane.exists(),
      actionsButton.is({ disabled: false }),
      closeButton.is({ disabled: false }),
      saveButton.is({ disabled: false }),
      searchField.has({ value: '' }),
      searchButton.is({ disabled: true }),
      resetAllButton.is({ disabled: true }),
    ]);

    // Pagination must not exist
    cy.expect([
      Button(COMMON_BUTTON_LABELS.PREVIOUS).absent(),
      Button(COMMON_BUTTON_LABELS.NEXT).absent(),
    ]);
  },

  verifyAffiliationPresent(defaultTenantName) {
    cy.expect(searchAndFilterPane.find(affiliationSelection).exists());
    if (defaultTenantName) {
      cy.expect(searchAndFilterPane.find(affiliationSelection).has({ value: defaultTenantName }));
    }
  },

  verifyAffiliationAbsent() {
    cy.expect(searchAndFilterPane.find(affiliationSelection).absent());
  },

  openAffiliation() {
    cy.do(searchAndFilterPane.find(affiliationSelection).open());
    cy.expect(SelectionList().exists());
  },

  verifyAffiliationOptions(options) {
    options.forEach((opt) => cy.contains(opt).should('be.visible'));
  },

  selectAffiliation(tenantName) {
    this.openAffiliation();
    cy.do(SelectionList().select(tenantName));
  },

  selectLocationByName(name) {
    cy.do(MultiColumnListCell({ content: name }).find(Checkbox()).click());
  },

  verifyTotalSelected(count) {
    cy.contains(`Total selected: ${count}`).should('be.visible');
  },

  close() {
    cy.do(closeButton.click());
    cy.expect(modal.absent());
  },

  save() {
    cy.do(saveButton.click());
    cy.expect(modal.absent());
  },

  filterAssignedOnly() {
    cy.do(locationAssignmentStatusSection.find(Checkbox('Assigned')).click());
  },

  verifyAssignedRowVisible(locationName) {
    cy.expect(
      MultiColumnList()
        .find(MultiColumnListCell({ content: locationName }))
        .exists(),
    );
    cy.contains('Assigned').should('be.visible');
  },
};
