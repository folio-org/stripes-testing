import {
  FUND_DISTRIBUTION_TYPES,
  INVOICE_LINE_VIEW_FIELDS,
  INVOICE_STATUSES,
  INVOICE_VIEW_FIELDS,
  ORDER_STATUSES,
  ORDER_TYPES,
  TRANSACTION_DETAIL_FIELDS,
} from '../../support/constants';
import Permissions from '../../support/dictionary/permissions';
import {
  Budgets,
  FiscalYears,
  Funds,
  Ledgers,
  TransactionDetails,
  Transactions,
} from '../../support/fragments/finance';
import { BasicOrderLine, NewOrder, OrderLines, Orders } from '../../support/fragments/orders';
import InvoiceStates from '../../support/fragments/invoices/invoiceStates';
import { InvoiceLineDetails, Invoices, InvoiceView } from '../../support/fragments/invoices';
import DuplicateInvoiceModal from '../../support/fragments/invoices/modal/duplicateInvoiceModal';
import { Organizations, NewOrganization } from '../../support/fragments/organizations';
import { BatchGroups } from '../../support/fragments/settings/invoices';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import { DateTools, ExecutionFlowManager } from '../../support/utils';
import InteractorsTools from '../../support/utils/interactorsTools';
import { calloutTypes } from '../../../interactors';

const R = {
  LOCALE: 'locale',
  ORGANIZATION: 'organization',
  FISCAL_YEAR: 'fiscalYear',
  LEDGER: 'ledger',
  FUND_A: 'fundA',
  FUND_B: 'fundB',
  BUDGET_A: 'budgetA',
  BUDGET_B: 'budgetB',
  BATCH_GROUP: 'batchGroup',
  INVOICE: 'invoice',
  ORDER_2: 'order2',
  ORDER_3: 'order3',
  ORDER_LINE_2: 'orderLine2',
  ORDER_LINE_3: 'orderLine3',
  INVOICE_LINE_1: 'invoiceLine1',
  INVOICE_LINE_2: 'invoiceLine2',
  INVOICE_LINE_3: 'invoiceLine3',
  EXPECTED_SUBTOTAL: 'expectedSubtotal',
  USER: 'user',
  DUPLICATE_INVOICE_ID: 'duplicateInvoiceId',
};

describe('Invoices', () => {
  const flow = new ExecutionFlowManager();

  before('Create C514972 preconditions', () => {
    cy.getAdminToken();
    cy.getTenantLocaleApi().then((locale) => flow.set(R.LOCALE, locale));

    const steps = getPreconditionSteps(); // eslint-disable-line no-use-before-define

    flow
      .step(steps.createFundsAndBudgets)
      .step(steps.createOpenInvoiceWithThreeLines)
      .step(steps.checkFundABudgetHasNoTransactions)
      .step(steps.deleteFundABudget)
      .step(steps.createAndLoginUserWithPermissions);
  });

  after('Delete C514972 data', () => {
    cy.getAdminToken();
    flow.cleanup();
  });

  it(
    'C514972 Duplicate invoice in "Open" status with three invoice lines, a budget for the fund related to the first and second invoice line was deleted (thunderjet)',
    { tags: ['extendedPath', 'thunderjet', 'C514972'] },
    () => {
      cy.wait(2000);
      const {
        expectedSubtotal,
        fiscalYear,
        fundB,
        invoice,
        invoiceLine3,
        locale,
        orderLine3,
        user,
      } = flow.ctx();

      cy.log('<--- STEP 1 --->');
      Invoices.selectDuplicateInvoice();
      DuplicateInvoiceModal.verifyModalView();

      cy.log('<--- STEP 2-3 --->');
      cy.intercept('POST', '/invoice/invoices*').as('createDuplicateInvoice');
      DuplicateInvoiceModal.clickDuplicateButton();
      cy.wait('@createDuplicateInvoice');

      InteractorsTools.assertCalloutsBatch([
        { message: InvoiceStates.saveLineErrorBudgetNotFoundByFundId, type: calloutTypes.error },
        { message: InvoiceStates.saveLineErrorBudgetNotFoundByFundId, type: calloutTypes.error },
        { message: InvoiceStates.invoiceDuplicatedMessage, type: calloutTypes.success },
      ]);
      InvoiceView.waitLoading();
      InvoiceView.checkInvoiceDetails({
        title: invoice.vendorInvoiceNo,
        invoiceInformation: [
          { key: INVOICE_VIEW_FIELDS.INVOICE_STATUS, value: INVOICE_STATUSES.OPEN },
        ],
        invoiceLines: [
          {
            poNumber: orderLine3.poLineNumber,
            fund: fundB.name,
            subTotal: expectedSubtotal,
          },
        ],
      });
      InvoiceView.toggleMetadataAccordion();
      cy.get('@createDuplicateInvoice').then(({ response }) => {
        InvoiceView.verifyMetadataContent({
          created: DateTools.getFormattedDateTimeInTimezoneForMetadata(
            new Date(response.body.metadata.createdDate),
            locale.timezone,
            locale.locale,
          ),
          createdBy: user.username,
        });
      });
      InteractorsTools.closeAllVisibleCallouts();

      cy.log('<--- STEP 4 --->');
      InvoiceView.selectInvoiceLine();
      InvoiceLineDetails.waitLoading();
      InvoiceLineDetails.assertPOLineLink(orderLine3.poLineNumber);
      InvoiceLineDetails.checkInvoiceLineDetails({
        invoiceLineInformation: [
          { key: INVOICE_LINE_VIEW_FIELDS.DESCRIPTION, value: invoiceLine3.description },
          { key: INVOICE_LINE_VIEW_FIELDS.PO_LINE_NUMBER, value: orderLine3.poLineNumber },
          { key: INVOICE_LINE_VIEW_FIELDS.QUANTITY, value: invoiceLine3.quantity },
          { key: INVOICE_LINE_VIEW_FIELDS.SUB_TOTAL, value: invoiceLine3.subTotal },
        ],
      });

      cy.log('<--- STEP 5 --->');
      InvoiceLineDetails.openEncumbrancePane(fundB.name);
      TransactionDetails.waitLoading();
      TransactionDetails.checkTransactionDetails({
        information: [
          { key: TRANSACTION_DETAIL_FIELDS.FISCAL_YEAR, value: fiscalYear.code },
          { key: TRANSACTION_DETAIL_FIELDS.FROM, value: fundB.name },
          { key: TRANSACTION_DETAIL_FIELDS.AMOUNT, value: expectedSubtotal },
        ],
      });
    },
  );
});

