import {
  ACQUISITION_METHOD_NAMES_IN_PROFILE,
  APPLICATION_NAMES,
  BUDGET_STATUSES,
  FUND_DISTRIBUTION_TYPES,
  INVOICE_LINE_VIEW_FIELDS,
  INVOICE_STATUSES,
  INVOICE_VIEW_FIELDS,
  ORDER_LINE_PAYMENT_STATUS,
  ORDER_SEARCH_OPTIONS,
  ORDER_STATUSES,
  POLINE_DETAILS_FIELDS,
} from '../../support/constants';
import { Budgets, FiscalYears, Funds, Ledgers } from '../../support/fragments/finance';
import Approvals from '../../support/fragments/settings/invoices/approvals';
import {
  BasicOrderLine,
  NewOrder,
  OrderDetails,
  OrderLineDetails,
  Orders,
} from '../../support/fragments/orders';
import CancelInvoiceModal from '../../support/fragments/invoices/modal/cancelInvoiceModal';
import { CodeTools, DateTools, StringTools } from '../../support/utils';
import getRandomPostfix from '../../support/utils/stringTools';
import { InvoiceLineDetails, InvoiceView, Invoices } from '../../support/fragments/invoices';
import InvoiceStates from '../../support/fragments/invoices/invoiceStates';
import NewOrganization from '../../support/fragments/organizations/newOrganization';
import Organizations from '../../support/fragments/organizations/organizations';
import OrderLines from '../../support/fragments/orders/orderLines';
import Permissions from '../../support/dictionary/permissions';
import TopMenu from '../../support/fragments/topMenu';
import TopMenuNavigation from '../../support/fragments/topMenuNavigation';
import Users from '../../support/fragments/users/users';

