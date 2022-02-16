import { Button, TextField, Select, KeyValue, Accordion, Pane } from '../../../../interactors';

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
  }
};
