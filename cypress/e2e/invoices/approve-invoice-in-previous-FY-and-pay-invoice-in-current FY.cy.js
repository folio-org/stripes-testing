import {
  ACQUISITION_METHOD_NAMES_IN_PROFILE,
  APPLICATION_NAMES,
  INVOICE_STATUSES,
  LOCATION_NAMES,
  ORDER_STATUSES,
} from '../../support/constants';
import Permissions from '../../support/dictionary/permissions';
import {
  BudgetDetails,
  Budgets,
  FinanceHelper,
  FiscalYears,
  FundDetails,
  Funds,
  LedgerRollovers,
  Ledgers,
  Transactions,
} from '../../support/fragments/finance';
import {
  InvoiceLineDetails,
  Invoices,
  InvoiceView,
  NewInvoice,
} from '../../support/fragments/invoices';
import { BasicOrderLine, NewOrder, OrderLines, Orders } from '../../support/fragments/orders';
import { NewOrganization, Organizations } from '../../support/fragments/organizations';
import Approvals from '../../support/fragments/settings/invoices/approvals';
import TopMenuNavigation from '../../support/fragments/topMenuNavigation';
import Users from '../../support/fragments/users/users';
import { CodeTools, DateTools, StringTools } from '../../support/utils';

describe('Invoices', () => {
  const isApprovePayEnabled = false;
  const code = CodeTools(2);
  const date = new Date();
  const organization = NewOrganization.getDefaultOrganization({ isVendor: true });
  const testData = {
    user: {},
    ledger: {},
    fundA: {},
    budgetForFundA: {},
    order: {
      ...NewOrder.defaultOngoingTimeOrder,
      vendor: organization.id,
      reEncumber: true,
    },
    orderLine: {},
    invoice: { ...NewInvoice.defaultUiInvoice, vendorName: organization.name },
  };
  const randomNumber = StringTools.randomTwoDigitNumber();
  const fiscalYears = {
    first: {
      ...FiscalYears.getDefaultFiscalYear(),
      code: `${code}${randomNumber}01`,
      periodStart: new Date(date.getFullYear(), 0, 1),
      periodEnd: new Date(date.getFullYear(), 11, 31),
    },
    second: {
      ...FiscalYears.getDefaultFiscalYear(),
      code: `${code}${randomNumber}02`,
      periodStart: new Date(date.getFullYear() + 1, 0, 1),
      periodEnd: new Date(date.getFullYear() + 1, 11, 31),
    },
    third: {
      ...FiscalYears.getDefaultFiscalYear(),
      code: `${code}${randomNumber}03`,
      periodStart: new Date(date.getFullYear() + 2, 0, 1),
      periodEnd: new Date(date.getFullYear() + 2, 11, 31),
    },
  };
  before(() => {
    cy.getAdminToken().then(() => {
      cy.getBatchGroups().then((batchGroup) => {
        testData.invoice.batchGroup = batchGroup.name;
      });
      const { ledger, fund, budget } = Budgets.createBudgetWithFundLedgerAndFYViaApi({
        fiscalYear: fiscalYears.first,
        ledger: { restrictExpenditures: true },
        budgetForFundA: { allocated: 100 },
      });
      testData.ledger = ledger;
      testData.fundA = fund;
      testData.budgetForFundA = budget;
      FiscalYears.createViaApi(fiscalYears.second);
      FiscalYears.createViaApi(fiscalYears.third);

      Organizations.createOrganizationViaApi(organization).then((orgResp) => {
        organization.id = orgResp;
        testData.invoice.accountingCode = organization.erpCode;

        cy.getLocations({ query: `name="${LOCATION_NAMES.MAIN_LIBRARY_UI}"` }).then(
          (locationResp) => {
            cy.getAcquisitionMethodsApi({
              query: `value="${ACQUISITION_METHOD_NAMES_IN_PROFILE.PURCHASE_AT_VENDOR_SYSTEM}"`,
            }).then((amResp) => {
              cy.getBookMaterialType().then((mtypeResp) => {
                const orderLine = {
                  ...BasicOrderLine.defaultOrderLine,
                  cost: {
                    listUnitPrice: 10.0,
                    currency: 'USD',
                    discountType: 'percentage',
                    quantityPhysical: 1,
                    poLineEstimatedPrice: 10.0,
                  },
                  fundDistribution: [
                    {
                      code: testData.fundA.code,
                      fundId: testData.fundA.id,
                      value: 100,
                    },
                  ],
                  locations: [{ locationId: locationResp.id, quantity: 1, quantityPhysical: 1 }],
                  acquisitionMethod: amResp.body.acquisitionMethods[0].id,
                  physical: {
                    createInventory: 'Instance, Holding, Item',
                    materialType: mtypeResp.id,
                    materialSupplier: orgResp,
                    volumes: [],
                  },
                };

                Orders.createOrderViaApi(testData.order).then((orderResp) => {
                  testData.order = orderResp;
                  testData.orderNumber = orderResp.poNumber;
                  orderLine.purchaseOrderId = orderResp.id;

                  OrderLines.createOrderLineViaApi(orderLine).then((orderLineResponse) => {
                    testData.orderLine = orderLineResponse;
                  });
                  Orders.updateOrderViaApi({
                    ...orderResp,
                    workflowStatus: ORDER_STATUSES.OPEN,
                  });
                });
              });
            });
          },
        );
      });

      const rollover = LedgerRollovers.generateLedgerRollover({
        ledger: testData.ledger,
        fromFiscalYear: fiscalYears.first,
        toFiscalYear: fiscalYears.second,
        restrictEncumbrance: true,
        restrictExpenditures: true,
        needCloseBudgets: false,
        budgetsRollover: [
          {
            rolloverAllocation: true,
            rolloverBudgetValue: 'None',
            addAvailableTo: 'Allocation',
          },
        ],
        encumbrancesRollover: [
          {
            orderType: 'Ongoing',
            basedOn: 'InitialAmount',
          },
        ],
      });
      LedgerRollovers.createLedgerRolloverViaApi(rollover);
      FiscalYears.updateFiscalYearViaApi({
        ...fiscalYears.first,
        _version: 1,
        periodStart: new Date(date.getFullYear() - 1, 0, 1),
        periodEnd: new Date(date.getFullYear() - 1, 11, 31),
      });
      FiscalYears.updateFiscalYearViaApi({
        ...fiscalYears.second,
        _version: 1,
        periodStart: new Date(date.getFullYear(), 0, 1),
        periodEnd: new Date(date.getFullYear(), 11, 31),
      });
      Approvals.setApprovePayValueViaApi(isApprovePayEnabled);
    });

    cy.createTempUser([
      Permissions.uiFinanceExecuteFiscalYearRollover.gui,
      Permissions.uiFinanceViewFundAndBudget.gui,
      Permissions.uiFinanceViewLedger.gui,
      Permissions.uiFinanceViewEditFiscalYear.gui,
      Permissions.uiInvoicesApproveInvoices.gui,
      Permissions.viewEditCreateInvoiceInvoiceLine.gui,
      Permissions.uiOrdersView.gui,
      Permissions.uiInvoicesPayInvoices.gui,
      Permissions.uiInvoicesPayInvoicesInDifferentFiscalYear.gui,
      Permissions.invoiceSettingsAll.gui,
    ]).then((userProperties) => {
      testData.user = userProperties;

      cy.login(userProperties.username, userProperties.password);
      TopMenuNavigation.navigateToApp(APPLICATION_NAMES.ORDERS);
      Orders.selectOrdersPane();
      Orders.waitLoading();
    });
  });

  after(() => {
    cy.getAdminToken();
    Users.deleteViaApi(testData.user.userId);
    Organizations.deleteOrganizationViaApi(organization.id);
  });

  it(
    'C388538 Approve invoice in previous FY and pay invoice in current FY (for previous FY) (thunderjet) (TaaS)',
    { tags: ['criticalPath', 'thunderjet', 'C388538'] },
    () => {
      Orders.searchByParameter('PO number', testData.orderNumber);
      Orders.selectFromResultsList(testData.orderNumber);
      Orders.newInvoiceFromOrder();
      Invoices.createInvoiceFromOrder(testData.invoice, fiscalYears.first.code);
      Invoices.approveInvoice();
      InvoiceView.checkInvoiceDetails({
        invoiceInformation: [{ key: 'Status', value: INVOICE_STATUSES.APPROVED }],
        invoiceLines: [
          {
            receiptStatus: 'Ongoing',
            paymentStatus: 'Ongoing',
          },
        ],
      });
      InvoiceView.selectInvoiceLine();
      InvoiceLineDetails.checkFundDistibutionTableContent([
        { name: testData.fundA.name, currentEncumbrance: '0.00' },
      ]);
      const TransactionDetails = InvoiceLineDetails.openEncumbrancePane();
      TransactionDetails.checkTransactionDetails({
        information: [
          { key: 'Fiscal year', value: fiscalYears.first.code },
          { key: 'Amount', value: '$0.00' },
          { key: 'Source', value: `${testData.orderNumber}-1` },
          { key: 'Type', value: 'Encumbrance' },
          { key: 'From', value: testData.fundA.name },
          { key: 'Initial encumbrance', value: '$10.00' },
          { key: 'Awaiting payment', value: '$10.00' },
          { key: 'Expended', value: '0.00' },
          { key: 'Status', value: 'Released' },
        ],
      });
      Transactions.selectTransaction('Pending payment');
      TransactionDetails.checkTransactionDetails({
        information: [
          { key: 'Fiscal year', value: fiscalYears.first.code },
          { key: 'Amount', value: '$10.00' },
          { key: 'Source', value: testData.invoice.invoiceNumber },
          { key: 'Type', value: 'Pending payment' },
          { key: 'From', value: testData.fundA.name },
        ],
      });
      Transactions.closeTransactionsPage();
      BudgetDetails.waitLoading();
      BudgetDetails.closeBudgetDetails();
      FundDetails.waitLoading();
      FundDetails.checkFundDetails({
        information: [
          { key: 'Name', value: testData.fundA.name },
          { key: 'Code', value: testData.fundA.code },
          { key: 'Ledger', value: testData.ledger.name },
          { key: 'Status', value: 'Active' },
        ],
        currentBudget: {
          name: fiscalYears.second.code,
          allocated: '50.00',
        },
        previousBudgets: [
          {
            name: testData.budgetForFundA.name,
            allocated: '50.00',
          },
        ],
      });

      const CurrentBudgetDetails = FundDetails.openCurrentBudgetDetails();
      CurrentBudgetDetails.checkBudgetDetails({
        summary: [{ key: 'Expended', value: '$0.00' }],
      });
      CurrentBudgetDetails.clickViewTransactionsLink();
      ['Pending payment', 'Expended'].forEach((transactionType) => {
        Transactions.checkTransactionsList({
          records: [{ type: transactionType }],
          present: false,
        });
      });
      Transactions.selectTransaction('Encumbrance');
      TransactionDetails.checkTransactionDetails({
        information: [
          { key: 'Fiscal year', value: fiscalYears.second.code },
          { key: 'Amount', value: '$10.00' },
          { key: 'Source', value: `${testData.orderNumber}-1` },
          { key: 'Type', value: 'Encumbrance' },
          { key: 'From', value: testData.fundA.name },
          { key: 'Initial encumbrance', value: '$10.00' },
          { key: 'Awaiting payment', value: '0.00' },
          { key: 'Expended', value: '0.00' },
          { key: 'Status', value: 'Unreleased' },
        ],
      });

      TopMenuNavigation.navigateToApp(APPLICATION_NAMES.FINANCE);
      FinanceHelper.clickLedgerButton();
      FinanceHelper.searchByName(testData.ledger.name);
      Ledgers.selectLedger(testData.ledger.name);
      Ledgers.rollover();
      Ledgers.fillInCommonRolloverInfo(fiscalYears.third.code, 'None', 'Allocation');

      const startPeriodSecond = DateTools.getFormattedDate(
        { date: new Date(date.getFullYear() - 1, 0, 1) },
        'MM/DD/YYYY',
      );
      const endPeriodSecond = DateTools.getFormattedDate(
        { date: new Date(date.getFullYear() - 1, 11, 31) },
        'MM/DD/YYYY',
      );
      const startPeriodThird = DateTools.getFormattedDate(
        { date: new Date(date.getFullYear(), 0, 1) },
        'MM/DD/YYYY',
      );
      const endPeriodThird = DateTools.getFormattedDate(
        { date: new Date(date.getFullYear(), 11, 31) },
        'MM/DD/YYYY',
      );

      FinanceHelper.clickFiscalYearButton();
      FinanceHelper.searchByName(fiscalYears.second.name);
      FiscalYears.selectFY(fiscalYears.second.name);
      FiscalYears.editFiscalYearDetails();
      FiscalYears.filltheStartAndEndDateonCalenderstartDateField(
        startPeriodSecond,
        endPeriodSecond,
      );
      FinanceHelper.searchByName(fiscalYears.third.name);
      FiscalYears.selectFY(fiscalYears.third.name);
      FiscalYears.editFiscalYearDetails();
      FiscalYears.filltheStartAndEndDateonCalenderstartDateField(startPeriodThird, endPeriodThird);

      TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVOICES);
      Invoices.searchByNumber(testData.invoice.invoiceNumber);
      Invoices.selectInvoice(testData.invoice.invoiceNumber);
      Invoices.payInvoice();
      Invoices.selectInvoiceLine();
      Invoices.openPageCurrentEncumbrance('$0.00');
      Funds.selectTransactionInList('Encumbrance');
      TransactionDetails.checkTransactionDetails({
        information: [
          { key: 'Fiscal year', value: fiscalYears.first.code },
          { key: 'Amount', value: '$0.00' },
          { key: 'Source', value: `${testData.orderNumber}-1` },
          { key: 'Type', value: 'Encumbrance' },
          { key: 'From', value: testData.fundA.name },
          { key: 'Initial encumbrance', value: '$10.00' },
          { key: 'Awaiting payment', value: '$0.00' },
          { key: 'Expended', value: '$10.00' },
          { key: 'Status', value: 'Released' },
        ],
      });
      Transactions.selectTransaction('Payment');
      TransactionDetails.checkTransactionDetails({
        information: [
          { key: 'Fiscal year', value: fiscalYears.first.code },
          { key: 'Amount', value: '$10.00' },
          { key: 'Source', value: testData.invoice.invoiceNumber },
          { key: 'Type', value: 'Payment' },
          { key: 'From', value: testData.fundA.name },
        ],
      });
      Transactions.closeTransactionsPage();
      BudgetDetails.waitLoading();
      BudgetDetails.closeBudgetDetails();
      FundDetails.waitLoading();
      FundDetails.checkFundDetails({
        information: [
          { key: 'Name', value: testData.fundA.name },
          { key: 'Code', value: testData.fundA.code },
          { key: 'Ledger', value: testData.ledger.name },
          { key: 'Status', value: 'Active' },
        ],
        currentBudget: {
          name: fiscalYears.third.code,
          allocated: '50.00',
        },
        previousBudgets: [
          {
            name: fiscalYears.second.code,
            allocated: '$50.00',
          },
          {
            name: testData.budgetForFundA.name,
            allocated: '$50.00',
          },
        ],
      });
      FundDetails.viewTransactionsForCurrentBudget();
      ['Pending payment', 'Expended'].forEach((transactionType) => {
        Transactions.checkTransactionsList({
          records: [{ type: transactionType }],
          present: false,
        });
      });
      Transactions.selectTransaction('Encumbrance');
      TransactionDetails.checkTransactionDetails({
        information: [
          { key: 'Fiscal year', value: fiscalYears.third.code },
          { key: 'Amount', value: '$10.00' },
          { key: 'Source', value: `${testData.orderNumber}-1` },
          { key: 'Type', value: 'Encumbrance' },
          { key: 'From', value: testData.fundA.name },
          { key: 'Initial encumbrance', value: '$10.00' },
          { key: 'Awaiting payment', value: '0.00' },
          { key: 'Expended', value: '0.00' },
          { key: 'Status', value: 'Unreleased' },
        ],
      });
    },
  );
});
