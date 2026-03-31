import FiscalYears from '../../../support/fragments/finance/fiscalYears/fiscalYears';
import Funds from '../../../support/fragments/finance/funds/funds';
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
    // close service point modal if it appears after login
    Modals.closeModalWithEscapeIfAny();
    // change session locale to English (temporary action, won't affect tenant settings)
    Localization.selectAmericanEnglish();
    // close service point modal if it appears switching locale
    Modals.closeModalWithEscapeIfAny();
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

  it(
    `TC196320 - verify that finance-funds search is displayed for ${Cypress.env('OKAPI_HOST')}`,
    { tags: ['sanity', 'fse', 'ui', 'finance', 'TC196320'] },
    () => {
      TopMenuNavigation.openAppFromDropdown(APPLICATION_NAMES.FINANCE);
      FinanceHelp.selectFundsNavigation();
      Funds.waitLoading();
      Funds.searchByName('*');
      cy.get('body').then(($body) => {
        if ($body.find('#funds-list').length) {
          cy.get('#funds-list').should('be.visible');
        } else {
          cy.log(`No funds found on ${Cypress.env('OKAPI_HOST')} - results pane is empty`);
        }
      });
    },
  );
});