function getPreconditionSteps() {
  const createFundDistribution = (fund, value = 100) => [
    {
      code: fund.code,
      distributionType: FUND_DISTRIBUTION_TYPES.PERCENTAGE,
      fundId: fund.id,
      value,
    },
  ];

  const createOrderAndLine = ({ flow, orderKey, orderLineKey, fundDistributions, amount = 20 }) => {
    const cleanupLine = (orderLineId) => OrderLines.deleteOrderLineViaApi(orderLineId, false);

    return Orders.createOrderViaApi(
      NewOrder.getDefaultOrder({
        orderType: ORDER_TYPES.ONE_TIME_API,
        vendorId: flow.get(R.ORGANIZATION).id,
      }),
    )
      .then((createdOrder) => {
        flow.set(orderKey, createdOrder, () => Orders.deleteOrderViaApi(createdOrder.id, false));

        return cy.getAcquisitionMethodsApi();
      })
      .then(({ body }) => {
        const acquisitionMethodId = body.acquisitionMethods[0].id;
        const orderLine = BasicOrderLine.getDefaultOrderLine({
          acquisitionMethod: acquisitionMethodId,
          fundDistribution: fundDistributions,
          listUnitPrice: amount,
          poLineEstimatedPrice: amount,
          purchaseOrderId: flow.get(orderKey).id,
          quantity: 1,
        });

        return OrderLines.createOrderLineViaApi(orderLine).then((createdOrderLine) => flow.set(orderLineKey, createdOrderLine));
      })
      .then(() => {
        Orders.updateOrderViaApi({
          ...flow.get(orderKey),
          workflowStatus: ORDER_STATUSES.OPEN,
        });
      })
      .then(() => {
        OrderLines.getOrderLineByIdViaApi(flow.get(orderLineKey).id).then((orderLine) => flow.set(orderLineKey, orderLine, cleanupLine.bind(null, orderLine.id)));
      });
  };

  const createInvoiceLine = ({ flow, key, poLineId, fundDistributions, subTotal, description }) => {
    const invoice = flow.get(R.INVOICE);
    const organization = flow.get(R.ORGANIZATION);

    return Invoices.createInvoiceLineViaApi(
      Invoices.getDefaultInvoiceLine({
        accountingCode: organization.erpCode,
        description,
        fundDistributions,
        invoiceId: invoice.id,
        invoiceLineStatus: invoice.status,
        poLineId,
        releaseEncumbrance: true,
        subTotal,
      }),
    ).then((invoiceLine) => {
      flow.set(key, invoiceLine, () => Invoices.deleteInvoiceLineViaApi(invoiceLine.id, { failOnStatusCode: false }));
      return invoiceLine;
    });
  };

  return {
    createFundsAndBudgets: (flow) => {
      const locale = flow.get(R.LOCALE);

      return FiscalYears.createViaApi({
        ...FiscalYears.getDefaultFiscalYear(),
        currency: locale.currency,
      })
        .then((createdFiscalYear) => {
          flow.set(R.FISCAL_YEAR, createdFiscalYear, () => FiscalYears.deleteFiscalYearViaApi(createdFiscalYear.id, false));

          return Ledgers.createViaApi({
            ...Ledgers.getDefaultLedger(),
            fiscalYearOneId: createdFiscalYear.id,
          });
        })
        .then((ledger) => {
          flow.set(R.LEDGER, ledger, () => Ledgers.deleteLedgerViaApi(ledger.id, false));

          return Funds.createViaApi({
            ...Funds.getDefaultFund(),
            ledgerId: ledger.id,
          });
        })
        .then(({ fund }) => {
          flow.set(R.FUND_A, fund, () => Funds.deleteFundViaApi(fund.id, false));

          return Budgets.createViaApi({
            ...Budgets.getDefaultBudget(),
            allocated: 100,
            fiscalYearId: flow.get(R.FISCAL_YEAR).id,
            fundId: fund.id,
          });
        })
        .then((budget) => {
          flow.set(R.BUDGET_A, budget, () => Budgets.deleteViaApi(budget.id, false));

          return Funds.createViaApi({
            ...Funds.getDefaultFund(),
            ledgerId: flow.get(R.LEDGER).id,
          });
        })
        .then(({ fund }) => {
          flow.set(R.FUND_B, fund, () => Funds.deleteFundViaApi(fund.id, false));

          return Budgets.createViaApi({
            ...Budgets.getDefaultBudget(),
            allocated: 100,
            fiscalYearId: flow.get(R.FISCAL_YEAR).id,
            fundId: fund.id,
          });
        })
        .then((budget) => {
          flow.set(R.BUDGET_B, budget, () => Budgets.deleteViaApi(budget.id, false));
        });
    },

    createOpenInvoiceWithThreeLines: (flow) => {
      const organization = {
        ...NewOrganization.defaultUiOrganizations,
        isVendor: true,
      };

      return Organizations.createOrganizationViaApi(organization)
        .then((organizationId) => {
          flow.set(R.ORGANIZATION, { ...organization, id: organizationId }, () => Organizations.deleteOrganizationViaApi(organizationId));

          return BatchGroups.getBatchGroupsViaApi();
        })
        .then((batchGroups) => {
          flow.set(R.BATCH_GROUP, batchGroups[0]);

          return Invoices.createInvoiceViaApi({
            accountingCode: flow.get(R.ORGANIZATION).erpCode,
            batchGroupId: batchGroups[0].id,
            fiscalYearId: flow.get(R.FISCAL_YEAR).id,
            invoiceStatus: INVOICE_STATUSES.OPEN,
            vendorId: flow.get(R.ORGANIZATION).id,
          });
        })
        .then((invoice) => {
          flow.set(R.INVOICE, invoice, () => Invoices.deleteInvoiceViaApi(invoice.id, { failOnStatusCode: false }));

          return createInvoiceLine({
            description: 'line #1 without POL, Fund A',
            flow,
            fundDistributions: createFundDistribution(flow.get(R.FUND_A)),
            key: R.INVOICE_LINE_1,
            subTotal: 5,
          });
        })
        .then(() => {
          return createOrderAndLine({
            flow,
            fundDistributions: [],
            orderKey: R.ORDER_2,
            orderLineKey: R.ORDER_LINE_2,
          });
        })
        .then(() => {
          return createInvoiceLine({
            description: 'line #2 with related POL and Fund A',
            flow,
            fundDistributions: createFundDistribution(flow.get(R.FUND_A)),
            key: R.INVOICE_LINE_2,
            poLineId: flow.get(R.ORDER_LINE_2).id,
            subTotal: 10,
          });
        })
        .then(() => {
          return createOrderAndLine({
            flow,
            fundDistributions: createFundDistribution(flow.get(R.FUND_B)),
            orderKey: R.ORDER_3,
            orderLineKey: R.ORDER_LINE_3,
            amount: 20,
          });
        })
        .then(() => {
          return createInvoiceLine({
            description: 'line #3 with related POL and Fund B',
            flow,
            fundDistributions: flow.get(R.ORDER_LINE_3).fundDistribution,
            key: R.INVOICE_LINE_3,
            poLineId: flow.get(R.ORDER_LINE_3).id,
            subTotal: 20,
          });
        })
        .then((line3) => {
          flow.set(R.EXPECTED_SUBTOTAL, line3.subTotal);
        });
    },

    checkFundABudgetHasNoTransactions: (flow) => {
      Transactions.getTransactionsViaApi({ query: `budgetId=="${flow.get(R.BUDGET_A).id}"` }).then(
        (transactions) => {
          expect(transactions || []).to.have.length(0);
        },
      );
    },

    deleteFundABudget: (flow) => {
      return Budgets.deleteViaApi(flow.get(R.BUDGET_A).id, false);
    },

    createAndLoginUserWithPermissions: (flow) => {
      return cy
        .createTempUser([
          Permissions.uiFinanceViewFundAndBudget.gui,
          Permissions.viewEditCreateInvoiceInvoiceLine.gui,
        ])
        .then((user) => {
          flow.set(R.USER, user, () => Users.deleteViaApi(user.userId));

          cy.login(user.username, user.password, {
            path: `${TopMenu.invoicesPath}/view/${flow.get(R.INVOICE).id}`,
            waiter: InvoiceView.waitLoading,
          });
        });
    },

    openOriginalInvoiceDetails: (flow) => {
      Invoices.searchByNumber(flow.get(R.INVOICE).vendorInvoiceNo);
      Invoices.selectInvoice(flow.get(R.INVOICE).vendorInvoiceNo);
      InvoiceView.waitLoading();
    },
  };
}
