import SettingsMenu from '../../../support/fragments/settingsMenu';
import MosaicSettings from '../../../support/fragments/settings/mosaic/mosaicSettings';
import Modals from '../../../support/fragments/modals';

describe('fse-mosaic - UI (no data manipulation)', () => {
  beforeEach(() => {
    // hide sensitive data from the report
    cy.allure().logCommandSteps(false);
    cy.loginAsAdmin({
      path: SettingsMenu.mosaicSettingsConfigPath,
      waiter: MosaicSettings.waitLoading,
    });
    cy.allure().logCommandSteps();
    // close service point modal if it appears after login
    Modals.closeModalWithEscapeIfAny();
  });

  it(
    `FDOPS-6314 - Verify Mosaic integration Configuration options default order template for ${Cypress.config('baseUrl')} - ${Cypress.env('OKAPI_TENANT')}`,
    { tags: ['sanity', 'fse', 'ui', 'mosaic', 'FDOPS-6314'] },
    () => {
      MosaicSettings.waitLoading();
      MosaicSettings.verifyDefaultOrderTemplateSelected('Mosaic eBooks Default');
    },
  );
});
