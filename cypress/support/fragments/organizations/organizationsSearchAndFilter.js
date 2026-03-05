import {
  Button,
  Checkbox,
  MultiColumnList,
  MultiColumnListRow,
  Pane,
  SearchField,
  Section,
  SelectionOption,
  TextField,
} from '../../../../interactors';

const organizationsList = MultiColumnList({ id: 'organizations-list' });
const searchInput = SearchField({ id: 'input-record-search' });
const resetButton = Button('Reset all');
const searchButtonInModal = Button({ type: 'submit' });
const toggleButtonIsDonor = Button({ id: 'accordion-toggle-button-isDonor' });
const donorSection = Section({ id: 'isDonor' });
const toggleOrganizationStatus = Button({ id: 'accordion-toggle-button-status' });
const toggleOrganizationTypes = Button({
  id: 'accordion-toggle-button-org-filter-organizationTypes',
});
const toggleOrganizationTags = Button({ id: 'accordion-toggle-button-tags' });
const toggleButtonIsVendor = Button({ id: 'accordion-toggle-button-isVendor' });
const toggleButtonCountry = Button({ id: 'accordion-toggle-button-plugin-country-filter' });
const toggleButtonLanguage = Button({ id: 'accordion-toggle-button-plugin-language-filter' });
const toggleButtonPaymentMethod = Button({ id: 'accordion-toggle-button-paymentMethod' });
const toggleButtonAcquisitionMethod = Button({
  id: 'accordion-toggle-button-org-filter-acqUnitIds',
});
const toggleButtonCreatedBy = Button({ id: 'accordion-toggle-button-metadata.createdByUserId' });
const toggleButtonDateCreated = Button({ id: 'accordion-toggle-button-metadata.createdDate' });
const toggleButtonUpdatedBy = Button({ id: 'accordion-toggle-button-metadata.updatedByUserId' });
const toggleButtonDateUpdated = Button({ id: 'accordion-toggle-button-metadata.updatedDate' });
const updatedDateAccordion = Section({ id: 'metadata.updatedDate' });
const startDateField = TextField({ name: 'startDate' });
const endDateField = TextField({ name: 'endDate' });
const applyButton = Button('Apply');

export default {
  waitLoading: () => {
    cy.expect(Pane({ id: 'organizations-results-pane' }).exists());
  },

  checkSearchAndFilterPaneExists: () => {
    cy.expect(organizationsList.exists());
  },

  searchByParameters: (parameter, value) => {
    cy.wait(4000);
    cy.do([
      searchInput.selectIndex(parameter),
      searchInput.fillIn(value),
      Button('Search').click(),
    ]);
  },

  filterByIsDonor(isDonor) {
    if (isDonor === 'Yes') {
      cy.wait(3000);
      cy.do([
        toggleButtonIsDonor.click(),
        donorSection.find(Checkbox('Yes')).click(),
        toggleButtonIsDonor.click(),
      ]);
    } else if (isDonor === 'No') {
      cy.wait(3000);
      cy.do([
        toggleButtonIsDonor.click(),
        donorSection.find(Checkbox('No')).click(),
        toggleButtonIsDonor.click(),
      ]);
    }
  },

  filterByIsVendor(isVendor) {
    cy.wait(3000);
    if (isVendor === 'Yes') {
      cy.do([toggleButtonIsVendor.click(), Checkbox('Yes').click()]);
    } else if (isVendor === 'No') {
      cy.do([toggleButtonIsVendor.click(), Checkbox('No').click()]);
    }
  },

  filterByOrganizationStatus: (status) => {
    cy.wait(2000);
    if (status === 'Active') {
      cy.do(Checkbox('Active').click());
    } else if (status === 'Pending') {
      cy.do(Checkbox('Pending').click());
    } else if (status === 'Inactive') {
      cy.do(Checkbox('Inactive').click());
    }
  },

  verifySearchAndFilterPane() {
    cy.expect([
      toggleOrganizationStatus.exists(),
      toggleOrganizationTypes.exists(),
      toggleOrganizationTags.exists(),
      toggleButtonIsDonor.exists(),
      toggleButtonIsVendor.exists(),
      toggleButtonCountry.exists(),
      toggleButtonLanguage.exists(),
      toggleButtonPaymentMethod.exists(),
      toggleButtonAcquisitionMethod.exists(),
      toggleButtonCreatedBy.exists(),
      toggleButtonDateCreated.exists(),
      toggleButtonUpdatedBy.exists(),
      toggleButtonDateUpdated.exists(),
    ]);
  },

  openCreatedByAccordion() {
    cy.wait(2000);
    cy.then(() => {
      toggleButtonCreatedBy.has({ ariaExpanded: 'false' }).then((isClosed) => {
        if (isClosed) {
          cy.do(toggleButtonCreatedBy.click());
          cy.wait(1000);
        }
      });
    });
  },

  openUpdatedByAccordion() {
    cy.wait(2000);
    cy.then(() => {
      toggleButtonUpdatedBy.has({ ariaExpanded: 'false' }).then((isClosed) => {
        if (isClosed) {
          cy.do(toggleButtonUpdatedBy.click());
          cy.wait(1000);
        }
      });
    });
  },

  openDateUpdatedAccordion() {
    cy.wait(2000);
    cy.then(() => {
      toggleButtonDateUpdated.has({ ariaExpanded: 'false' }).then((isClosed) => {
        if (isClosed) {
          cy.do(toggleButtonDateUpdated.click());
          cy.wait(1000);
        }
      });
    });
  },

  resetFiltersIfActive: () => {
    cy.get('[data-testid="reset-button"]')
      .invoke('is', ':enabled')
      .then((state) => {
        if (state) {
          cy.do(resetButton.click());
          cy.wait(500);
          cy.expect(resetButton.is({ disabled: true }));
        }
      });
  },

  filterByCreator(userName) {
    this.openCreatedByAccordion();
    cy.do([
      Button('Find User').click(),
      TextField({ name: 'query' }).fillIn(userName),
      searchButtonInModal.click(),
    ]);
    cy.wait(2000);
    cy.do(MultiColumnListRow({ index: 0 }).click());
  },

  filterByUpdater(userName) {
    this.openUpdatedByAccordion();
    cy.do([
      Button('Find User').click(),
      TextField({ name: 'query' }).fillIn(userName),
      searchButtonInModal.click(),
    ]);
    cy.wait(2000);
    cy.do(MultiColumnListRow({ index: 0 }).click());
  },

  filterByDateUpdated(startDate, endDate) {
    this.openDateUpdatedAccordion();
    cy.do([
      updatedDateAccordion.find(startDateField).fillIn(startDate),
      updatedDateAccordion.find(endDateField).fillIn(endDate),
      updatedDateAccordion.find(applyButton).click(),
    ]);
    cy.wait(2000);
  },

  filterByCountry(country) {
    cy.wait(3000);
    cy.do([
      toggleButtonCountry.click(),
      Button({ id: 'addresses-selection' }).click(),
      SelectionOption(country).click(),
    ]);
  },

  filterByLanguage(language) {
    cy.wait(3000);
    cy.do([
      toggleButtonLanguage.click(),
      Button({ id: 'language-selection' }).click(),
      SelectionOption(language).click(),
    ]);
  },

  filterByPaymentMethod(paymentMethod) {
    cy.wait(3000);
    cy.do([toggleButtonPaymentMethod.click(), Checkbox(paymentMethod).click()]);
  },
};