describe('Invoices', () => {
  const code = CodeTools(4);
  const otherCode = CodeTools(4);

  const testData = {
    fiscalYears: {
      first: {
        ...FiscalYears.getDefaultFiscalYear(),
        code: `${code}${StringTools.randomTwoDigitNumber()}01`,
        ...DateTools.getFullFiscalYearStartAndEnd(0),
      },
      second: {
        ...FiscalYears.getDefaultFiscalYear(),
        code: `${code}${StringTools.randomTwoDigitNumber()}02`,
        ...DateTools.getFullFiscalYearStartAndEnd(1),
      },
      other: {
        ...FiscalYears.getDefaultFiscalYear(),
        code: `${otherCode}${StringTools.randomTwoDigitNumber()}01`,
        ...DateTools.getFullFiscalYearStartAndEnd(0),
      },
    },
    organization: NewOrganization.getDefaultOrganization(),
    ledger1: {},
    ledger2: {},
    fundA: {},
    fundB: {},
    acquisitionMethodId: null,
    order1: {},
    order2: {},
    order3: {},
    orderLine1: {},
    orderLine2: {},
    orderLine3: {},
    invoice1: {},
    invoice2: {},
    invoice3: {},
    user: {},
  };

  const createFiscalYear = (fiscalYearKey) => {
    return FiscalYears.createViaApi(testData.fiscalYears[fiscalYearKey]).then((fiscalYear) => {
      testData.fiscalYears[fiscalYearKey] = fiscalYear;
    });
  };

  const createFiscalYears = () => {
    return createFiscalYear('first')
      .then(() => createFiscalYear('second'))
      .then(() => createFiscalYear('other'));
  };

  const createLedger = (ledgerKey, fiscalYearKey) => {
    return Ledgers.createViaApi({
      ...Ledgers.getDefaultLedger(),
      fiscalYearOneId: testData.fiscalYears[fiscalYearKey].id,
    }).then((ledger) => {
      testData[ledgerKey] = ledger;
    });
  };

  const createFund = (fundKey, ledgerKey) => {
    return Funds.createViaApi({
      ...Funds.getDefaultFund(),
      ledgerId: testData[ledgerKey].id,
    }).then((fundResponse) => {
      testData[fundKey] = fundResponse.fund;
    });
  };

  const createBudget = (fundKey, fiscalYearKey, budgetStatus) => {
    return Budgets.createViaApi({
      ...Budgets.getDefaultBudget(),
      fiscalYearId: testData.fiscalYears[fiscalYearKey].id,
      fundId: testData[fundKey].id,
      allocated: 1000,
      budgetStatus,
    });
  };

  const createFundsWithBudgets = () => {
    return createLedger('ledger1', 'first')
      .then(() => createLedger('ledger2', 'other'))
      .then(() => createFund('fundA', 'ledger1'))
      .then(() => createBudget('fundA', 'first', BUDGET_STATUSES.ACTIVE))
      .then(() => createBudget('fundA', 'second', BUDGET_STATUSES.PLANNED))
      .then(() => createFund('fundB', 'ledger2'))
      .then(() => createBudget('fundB', 'other', BUDGET_STATUSES.ACTIVE));
  };

  const createOrganization = () => {
    return Organizations.createOrganizationViaApi(testData.organization).then((id) => {
      testData.organization.id = id;
    });
  };

  const getAcquisitionMethodId = () => {
    return cy
      .getAcquisitionMethodsApi({
        query: `value="${ACQUISITION_METHOD_NAMES_IN_PROFILE.PURCHASE_AT_VENDOR_SYSTEM}"`,
      })
      .then(({ body }) => {
        testData.acquisitionMethodId = body.acquisitionMethods[0].id;
      });
  };

  const createOpenOrderWithLine = (orderKey, orderLineKey, fundKey) => {
    return Orders.createOrderViaApi({
      ...NewOrder.getDefaultOrder({ vendorId: testData.organization.id }),
      reEncumber: true,
    })
      .then((order) => {
        testData[orderKey] = order;

        return OrderLines.createOrderLineViaApi(
          BasicOrderLine.getDefaultOrderLine({
            purchaseOrderId: testData[orderKey].id,
            title: `AT_C703346_${orderLineKey}_${getRandomPostfix()}`,
            acquisitionMethod: testData.acquisitionMethodId,
            listUnitPrice: 25,
            poLineEstimatedPrice: 25,
            fundDistribution: [
              {
                code: testData[fundKey].code,
                fundId: testData[fundKey].id,
                distributionType: FUND_DISTRIBUTION_TYPES.PERCENTAGE,
                value: 100,
              },
            ],
          }),
        );
      })
      .then((orderLine) => {
        testData[orderLineKey] = orderLine;

        return Orders.updateOrderViaApi({
          ...testData[orderKey],
          workflowStatus: ORDER_STATUSES.OPEN,
        });
      })
      .then(() => {
        // After the order is opened its fund distribution references the created encumbrance
        return OrderLines.getOrderLineByIdViaApi(testData[orderLineKey].id);
      })
      .then((orderLine) => {
        testData[orderLineKey] = orderLine;
      });
  };

  const createInvoice = (invoiceKey, orderLineKey, fiscalYearKey) => {
    return cy
      .getBatchGroups()
      .then((batchGroup) => {
        return Invoices.createInvoiceWithInvoiceLineViaApi({
          vendorId: testData.organization.id,
          accountingCode: testData.organization.erpCode,
          poLineId: testData[orderLineKey].id,
          fiscalYearId: testData.fiscalYears[fiscalYearKey].id,
          batchGroupId: batchGroup.id,
          fundDistributions: testData[orderLineKey].fundDistribution,
          subTotal: testData[orderLineKey].cost.poLineEstimatedPrice,
          releaseEncumbrance: true,
          exportToAccounting: true,
        });
      })
      .then((invoice) => {
        testData[invoiceKey] = invoice;
      });
  };

  const approveInvoice = (invoiceKey) => {
    return Invoices.changeInvoiceStatusViaApi({
      invoice: testData[invoiceKey],
      status: INVOICE_STATUSES.APPROVED,
    });
  };

  const unOpenFirstOrder = () => {
    return Orders.getOrderByIdViaApi(testData.order1.id).then((order) => {
      return Orders.updateOrderViaApi({
        ...order,
        workflowStatus: ORDER_STATUSES.PENDING,
      });
    });
  };

  const createOrdersWithInvoices = () => {
    return createOpenOrderWithLine('order1', 'orderLine1', 'fundA')
      .then(() => createInvoice('invoice1', 'orderLine1', 'first'))
      .then(() => approveInvoice('invoice1'))
      .then(unOpenFirstOrder)
      .then(() => createOpenOrderWithLine('order2', 'orderLine2', 'fundB'))
      .then(() => createInvoice('invoice2', 'orderLine2', 'other'))
      .then(() => approveInvoice('invoice2'))
      .then(() => createOpenOrderWithLine('order3', 'orderLine3', 'fundA'))
      .then(() => createInvoice('invoice3', 'orderLine3', 'first'));
  };

  const updateFiscalYearDates = (fiscalYearKey, offset) => {
    const updatedFY = {
      ...testData.fiscalYears[fiscalYearKey],
      ...DateTools.getFullFiscalYearStartAndEnd(offset),
    };

    return FiscalYears.updateFiscalYearViaApi(updatedFY).then(() => {
      testData.fiscalYears[fiscalYearKey] = { ...updatedFY, _version: updatedFY._version + 1 };
    });
  };

  const shiftFiscalYearDates = () => {
    return updateFiscalYearDates('first', -1).then(() => updateFiscalYearDates('second', 0));
  };

  const createUserAndLogin = () => {
    return cy
      .createTempUser([
        Permissions.uiFinanceViewFundAndBudget.gui,
        Permissions.uiInvoicesCanViewAndEditInvoicesAndInvoiceLines.gui,
        Permissions.uiOrdersView.gui,
        Permissions.uiInvoicesCancelInvoices.gui,
        Permissions.uiInvoicesApproveInvoices.gui,
        Permissions.uiInvoicesPayInvoices.gui,
        Permissions.uiInvoicesPayInvoicesInDifferentFiscalYear.gui,
      ])
      .then((userProperties) => {
        testData.user = userProperties;

        cy.login(userProperties.username, userProperties.password, {
          path: TopMenu.ordersPath,
          waiter: Orders.waitLoading,
        });
      });
  };

  before('Create test data', () => {
    cy.getAdminToken();
    Approvals.setApprovePayValueViaApi(false);

    createFiscalYears()
      .then(createFundsWithBudgets)
      .then(createOrganization)
      .then(getAcquisitionMethodId)
      .then(createOrdersWithInvoices)
      .then(shiftFiscalYearDates)
      .then(createUserAndLogin);
  });

  after('Delete test data', () => {
    cy.getAdminToken().then(() => {
      Users.deleteViaApi(testData.user.userId);
      Organizations.deleteOrganizationViaApi(testData.organization.id);
    });
  });

  it(
    'C703346 Update order line status modal is not is not displayed when cancelling an invoice in a current fiscal year and approving or cancelling invoice in a previous fiscal year (thunderjet)',
    { tags: ['extendedPath', 'thunderjet', 'C703346', 'nonParallel'] },
    () => {
      // Step 1: Navigate to POL details pane related to the "Order #1"
      Orders.searchByParameter(ORDER_SEARCH_OPTIONS.PO_NUMBER, testData.order1.poNumber);
      Orders.selectFromResultsList(testData.order1.poNumber);
      OrderDetails.waitLoading();
      OrderDetails.openPolDetails(testData.orderLine1.titleOrPackage);
      OrderLineDetails.checkFieldsConditions([
        {
          label: POLINE_DETAILS_FIELDS.PAYMENT_STATUS,
          conditions: { value: ORDER_LINE_PAYMENT_STATUS.PENDING },
        },
      ]);
      OrderLineDetails.checkFundDistibutionTableContent([
        { name: testData.fundA.name, currentEncumbrance: '$0.00' },
      ]);

      // Step 2: Navigate to POL details pane related to the "Order #2"
      Orders.searchByParameter(ORDER_SEARCH_OPTIONS.PO_NUMBER, testData.order2.poNumber);
      Orders.selectFromResultsList(testData.order2.poNumber);
      OrderDetails.waitLoading();
      OrderDetails.openPolDetails(testData.orderLine2.titleOrPackage);
      OrderLineDetails.checkFieldsConditions([
        {
          label: POLINE_DETAILS_FIELDS.PAYMENT_STATUS,
          conditions: { value: ORDER_LINE_PAYMENT_STATUS.AWAITING_PAYMENT },
        },
      ]);
      OrderLineDetails.checkFundDistibutionTableContent([
        { name: testData.fundB.name, currentEncumbrance: '$0.00' },
      ]);

      // Step 3: Navigate to POL details pane related to the "Order #3"
      Orders.searchByParameter(ORDER_SEARCH_OPTIONS.PO_NUMBER, testData.order3.poNumber);
      Orders.selectFromResultsList(testData.order3.poNumber);
      OrderDetails.waitLoading();
      OrderDetails.openPolDetails(testData.orderLine3.titleOrPackage);
      OrderLineDetails.checkFieldsConditions([
        {
          label: POLINE_DETAILS_FIELDS.PAYMENT_STATUS,
          conditions: { value: ORDER_LINE_PAYMENT_STATUS.AWAITING_PAYMENT },
        },
      ]);
      OrderLineDetails.checkFundDistibutionTableContent([
        {
          name: testData.fundA.name,
          currentEncumbrance: `$${testData.orderLine3.cost.poLineEstimatedPrice}.00`,
        },
      ]);

      // Step 4: Navigate to Invoice #1 details pane
      TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVOICES);
      Invoices.searchByNumber(testData.invoice1.vendorInvoiceNo);
      Invoices.selectInvoice(testData.invoice1.vendorInvoiceNo);
      InvoiceView.waitLoading();
      InvoiceView.verifyWarningMessage(InvoiceStates.invoiceCanNotBeApprovedPendingOrder);
      InvoiceView.checkInvoiceDetails({
        invoiceInformation: [
          { key: INVOICE_VIEW_FIELDS.FISCAL_YEAR, value: testData.fiscalYears.first.code },
        ],
      });

      // Step 5: Cancel invoice and verify Cancel invoice modal
      InvoiceView.clickCancelInActionsMenu();
      CancelInvoiceModal.verifyModalView();

      // Step 6: Submit Cancel invoice modal
      CancelInvoiceModal.clickSubmitButton();
      InvoiceView.checkInvoiceDetails({
        invoiceInformation: [
          { key: INVOICE_VIEW_FIELDS.INVOICE_STATUS, value: INVOICE_STATUSES.CANCELLED },
        ],
      });

      // Step 7: Click on invoice line #1
      InvoiceView.selectInvoiceLine(0);
      InvoiceLineDetails.waitLoading();
      InvoiceLineDetails.checkInvoiceLineDetails({
        invoiceLineInformation: [
          { key: INVOICE_LINE_VIEW_FIELDS.STATUS, value: INVOICE_STATUSES.CANCELLED },
        ],
      });
      InvoiceLineDetails.checkFundDistibutionTableContent([
        { name: testData.fundA.name, currentEncumbrance: '$0.00' },
      ]);

      // Step 8: Check POL related to the "Order #1"
      InvoiceLineDetails.openPOLineFromInvoiceLine();
      OrderLineDetails.waitLoading();
      OrderLineDetails.checkFieldsConditions([
        {
          label: POLINE_DETAILS_FIELDS.PAYMENT_STATUS,
          conditions: { value: ORDER_LINE_PAYMENT_STATUS.PENDING },
        },
      ]);
      OrderLineDetails.checkFundDistibutionTableContent([
        { name: testData.fundA.name, currentEncumbrance: '$0.00' },
      ]);

      // Step 9: Navigate to Invoice #2 details pane
      TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVOICES);
      Invoices.searchByNumber(testData.invoice2.vendorInvoiceNo);
      Invoices.selectInvoice(testData.invoice2.vendorInvoiceNo);
      InvoiceView.waitLoading();
      InvoiceView.checkInvoiceDetails({
        invoiceInformation: [
          { key: INVOICE_VIEW_FIELDS.FISCAL_YEAR, value: testData.fiscalYears.other.code },
        ],
      });

      // Step 10: Cancel invoice
      InvoiceView.cancelInvoice();
      InvoiceView.checkInvoiceDetails({
        invoiceInformation: [
          { key: INVOICE_VIEW_FIELDS.INVOICE_STATUS, value: INVOICE_STATUSES.CANCELLED },
        ],
      });

      // Step 11: Click on invoice line #1
      InvoiceView.selectInvoiceLine(0);
      InvoiceLineDetails.waitLoading();
      InvoiceLineDetails.checkInvoiceLineDetails({
        invoiceLineInformation: [
          { key: INVOICE_LINE_VIEW_FIELDS.STATUS, value: INVOICE_STATUSES.CANCELLED },
        ],
      });
      InvoiceLineDetails.checkFundDistibutionTableContent([
        {
          name: testData.fundB.name,
          currentEncumbrance: `$${testData.orderLine2.cost.poLineEstimatedPrice}.00`,
        },
      ]);

      // Step 12: Check POL related to the "Order #2"
      InvoiceLineDetails.openPOLineFromInvoiceLine();
      OrderLineDetails.waitLoading();
      OrderLineDetails.checkFieldsConditions([
        {
          label: POLINE_DETAILS_FIELDS.PAYMENT_STATUS,
          conditions: { value: ORDER_LINE_PAYMENT_STATUS.AWAITING_PAYMENT },
        },
      ]);
      OrderLineDetails.checkFundDistibutionTableContent([
        {
          name: testData.fundB.name,
          currentEncumbrance: `$${testData.orderLine2.cost.poLineEstimatedPrice}.00`,
        },
      ]);

      // Step 13: Navigate to Invoice #3 details pane
      TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVOICES);
      Invoices.searchByNumber(testData.invoice3.vendorInvoiceNo);
      Invoices.selectInvoice(testData.invoice3.vendorInvoiceNo);
      InvoiceView.waitLoading();
      InvoiceView.checkInvoiceDetails({
        invoiceInformation: [
          { key: INVOICE_VIEW_FIELDS.FISCAL_YEAR, value: testData.fiscalYears.first.code },
        ],
      });

      // Step 14: Approve invoice
      InvoiceView.approveInvoice();
      InvoiceView.checkInvoiceDetails({
        invoiceInformation: [
          { key: INVOICE_VIEW_FIELDS.INVOICE_STATUS, value: INVOICE_STATUSES.APPROVED },
        ],
      });

      // Step 15: Click on invoice line #1
      InvoiceView.selectInvoiceLine(0);
      InvoiceLineDetails.waitLoading();
      InvoiceLineDetails.checkInvoiceLineDetails({
        invoiceLineInformation: [
          { key: INVOICE_LINE_VIEW_FIELDS.STATUS, value: INVOICE_STATUSES.APPROVED },
        ],
      });
      InvoiceLineDetails.checkFundDistibutionTableContent([
        { name: testData.fundA.name, currentEncumbrance: '$0.00' },
      ]);

      // Step 16: Check POL related to the "Order #3"
      InvoiceLineDetails.openPOLineFromInvoiceLine();
      OrderLineDetails.waitLoading();
      OrderLineDetails.checkFieldsConditions([
        {
          label: POLINE_DETAILS_FIELDS.PAYMENT_STATUS,
          conditions: { value: ORDER_LINE_PAYMENT_STATUS.AWAITING_PAYMENT },
        },
      ]);
      OrderLineDetails.checkFundDistibutionTableContent([
        { name: testData.fundA.name, currentEncumbrance: '$0.00' },
      ]);
    },
  );
});
