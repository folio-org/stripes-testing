import { Button, TextField, Select, KeyValue, Accordion, Pane, Checkbox, MultiColumnList, MultiColumnListCell, SearchField, MultiColumnListRow } from '../../../../interactors';

const buttonNew = Button('New');
const saveAndClose = Button('Save & close');
const summaryAccordionId = 'summarySection';
const organizationDetails = Pane({ id: 'pane-organization-details' });
const organizationsList = MultiColumnList({ id: 'organizations-list' });
const blueColor = 'rgba(0, 0, 0, 0)';
const summarySection = Accordion({ id: summaryAccordionId });
const searchInput = SearchField({ id: 'input-record-search' });

export default {
  createOrganizationViaUi: (organization) => {
    cy.expect(buttonNew.exists());
    cy.do([
      buttonNew.click(),
      Select('Organization status*').choose(organization.status),
      TextField('Name*').fillIn(organization.name),
      TextField('Code*').fillIn(organization.code),
      saveAndClose.click()
    ]);
  },

  checkCreatedOrganization: (organization) => {
    cy.expect(organizationDetails.exists());
    cy.expect(summarySection.find(KeyValue({ value: organization.name })).exists());
    cy.expect(summarySection.find(KeyValue({ value: organization.code })).exists());
  },

  selectActiveStatus: () => {
    cy.do(Checkbox('Active').click());
  },

  checkOrganizationFilter: () => {
    cy.expect(organizationsList.exists());
  },

  chooseOrganizationFromList: (organization) => {
    cy.do(organizationsList
      .find(MultiColumnListCell({ content: organization.name }))
      .click());
  },

  expectColorFromList: () => {
    cy.get('#organizations-list').should('have.css', 'background-color', blueColor);
  },

  checkOpenOrganizationInfo: (organization) => {
    cy.expect(organizationDetails.exists());
    cy.expect(summarySection.find(KeyValue({ value: organization.name })).exists());
    cy.expect(summarySection.find(KeyValue({ value: organization.code })).exists());
  },
  searchByParameters: (parameter, value) => {
    cy.do([
      searchInput.selectIndex(parameter),
      searchInput.fillIn(value),
      Button('Search').click(),
    ]);
  },

  resetFilters: () => {
    cy.do(Button('Reset all').click());
  },

  checkSearchResults: (organization) => {
    cy.expect(organizationsList
      .find(MultiColumnListRow({ index: 0 }))
      .find(MultiColumnListCell({ columnIndex: 0 }))
      .has({ content: organization.name }));
  },
};
