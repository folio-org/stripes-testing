import { Button, TextField, Select, KeyValue, Accordion, Pane, Checkbox, MultiColumnList, MultiColumnListCell } from '../../../../interactors';

const buttonNew = Button('New');
const saveAndClose = Button('Save & close');
const summaryAccordionId = 'summarySection';

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
    cy.expect(Pane({ id: 'pane-organization-details' }).exists());
    cy.expect(Accordion({ id: summaryAccordionId }).find(KeyValue({ value: organization.name })).exists());
    cy.expect(Accordion({ id: summaryAccordionId }).find(KeyValue({ value: organization.code })).exists());
  },

  selectActiveStatus: () => {
    cy.do(Checkbox('Active').click());
  },

  checkOrganizationFilter: () => {
    cy.expect(MultiColumnList({ id: 'organizations-list' }).exists());
  },

  chooseOrganizationFromList: (organization) => {
    cy.do(MultiColumnList({ id: 'organizations-list' })
      .find(MultiColumnListCell({ content: organization.name }))
      .click());
  },

  expectcolorFromList: () => {
    cy.get('.mclRow---e3WhT:first-child').should('have.css', 'background-color', 'rgba(0, 0, 0, 0.08)');
  },

  checkOpenOrganizationInfo: (organization) => {
    cy.expect(Pane({ id: 'pane-organization-details' }).exists());
    cy.expect(Accordion({ id: summaryAccordionId }).find(KeyValue({ value: organization.name })).exists());
    cy.expect(Accordion({ id: summaryAccordionId }).find(KeyValue({ value: organization.code })).exists());
  },
};
