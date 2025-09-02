import TopMenu from '../../../support/fragments/topMenu';
import BulkEditSearch from '../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import BulkEditLogs from '../../../support/fragments/bulk-edit/bulk-edit-logs';

describe('fse-bulk-edit - UI (no data manipulation)', () => {
  beforeEach(() => {
    // hide sensitive data from the report
    cy.allure().logCommandSteps(false);
    cy.loginAsAdmin({
      path: TopMenu.bulkEditPath,
      waiter: BulkEditSearch.waitLoading,
    });
    cy.allure().logCommandSteps();
  });

  it(
    `TC195812 - verify that bulk edit page is displayed for ${Cypress.env('OKAPI_HOST')}`,
    { tags: ['sanity', 'fse', 'ui', 'bulk-edit'] },
    () => {
      BulkEditSearch.verifyBulkEditImage();
      // verify logs items
      BulkEditSearch.openLogsSearch();
      BulkEditSearch.verifySetCriteriaPaneSpecificTabs('Identifier', 'Logs');
      BulkEditSearch.verifySpecificTabHighlighted('Logs');
      BulkEditLogs.verifyLogsPane();
    },
  );
});
