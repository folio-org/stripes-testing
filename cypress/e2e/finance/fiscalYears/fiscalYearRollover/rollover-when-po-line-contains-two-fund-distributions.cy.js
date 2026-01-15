import { Permissions } from '../../../../support/dictionary';
import {
  FinanceHelper,
  FiscalYears,
  Funds,
  FundDetails,
  Budgets,
  Ledgers,
  LedgerRolloverInProgress,
  Transactions,
} from '../../../../support/fragments/finance';
import { NewOrganization, Organizations } from '../../../../support/fragments/organizations';
import { NewOrder, BasicOrderLine, Orders } from '../../../../support/fragments/orders';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import { CodeTools, StringTools } from '../../../../support/utils';
import FileManager from '../../../../support/utils/fileManager';

describe('Finance', () => {
  describe('Fiscal Year Rollover', () => {
    const date = new Date();
    const code = CodeTools(4);
    const fiscalYears = {
      current: {
        ...FiscalYears.getDefaultFiscalYear(),
        code: `${code}${StringTools.randomTwoDigitNumber()}01`,
        periodStart: new Date(date.getFullYear(), 0, 1),
        periodEnd: new Date(date.getFullYear(), 11, 31),
      },
      next: {
        ...FiscalYears.getDefaultFiscalYear(),
        code: `${code}${StringTools.randomTwoDigitNumber()}02`,
        periodStart: new Date(date.getFullYear() + 1, 0, 1),
        periodEnd: new Date(date.getFullYear() + 1, 11, 31),
      },
    };
    const ledgers = {
      first: { ...Ledgers.getDefaultLedger(), fiscalYearOneId: fiscalYears.current.id },
      second: { ...Ledgers.getDefaultLedger(), fiscalYearOneId: fiscalYears.current.id },
    };
    const funds = {
      first: { ...Funds.getDefaultFund(), ledgerId: ledgers.first.id },
      second: { ...Funds.getDefaultFund(), ledgerId: ledgers.second.id },
    };
    const budgets = {
      first: {
        ...Budgets.getDefaultBudget(),
        allocated: 100,
        fiscalYearId: fiscalYears.current.id,
        fundId: funds.first.id,
      },
      second: {
        ...Budgets.getDefaultBudget(),
        allocated: 100,
        fiscalYearId: fiscalYears.current.id,
        fundId: funds.second.id,
      },
    };
    const testData = {
      fileName: `*-rollover-errors-${fiscalYears.next.code}.csv`,
      organization: NewOrganization.getDefaultOrganization(),
      orders: [],
      orderLines: [],
      user: {},
    };

    before('Create test data', () => {
      cy.getAdminToken().then(() => {
        Object.values(fiscalYears).forEach((fiscalYear) => {
          FiscalYears.createViaApi(fiscalYear);
        });
        Object.values(ledgers).forEach((ledger) => {
          Ledgers.createViaApi(ledger);
        });
        Object.values(funds).forEach((fund) => {
          Funds.createViaApi(fund);
        });
        Object.values(budgets).forEach((budget) => {
          Budgets.createViaApi(budget);
        });

        Organizations.createOrganizationViaApi(testData.organization).then(() => {
          [
            {
              order: {
                ...NewOrder.getDefaultOrder({ vendorId: testData.organization.id }),
                reEncumber: true,
              },
              orderLine: BasicOrderLine.getDefaultOrderLine({
                listUnitPrice: 10,
                fundDistribution: [{ code: funds.first.code, fundId: funds.first.id, value: 100 }],
              }),
            },
            {
              order: {
                ...NewOrder.getDefaultOrder({ vendorId: testData.organization.id }),
                reEncumber: true,
              },
              orderLine: BasicOrderLine.getDefaultOrderLine({
                listUnitPrice: 15,
                fundDistribution: [
                  { code: funds.second.code, fundId: funds.second.id, value: 100 },
                ],
              }),
            },
            {
              order: {
                ...NewOrder.getDefaultOrder({ vendorId: testData.organization.id }),
                reEncumber: true,
              },
              orderLine: BasicOrderLine.getDefaultOrderLine({
                listUnitPrice: 50,
                fundDistribution: [
                  { code: funds.first.code, fundId: funds.first.id, value: 60 },
                  { code: funds.second.code, fundId: funds.second.id, value: 40 },
                ],
              }),
            },
          ].forEach(({ order, orderLine }) => {
            Orders.createOrderWithOrderLineViaApi(order, orderLine).then((response) => {
              testData.orders.push(response);

              Orders.updateOrderViaApi({ ...response, workflowStatus: 'Open' });
            });
          });
        });
      });

      cy.createTempUser([
        Permissions.uiFinanceExecuteFiscalYearRollover.gui,
        Permissions.uiFinanceViewFiscalYear.gui,
        Permissions.uiFinanceViewFundAndBudget.gui,
        Permissions.uiFinanceViewLedger.gui,
      ]).then((userProperties) => {
        testData.user = userProperties;

        cy.login(testData.user.username, testData.user.password, {
          path: TopMenu.ledgerPath,
          waiter: Ledgers.waitForLedgerDetailsLoading,
        });
      });
    });

    after('Delete test data', () => {
      FileManager.deleteFileFromDownloadsByMask(testData.fileName);

      cy.getAdminToken().then(() => {
        Organizations.deleteOrganizationViaApi(testData.organization.id);
        Users.deleteViaApi(testData.user.userId);
      });
    });

    it(
      'C397990 Rollover when PO line contains two fund distributions related to different ledgers and same fiscal year (thunderjet) (TaaS)',
      { tags: ['extendedPath', 'thunderjet', 'C397990'] },
      () => {
        // Click on Ledger name link from preconditions
        FinanceHelper.searchByName(ledgers.first.name);
        const LedgerDetails = Ledgers.selectLedger(ledgers.first.name);
        LedgerDetails.checkLedgerDetails({
          information: [{ key: 'Fiscal year', value: fiscalYears.current.code }],
        });

        // Click "Actions" button, Select "Rollover" option
        const LedgerRolloverDetails = LedgerDetails.openLedgerRolloverEditForm();
        LedgerRolloverDetails.checkLedgerRolloverDetails({ fiscalYear: fiscalYears.current.code });

        // Fill ledger rollover fields
        LedgerRolloverDetails.fillLedgerRolloverFields({
          fiscalYear: fiscalYears.next.code,
          rolloverBudgets: [{ checked: true, rolloverBudget: 'None', rolloverValue: 'Allocation' }],
          rolloverEncumbrance: {
            oneTime: { checked: true, basedOn: 'Initial encumbrance' },
          },
        });

        // Click "Rollover" button, Click "Continue" button, Click "Confirm" button
        LedgerRolloverDetails.clickRolloverButton();
        LedgerRolloverInProgress.checkLedgerRolloverInProgressDetails({ successful: false });

        // Click "<Ledger name>-rollover-errors-<Fiscal year #2>.csv" link
        LedgerRolloverInProgress.clickRolloverErrorLink();

        // Open downloaded file, Check *"Encumbered (Budget)"* column
        FileManager.convertCsvToJson(testData.fileName).then((data) => {
          const rolloverError = data[0];
          const expectedError = `[WARNING] Part of the encumbrances belong to the ledger, which has not been rollovered. Ledgers to rollover: ${ledgers.second.name} (id=${ledgers.second.id})`;

          cy.expect(rolloverError['Error message']).to.equal(expectedError);
        });

        // Go back to "Ledger name" pane
        cy.visit(`${TopMenu.ledgerPath}/${ledgers.first.id}/view`);
        LedgerRolloverInProgress.clickCloseAndViewLedgerButton();

        // Click **"Fund A"** record in "Fund" accordion
        LedgerDetails.openFundDetails(funds.first.name);
        FundDetails.checkFundDetails({ plannedBudgets: [{ unavailable: '$10.00' }] });

        // Go back to "Ledger name" pane, Open "Ledger #2" details pane
        cy.visit(`${TopMenu.ledgerPath}/${ledgers.second.id}/view`);
        LedgerDetails.checkLedgerDetails({
          information: [{ key: 'Fiscal year', value: fiscalYears.current.code }],
        });

        // Click "Actions" button, Select "Rollover" option
        LedgerDetails.openLedgerRolloverEditForm();
        LedgerRolloverDetails.checkLedgerRolloverDetails({ fiscalYear: fiscalYears.current.code });

        // Fill ledger rollover fields
        LedgerRolloverDetails.fillLedgerRolloverFields({
          fiscalYear: fiscalYears.next.code,
          rolloverBudgets: [{ checked: true, rolloverBudget: 'None', rolloverValue: 'Allocation' }],
          rolloverEncumbrance: {
            oneTime: { checked: true, basedOn: 'Initial encumbrance' },
          },
        });

        // Click "Rollover" button, Click "Continue" button, Click "Confirm" button
        LedgerRolloverDetails.clickRolloverButton();
        LedgerRolloverInProgress.checkLedgerRolloverInProgressDetails({ successful: true });

        // Click "Close & view ledger details" button
        LedgerRolloverInProgress.clickCloseAndViewLedgerButton();

        // Click **"Fund B"** record in "Fund" accordion
        LedgerDetails.openFundDetails(funds.second.name);
        FundDetails.checkFundDetails({ plannedBudgets: [{ unavailable: '$35.00' }] });

        // Open **"Fund A"** details pane
        cy.visit(`${TopMenu.fundPath}/view/${funds.first.id}`);
        FundDetails.checkFundDetails({
          currentBudget: { unavailable: '$40.00' },
          plannedBudgets: [{ unavailable: '$10.00' }],
        });

        // Click budget record in "Planned budget" accordion
        const BudgetDetails = FundDetails.openPlannedBudgetDetails();
        BudgetDetails.checkBudgetDetails({
          summary: [{ key: 'Unavailable', value: '$10.00' }],
        });

        // Click "View transactions" link in "Budget information" accordion
        BudgetDetails.clickViewTransactionsLink();
        Transactions.checkTransactionsList({
          records: [
            { type: 'Encumbrance', amount: '$10.00' },
            { type: 'Encumbrance', amount: '$30.00' },
          ],
        });
      },
    );
  });
});
