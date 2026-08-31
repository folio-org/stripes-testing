import {
  ACQUISITION_METHOD_NAMES_IN_PROFILE,
  APPLICATION_NAMES,
  COMMON_BUTTON_LABELS,
  FUND_DETAILS_FIELDS,
  FUND_DISTRIBUTION_TYPES,
  FUND_STATUSES,
  INVOICE_STATUSES,
  INVOICE_VIEW_FIELDS,
  ORDER_SEARCH_OPTIONS,
  ORDER_STATUSES,
} from '../../support/constants';
import Approvals from '../../support/fragments/settings/invoices/approvals';
import ApproveInvoiceModal from '../../support/fragments/invoices/modal/approveInvoiceModal';
import {
  BasicOrderLine,
  NewOrder,
  OrderDetails,
  OrderLines,
  Orders,
} from '../../support/fragments/orders';
import {
  Budgets,
  FinanceHelper,
  FiscalYears,
  FundDetails,
  Funds,
} from '../../support/fragments/finance';
import DateTools from '../../support/utils/dateTools';
import FundEditForm from '../../support/fragments/finance/funds/fundEditForm';
import { InvoiceView, Invoices } from '../../support/fragments/invoices';
import InteractorsTools from '../../support/utils/interactorsTools';
import InvoiceStates from '../../support/fragments/invoices/invoiceStates';
import getRandomPostfix, { randomFourDigitNumber } from '../../support/utils/stringTools';
import { NewOrganization, Organizations } from '../../support/fragments/organizations';
import OrderStates from '../../support/fragments/orders/orderStates';
import States from '../../support/fragments/finance/states';
import { Permissions } from '../../support/dictionary';
import TopMenu from '../../support/fragments/topMenu';
import TopMenuNavigation from '../../support/fragments/topMenuNavigation';
import Users from '../../support/fragments/users/users';

