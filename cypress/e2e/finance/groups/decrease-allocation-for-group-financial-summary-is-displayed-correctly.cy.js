import permissions from '../../../support/dictionary/permissions';
import FiscalYears from '../../../support/fragments/finance/fiscalYears/fiscalYears';
import Funds from '../../../support/fragments/finance/funds/funds';
import Ledgers from '../../../support/fragments/finance/ledgers/ledgers';
import TopMenu from '../../../support/fragments/topMenu';
import getRandomPostfix from '../../../support/utils/stringTools';
import Budgets from '../../../support/fragments/finance/budgets/budgets';
import Groups from '../../../support/fragments/finance/groups/groups';
import FinanceHelp from '../../../support/fragments/finance/financeHelper';
import Users from '../../../support/fragments/users/users';

describe('Finance: Groups', () => {
  const firstFiscalYear = { ...FiscalYears.defaultUiFiscalYear };
  const defaultLedger = { ...Ledgers.defaultUiLedger };
  const firstFund = { ...Funds.defaultUiFund };
  const secondFund = {
    name: `autotest_fund2_${getRandomPostfix()}`,
    code: getRandomPostfix(),
    externalAccountNo: getRandomPostfix(),
    fundStatus: 'Active',
    description: `This is fund created by E2E test automation script_${getRandomPostfix()}`,
  };
  const defaultGroup = { ...Groups.defaultUiGroup };

  const firstBudget = {
    ...Budgets.getDefaultBudget(),
    allocated: 0,
  };

  const secondBudget = {
    ...Budgets.getDefaultBudget(),
    allocated: 100,
  };
  let user;

  before(() => {
    cy.getAdminToken();
    FiscalYears.createViaApi(firstFiscalYear).then((firstFiscalYearResponse) => {
      firstFiscalYear.id = firstFiscalYearResponse.id;
      firstBudget.fiscalYearId = firstFiscalYearResponse.id;
      secondBudget.fiscalYearId = firstFiscalYearResponse.id;
      defaultLedger.fiscalYearOneId = firstFiscalYear.id;
      Ledgers.createViaApi(defaultLedger).then((ledgerResponse) => {
        defaultLedger.id = ledgerResponse.id;
        firstFund.ledgerId = defaultLedger.id;
        secondFund.ledgerId = defaultLedger.id;
        Groups.createViaApi(defaultGroup).then((firstGroupResponse) => {
          defaultGroup.id = firstGroupResponse.id;
        });
        Funds.createViaApi(firstFund).then((fundResponse) => {
          firstFund.id = fundResponse.fund.id;
          firstBudget.fundId = fundResponse.fund.id;
          Budgets.createViaApi(firstBudget);

          Funds.createViaApi(secondFund).then((secondFundResponse) => {
            secondFund.id = secondFundResponse.fund.id;
            secondBudget.fundId = secondFundResponse.fund.id;
            Budgets.createViaApi(secondBudget);

            cy.loginAsAdmin({ path: TopMenu.fundPath, waiter: Funds.waitLoading });
            FinanceHelp.searchByName(secondFund.name);
            Funds.selectFund(secondFund.name);
            Funds.addTransferTo(firstFund.name);
            Funds.addGroupToFund(defaultGroup.name);
            Funds.closeFundDetails();
            FinanceHelp.searchByName(firstFund.name);
            Funds.selectFund(firstFund.name);
            Funds.addTransferFrom(secondFund.name);
          });
        });
      });
    });
    cy.createTempUser([
      permissions.uiFinanceCreateAllocations.gui,
      permissions.uiFinanceViewFundAndBudget.gui,
      permissions.uiFinanceViewGroups.gui,
    ]).then((userProperties) => {
      user = userProperties;
      cy.login(userProperties.username, userProperties.password, {
        path: TopMenu.fundPath,
        waiter: Funds.waitLoading,
      });
    });
  });

  after(() => {
    cy.getAdminToken();
    Users.deleteViaApi(user.userId);
  });

  it(
    'C445994 Decrease allocation for group financial summary is displayed correctly (thunderjet)',
    { tags: ['criticalPath', 'thunderjet', 'C445994'] },
    () => {
      FinanceHelp.searchByName(firstFund.name);
      Funds.selectFund(firstFund.name);
      Funds.selectBudgetDetails();
      const amount = '10';

      Funds.openMoveAllocationModal();
      Funds.fillInAllAllocationFields(firstFund, secondFund, amount);
      Funds.closeBudgetDetails();
      Funds.closeFundDetails();
      Funds.clickOnGroupTab();
      FinanceHelp.searchByName(defaultGroup.name);
      Groups.selectGroup(defaultGroup.name);
      Groups.checkFinancialSummary({
        summary: [
          { key: 'Initial allocation', value: '$100.00' },
          { key: 'Increase in allocation', value: '$0.00' },
          { key: 'Decrease in allocation', value: '$10.00' },
          { key: 'Total allocated', value: '$90.00' },
          { key: 'Net transfers', value: '$0.00' },
          { key: 'Total funding', value: '$90.00' },
        ],
      });
    },
  );
});
