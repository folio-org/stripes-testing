import TopMenu from '../../../support/fragments/topMenu';
import FiscalYears from '../../../support/fragments/finance/fiscalYears/fiscalYears';
import permissions from '../../../support/dictionary/permissions';
import Users from '../../../support/fragments/users/users';
import NewFiscalYear from '../../../support/fragments/finance/fiscalYears/newFiscalYear';

describe('ui-finance: Fiscal Year', () => {
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
    FiscalYears.selectFY(defaultFiscalYear.name);
    FiscalYears.deleteFiscalYearViaActions();
    Users.deleteViaApi(user.userId);
  });

  it(
    'C380514: "UTC" is displayed in "Period begin date" and "Period end date" fields when create or view fiscal year (Orchid +) (thunderjet) (TaaS)',
    { tags: ['criticalPath', 'thunderjet'] },
    () => {
      FiscalYears.createDefaultFiscalYear(defaultFiscalYear);
      FiscalYears.checkCreatedFiscalYear(defaultFiscalYear.name);
    },
  );
});
