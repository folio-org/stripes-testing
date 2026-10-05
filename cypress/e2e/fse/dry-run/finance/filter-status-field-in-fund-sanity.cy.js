import Budgets from '../../../../support/fragments/finance/budgets/budgets';
import FinanceHelp from '../../../../support/fragments/finance/financeHelper';
import FiscalYears from '../../../../support/fragments/finance/fiscalYears/fiscalYears';
import Funds from '../../../../support/fragments/finance/funds/funds';
import Ledgers from '../../../../support/fragments/finance/ledgers/ledgers';
import TopMenu from '../../../../support/fragments/topMenu';
import { parseSanityParameters } from '../../../../support/utils/users';

const { user, memberTenant } = parseSanityParameters();

describe('Funds', () => {
  const defaultFiscalYear = { ...FiscalYears.defaultUiFiscalYear };
  const defaultLedger = { ...Ledgers.defaultUiLedger };
  const firstFund = { ...Funds.defaultUiFund };
  const defaultBudget = {
    ...Budgets.getDefaultBudget(),
    allocated: 1000,
  };

  before(() => {
    cy.setTenant(memberTenant.id);
    cy.getUserToken(user.username, user.password, { log: false });

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

    cy.allure().logCommandSteps(false);
    cy.login(user.username, user.password, {
      path: TopMenu.fundPath,
      waiter: Funds.waitLoading,
    });
    cy.allure().logCommandSteps(true);
  });

  after(() => {
    cy.setTenant(memberTenant.id);
    cy.getUserToken(user.username, user.password, { log: false });
    Budgets.deleteViaApi(defaultBudget.id);
    Funds.deleteFundViaApi(firstFund.id);
    Ledgers.deleteLedgerViaApi(defaultLedger.id);
    FiscalYears.deleteFiscalYearViaApi(defaultFiscalYear.id);
  });

  it(
    'C380709 Filter in "Status" fields works correctly when creating and editing fund (thunderjet)',
    { tags: ['dryRun', 'thunderjet', 'C380709'] },
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
