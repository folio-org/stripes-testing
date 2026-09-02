import SettingsMenu from '../../../support/fragments/settingsMenu';
import OaiPmhPane, { SECTIONS } from '../../../support/fragments/settings/oai-pmh/oaipmhPane';
import SettingsGeneral from '../../../support/fragments/settings/oai-pmh/general';
import Modals from '../../../support/fragments/modals';

describe('fse-oai-pmh - UI (no data manipulation)', () => {
  beforeEach(() => {
    // hide sensitive data from the report
    cy.allure().logCommandSteps(false);
    cy.loginAsAdmin({
      path: SettingsMenu.oaiPmhPath,
      waiter: OaiPmhPane.waitLoading,
    });
    cy.allure().logCommandSteps();
    // close service point modal if it appears after login
    Modals.closeModalWithEscapeIfAny();
  });

  it(
    `FDOPS-6192 - verify OAI-PMH general settings for ${Cypress.config('baseUrl')} - ${Cypress.env('OKAPI_TENANT')}`,
    { tags: ['fse', 'ui', 'oai-pmh', 'sanity', 'FDOPS-6192'] },
    () => {
      OaiPmhPane.selectSection(SECTIONS.GENERAL);
      SettingsGeneral.verifyCheckEnableOaiServiceCheckbox(true, true);
      SettingsGeneral.verifyWarningBanner();
    },
  );
});
