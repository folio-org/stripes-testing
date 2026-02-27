import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import { APPLICATION_NAMES } from '../../../support/constants';
import BulkEditSearch from '../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import BulkEditLogs from '../../../support/fragments/bulk-edit/bulk-edit-logs';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import { Localization } from '../../../support/fragments/settings/tenant/general';
import Modals from '../../../support/fragments/modals';

describe('fse-bulk-edit - UI (no data manipulation)', () => {
  beforeEach(() => {
    // hide sensitive data from the report
    cy.allure().logCommandSteps(false);
    cy.loginAsAdmin({
      path: SettingsMenu.sessionLocalePath,
      waiter: Localization.americanEnglishButtonWaitLoading,
    });
    cy.allure().logCommandSteps();
    // close service point modal if it appears after login
    Modals.closeModalWithEscapeIfAny();
    // change session locale to English (temporary action, won't affect tenant settings)
    Localization.selectAmericanEnglish();
    // close service point modal if it appears switching locale
    Modals.closeModalWithEscapeIfAny();
  });

  it(
    `TC195812 - verify that bulk edit page is displayed for ${Cypress.env('OKAPI_HOST')}`,
    { tags: ['sanity', 'fse', 'ui', 'bulk-edit', 'TC195812'] },
    () => {
      TopMenuNavigation.openAppFromDropdown(APPLICATION_NAMES.BULK_EDIT);
      BulkEditSearch.waitLoading();
      BulkEditSearch.verifyBulkEditImage();
      // verify logs items
      BulkEditSearch.openLogsSearch();
      BulkEditSearch.verifySetCriteriaPaneSpecificTabs('Identifier', 'Logs');
      BulkEditSearch.verifySpecificTabHighlighted('Logs');
      BulkEditLogs.verifyLogsPane();
    },
  );
});
