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
  ORDER_SYSTEM_CLOSING_REASONS,
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
import { CodeTools, DateTools, StringTools } from '../../support/utils';
import getRandomPostfix from '../../support/utils/stringTools';
import { InvoiceLineDetails, InvoiceView, Invoices } from '../../support/fragments/invoices';
import NewOrganization from '../../support/fragments/organizations/newOrganization';
import Organizations from '../../support/fragments/organizations/organizations';
import OrderLines from '../../support/fragments/orders/orderLines';
import Permissions from '../../support/dictionary/permissions';
import SettingsInvoices from '../../support/fragments/invoices/settingsInvoices';
import TopMenu from '../../support/fragments/topMenu';
import TopMenuNavigation from '../../support/fragments/topMenuNavigation';
import Users from '../../support/fragments/users/users';

describe('Invoices', () => {
  const code = CodeTools(4);

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
    },
    organization: NewOrganization.getDefaultOrganization(),
    ledger: {},
    fund: {},
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

  const createConsecutiveFiscalYears = () => {
    return createFiscalYear('first').then(() => createFiscalYear('second'));
  };

  const createLedger = () => {
    return Ledgers.createViaApi({
      ...Ledgers.getDefaultLedger(),
      fiscalYearOneId: testData.fiscalYears.first.id,
    }).then((ledger) => {
      testData.ledger = ledger;
    });
  };

  const createBudget = (fiscalYearKey, budgetStatus) => {
    return Budgets.createViaApi({
      ...Budgets.getDefaultBudget(),
      fiscalYearId: testData.fiscalYears[fiscalYearKey].id,
      fundId: testData.fund.id,
      allocated: 1000,
      budgetStatus,
    });
  };

  const createFundWithBudgets = () => {
    return Funds.createViaApi({
      ...Funds.getDefaultFund(),
      ledgerId: testData.ledger.id,
    })
      .then((fundResponse) => {
        testData.fund = fundResponse.fund;

        return createBudget('first', BUDGET_STATUSES.ACTIVE);
      })
      .then(() => createBudget('second', BUDGET_STATUSES.PLANNED));
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

  const createOpenOrderWithLine = (orderKey, orderLineKey, order) => {
    return Orders.createOrderViaApi({ ...order, reEncumber: true })
      .then((orderResponse) => {
        testData[orderKey] = orderResponse;

        return OrderLines.createOrderLineViaApi(
          BasicOrderLine.getDefaultOrderLine({
            purchaseOrderId: testData[orderKey].id,
            title: `AT_C703334_${orderLineKey}_${getRandomPostfix()}`,
            acquisitionMethod: testData.acquisitionMethodId,
            listUnitPrice: 10,
            poLineEstimatedPrice: 10,
            fundDistribution: [
              {
                code: testData.fund.code,
                fundId: testData.fund.id,
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
        return OrderLines.getOrderLineByIdViaApi(testData[orderLineKey].id);
      })
      .then((orderLine) => {
        testData[orderLineKey] = orderLine;
      });
  };

  const createInvoice = (invoiceKey, orderLineKey, releaseEncumbrance) => {
    return cy
      .getBatchGroups()
      .then((batchGroup) => {
        return Invoices.createInvoiceWithInvoiceLineViaApi({
          vendorId: testData.organization.id,
          accountingCode: testData.organization.erpCode,
          poLineId: testData[orderLineKey].id,
          fiscalYearId: testData.fiscalYears.first.id,
          batchGroupId: batchGroup.id,
          fundDistributions: testData[orderLineKey].fundDistribution,
          subTotal: testData[orderLineKey].cost.poLineEstimatedPrice,
          releaseEncumbrance,
          exportToAccounting: true,
        });
      })
      .then((invoice) => {
        testData[invoiceKey] = invoice;
      });
  };

  const changeInvoiceStatus = (invoiceKey, status) => {
    return Invoices.changeInvoiceStatusViaApi({ invoice: testData[invoiceKey], status });
  };

  const cancelThirdOrder = () => {
    return Orders.getOrderByIdViaApi(testData.order3.id).then((order) => {
      return Orders.updateOrderViaApi({
        ...order,
        workflowStatus: ORDER_STATUSES.CLOSED,
        closeReason: { reason: ORDER_SYSTEM_CLOSING_REASONS.CANCELLED },
      });
    });
  };

  const createOrdersWithInvoices = () => {
    return createOpenOrderWithLine(
      'order1',
      'orderLine1',
      NewOrder.getDefaultOngoingOrder({
        vendorId: testData.organization.id,
        ongoing: { isSubscription: false, manualRenewal: false },
      }),
    )
      .then(() => createInvoice('invoice1', 'orderLine1', true))
      .then(() => changeInvoiceStatus('invoice1', INVOICE_STATUSES.APPROVED))
      .then(() => createOpenOrderWithLine(
        'order2',
        'orderLine2',
        NewOrder.getDefaultOrder({ vendorId: testData.organization.id }),
      ))
      .then(() => createInvoice('invoice2', 'orderLine2', false))
      .then(() => changeInvoiceStatus('invoice2', INVOICE_STATUSES.APPROVED))
      .then(() => createOpenOrderWithLine(
        'order3',
        'orderLine3',
        NewOrder.getDefaultOrder({ vendorId: testData.organization.id }),
      ))
      .then(() => createInvoice('invoice3', 'orderLine3', true))
      .then(() => changeInvoiceStatus('invoice3', INVOICE_STATUSES.REVIEWED))
      .then(cancelThirdOrder);
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
        Permissions.uiInvoicesApproveInvoices.gui,
        Permissions.uiInvoicesPayInvoices.gui,
        Permissions.uiInvoicesPayInvoicesInDifferentFiscalYear.gui,
        Permissions.invoiceSettingsAll.gui,
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

    createConsecutiveFiscalYears()
      .then(createLedger)
      .then(createFundWithBudgets)
      .then(createOrganization)
      .then(getAcquisitionMethodId)
      .then(createOrdersWithInvoices)
      .then(shiftFiscalYearDates)
      .then(createUserAndLogin);
  });

  after('Delete test data', () => {
    cy.getAdminToken().then(() => {
      Approvals.setApprovePayValueViaApi(false);
      Users.deleteViaApi(testData.user.userId);
      Organizations.deleteOrganizationViaApi(testData.organization.id);
    });
  });

  it(
    'C703334 Update order status modal is not displayed when paying invoices against a previous year (non-open order, no encumbrance release) (thunderjet)',
    { tags: ['extendedPath', 'thunderjet', 'C703334', 'nonParallel'] },
    () => {
      // Step 1: Navigate to Order 1 POL details pane
      Orders.searchByParameter(ORDER_SEARCH_OPTIONS.PO_NUMBER, testData.order1.poNumber);
      Orders.selectFromResultsList(testData.order1.poNumber);
      OrderDetails.waitLoading();
      OrderDetails.openPolDetails(testData.orderLine1.titleOrPackage);
      OrderLineDetails.checkFieldsConditions([
        {
          label: POLINE_DETAILS_FIELDS.PAYMENT_STATUS,
          conditions: { value: ORDER_LINE_PAYMENT_STATUS.ONGOING },
        },
      ]);
      OrderLineDetails.checkFundDistibutionTableContent([
        { name: testData.fund.name, currentEncumbrance: '$0.00' },
      ]);

      // Step 2: Navigate to Order 2 POL details pane
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
        { name: testData.fund.name, currentEncumbrance: '$0.00' },
      ]);

      // Step 3: Navigate to Order 3 POL details pane
      Orders.searchByParameter(ORDER_SEARCH_OPTIONS.PO_NUMBER, testData.order3.poNumber);
      Orders.selectFromResultsList(testData.order3.poNumber);
      OrderDetails.waitLoading();
      OrderDetails.openPolDetails(testData.orderLine3.titleOrPackage);
      OrderLineDetails.checkFieldsConditions([
        {
          label: POLINE_DETAILS_FIELDS.PAYMENT_STATUS,
          conditions: { value: ORDER_LINE_PAYMENT_STATUS.CANCELLED },
        },
      ]);
      OrderLineDetails.checkFundDistibutionTableContent([
        { name: testData.fund.name, currentEncumbrance: '$0.00' },
      ]);

      // Step 4: Navigate to Invoice 1 details pane
      TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVOICES);
      Invoices.searchByNumber(testData.invoice1.vendorInvoiceNo);
      Invoices.selectInvoice(testData.invoice1.vendorInvoiceNo);
      InvoiceView.waitLoading();
      InvoiceView.checkInvoiceDetails({
        invoiceInformation: [
          { key: INVOICE_VIEW_FIELDS.FISCAL_YEAR, value: testData.fiscalYears.first.code },
        ],
      });

      // Step 5: Pay the invoice
      InvoiceView.payInvoice();
      InvoiceView.checkInvoiceDetails({
        invoiceInformation: [
          { key: INVOICE_VIEW_FIELDS.INVOICE_STATUS, value: INVOICE_STATUSES.PAID },
        ],
      });

      // Step 6: Click on the invoice line
      InvoiceView.selectInvoiceLine(0);
      InvoiceLineDetails.waitLoading();
      InvoiceLineDetails.checkInvoiceLineDetails({
        invoiceLineInformation: [
          { key: INVOICE_LINE_VIEW_FIELDS.STATUS, value: INVOICE_STATUSES.PAID },
        ],
      });

      // Step 7: Check POL payment status
      InvoiceLineDetails.openPOLineFromInvoiceLine();
      OrderLineDetails.waitLoading();
      OrderLineDetails.checkFieldsConditions([
        {
          label: POLINE_DETAILS_FIELDS.PAYMENT_STATUS,
          conditions: { value: ORDER_LINE_PAYMENT_STATUS.ONGOING },
        },
      ]);

      // Step 8: Navigate to the Invoice 2 details pane
      TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVOICES);
      Invoices.searchByNumber(testData.invoice2.vendorInvoiceNo);
      Invoices.selectInvoice(testData.invoice2.vendorInvoiceNo);
      InvoiceView.waitLoading();
      InvoiceView.checkInvoiceDetails({
        invoiceInformation: [
          { key: INVOICE_VIEW_FIELDS.INVOICE_STATUS, value: INVOICE_STATUSES.APPROVED },
          { key: INVOICE_VIEW_FIELDS.FISCAL_YEAR, value: testData.fiscalYears.first.code },
        ],
      });

      // Step 9: Pay the invoice
      InvoiceView.payInvoice();
      InvoiceView.checkInvoiceDetails({
        invoiceInformation: [
          { key: INVOICE_VIEW_FIELDS.INVOICE_STATUS, value: INVOICE_STATUSES.PAID },
        ],
      });

      // Step 10: Click on the invoice line
      InvoiceView.selectInvoiceLine(0);
      InvoiceLineDetails.waitLoading();
      InvoiceLineDetails.checkInvoiceLineDetails({
        invoiceLineInformation: [
          { key: INVOICE_LINE_VIEW_FIELDS.STATUS, value: INVOICE_STATUSES.PAID },
        ],
      });

      // Step 11: Check POL payment status
      InvoiceLineDetails.openPOLineFromInvoiceLine();
      OrderLineDetails.waitLoading();
      OrderLineDetails.checkFieldsConditions([
        {
          label: POLINE_DETAILS_FIELDS.PAYMENT_STATUS,
          conditions: { value: ORDER_LINE_PAYMENT_STATUS.PARTIALLY_PAID },
        },
      ]);

      // Step 12: Enable Approve & Pay
      cy.visit(TopMenu.settingsInvoiveApprovalPath);
      SettingsInvoices.waitApprovalsLoading();
      SettingsInvoices.checkApproveAndPayCheckboxIfNeeded();

      // Step 13: Navigate to Invoice 3 details pane
      TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVOICES);
      Invoices.searchByNumber(testData.invoice3.vendorInvoiceNo);
      Invoices.selectInvoice(testData.invoice3.vendorInvoiceNo);
      InvoiceView.waitLoading();
      InvoiceView.checkInvoiceDetails({
        invoiceInformation: [
          { key: INVOICE_VIEW_FIELDS.INVOICE_STATUS, value: INVOICE_STATUSES.REVIEWED },
          { key: INVOICE_VIEW_FIELDS.FISCAL_YEAR, value: testData.fiscalYears.first.code },
        ],
      });

      // Step 14: Approve and pay the invoice
      InvoiceView.approveInvoice({ isApprovePayEnabled: true });
      InvoiceView.checkInvoiceDetails({
        invoiceInformation: [
          { key: INVOICE_VIEW_FIELDS.INVOICE_STATUS, value: INVOICE_STATUSES.PAID },
        ],
      });

      // Step 15: Click on the invoice line
      InvoiceView.selectInvoiceLine(0);
      InvoiceLineDetails.waitLoading();
      InvoiceLineDetails.checkInvoiceLineDetails({
        invoiceLineInformation: [
          { key: INVOICE_LINE_VIEW_FIELDS.STATUS, value: INVOICE_STATUSES.PAID },
        ],
      });

      // Step 16: Check POL payment status
      InvoiceLineDetails.openPOLineFromInvoiceLine();
      OrderLineDetails.waitLoading();
      OrderLineDetails.checkFieldsConditions([
        {
          label: POLINE_DETAILS_FIELDS.PAYMENT_STATUS,
          conditions: { value: ORDER_LINE_PAYMENT_STATUS.FULLY_PAID },
        },
      ]);
    },
  );
});
