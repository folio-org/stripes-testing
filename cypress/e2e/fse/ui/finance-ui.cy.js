import FiscalYears from '../../../support/fragments/finance/fiscalYears/fiscalYears';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import { Localization } from '../../../support/fragments/settings/tenant/general';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import { APPLICATION_NAMES } from '../../../support/constants';
import FinanceHelp from '../../../support/fragments/finance/financeHelper';

describe('fse-finance - UI (no data manipulation)', () => {
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
    `TC195278 - verify that finance-fiscal year is displayed for ${Cypress.env('OKAPI_HOST')}`,
    { tags: ['sanity', 'fse', 'ui', 'finance', 'TC195278'] },
    () => {
      TopMenuNavigation.openAppFromDropdown(APPLICATION_NAMES.FINANCE);
      FinanceHelp.selectFiscalYearsNavigation();
      FiscalYears.waitLoading();
      // run basic search
      FiscalYears.searchByName('F');
      FiscalYears.fiscalYearsDisplay();
    },
  );
});
