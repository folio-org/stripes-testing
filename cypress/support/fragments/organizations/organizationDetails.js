import { Button, MultiColumnList, MultiColumnListCell, Section } from '../../../../interactors';
import IntegrationViewForm from './integrations/integrationViewForm';

const organizationDetailsSection = Section({ id: 'pane-organization-details' });

// Integration details section
const integrationDetailsSection = Button({
  id: 'accordion-toggle-button-integrationDetailsSection',
});
const addOrganizationIntegrationButton = Button({ id: 'clickable-neworganization-integration' });
const listIntegrationConfigs = MultiColumnList({
  id: 'list-integration-configs',
});

export default {
  waitLoading() {
    cy.expect(organizationDetailsSection.exists());
  },
  addIntegration() {
    cy.do([integrationDetailsSection.click(), addOrganizationIntegrationButton.click()]);
  },
  selectIntegration(integrationName) {
    cy.do([
      integrationDetailsSection.click(),
      listIntegrationConfigs.find(MultiColumnListCell({ content: integrationName })).click(),
    ]);

    IntegrationViewForm.waitLoading();

    return IntegrationViewForm;
  },
};
