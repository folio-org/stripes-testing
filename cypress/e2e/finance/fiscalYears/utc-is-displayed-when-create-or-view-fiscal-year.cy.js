import permissions from '../../../support/dictionary/permissions';
import FiscalYears from '../../../support/fragments/finance/fiscalYears/fiscalYears';
import NewFiscalYear from '../../../support/fragments/finance/fiscalYears/newFiscalYear';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';

describe('Fiscal Year', () => {
  const defaultFiscalYear = { ...NewFiscalYear.defaultFiscalYear };
  let user;
  before(() => {
    cy.getAdminToken();
    cy.createTempUser([permissions.uiFinanceViewEditCreateFiscalYear.gui]).then(
      (userProperties) => {
        user = userProperties;
        cy.login(userProperties.username, userProperties.password, {
          path: TopMenu.fiscalYearPath,
          waiter: FiscalYears.waitLoading,
        });
      },
    );
  });
  after(() => {
    cy.loginAsAdmin({ path: TopMenu.fiscalYearPath, waiter: FiscalYears.waitLoading });
    cy.getAdminToken();
    FiscalYears.selectFY(defaultFiscalYear.name);
    FiscalYears.deleteFiscalYearViaActions();
    Users.deleteViaApi(user.userId);
  });

  it(
    'C380514 "UTC" is displayed in "Period begin date" and "Period end date" fields when create or view fiscal year (Orchid +) (thunderjet) (TaaS)',
    { tags: ['criticalPath', 'thunderjet', 'C380514'] },
    () => {
      FiscalYears.createDefaultFiscalYear(defaultFiscalYear);
      FiscalYears.closeThirdPane();
      FiscalYears.searchByName(defaultFiscalYear.name);
      FiscalYears.selectFisacalYear(defaultFiscalYear.name);
      FiscalYears.checkCreatedFiscalYear(defaultFiscalYear.name);
      FiscalYears.closeThirdPane();
      FiscalYears.resetFilters();
    },
  );
});
