import {
  ACQUISITION_METHOD_NAMES_IN_PROFILE,
  COMMON_BUTTON_LABELS,
  FUND_DISTRIBUTION_TYPES,
  INVOICE_BATCH_GROUPS,
  INVOICE_PAYMENT_METHODS,
  INVOICE_STATUSES,
  INVOICE_VIEW_FIELDS,
  ORDER_LINE_SEARCH_INDEX_LABELS,
  ORDER_STATUSES,
} from '../../support/constants';
import CapabilitySets from '../../support/dictionary/capabilitySets';
import { Budgets, FiscalYears, Funds, Ledgers } from '../../support/fragments/finance';
import { InvoiceEditForm, Invoices, InvoiceView } from '../../support/fragments/invoices';
import InvoiceStates from '../../support/fragments/invoices/invoiceStates';
import SelectOrderLinesModal from '../../support/fragments/invoices/modal/selectOrderLinesModal';
import { BasicOrderLine, NewOrder, OrderLines, Orders } from '../../support/fragments/orders';
import { NewOrganization, Organizations } from '../../support/fragments/organizations';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import { CodeTools, DateTools, StringTools } from '../../support/utils';
import InteractorsTools from '../../support/utils/interactorsTools';
import getRandomPostfix from '../../support/utils/stringTools';

