import {
  ACQUISITION_METHOD_NAMES_IN_PROFILE,
  FUND_DISTRIBUTION_TYPES,
  INVOICE_STATUSES,
  INVOICE_VIEW_FIELDS,
  ORDER_STATUSES,
} from '../../support/constants';
import CapabilitySets from '../../support/dictionary/capabilitySets';
import { Budgets, FiscalYears, Funds, Ledgers } from '../../support/fragments/finance';
import { InvoiceLineDetails, Invoices, InvoiceView } from '../../support/fragments/invoices';
import InvoiceLineEditForm from '../../support/fragments/invoices/invoiceLineEditForm';
import { BasicOrderLine, NewOrder, OrderLines, Orders } from '../../support/fragments/orders';
import { NewOrganization, Organizations } from '../../support/fragments/organizations';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import getRandomPostfix from '../../support/utils/stringTools';

describe('Invoices', () => {
  const testData = {};

  before('Create test data', () => {
    const postfix = getRandomPostfix();
    testData.ledger = {
      ...Ledgers.getDefaultLedger(),
      name: `AT_C831978_Ledger_${postfix}`,
    };
    testData.fundA = {
      ...Funds.getDefaultFund(),
      name: `AT_C831978_Fund_A_${postfix}`,
      ledgerId: testData.ledger.id,
    };
    testData.fundB = {
      ...Funds.getDefaultFund(),
      name: `AT_C831978_Fund_B_${postfix}`,
      ledgerId: testData.ledger.id,
    };
    testData.organization = {
      ...NewOrganization.getDefaultOrganization(),
      name: `AT_C831978_Organization_${postfix}`,
    };
    testData.budgets = [];

    cy.getAdminToken();
    FiscalYears.getCurrentFiscalYearOrCreateViaApi().then((fiscalYear) => {
      testData.fiscalYear = fiscalYear;

      Ledgers.createViaApi({ ...testData.ledger, fiscalYearOneId: fiscalYear.id });
      [testData.fundA, testData.fundB].forEach((fund) => {
        Funds.createViaApi(fund);
        Budgets.createViaApi({
          ...Budgets.getDefaultBudget(),
          allocated: 1000,
          fiscalYearId: fiscalYear.id,
          fundId: fund.id,
        }).then((budget) => {
          testData.budgets.push(budget);
        });
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

    // Open order with one PO line, fund distribution is Fund A
    cy.then(() => {
      Orders.createOrderViaApi(
        NewOrder.getDefaultOrder({ vendorId: testData.organization.id }),
      ).then((order) => {
        testData.order = order;

        OrderLines.createOrderLineViaApi(
          BasicOrderLine.getDefaultOrderLine({
            purchaseOrderId: order.id,
            acquisitionMethod: testData.acquisitionMethodId,
            listUnitPrice: 100,
            poLineEstimatedPrice: 100,
            fundDistribution: [
              {
                code: testData.fundA.code,
                fundId: testData.fundA.id,
                distributionType: FUND_DISTRIBUTION_TYPES.PERCENTAGE,
                value: 100,
              },
            ],
          }),
        ).then((orderLine) => {
          testData.orderLine = orderLine;

          Orders.updateOrderViaApi({ ...order, workflowStatus: ORDER_STATUSES.OPEN });
        });
      });
    });

    // Invoice based on the order, invoice line inherits PO line fund distribution with encumbrance
    cy.then(() => {
      OrderLines.getOrderLineByIdViaApi(testData.orderLine.id).then((orderLine) => {
        Invoices.createInvoiceWithInvoiceLineViaApi({
          vendorId: testData.organization.id,
          accountingCode: testData.organization.erpCode,
          fiscalYearId: testData.fiscalYear.id,
          poLineId: orderLine.id,
          invoiceStatus: INVOICE_STATUSES.OPEN,
          fundDistributions: orderLine.fundDistribution,
          subTotal: 100,
          releaseEncumbrance: true,
          exportToAccounting: false,
        }).then((invoice) => {
          testData.invoice = invoice;
        });
      });
    });

    cy.createTempUser([]).then((userProperties) => {
      testData.user = userProperties;

      cy.assignCapabilitiesToExistingUser(
        testData.user.userId,
        [],
        [CapabilitySets.uiInvoiceInvoiceEdit],
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
    Invoices.deleteInvoiceViaApi(testData.invoice.id);
    Orders.deleteOrderViaApi(testData.order.id, false);
    testData.budgets.forEach((budget) => Budgets.deleteViaApi(budget.id, false));
    Funds.deleteFundViaApi(testData.fundA.id, false);
    Funds.deleteFundViaApi(testData.fundB.id, false);
    Ledgers.deleteLedgerViaApi(testData.ledger.id, false);
    Organizations.deleteOrganizationViaApi(testData.organization.id);
  });

  it(
    'C831978 Updated fund distribution is displayed correctly in the invoice line view (thunderjet)',
    { tags: ['criticalPath', 'thunderjet', 'C831978'] },
    () => {
      // Step 1: Navigate to the invoice
      Invoices.selectInvoiceByNumber(testData.invoice.vendorInvoiceNo);
      InvoiceView.checkInvoiceDetails({
        title: testData.invoice.vendorInvoiceNo,
        invoiceInformation: [
          { key: INVOICE_VIEW_FIELDS.INVOICE_STATUS, value: INVOICE_STATUSES.OPEN },
        ],
        invoiceLines: [{ fundCode: testData.fundA.code }],
      });

      // Step 2: Open invoice line, click "Actions" button, select "Edit" option
      InvoiceView.selectInvoiceLine();
      InvoiceLineDetails.openInvoiceLineEditForm();
      InvoiceLineEditForm.checkFieldsConditions([
        {
          label: 'Fund ID',
          conditions: { singleValue: `${testData.fundA.name} (${testData.fundA.code})` },
        },
      ]);

      // Step 3: Select Fund B in "Fund ID" dropdown, click "Save & close" button
      InvoiceLineEditForm.selectFundDistribution(testData.fundB.name);
      InvoiceLineEditForm.clickSaveButton();
      InvoiceView.checkInvoiceLinesTableContent([{ fundCode: testData.fundB.code }]);

      // Step 4: Click on the invoice line record
      InvoiceView.selectInvoiceLine();
      InvoiceLineDetails.checkFundDistibutionTableContent([{ name: testData.fundB.name }]);

      // Step 5: Refresh the page
      cy.reload();
      InvoiceLineDetails.waitLoading();
      InvoiceLineDetails.checkFundDistibutionTableContent([{ name: testData.fundB.name }]);
    },
  );
});
