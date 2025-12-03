import permissions from '../../../support/dictionary/permissions';
import Budgets from '../../../support/fragments/finance/budgets/budgets';
import FinanceHelp from '../../../support/fragments/finance/financeHelper';
import FiscalYears from '../../../support/fragments/finance/fiscalYears/fiscalYears';
import Funds from '../../../support/fragments/finance/funds/funds';
import Ledgers from '../../../support/fragments/finance/ledgers/ledgers';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';

describe('Funds', () => {
  const defaultFiscalYear = { ...FiscalYears.defaultUiFiscalYear };
  const defaultLedger = { ...Ledgers.defaultUiLedger };
  const firstFund = { ...Funds.defaultUiFund };
  const defaultBudget = {
    ...Budgets.getDefaultBudget(),
    allocated: 1000,
  };
  let user;

  before(() => {
    cy.getAdminToken();

    FiscalYears.createViaApi(defaultFiscalYear).then((fiscalYearResponse) => {
      defaultFiscalYear.id = fiscalYearResponse.id;
      defaultBudget.fiscalYearId = fiscalYearResponse.id;
      defaultLedger.fiscalYearOneId = defaultFiscalYear.id;

      Ledgers.createViaApi(defaultLedger).then((ledgerResponse) => {
        defaultLedger.id = ledgerResponse.id;
        firstFund.ledgerId = defaultLedger.id;

        Funds.createViaApi(firstFund).then((fundResponse) => {
          firstFund.id = fundResponse.fund.id;
          defaultBudget.fundId = fundResponse.fund.id;
          Budgets.createViaApi(defaultBudget);
        });
      });
    });

    cy.createTempUser([permissions.uiFinanceViewEditCreateFundAndBudget.gui]).then(
      (userProperties) => {
        user = userProperties;
        cy.waitForAuthRefresh(() => {
          cy.login(userProperties.username, userProperties.password, {
            path: TopMenu.fundPath,
            waiter: Funds.waitLoading,
          });
          cy.reload();
          Funds.waitLoading();
        }, 20_000);
      },
    );
  });

  after(() => {
    cy.getAdminToken();
    Budgets.deleteViaApi(defaultBudget.id);
    Funds.deleteFundViaApi(firstFund.id);
    Ledgers.deleteLedgerViaApi(defaultLedger.id);
    FiscalYears.deleteFiscalYearViaApi(defaultFiscalYear.id);
    Users.deleteViaApi(user.userId);
  });

  it(
    'C380709 Filter in "Status" fields works correctly when creating and editing fund (thunderjet)',
    { tags: ['criticalPath', 'thunderjet', 'eurekaPhase1', 'C380709'] },
    () => {
      const fundEditForm = Funds.clickCreateNewFundButton();
      fundEditForm.checkButtonsConditions([
        { label: 'Cancel', conditions: { disabled: false } },
        { label: 'Save & close', conditions: { disabled: true } },
      ]);

      fundEditForm.changeStatusAndCancelWithoutSaving(FinanceHelp.statusFrozen);
      Funds.waitLoading();

      FinanceHelp.searchByName(firstFund.name);
      Funds.selectFund(firstFund.name);
      Funds.waitForFundDetailsLoading();
      Funds.checkFundStatus(FinanceHelp.statusActive);

      Funds.editFund();
      fundEditForm.changeStatusAndCancelWithoutSaving(FinanceHelp.statusFrozen);

      Funds.waitForFundDetailsLoading();
      Funds.checkFundStatus(FinanceHelp.statusActive);
    },
  );
});
