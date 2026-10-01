import {
  ACQUISITION_METHOD_NAMES_IN_PROFILE,
  APPLICATION_NAMES,
  ENCUMBRANCE_STATUSES,
  FUND_DISTRIBUTION_TYPES,
  INVOICE_STATUSES,
  INVOICE_VIEW_FIELDS,
  ORDER_STATUSES,
  TRANSACTION_DETAIL_FIELDS,
  TRANSACTION_TYPES,
} from '../../../support/constants';
import Permissions from '../../../support/dictionary/permissions';
import {
  Budgets,
  FinanceHelper,
  FundDetails,
  Funds,
  TransactionDetails,
  Transactions,
} from '../../../support/fragments/finance';
import { InvoiceLineDetails, Invoices, InvoiceView } from '../../../support/fragments/invoices';
import { BasicOrderLine, NewOrder, OrderLines, Orders } from '../../../support/fragments/orders';
import { NewOrganization, Organizations } from '../../../support/fragments/organizations';
import TopMenu from '../../../support/fragments/topMenu';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import Users from '../../../support/fragments/users/users';

describe('Finance', () => {
  describe('Transactions', () => {
    const testData = {
      organization: NewOrganization.getDefaultOrganization(),
      fiscalYear: {},
      fund: {},
      acquisitionMethodId: null,
      order: {},
      orderLine: {},
      invoices: {},
      user: {},
    };

    const createBudgetWithFundLedgerAndFiscalYear = () => {
      const { fiscalYear, fund } = Budgets.createBudgetWithFundLedgerAndFYViaApi({
        budget: { allocated: 1000 },
      });

      testData.fiscalYear = fiscalYear;
      testData.fund = fund;
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

    const createOpenOngoingOrderWithLine = () => {
      return getAcquisitionMethodId()
        .then(() => {
          return Orders.createOrderViaApi(
            NewOrder.getDefaultOngoingOrder({ vendorId: testData.organization.id }),
          );
        })
        .then((order) => {
          testData.order = order;

          return OrderLines.createOrderLineViaApi(
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
        })
        .then((orderLine) => {
          testData.orderLine = orderLine;

          return Orders.updateOrderViaApi({
            ...testData.order,
            workflowStatus: ORDER_STATUSES.OPEN,
          });
        });
    };

    const createInvoice = ({ invoiceKey, subTotal, invoiceStatus }) => {
      return OrderLines.getOrderLineByIdViaApi(testData.orderLine.id)
        .then((orderLine) => {
          return Invoices.createInvoiceWithInvoiceLineViaApi({
            vendorId: testData.organization.id,
            accountingCode: testData.organization.erpCode,
            poLineId: orderLine.id,
            fundDistributions: orderLine.fundDistribution,
            invoiceStatus: INVOICE_STATUSES.OPEN,
            subTotal,
            releaseEncumbrance: true,
            exportToAccounting: false,
          });
        })
        .then((invoice) => {
          testData.invoices[invoiceKey] = invoice;

          return Invoices.changeInvoiceStatusViaApi({ invoice, status: invoiceStatus });
        });
    };

    const createInvoices = () => {
      return createInvoice({
        invoiceKey: 'first',
        subTotal: 2,
        invoiceStatus: INVOICE_STATUSES.APPROVED,
      }).then(() => {
        return createInvoice({
          invoiceKey: 'second',
          subTotal: 3,
          invoiceStatus: INVOICE_STATUSES.PAID,
        });
      });
    };

    const createUserAndLogin = () => {
      return cy
        .createTempUser([
          Permissions.uiInvoicesCanViewInvoicesAndInvoiceLines.gui,
          Permissions.uiOrdersView.gui,
          Permissions.uiFinanceViewFundAndBudget.gui,
          Permissions.uiInvoicesCancelInvoices.gui,
          Permissions.uiFinanceUnreleaseEncumbrance.gui,
        ])
        .then((userProperties) => {
          testData.user = userProperties;

          cy.login(userProperties.username, userProperties.password, {
            path: TopMenu.fundPath,
            waiter: Funds.waitLoading,
          });
        });
    };

    before('Create test data', () => {
      cy.getAdminToken();

      cy.then(createBudgetWithFundLedgerAndFiscalYear)
        .then(createOrganization)
        .then(createOpenOngoingOrderWithLine)
        .then(createInvoices)
        .then(createUserAndLogin);
    });

    after('Delete test data', () => {
      cy.getAdminToken().then(() => {
        Users.deleteViaApi(testData.user.userId);
        Organizations.deleteOrganizationViaApi(testData.organization.id);
      });
    });

    it(
      'C1045396 Encumbrance is calculated correctly after unreleasing it manually when a paid and approved invoices NOT exceeding initial encumbrance exist (release encumbrance = true) (thunderjet)',
      { tags: ['extendedPath', 'thunderjet', 'C1045396'] },
      () => {
        // Step 1: Open the encumbrance from the transactions of the current budget of Fund A
        FinanceHelper.searchByName(testData.fund.name);
        Funds.selectFund(testData.fund.name);
        FundDetails.viewTransactionsForCurrentBudget();
        Transactions.selectTransaction(TRANSACTION_TYPES.ENCUMBRANCE);
        TransactionDetails.checkTransactionDetails({
          information: [
            { key: TRANSACTION_DETAIL_FIELDS.FISCAL_YEAR, value: testData.fiscalYear.code },
            { key: TRANSACTION_DETAIL_FIELDS.AMOUNT, value: '$0.00' },
            { key: TRANSACTION_DETAIL_FIELDS.SOURCE, value: testData.orderLine.poLineNumber },
            { key: TRANSACTION_DETAIL_FIELDS.TYPE, value: TRANSACTION_TYPES.ENCUMBRANCE },
            { key: TRANSACTION_DETAIL_FIELDS.FROM, value: testData.fund.name },
            { key: TRANSACTION_DETAIL_FIELDS.INITIAL_ENCUMBRANCE, value: '$10.00' },
            { key: TRANSACTION_DETAIL_FIELDS.AWAITING_PAYMENT, value: '$2.00' },
            { key: TRANSACTION_DETAIL_FIELDS.EXPENDED, value: '$3.00' },
            { key: TRANSACTION_DETAIL_FIELDS.STATUS, value: ENCUMBRANCE_STATUSES.RELEASED },
          ],
        });

        // Step 2: Unrelease the encumbrance
        Funds.unreleaseEncumbrance();
        TransactionDetails.checkTransactionDetails({
          information: [
            { key: TRANSACTION_DETAIL_FIELDS.AMOUNT, value: '($5.00)' },
            { key: TRANSACTION_DETAIL_FIELDS.INITIAL_ENCUMBRANCE, value: '$10.00' },
            { key: TRANSACTION_DETAIL_FIELDS.AWAITING_PAYMENT, value: '$2.00' },
            { key: TRANSACTION_DETAIL_FIELDS.EXPENDED, value: '$3.00' },
            { key: TRANSACTION_DETAIL_FIELDS.STATUS, value: ENCUMBRANCE_STATUSES.UNRELEASED },
          ],
        });

        // Step 3: Cancel Invoice #1
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVOICES);
        Invoices.selectInvoiceByNumber(testData.invoices.first.vendorInvoiceNo);
        InvoiceView.cancelInvoice();
        InvoiceView.checkInvoiceDetails({
          title: testData.invoices.first.vendorInvoiceNo,
          invoiceInformation: [
            { key: INVOICE_VIEW_FIELDS.INVOICE_STATUS, value: INVOICE_STATUSES.CANCELLED },
          ],
        });

        // Step 4: Open the encumbrance from the invoice line of Invoice #1
        InvoiceView.selectInvoiceLine();
        InvoiceLineDetails.checkFundDistibutionTableContent([
          { name: testData.fund.name, currentEncumbrance: '$7.00' },
        ]);
        InvoiceLineDetails.openEncumbrancePane();
        TransactionDetails.checkTransactionDetails({
          information: [
            { key: TRANSACTION_DETAIL_FIELDS.FISCAL_YEAR, value: testData.fiscalYear.code },
            { key: TRANSACTION_DETAIL_FIELDS.AMOUNT, value: '($7.00)' },
            { key: TRANSACTION_DETAIL_FIELDS.SOURCE, value: testData.orderLine.poLineNumber },
            { key: TRANSACTION_DETAIL_FIELDS.TYPE, value: TRANSACTION_TYPES.ENCUMBRANCE },
            { key: TRANSACTION_DETAIL_FIELDS.FROM, value: testData.fund.name },
            { key: TRANSACTION_DETAIL_FIELDS.INITIAL_ENCUMBRANCE, value: '$10.00' },
            { key: TRANSACTION_DETAIL_FIELDS.AWAITING_PAYMENT, value: '$0.00' },
            { key: TRANSACTION_DETAIL_FIELDS.EXPENDED, value: '$3.00' },
            { key: TRANSACTION_DETAIL_FIELDS.STATUS, value: ENCUMBRANCE_STATUSES.UNRELEASED },
          ],
        });

        // Step 5: Cancel Invoice #2
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVOICES);
        Invoices.selectInvoiceByNumber(testData.invoices.second.vendorInvoiceNo);
        InvoiceView.cancelInvoice();
        InvoiceView.checkInvoiceDetails({
          title: testData.invoices.second.vendorInvoiceNo,
          invoiceInformation: [
            { key: INVOICE_VIEW_FIELDS.INVOICE_STATUS, value: INVOICE_STATUSES.CANCELLED },
          ],
        });

        // Step 6: Open the encumbrance from the invoice line of Invoice #2
        InvoiceView.selectInvoiceLine();
        InvoiceLineDetails.checkFundDistibutionTableContent([
          { name: testData.fund.name, currentEncumbrance: '$10.00' },
        ]);
        InvoiceLineDetails.openEncumbrancePane();
        TransactionDetails.checkTransactionDetails({
          information: [
            { key: TRANSACTION_DETAIL_FIELDS.FISCAL_YEAR, value: testData.fiscalYear.code },
            { key: TRANSACTION_DETAIL_FIELDS.AMOUNT, value: '($10.00)' },
            { key: TRANSACTION_DETAIL_FIELDS.SOURCE, value: testData.orderLine.poLineNumber },
            { key: TRANSACTION_DETAIL_FIELDS.TYPE, value: TRANSACTION_TYPES.ENCUMBRANCE },
            { key: TRANSACTION_DETAIL_FIELDS.FROM, value: testData.fund.name },
            { key: TRANSACTION_DETAIL_FIELDS.INITIAL_ENCUMBRANCE, value: '$10.00' },
            { key: TRANSACTION_DETAIL_FIELDS.AWAITING_PAYMENT, value: '$0.00' },
            { key: TRANSACTION_DETAIL_FIELDS.EXPENDED, value: '$0.00' },
            { key: TRANSACTION_DETAIL_FIELDS.STATUS, value: ENCUMBRANCE_STATUSES.UNRELEASED },
          ],
        });
      },
    );
  });
});
