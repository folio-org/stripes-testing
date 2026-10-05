import FinanceHelp from '../../../../support/fragments/finance/financeHelper';
import FiscalYears from '../../../../support/fragments/finance/fiscalYears/fiscalYears';
import NewFiscalYear from '../../../../support/fragments/finance/fiscalYears/newFiscalYear';
import TopMenu from '../../../../support/fragments/topMenu';
import { parseSanityParameters } from '../../../../support/utils/users';

const { user, memberTenant } = parseSanityParameters();

describe('Fiscal Year', () => {
  const defaultFiscalYear = { ...NewFiscalYear.defaultFiscalYear };
  before(() => {
    cy.setTenant(memberTenant.id);
    cy.getUserToken(user.username, user.password, { log: false });

    cy.allure().logCommandSteps(false);
    cy.login(user.username, user.password, {
      path: TopMenu.fiscalYearPath,
      waiter: FiscalYears.waitLoading,
    });
    cy.allure().logCommandSteps(true);
    FiscalYears.createDefaultFiscalYear(defaultFiscalYear);
    FiscalYears.checkCreatedFiscalYear(defaultFiscalYear.name);
    FiscalYears.closeThirdPane();
  });

  after(() => {
    FiscalYears.deleteFiscalYearViaActions();
  });

  it(
    'C3452 View fiscal year details (thunderjet)',
    { tags: ['dryRun', 'thunderjet', 'C3452'] },
    () => {
      FiscalYears.fiscalYearsDisplay();
      FinanceHelp.searchByName(defaultFiscalYear.name);
      FiscalYears.selectFY(defaultFiscalYear.name);
      FiscalYears.fiscalYearDetailView();
    },
  );
});
