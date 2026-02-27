import FiscalYears from '../../../support/fragments/finance/fiscalYears/fiscalYears';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import { Localization } from '../../../support/fragments/settings/tenant/general';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import { APPLICATION_NAMES } from '../../../support/constants';
import FinanceHelp from '../../../support/fragments/finance/financeHelper';
import Modals from '../../../support/fragments/modals';

describe('fse-finance - UI (no data manipulation)', () => {
  beforeEach(() => {
    // hide sensitive data from the report
    cy.allure().logCommandSteps(false);
    cy.loginAsAdmin({
      path: SettingsMenu.sessionLocalePath,
      waiter: Localization.americanEnglishButtonWaitLoading,
    });
    cy.allure().logCommandSteps();
    cy.wait(3000);
    // close service point modal if it appears after login
    Modals.closeModalWithEscapeIfAny();
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