describe('Invoices', () => {
  const testData = {};

  before('Create test data', () => {
    const postfix = getRandomPostfix();
    testData.organization = {
      ...NewOrganization.getDefaultOrganization(),
      name: `AT_C353566_Organization_${postfix}`,
    };
    testData.invoice = {
      invoiceDate: DateTools.getCurrentDate(),
      batchGroupName: INVOICE_BATCH_GROUPS.FOLIO,
      vendorInvoiceNo: `AT_C353566_${postfix}`,
      paymentMethod: INVOICE_PAYMENT_METHODS.CASH,
    };
    // Two concurrent fiscal years of different series with the same period including today
    testData.finance = ['Alpha', 'Beta'].map((descriptor) => {
      const fiscalYear = {
        ...FiscalYears.getDefaultFiscalYear(),
        name: `AT_C353566_FY_${descriptor}_${postfix}`,
        code: `${CodeTools(4)}${StringTools.randomTwoDigitNumber()}01`,
        ...DateTools.getFullFiscalYearStartAndEnd(0),
      };
      const ledger = {
        ...Ledgers.getDefaultLedger(),
        name: `AT_C353566_Ledger_${descriptor}_${postfix}`,
        fiscalYearOneId: fiscalYear.id,
      };
      const fund = {
        ...Funds.getDefaultFund(),
        name: `AT_C353566_Fund_${descriptor}_${postfix}`,
        ledgerId: ledger.id,
      };

      return { fiscalYear, ledger, fund };
    });
    testData.orders = [];

    cy.getAdminToken();
    testData.finance.forEach(({ fiscalYear, ledger, fund }, index) => {
      FiscalYears.createViaApi(fiscalYear);
      Ledgers.createViaApi(ledger);
      Funds.createViaApi(fund);
      Budgets.createViaApi({
        ...Budgets.getDefaultBudget(),
        allocated: 1000,
        fiscalYearId: fiscalYear.id,
        fundId: fund.id,
      }).then((budget) => {
        testData.finance[index].budget = budget;
      });
    });
    Organizations.createOrganizationViaApi(testData.organization).then((id) => {
      testData.organization.id = id;
    });
    cy.getAcquisitionMethodsApi({
      query: `value="${ACQUISITION_METHOD_NAMES_IN_PROFILE.PURCHASE_AT_VENDOR_SYSTEM}"`,
    }).then(({ body }) => {
      testData.acquisitionMethodId = body.acquisitionMethods[0].id;
    });

    // Order #1 with fund "Alpha" and Order #2 with fund "Beta", both in "Open" status
    cy.then(() => {
      testData.finance.forEach(({ fund }) => {
        Orders.createOrderViaApi(
          NewOrder.getDefaultOrder({ vendorId: testData.organization.id }),
        ).then((order) => {
          testData.orders.push(order);

          OrderLines.createOrderLineViaApi(
            BasicOrderLine.getDefaultOrderLine({
              purchaseOrderId: order.id,
              acquisitionMethod: testData.acquisitionMethodId,
              listUnitPrice: 10,
              poLineEstimatedPrice: 10,
              fundDistribution: [
                {
                  code: fund.code,
                  fundId: fund.id,
                  distributionType: FUND_DISTRIBUTION_TYPES.PERCENTAGE,
                  value: 100,
                },
              ],
            }),
          );
          Orders.updateOrderViaApi({ ...order, workflowStatus: ORDER_STATUSES.OPEN });
        });
      });
    });

    cy.createTempUser([]).then((userProperties) => {
      testData.user = userProperties;

      cy.assignCapabilitiesToExistingUser(
        testData.user.userId,
        [],
        [
          CapabilitySets.uiFinanceFundBudgetView,
          CapabilitySets.uiInvoiceInvoiceApprove,
          CapabilitySets.uiInvoiceInvoiceCreate,
          CapabilitySets.uiOrdersOrdersView,
        ],
      );
      cy.login(testData.user.username, testData.user.password, {
        path: TopMenu.invoicesPath,
        waiter: Invoices.waitLoading,
      });
    });
  });

  after('Delete test data', () => {
    cy.getAdminToken();
    Users.deleteViaApi(testData.user.userId);
    Invoices.getInvoiceViaApi({
      query: `vendorInvoiceNo="${testData.invoice.vendorInvoiceNo}"`,
    }).then(({ invoices }) => {
      invoices.forEach(({ id }) => Invoices.deleteInvoiceViaApi(id));
    });
    testData.orders.forEach(({ id }) => Orders.deleteOrderViaApi(id, false));
    testData.finance.forEach(({ fiscalYear, ledger, fund, budget }) => {
      Budgets.deleteViaApi(budget.id, false);
      Funds.deleteFundViaApi(fund.id, false);
      Ledgers.deleteLedgerViaApi(ledger.id, false);
      FiscalYears.deleteFiscalYearViaApi(fiscalYear.id, false);
    });
    Organizations.deleteOrganizationViaApi(testData.organization.id);
  });

  it(
    'C353566 Correct fund validation to approve invoice (thunderjet)',
    { tags: ['extendedPath', 'thunderjet', 'C353566'] },
    () => {
      const [alpha, beta] = testData.finance;
      const [firstOrder, secondOrder] = testData.orders;

      // Step 1: Click "Actions" button on "Invoices" pane, select "New" option
      Invoices.openNewInvoiceForm();
      InvoiceEditForm.waitLoading();
      InvoiceEditForm.checkButtonsConditions([
        { label: COMMON_BUTTON_LABELS.CANCEL, conditions: { disabled: false } },
        { label: COMMON_BUTTON_LABELS.SAVE_AND_CLOSE, conditions: { disabled: true } },
      ]);

      // Step 2: Fill in all the required fields with valid data
      InvoiceEditForm.fillInvoiceFields({
        ...testData.invoice,
        vendorName: testData.organization.name,
      });
      InvoiceEditForm.checkButtonsConditions([
        { label: COMMON_BUTTON_LABELS.CANCEL, conditions: { disabled: false } },
        { label: COMMON_BUTTON_LABELS.SAVE_AND_CLOSE, conditions: { disabled: false } },
      ]);

      // Step 3: Click "Save & close" button
      InvoiceEditForm.clickSaveButton();
      InvoiceView.checkInvoiceDetails({
        title: testData.invoice.vendorInvoiceNo,
        invoiceInformation: [
          { key: INVOICE_VIEW_FIELDS.INVOICE_STATUS, value: INVOICE_STATUSES.OPEN },
        ],
        invoiceLines: [],
      });

      // Step 4: Click "Actions" button in "Invoice lines" accordion, select "Add line from POL"
      InvoiceView.openSelectOrderLineModal();

      // Step 5: Search for PO line related to Order #1
      SelectOrderLinesModal.searchByParameter(
        ORDER_LINE_SEARCH_INDEX_LABELS.POL_NUMBER,
        `${firstOrder.poNumber}-1`,
      );
      SelectOrderLinesModal.verifyModalView();

      // Step 6: Check the checkbox next to PO line and click "Save" button
      SelectOrderLinesModal.selectOrderLineByNumber(`${firstOrder.poNumber}-1`);
      SelectOrderLinesModal.clickSaveButton();
      InvoiceView.checkInvoiceDetails({
        invoiceLines: [{ poNumber: `${firstOrder.poNumber}-1` }],
      });

      // Step 7: Click "Actions" button in "Invoice lines" accordion, select "Add line from POL"
      InvoiceView.openSelectOrderLineModal();

      // Step 8: Open "DevTools" ("Network" tab)
      cy.intercept('POST', '**/invoice/invoice-lines').as('createInvoiceLine');

      // Step 9: Search for PO line related to Order #2
      SelectOrderLinesModal.searchByParameter(
        ORDER_LINE_SEARCH_INDEX_LABELS.POL_NUMBER,
        `${secondOrder.poNumber}-1`,
      );
      SelectOrderLinesModal.verifyModalView();

      // Step 10: Check the checkbox next to PO line and click "Save" button
      SelectOrderLinesModal.selectOrderLineByNumber(`${secondOrder.poNumber}-1`);
      SelectOrderLinesModal.clickSaveButton();
      InteractorsTools.checkCalloutErrorMessage(
        `Invoice line cannot be saved because Fund ${beta.fund.code} has no current budget for fiscal year ${alpha.fiscalYear.code}.`,
      );
      InvoiceView.checkInvoiceDetails({
        invoiceLines: [{ poNumber: `${firstOrder.poNumber}-1` }],
      });

      // Step 11: Check 404 response for "invoice-line" request
      cy.wait('@createInvoiceLine').then((interception) => {
        InvoiceView.checkErrorInvoiceApiResponse(interception, {
          expectedStatus: 404,
          expectedMessage: InvoiceStates.activeBudgetNotFoundMessage,
          expectedErrorCode: InvoiceStates.budgetNotFoundCode,
          expectedFundId: beta.fund.id,
          expectedFiscalYearId: alpha.fiscalYear.id,
        });
      });
    },
  );
});