describe('Orders', () => {
  const testData = {
    organization: NewOrganization.getDefaultOrganization(),
    order1: {},
    order2: {},
    orderLine1: {},
    orderLine2: {},
    invoice: {},
    user: {},
  };

  const createFinanceData = () => {
    const financeData = Budgets.createBudgetWithFundLedgerAndFYViaApi({
      budget: { allocated: 100 },
      fund: { code: `FundA_${randomFourDigitNumber()}` },
    });
    testData.fiscalYear = financeData.fiscalYear;
    testData.ledger = financeData.ledger;
    testData.fundA = financeData.fund;
    testData.budgetA = financeData.budget;

    testData.fundB = {
      ...Funds.getDefaultFund(),
      code: `FundB_${randomFourDigitNumber()}`,
      ledgerId: testData.ledger.id,
    };

    return Funds.createViaApi(testData.fundB).then((fundResponse) => {
      testData.fundB = fundResponse.fund;
    });
  };

  const createOrderWithFund = (fund, title, acquisitionMethod) => {
    const order = {
      ...NewOrder.getDefaultOrder({ vendorId: testData.organization.id }),
      reEncumber: true,
    };

    return Orders.createOrderViaApi(order).then((orderResponse) => {
      const orderLine = BasicOrderLine.getDefaultOrderLine({
        acquisitionMethod,
        purchaseOrderId: orderResponse.id,
        title,
        fundDistribution: [
          {
            code: fund.code,
            fundId: fund.id,
            distributionType: FUND_DISTRIBUTION_TYPES.PERCENTAGE,
            value: 100,
          },
        ],
      });

      return OrderLines.createOrderLineViaApi(orderLine).then((orderLineResponse) => ({
        order: orderResponse,
        orderLine: orderLineResponse,
      }));
    });
  };

  const createOrders = () => {
    Organizations.createOrganizationViaApi(testData.organization);

    return cy
      .getAcquisitionMethodsApi({
        query: `value="${ACQUISITION_METHOD_NAMES_IN_PROFILE.OTHER}"`,
      })
      .then(({ body }) => {
        const acquisitionMethod = body.acquisitionMethods[0].id;

        return createOrderWithFund(
          testData.fundA,
          `autotest_order1_${getRandomPostfix()}`,
          acquisitionMethod,
        )
          .then(({ order, orderLine }) => {
            testData.order1 = order;
            testData.orderLine1 = orderLine;

            return createOrderWithFund(
              testData.fundB,
              `autotest_order2_${getRandomPostfix()}`,
              acquisitionMethod,
            );
          })
          .then(({ order, orderLine }) => {
            testData.order2 = order;
            testData.orderLine2 = orderLine;
          });
      });
  };

  const createInvoice = () => {
    return Invoices.createInvoiceWithInvoiceLineWithoutOrderViaApi({
      vendorId: testData.organization.id,
      fiscalYearId: testData.fiscalYear.id,
      accountingCode: testData.organization.erpCode,
      subTotal: 10,
      fundDistributions: [{ code: testData.fundA.code, fundId: testData.fundA.id, value: 100 }],
    }).then((invoice) => {
      testData.invoice = invoice;
    });
  };

  before('Create test data', () => {
    cy.getAdminToken().then(() => {
      Approvals.setApprovePayValueViaApi(false);
      createFinanceData();
      createOrders().then(() => createInvoice());
    });

    cy.createTempUser([
      Permissions.uiFinanceViewEditFundAndBudget.gui,
      Permissions.uiFinanceViewEditFiscalYear.gui,
      Permissions.uiInvoicesCanViewAndEditInvoicesAndInvoiceLines.gui,
      Permissions.uiOrdersEdit.gui,
      Permissions.uiInvoicesApproveInvoices.gui,
      Permissions.uiOrdersApprovePurchaseOrders.gui,
    ]).then((userProperties) => {
      testData.user = userProperties;

      cy.login(testData.user.username, testData.user.password, {
        path: TopMenu.fundPath,
        waiter: Funds.waitLoading,
      });
    });
  });

  after('Delete test data', () => {
    cy.getAdminToken().then(() => {
      Approvals.setApprovePayValueViaApi(false);
      Invoices.deleteInvoiceViaApi(testData.invoice.id);
      Orders.deleteOrderViaApi(testData.order1.id);
      Orders.deleteOrderViaApi(testData.order2.id);
      Organizations.deleteOrganizationViaApi(testData.organization.id);
      Funds.deleteFundViaApi(testData.fundB.id);
      Budgets.deleteBudgetWithFundLedgerAndFYViaApi(testData.budgetA);
      Users.deleteViaApi(testData.user.userId);
    });
  });

  it(
    "C934299 DevTools | Check error messages when a fund's budget is inactive or the fiscal year period does not include the current date or fund does not have a current budget (thunderjet)",
    { tags: ['extendedPath', 'thunderjet', 'C934299', 'nonParallel'] },
    () => {
      // Step 1: Select Fund A, open Edit form
      Funds.searchByName(testData.fundA.name);
      Funds.selectFund(testData.fundA.name);
      FundDetails.openFundEditForm();
      FundEditForm.verifyFormView();

      // Step 2: Set Fund A status to Inactive and save
      FundEditForm.fillFundInfoSectionFields({ fundStatus: FUND_STATUSES.INACTIVE });
      FundEditForm.clickSaveAndCloseButton();
      FundDetails.checkInformation([
        { key: FUND_DETAILS_FIELDS.STATUS, value: FUND_STATUSES.INACTIVE },
      ]);

      // Step 3: Navigate to Orders, open Order #1
      TopMenuNavigation.navigateToApp(APPLICATION_NAMES.ORDERS);
      Orders.selectOrdersPane();
      Orders.searchByParameter(ORDER_SEARCH_OPTIONS.PO_NUMBER, testData.order1.poNumber);
      Orders.selectFromResultsList(testData.order1.poNumber);
      OrderDetails.waitLoading();
      OrderDetails.checkOrderStatus(ORDER_STATUSES.PENDING);

      // Step 4: Try to open Order #1 - Fund A is Inactive
      cy.intercept('PUT', `/orders/composite-orders/${testData.order1.id}`).as('openOrder1');
      Orders.openOrder();
      cy.wait('@openOrder1').then((interception) => {
        OrderDetails.checkApiErrorResponse(interception, {
          expectedStatus: 422,
          expectedErrorCode: States.budgetNotFoundForFiscalYear,
          expectedErrorMessage: States.couldNotFindActiveBudgetInCurrentFY,
        });
      });
      InteractorsTools.checkCalloutErrorMessage(
        OrderStates.noCurrentBudgetForFund(testData.fundA.code, testData.fiscalYear.code),
      );
      OrderDetails.checkOrderStatus(ORDER_STATUSES.PENDING);
      InteractorsTools.closeCalloutMessage();

      // Step 5: Navigate to Invoices, open the Invoice
      TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVOICES);
      Invoices.selectInvoiceByNumber(testData.invoice.vendorInvoiceNo);
      InvoiceView.waitLoading();
      InvoiceView.checkInvoiceDetails({
        title: testData.invoice.vendorInvoiceNo,
        invoiceInformation: [
          { key: INVOICE_VIEW_FIELDS.INVOICE_STATUS, value: INVOICE_STATUSES.OPEN },
        ],
        invoiceLines: [{ fundCode: testData.fundA.code }],
      });

      // Step 6: Try to approve the Invoice - Fund A is Inactive
      cy.intercept('PUT', `/invoice/invoices/${testData.invoice.id}?*`).as('approveInvoice');
      InvoiceView.clickApproveAndPayInvoice({ isApprovePayEnabled: false });
      ApproveInvoiceModal.verifyModalView({ isApprovePayEnabled: false });
      ApproveInvoiceModal.clickOnlySubmitButton();
      cy.wait('@approveInvoice').then((interception) => {
        InvoiceView.checkErrorInvoiceApiResponse(interception, {
          expectedStatus: 404,
          expectedMessage: InvoiceStates.activeBudgetNotFoundMessage,
          expectedErrorCode: InvoiceStates.budgetNotFoundCode,
          expectedFundId: testData.fundA.id,
          expectedFiscalYearId: testData.fiscalYear.id,
        });
      });
      InteractorsTools.checkCalloutErrorMessage(
        InvoiceStates.cannotApproveFundHasNoCurrentBudget(
          testData.fundA.code,
          testData.fiscalYear.code,
        ),
      );
      InvoiceView.checkInvoiceDetails({
        invoiceInformation: [
          { key: INVOICE_VIEW_FIELDS.INVOICE_STATUS, value: INVOICE_STATUSES.OPEN },
        ],
      });
      InteractorsTools.closeCalloutMessage();

      // Step 7: Navigate to Finance, set Fund A status back to Active
      TopMenuNavigation.navigateToApp(APPLICATION_NAMES.FINANCE);
      FinanceHelper.selectFundsNavigation();
      FinanceHelper.searchByName(testData.fundA.name);
      Funds.selectFund(testData.fundA.name);
      FundDetails.openFundEditForm();
      FundEditForm.fillFundInfoSectionFields({ fundStatus: FUND_STATUSES.ACTIVE });
      FundEditForm.clickSaveAndCloseButton();
      FundDetails.checkInformation([
        { key: FUND_DETAILS_FIELDS.STATUS, value: FUND_STATUSES.ACTIVE },
      ]);

      // Step 8: Navigate to the Fiscal year tab, open Edit form
      FinanceHelper.selectFiscalYearsNavigation();
      FinanceHelper.searchByName(testData.fiscalYear.name);
      FiscalYears.selectFY(testData.fiscalYear.name);
      FiscalYears.editFiscalYearDetails();
      FiscalYears.checkButtonsConditions([
        { label: COMMON_BUTTON_LABELS.CANCEL, conditions: { disabled: false } },
        { label: COMMON_BUTTON_LABELS.SAVE_AND_CLOSE, conditions: { disabled: true } },
      ]);

      // Step 9: Change Period End Date to a day in the past and save
      FiscalYears.fillTheStartAndEndDateOnCalenderStartDateField(
        DateTools.getTwoPreviousDaysDateForFiscalYearOnUIEdit(),
        DateTools.getPreviousDayDateForFiscalYearOnUIEdit(),
      );
      InteractorsTools.checkCalloutMessage(States.fiscalYearSavedSuccessfully);

      // Step 10: Navigate to Orders, open Order #1
      TopMenuNavigation.navigateToApp(APPLICATION_NAMES.ORDERS);
      Orders.searchByParameter(ORDER_SEARCH_OPTIONS.PO_NUMBER, testData.order1.poNumber);
      Orders.selectFromResultsList(testData.order1.poNumber);
      OrderDetails.checkOrderStatus(ORDER_STATUSES.PENDING);

      // Step 11: Try to open Order #1 - fiscal year is not current anymore
      cy.intercept('PUT', `/orders/composite-orders/${testData.order1.id}`).as('openOrder1Again');
      Orders.openOrder();
      cy.wait('@openOrder1Again').then((interception) => {
        OrderDetails.checkApiErrorResponse(interception, {
          expectedStatus: 404,
          expectedErrorCode: OrderStates.currentFiscalYearNotFound,
          expectedErrorMessage: OrderStates.currentFYearNotFoundAPIMessage,
        });
      });
      OrderLines.checkErrorToastMessage(OrderStates.noCurrentFYFoundForLedger);
      OrderDetails.checkOrderStatus(ORDER_STATUSES.PENDING);
      InteractorsTools.closeCalloutMessage();

      // Step 12: Navigate to the Fiscal year tab, change Period End Date to a day in the future
      TopMenuNavigation.navigateToApp(APPLICATION_NAMES.FINANCE);
      FinanceHelper.selectFiscalYearsNavigation();
      FinanceHelper.searchByName(testData.fiscalYear.name);
      FiscalYears.selectFY(testData.fiscalYear.name);
      FiscalYears.editFiscalYearDetails();
      FiscalYears.fillTheStartAndEndDateOnCalenderStartDateField(
        DateTools.getTwoPreviousDaysDateForFiscalYearOnUIEdit(),
        DateTools.get2DaysAfterTomorrowDateForFiscalYearOnUIEdit(),
      );
      InteractorsTools.checkCalloutMessage(States.fiscalYearSavedSuccessfully);

      // Step 13: Navigate to Orders, open Order #2
      TopMenuNavigation.navigateToApp(APPLICATION_NAMES.ORDERS);
      Orders.searchByParameter(ORDER_SEARCH_OPTIONS.PO_NUMBER, testData.order2.poNumber);
      Orders.selectFromResultsList(testData.order2.poNumber);
      OrderDetails.checkOrderStatus(ORDER_STATUSES.PENDING);

      // Step 14: Try to open Order #2 - Fund B has no current budget
      cy.intercept('PUT', `/orders/composite-orders/${testData.order2.id}`).as('openOrder2');
      Orders.openOrder();
      cy.wait('@openOrder2').then((interception) => {
        OrderDetails.checkApiErrorResponse(interception, {
          expectedStatus: 422,
          expectedErrorCode: OrderStates.budgetNotFoundForFiscalYear,
          expectedErrorMessage: OrderStates.couldNotFindActiveBudgetInCurrentFY,
        });
      });
      OrderLines.checkErrorToastMessage(
        OrderStates.noCurrentBudgetForFund(testData.fundB.code, testData.fiscalYear.code),
      );
      OrderDetails.checkOrderStatus(ORDER_STATUSES.PENDING);
    },
  );
});
