import { Button, MultiColumnList, MultiColumnListCell, Section } from '../../../../interactors';
import { DEFAULT_WAIT_TIME } from '../../constants';
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
  waitLoading(ms = DEFAULT_WAIT_TIME) {
    cy.wait(ms);
    cy.expect(organizationDetailsSection.exists());
  },
  organizationDetailsSectionIsAbsent() {
    cy.expect(organizationDetailsSection.absent());
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
