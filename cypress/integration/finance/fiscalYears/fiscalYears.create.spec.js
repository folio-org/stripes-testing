import TopMenu from '../../../support/fragments/topMenu';
import NewFiscalYear from '../../../support/fragments/finance/fiscalYears/newFiscalYear';
import FiscalYears from '../../../support/fragments/finance/fiscalYears/fiscalYears';
import getRandomPostfix from '../../../support/utils/stringTools';
import { testType } from '../../../support/utils/tagTools';

describe('ui-finance: Fiscal Year creation', () => {
  before(() => {
    cy.login(Cypress.env('diku_login'), Cypress.env('diku_password'));
    cy.visit(TopMenu.fiscalYearPath);
  });

  it('C4051 should create new fiscal year', { tags: [testType.smoke] }, () => {
    const defaultFiscalYear = { ...NewFiscalYear.defaultFiscalYear };
    FiscalYears.createDefaultFiscalYear(defaultFiscalYear);
    FiscalYears.checkCreatedFiscalYear(defaultFiscalYear.name);
    FiscalYears.deleteFiscalYearViaActions();

    // should not create fund without mandatory fields
    const testFundName = `autotest_fund_${getRandomPostfix()}`;
    FiscalYears.tryToCreateFiscalYearWithoutMandatoryFields(testFundName);
    FiscalYears.searchByName(testFundName);
    FiscalYears.checkZeroSearchResultsHeader();
  });
});
