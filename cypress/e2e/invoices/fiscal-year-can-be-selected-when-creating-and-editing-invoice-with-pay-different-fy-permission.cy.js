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
import SelectOrderLinesModal from '../../support/fragments/invoices/modal/selectOrderLinesModal';
import { BasicOrderLine, NewOrder, OrderLines, Orders } from '../../support/fragments/orders';
import { NewOrganization, Organizations } from '../../support/fragments/organizations';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import { CodeTools, DateTools } from '../../support/utils';
import getRandomPostfix from '../../support/utils/stringTools';

describe('Invoices', () => {
  const testData = {};

  before('Create test data', () => {
    const postfix = getRandomPostfix();
    const currentYear = new Date().getFullYear();
    testData.fiscalYearSeries = CodeTools(4);
    testData.fiscalYears = {
      // Fiscal year #1 - past period
      first: {
        ...FiscalYears.getDefaultFiscalYear(),
        name: `AT_C387522_FiscalYear_1_${postfix}`,
        code: `${testData.fiscalYearSeries}${currentYear - 1}`,
        ...DateTools.getFullFiscalYearStartAndEnd(-1),
      },
      // Fiscal year #2 - period includes today's date
      second: {
        ...FiscalYears.getDefaultFiscalYear(),
        name: `AT_C387522_FiscalYear_2_${postfix}`,
        code: `${testData.fiscalYearSeries}${currentYear}`,
        ...DateTools.getFullFiscalYearStartAndEnd(0),
      },
    };
    testData.ledger = {
      ...Ledgers.getDefaultLedger(),
      name: `AT_C387522_Ledger_${postfix}`,
      fiscalYearOneId: testData.fiscalYears.first.id,
      restrictExpenditures: true,
    };
    testData.fund = {
      ...Funds.getDefaultFund(),
      name: `AT_C387522_Fund_A_${postfix}`,
      ledgerId: testData.ledger.id,
    };
    testData.organization = {
      ...NewOrganization.getDefaultOrganization(),
      name: `AT_C387522_Organization_${postfix}`,
    };
    testData.invoice = {
      invoiceDate: DateTools.getCurrentDate(),
      status: INVOICE_STATUSES.OPEN,
      batchGroupName: INVOICE_BATCH_GROUPS.FOLIO,
      vendorInvoiceNo: `AT_C387522_${postfix}`,
      paymentMethod: INVOICE_PAYMENT_METHODS.CASH,
    };

    cy.getAdminToken();
    FiscalYears.createViaApi(testData.fiscalYears.first);
    FiscalYears.createViaApi(testData.fiscalYears.second);
    Ledgers.createViaApi(testData.ledger);
    Funds.createViaApi(testData.fund);
    Budgets.createViaApi({
      ...Budgets.getDefaultBudget(),
      allocated: 1000,
      fiscalYearId: testData.fiscalYears.second.id,
      fundId: testData.fund.id,
    }).then((budget) => {
      testData.budget = budget;
    });
    Organizations.createOrganizationViaApi(testData.organization).then((id) => {
      testData.organization.id = id;
    });
    cy.getAcquisitionMethodsApi({
      query: `value="${ACQUISITION_METHOD_NAMES_IN_PROFILE.PURCHASE_AT_VENDOR_SYSTEM}"`,
    }).then(({ body }) => {
      testData.acquisitionMethodId = body.acquisitionMethods[0].id;
    });

    // One-time order in "Open" status with one PO line, "Re-encumber" is active, Fund A
    cy.then(() => {
      Orders.createOrderViaApi({
        ...NewOrder.getDefaultOrder({ vendorId: testData.organization.id }),
        reEncumber: true,
      }).then((order) => {
        testData.order = order;

        OrderLines.createOrderLineViaApi(
          BasicOrderLine.getDefaultOrderLine({
            purchaseOrderId: order.id,
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
        Orders.updateOrderViaApi({ ...order, workflowStatus: ORDER_STATUSES.OPEN });
      });
    });

    cy.createTempUser([]).then((userProperties) => {
      testData.user = userProperties;

      cy.assignCapabilitiesToExistingUser(
        testData.user.userId,
        [],
        [CapabilitySets.uiInvoiceInvoiceCreate, CapabilitySets.uiInvoiceInvoicePayDifferentFy],
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
    Orders.deleteOrderViaApi(testData.order.id, false);
    Budgets.deleteViaApi(testData.budget.id, false);
    Funds.deleteFundViaApi(testData.fund.id, false);
    Ledgers.deleteLedgerViaApi(testData.ledger.id, false);
    FiscalYears.deleteFiscalYearViaApi(testData.fiscalYears.first.id, false);
    FiscalYears.deleteFiscalYearViaApi(testData.fiscalYears.second.id, false);
    Organizations.deleteOrganizationViaApi(testData.organization.id);
  });

  it(
    'C387522 Fiscal year can be selected when user with "Invoice: Pay invoices in a different fiscal year" permission is creating and editing invoice (thunderjet)',
    { tags: ['extendedPath', 'thunderjet', 'C387522'] },
    () => {
      const poLineNumber = `${testData.order.poNumber}-1`;
      const { first: fiscalYearFirst, second: fiscalYearSecond } = testData.fiscalYears;

      // Step 1: Click "Actions" button on "Invoices" pane, select "New" option
      Invoices.openNewInvoiceForm();
      InvoiceEditForm.waitLoading();
      InvoiceEditForm.checkFiscalYearIsAbsent();
      InvoiceEditForm.checkButtonsConditions([
        { label: COMMON_BUTTON_LABELS.CANCEL, conditions: { disabled: false } },
        { label: COMMON_BUTTON_LABELS.SAVE_AND_CLOSE, conditions: { disabled: true } },
      ]);

      // Step 2: Fill all mandatory fields with valid values
      InvoiceEditForm.fillInvoiceFields({
        ...testData.invoice,
        vendorName: testData.organization.name,
      });
      InvoiceEditForm.checkButtonsConditions([
        { label: COMMON_BUTTON_LABELS.SAVE_AND_CLOSE, conditions: { disabled: false } },
      ]);

      // Step 3-4: Expand "Fiscal year" dropdown, start typing existing fiscal year name
      InvoiceEditForm.checkFiscalYearOptions({
        filter: testData.fiscalYearSeries,
        options: [fiscalYearSecond.code, fiscalYearFirst.code],
      });

      // Step 5: Select any fiscal year other than "Fiscal year #2"
      InvoiceEditForm.fillInvoiceFields({ fiscalYear: fiscalYearFirst.code });

      // Step 6: Click "Save & close" button
      InvoiceEditForm.clickSaveButton();
      InvoiceView.checkInvoiceDetails({
        title: testData.invoice.vendorInvoiceNo,
        invoiceInformation: [{ key: INVOICE_VIEW_FIELDS.FISCAL_YEAR, value: fiscalYearFirst.code }],
      });

      // Step 7: Click "Actions" button, select "Edit" option
      InvoiceView.openInvoiceEditForm();
      InvoiceEditForm.checkButtonsConditions([
        { label: COMMON_BUTTON_LABELS.CANCEL, conditions: { disabled: false } },
        { label: COMMON_BUTTON_LABELS.SAVE_AND_CLOSE, conditions: { disabled: true } },
      ]);

      // Step 8: Click on the dropdown below "Fiscal year" field
      InvoiceEditForm.checkFiscalYearOptions({
        filter: testData.fiscalYearSeries,
        options: [fiscalYearSecond.code, fiscalYearFirst.code],
      });

      // Step 9: Select "Fiscal year #2"
      InvoiceEditForm.fillInvoiceFields({ fiscalYear: fiscalYearSecond.code });
      InvoiceEditForm.checkButtonsConditions([
        { label: COMMON_BUTTON_LABELS.SAVE_AND_CLOSE, conditions: { disabled: false } },
      ]);

      // Step 10: Click "Save & close" button
      InvoiceEditForm.clickSaveButton();
      InvoiceView.checkInvoiceDetails({
        invoiceInformation: [
          { key: INVOICE_VIEW_FIELDS.FISCAL_YEAR, value: fiscalYearSecond.code },
        ],
      });

      // Step 11: Click "Actions" in "Invoice lines" accordion, select "Add line from POL"
      InvoiceView.openSelectOrderLineModal();

      // Step 12: Search for PO line from Preconditions and mark the checkbox next to it
      SelectOrderLinesModal.searchByParameter(
        ORDER_LINE_SEARCH_INDEX_LABELS.POL_NUMBER,
        poLineNumber,
      );
      SelectOrderLinesModal.selectOrderLineByNumber(poLineNumber);
      SelectOrderLinesModal.checkOrderLineSelected();

      // Step 13: Click "Save" button
      SelectOrderLinesModal.clickSaveButton();
      InvoiceView.checkInvoiceDetails({
        invoiceInformation: [
          { key: INVOICE_VIEW_FIELDS.FISCAL_YEAR, value: fiscalYearSecond.code },
          { key: INVOICE_VIEW_FIELDS.INVOICE_STATUS, value: INVOICE_STATUSES.OPEN },
        ],
        invoiceLines: [{ poNumber: poLineNumber }],
      });
    },
  );
});
