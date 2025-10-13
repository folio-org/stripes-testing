import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import { APPLICATION_NAMES } from '../../../support/constants';
import BulkEditSearch from '../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import BulkEditLogs from '../../../support/fragments/bulk-edit/bulk-edit-logs';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import { Localization } from '../../../support/fragments/settings/tenant/general';

describe('fse-bulk-edit - UI (no data manipulation)', () => {
  beforeEach(() => {
    // hide sensitive data from the report
    cy.allure().logCommandSteps(false);
    cy.loginAsAdmin({
      path: SettingsMenu.sessionLocalePath,
      waiter: Localization.americanEnglishButtonWaitLoading,
    });
    cy.allure().logCommandSteps();
    // change session locale to English (temporary action, won't affect tenant settings)
    Localization.selectAmericanEnglish();
  });

  it(
    `TC195812 - verify that bulk edit page is displayed for ${Cypress.env('OKAPI_HOST')}`,
    { tags: ['sanity', 'fse', 'ui', 'bulk-edit'] },
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
