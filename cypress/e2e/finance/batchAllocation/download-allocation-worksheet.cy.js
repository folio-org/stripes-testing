import uuid from 'uuid';
import permissions from '../../../support/dictionary/permissions';
import TopMenu from '../../../support/fragments/topMenu';
import FiscalYears from '../../../support/fragments/finance/fiscalYears/fiscalYears';
import Ledgers from '../../../support/fragments/finance/ledgers/ledgers';
import Funds from '../../../support/fragments/finance/funds/funds';
import Budgets from '../../../support/fragments/finance/budgets/budgets';
import Users from '../../../support/fragments/users/users';
import DateTools from '../../../support/utils/dateTools';
import getRandomPostfix from '../../../support/utils/stringTools';
import BatchEditBudget from '../../../support/fragments/finance/ledgers/batchEditBudget';
import InteractorsTools from '../../../support/utils/interactorsTools';

describe('Finance › Batch allocation', () => {
  let user;
  const fiscalYear1 = { ...FiscalYears.defaultUiFiscalYear };
  const fiscalYear2 = {
    ...FiscalYears.defaultUiFiscalYear,
    name: `${FiscalYears.defaultUiFiscalYear.name}_Next`,
    periodStart: `${DateTools.get5DaysAfterTomorrowDateForFiscalYear()}T00:00:00.000+12:00`,
    periodEnd: `${DateTools.get7DaysAfterTomorrowDateForFiscalYear()}T00:00:00.000+12:00`,
  };
  const ledger = { ...Ledgers.defaultUiLedger };
  const funds = [
    {
      ...Funds.defaultUiFund,
      name: `autotest_fund_A_${getRandomPostfix()}`,
      code: `${getRandomPostfix()}_1`,
    },
    {
      ...Funds.defaultUiFund,
      name: `autotest_fund_B_${getRandomPostfix()}`,
      code: `${getRandomPostfix()}_2`,
    },
    {
      ...Funds.defaultUiFund,
      name: `autotest_fund_C_${getRandomPostfix()}`,
      code: `${getRandomPostfix()}_3`,
    },
    {
      ...Funds.defaultUiFund,
      name: `autotest_fund_D_${getRandomPostfix()}`,
      code: `${getRandomPostfix()}_4`,
    },
  ];

  const budgets = [
    {
      ...Budgets.getDefaultBudget(),
      allocated: 100,
      allowableEncumbrance: 110,
      allowableExpenditure: 110,
    },
    { ...Budgets.getDefaultBudget(), allocated: 200 },
    { ...Budgets.getDefaultBudget(), allocated: 300 },
    {},
  ];
  let fileName1 = '';
  let fileName2 = '';
  let moveAllocationTransaction;

  before('Setup data', () => {
    cy.loginAsAdmin({
      path: TopMenu.fundPath,
      waiter: Funds.waitLoading,
    });

    FiscalYears.createViaApi(fiscalYear1)
      .then((fy1) => {
        fiscalYear1.id = fy1.id;
        ledger.fiscalYearOneId = fy1.id;
        fiscalYear2.code = fiscalYear1.code.slice(0, -1) + '2';
        budgets.forEach((b) => {
          b.fiscalYearId = fy1.id;
        });
        FiscalYears.createViaApi(fiscalYear2).then((fy2) => {
          fiscalYear2.id = fy2.id;
          Ledgers.createViaApi(ledger).then((ledgerResponse) => {
            ledger.id = ledgerResponse.id;
            funds.forEach((fund, idx) => {
              fund.ledgerId = ledger.id;
              Funds.createViaApi(fund).then((fundResp) => {
                fund.id = fundResp.fund.id;
                if (idx < 3) {
                  const budgetToUse = budgets[idx];
                  budgetToUse.fundId = fund.id;
                  Budgets.createViaApi(budgetToUse).then((budgetResp) => {
                    budgetToUse.id = budgetResp.id;
                  });
                }
              });
            });
          });
        });
      })
      .then(() => {
        moveAllocationTransaction = {
          transactionsToCreate: [
            {
              amount: 10.5,
              currency: 'USD',
              fiscalYearId: fiscalYear1.id,
              fromFundId: funds[0].id,
              toFundId: funds[1].id,
              transactionType: 'Allocation',
              source: 'User',
              id: uuid(),
            },
          ],
        };
        return Budgets.batchProcessTransactions(moveAllocationTransaction);
      });

    Funds.searchByName(funds[0].name);
    Funds.selectFund(funds[0].name);
    Funds.selectBudgetDetails();
    Funds.increaseAllocation('10');
    cy.wait(4000);
    Funds.decreaseAllocation('5');
    cy.wait(4000);

    fileName1 = `${fiscalYear2.code}${ledger.code}.csv`;
    fileName2 = `${fiscalYear1.code}${ledger.code}.csv`;

    cy.createTempUser([
      permissions.uiFinanceViewLedger.gui,
      permissions.uiFinanceViewFiscalYear.gui,
    ]).then((userProperties) => {
      user = userProperties;
      cy.login(user.username, user.password, {
        path: TopMenu.ledgerPath,
        waiter: Ledgers.waitLoading,
      });
    });
  });

  after('Clean up', () => {
    cy.getAdminToken();
    Users.deleteViaApi(user.userId);
  });

  it(
    'C648502 Download allocation worksheet (CSV) from Ledger view (thunderjet)',
    { tags: ['criticalPath', 'thunderjet', 'C648502'] },
    () => {
      Ledgers.searchByName(ledger.name);
      Ledgers.selectLedger(ledger.name);
      BatchEditBudget.clickDownloadAllocationWorksheet();
      BatchEditBudget.cancelBatchEditBudget();
      BatchEditBudget.clickDownloadAllocationWorksheet();
      BatchEditBudget.clickConfirmButton();
      InteractorsTools.checkCalloutMessage(
        'Please wait while the worksheet is generated. Your download will start automatically',
      );
      Ledgers.checkColumnNamesInDownloadedLedgerAllocationWorksheet(
        `${fiscalYear2.code}${ledger.code}.csv`,
      );
      Ledgers.deleteDownloadedFile(fileName1);
      BatchEditBudget.clickDownloadAllocationWorksheet();
      BatchEditBudget.selectFiscalYearInConfirmModal(fiscalYear1);
      BatchEditBudget.clickConfirmButton();
      InteractorsTools.checkCalloutMessage(
        'Please wait while the worksheet is generated. Your download will start automatically',
      );
      Ledgers.checkColumnNamesInDownloadedLedgerAllocationWorksheet(
        `${fiscalYear1.code}${ledger.code}.csv`,
      );
      Ledgers.checkLedgerExportRow(
        fileName2,
        { fundName: funds[0].name },
        {
          fiscalYear: fileName1.code,
          fundName: funds[0].name,
          fundCode: funds[0].code,
          fundUUID: funds[0].id,
          fundStatus: 'Active',
          budgetName: budgets[0].name,
          budgetUUID: budgets[0].id,
          budgetStatus: 'Active',
          budgetInitialAllocation: budgets[0].allocated,
          budgetCurrentAllocation: '94.5',
          budgetAllowableEncumbrance: '110',
          budgetAllowableExpenditure: '110',
          allocationAdjustment: '0',
          transactionTag: '',
          transactionDescription: '',
        },
      );
      Ledgers.checkLedgerExportRow(
        fileName2,
        { fundName: funds[1].name },
        {
          fiscalYear: fileName1.code,
          fundName: funds[1].name,
          fundCode: funds[1].code,
          fundUUID: funds[1].id,
          fundStatus: 'Active',
          budgetName: budgets[1].name,
          budgetUUID: budgets[1].id,
          budgetStatus: 'Active',
          budgetInitialAllocation: budgets[1].allocated,
          budgetCurrentAllocation: '210.5',
          budgetAllowableEncumbrance: '100',
          budgetAllowableExpenditure: '100',
          allocationAdjustment: '0',
          transactionTag: '',
          transactionDescription: '',
        },
      );
      Ledgers.checkLedgerExportRow(
        fileName2,
        { fundName: funds[2].name },
        {
          fiscalYear: fileName1.code,
          fundName: funds[2].name,
          fundCode: funds[2].code,
          fundUUID: funds[2].id,
          fundStatus: 'Active',
          budgetName: budgets[2].name,
          budgetUUID: budgets[2].id,
          budgetStatus: 'Active',
          budgetInitialAllocation: budgets[2].allocated,
          budgetCurrentAllocation: '300',
          budgetAllowableEncumbrance: '100',
          budgetAllowableExpenditure: '100',
          allocationAdjustment: '0',
          transactionTag: '',
          transactionDescription: '',
        },
      );
      Ledgers.checkLedgerExportRow(
        fileName2,
        { fundName: funds[3].name },
        {
          fiscalYear: fileName1.code,
          fundName: funds[3].name,
          fundCode: funds[3].code,
          fundUUID: funds[3].id,
          fundStatus: 'Active',
          budgetName: '',
          budgetUUID: '',
          budgetStatus: '',
          budgetInitialAllocation: '',
          budgetCurrentAllocation: '',
          budgetAllowableEncumbrance: '',
          budgetAllowableExpenditure: '',
          allocationAdjustment: '0',
          transactionTag: '',
          transactionDescription: '',
        },
      );
      Ledgers.deleteDownloadedFile(fileName2);
    },
  );
});
