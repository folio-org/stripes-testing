import TopMenu from '../../../support/fragments/topMenu';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import Modals from '../../../support/fragments/modals';
import { Localization } from '../../../support/fragments/settings/tenant/general';
import Reporting, { REPORTING_NAV_ITEMS } from '../../../support/fragments/reporting/reporting';
import { APPLICATION_NAMES } from '../../../support/constants';

// Tables preferred for query checks: MetaDB first, then LDP Classic. Falls back to the first table returned.
const PREFERRED_TABLES = [
  { tableSchema: 'folio_users', tableName: 'users__t' },
  { tableSchema: 'public', tableName: 'user_users' },
];

describe('fse-ldp-reporting - UI (no data manipulation)', () => {
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
    `FDOPS-7546 - verify Reporting app is displayed for ${Cypress.config('baseUrl')} - ${Cypress.env('OKAPI_TENANT')}`,
    { tags: ['ldp', 'fse', 'ui', 'reporting', 'FDOPS-7546'] },
    () => {
      TopMenuNavigation.openApp(APPLICATION_NAMES.REPORTING);
      Reporting.waitLoading();
      Reporting.verifyNavItemsDisplayed();
      Reporting.openNavItem(REPORTING_NAV_ITEMS.BUILD_QUERY);
      Reporting.verifyQueryBuilderDisplayed();
    },
  );

  it(
    `FDOPS-7547 - verify Reporting database info is displayed for ${Cypress.config('baseUrl')} - ${Cypress.env('OKAPI_TENANT')}`,
    { tags: ['ldp', 'fse', 'ui', 'reporting', 'FDOPS-7547'] },
    () => {
      TopMenuNavigation.openApp(APPLICATION_NAMES.REPORTING);
      Reporting.waitLoading();
      Reporting.openNavItem(REPORTING_NAV_ITEMS.DATABASE_INFO);
      Reporting.verifyDatabaseInfoDisplayed();
      Reporting.verifyResultsListDisplayed();
    },
  );
});

describe('fse-ldp-reporting - UI (data manipulation)', () => {
  let reportingTable = null;

  before('Find a reporting table to query', () => {
    cy.allure().logCommandSteps(false);
    cy.getAdminToken();
    cy.getLdpTables({ failOnStatusCode: false }).then((response) => {
      if (response.status === 200 && Array.isArray(response.body) && response.body.length) {
        const tables = response.body;
        reportingTable =
          PREFERRED_TABLES.find(({ tableSchema, tableName }) => {
            return tables.some((t) => t.tableSchema === tableSchema && t.tableName === tableName);
          }) || tables[0];
      }
    });
    cy.loginAsAdmin({
      path: TopMenu.reportingPath,
      waiter: Reporting.waitLoading,
    });
    cy.allure().logCommandSteps();
  });

  it(
    `FDOPS-7548 - verify query can be built and submitted in Reporting app for ${Cypress.config('baseUrl')} - ${Cypress.env('OKAPI_TENANT')}`,
    { tags: ['nonProd', 'fse', 'ui', 'reporting', 'ldp', 'FDOPS-7548'] },
    () => {
      if (!reportingTable) {
        cy.log('Reporting DB is not configured for this tenant, skipping test');
        return;
      }
      // query is only submitted (read-only SELECT), it is not saved
      Reporting.openNavItem(REPORTING_NAV_ITEMS.BUILD_QUERY);
      Reporting.verifyQueryBuilderDisplayed();
      Reporting.selectTable(reportingTable.tableSchema, reportingTable.tableName);
      Reporting.submitQuery();
      Reporting.verifyResultsDisplayed();
    },
  );
});
