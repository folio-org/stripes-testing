import {
  ACQUISITION_METHOD_NAMES_IN_PROFILE,
  APPLICATION_NAMES,
  INVOICE_STATUSES,
  LOCATION_NAMES,
  ORDER_STATUSES,
} from '../../support/constants';
import Permissions from '../../support/dictionary/permissions';
import { BudgetDetails, Budgets, Funds } from '../../support/fragments/finance';
import {
  InvoiceLineEditForm,
  InvoiceNewForm,
  Invoices,
  InvoiceView,
  NewInvoice,
} from '../../support/fragments/invoices';
import InvoiceLineDetails from '../../support/fragments/invoices/invoiceLineDetails';
import { BasicOrderLine, NewOrder, OrderLines, Orders } from '../../support/fragments/orders';
import { NewOrganization, Organizations } from '../../support/fragments/organizations';
import ExpenseClasses from '../../support/fragments/settings/finance/expenseClasses';
import TopMenuNavigation from '../../support/fragments/topMenuNavigation';
import Users from '../../support/fragments/users/users';
import getRandomPostfix from '../../support/utils/stringTools';

describe('Invoices', () => {
  const organization = NewOrganization.getDefaultOrganization();
  const testData = {
    organization,
    user: {},
  };
  const invoice = { ...NewInvoice.defaultUiInvoice };
  const expenseClass1 = { ...ExpenseClasses.getDefaultExpenseClass() };
  const expenseClass2 = {
    ...ExpenseClasses.getDefaultExpenseClass(),
    name: `autotest_class_2_name_${getRandomPostfix()}`,
  };

  before('Setup test data', () => {
    cy.getAdminToken();
    ExpenseClasses.createExpenseClassViaApi(expenseClass1).then((ec1) => {
      testData.expenseClass1 = ec1;

      ExpenseClasses.createExpenseClassViaApi(expenseClass2).then((ec2) => {
        testData.expenseClass2 = ec2;

        const { fiscalYear, fund } = Budgets.createBudgetWithFundLedgerAndFYViaApi({
          budget: {
            allocated: 100,
            statusExpenseClasses: [
              {
                status: 'Active',
                expenseClassId: testData.expenseClass1.id,
              },
              {
                status: 'Active',
                expenseClassId: testData.expenseClass2.id,
              },
            ],
          },
        });
        testData.fiscalYear = fiscalYear;
        testData.fund = fund;
      });
    });

    Organizations.createOrganizationViaApi(testData.organization).then((orgResp) => {
      testData.organization.id = orgResp;
      invoice.accountingCode = organization.erpCode;

      cy.getLocations({ query: `name="${LOCATION_NAMES.ANNEX_UI}"` }).then((locationResp) => {
        cy.getAcquisitionMethodsApi({
          query: `value="${ACQUISITION_METHOD_NAMES_IN_PROFILE.PURCHASE_AT_VENDOR_SYSTEM}"`,
        }).then((amResp) => {
          cy.getBookMaterialType().then((mtypeResp) => {
            testData.order = {
              ...NewOrder.getDefaultOrder({ vendorId: testData.organization.id }),
              reEncumber: true,
              approved: true,
            };
            const orderLine = {
              ...BasicOrderLine.defaultOrderLine,
              cost: {
                listUnitPrice: 20.0,
                currency: 'USD',
                discountType: 'percentage',
                quantityPhysical: 1,
                poLineEstimatedPrice: 20.0,
              },
              fundDistribution: [
                {
                  code: testData.fund.code,
                  fundId: testData.fund.id,
                  value: 100,
                },
              ],
              locations: [{ locationId: locationResp.id, quantity: 1, quantityPhysical: 1 }],
              acquisitionMethod: amResp.body.acquisitionMethods[0].id,
              physical: {
                createInventory: 'Instance, Holding, Item',
                materialType: mtypeResp.id,
                materialSupplier: orgResp.id,
                volumes: [],
              },
            };

            Orders.createOrderViaApi(testData.order).then((orderResp) => {
              testData.order.id = orderResp.id;
              testData.orderNumber = orderResp.poNumber;
              orderLine.purchaseOrderId = orderResp.id;

              OrderLines.createOrderLineViaApi(orderLine);
              Orders.updateOrderViaApi({
                ...orderResp,
                workflowStatus: ORDER_STATUSES.OPEN,
              });
            });
          });
        });
      });
    });
    cy.getBatchGroups().then((bgResp) => {
      invoice.batchGroup = bgResp.name;
    });

    cy.createTempUser([
      Permissions.uiInvoicesApproveInvoices.gui,
      Permissions.viewEditCreateInvoiceInvoiceLine.gui,
      Permissions.uiFinanceViewFundAndBudget.gui,
      Permissions.uiInvoicesPayInvoices.gui,
    ]).then((userProperties) => {
      testData.user = userProperties;

      cy.login(userProperties.username, userProperties.password);
      TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVOICES);
      Invoices.waitLoading();
    });
  });

  after('Clean up test data', () => {
    cy.getAdminToken();
    Users.deleteViaApi(testData.user.userId);
    Organizations.deleteOrganizationViaApi(testData.organization.id);
  });

  it(
    'C15859 Pay an invoice with multiple "Expense classes" assigned to it (thunderjet)',
    { tags: ['criticalPath', 'thunderjet', 'C15859'] },
    () => {
      Invoices.openNewInvoiceForm();
      InvoiceNewForm.createInvoice({
        status: invoice.status,
        invoiceDate: invoice.invoiceDate,
        invoiceNumber: invoice.invoiceNumber,
        vendorName: organization.name,
        accountingCode: invoice.accountingCode,
        batchGroup: invoice.batchGroup,
        paymentMethod: 'Cash',
      });
      Invoices.createInvoiceLineFromPol(testData.orderNumber);
      Invoices.selectInvoiceLine();
      InvoiceLineDetails.waitLoading();
      InvoiceLineDetails.openInvoiceLineEditForm();
      InvoiceLineEditForm.configureFundDistribution(0, {
        expenseClass: expenseClass1.name,
        value: '50',
      });
      InvoiceLineEditForm.clickAddFundDistributionButton();
      InvoiceLineEditForm.configureFundDistribution(1, {
        fund: `${testData.fund.name} (${testData.fund.code})`,
        expenseClass: expenseClass2.name,
        value: '50',
      });
      InvoiceLineEditForm.clickSaveButton();
      InvoiceView.approveInvoice();
      InvoiceView.checkInvoiceDetails({
        invoiceInformation: [
          { key: 'Fiscal year', value: testData.fiscalYear.code },
          { key: 'Status', value: INVOICE_STATUSES.APPROVED },
        ],
      });
      InvoiceView.selectInvoiceLine();
      InvoiceLineDetails.waitLoading();
      InvoiceLineDetails.openFundDetailsPane(testData.fund.name);
      Funds.selectBudgetDetails();
      BudgetDetails.checkBudgetDetails({
        summary: [{ key: 'Awaiting payment', value: '$20.00' }],
      });
      Funds.viewTransactions();
      Funds.checkTransactionCount('Pending payment', 2);

      TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVOICES);
      Invoices.waitLoading();
      Invoices.searchByNumber(invoice.invoiceNumber);
      Invoices.selectInvoice(invoice.invoiceNumber);
      InvoiceView.payInvoice();
      InvoiceView.checkInvoiceDetails({
        invoiceInformation: [{ key: 'Status', value: INVOICE_STATUSES.PAID }],
      });
      InvoiceView.selectInvoiceLine();
      InvoiceLineDetails.waitLoading();
      InvoiceLineDetails.openFundDetailsPane(testData.fund.name, 0);
      Funds.selectBudgetDetails();
      BudgetDetails.checkBudgetDetails({
        summary: [{ key: 'Expended', value: '$20.00' }],
      });
      Funds.viewTransactions();
      Funds.checkTransactionCount('Payment', 2);
    },
  );
});
