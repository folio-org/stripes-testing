import Approvals from '../../support/fragments/settings/invoices/approvals';
import ApproveInvoiceModal from '../../support/fragments/invoices/modal/approveInvoiceModal';
import { Budgets, FiscalYears, Funds, Ledgers } from '../../support/fragments/finance';
import { BasicOrderLine, NewOrder, OrderLines, Orders } from '../../support/fragments/orders';
import { CodeTools, DateTools, StringTools } from '../../support/utils';
import InteractorsTools from '../../support/utils/interactorsTools';
import InvoiceLineDetails from '../../support/fragments/invoices/invoiceLineDetails';
import InvoiceStates from '../../support/fragments/invoices/invoiceStates';
import { InvoiceView, Invoices } from '../../support/fragments/invoices';
import { NewOrganization, Organizations } from '../../support/fragments/organizations';
import Permissions from '../../support/dictionary/permissions';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import {
  ADJUSTMENT_DISTRIBUTION_TYPES,
  ADJUSTMENT_PRORATE,
  ADJUSTMENT_RELATION_TO_TOTAL,
  ACQUISITION_METHOD_NAMES_IN_PROFILE,
  FUND_DISTRIBUTION_TYPES,
  INVOICE_STATUSES,
  INVOICE_VIEW_FIELDS,
  ORDER_STATUSES,
  ORDER_TYPES,
  POL_CREATE_INVENTORY_SETTINGS,
} from '../../support/constants';

describe('Invoices', () => {
  const code = CodeTools(4);
  const testData = {
    fiscalYear: {
      ...FiscalYears.getDefaultFiscalYear(),
      code: `${code}${StringTools.randomFourDigitNumber()}`,
      ...DateTools.getFullFiscalYearStartAndEnd(0),
    },
    ledger: {},
    fundA: {},
    fundB: {},
    budgetA: {},
    budgetB: {},
    organization: {},
    order: {},
    orderLine: {},
    invoice: {},
    invoiceLine: {},
    user: {},
  };

  const createFinanceData = () => {
    return FiscalYears.createViaApi(testData.fiscalYear).then((fiscalYearResponse) => {
      testData.fiscalYear = fiscalYearResponse;

      const ledger = {
        ...Ledgers.defaultUiLedger,
        fiscalYearOneId: testData.fiscalYear.id,
        restrictExpenditures: true,
      };

      return Ledgers.createViaApi(ledger).then((ledgerResponse) => {
        testData.ledger = ledgerResponse;

        const fundA = {
          ...Funds.getDefaultFund(),
          ledgerId: ledgerResponse.id,
        };

        return Funds.createViaApi(fundA).then((fundAResponse) => {
          testData.fundA = fundAResponse.fund;

          const budgetA = {
            ...Budgets.getDefaultBudget(),
            fiscalYearId: testData.fiscalYear.id,
            fundId: fundAResponse.fund.id,
            allocated: 100,
          };

          return Budgets.createViaApi(budgetA).then((budgetAResponse) => {
            testData.budgetA = budgetAResponse;

            const fundB = {
              ...Funds.getDefaultFund(),
              ledgerId: ledgerResponse.id,
            };

            return Funds.createViaApi(fundB).then((fundBResponse) => {
              testData.fundB = fundBResponse.fund;

              const budgetB = {
                ...Budgets.getDefaultBudget(),
                fiscalYearId: testData.fiscalYear.id,
                fundId: fundBResponse.fund.id,
                allocated: 100,
              };

              return Budgets.createViaApi(budgetB).then((budgetBResponse) => {
                testData.budgetB = budgetBResponse;
              });
            });
          });
        });
      });
    });
  };

  const createOrderLine = (purchaseOrderId, acquisitionMethodId) => {
    return {
      ...BasicOrderLine.defaultOrderLine,
      purchaseOrderId,
      cost: {
        listUnitPrice: 50,
        currency: 'USD',
        quantityPhysical: 1,
        poLineEstimatedPrice: 50,
      },
      fundDistribution: [
        {
          code: testData.fundA.code,
          fundId: testData.fundA.id,
          distributionType: FUND_DISTRIBUTION_TYPES.AMOUNT,
          value: 25,
        },
        {
          code: testData.fundB.code,
          fundId: testData.fundB.id,
          distributionType: FUND_DISTRIBUTION_TYPES.AMOUNT,
          value: 25,
        },
      ],
      locations: [],
      acquisitionMethod: acquisitionMethodId,
      physical: {
        createInventory: POL_CREATE_INVENTORY_SETTINGS.INSTANCE,
        materialSupplier: testData.organization.id,
      },
    };
  };

  const createOrderWithLine = (acquisitionMethodId) => {
    const order = {
      ...NewOrder.getDefaultOrder({ vendorId: testData.organization.id }),
      orderType: ORDER_TYPES.ONE_TIME_API,
      reEncumber: true,
    };

    return Orders.createOrderViaApi(order).then((orderResponse) => {
      testData.order = orderResponse;

      const orderLine = createOrderLine(orderResponse.id, acquisitionMethodId);

      return OrderLines.createOrderLineViaApi(orderLine).then((orderLineResponse) => {
        return Orders.updateOrderViaApi({
          ...orderResponse,
          workflowStatus: ORDER_STATUSES.OPEN,
        }).then(() => {
          return OrderLines.getOrderLineViaApi({ query: `id=="${orderLineResponse.id}"` }).then(
            (orderLinesArray) => {
              testData.orderLine = orderLinesArray[0];
            },
          );
        });
      });
    });
  };

  const createInvoice = (batchGroupId) => {
    return Invoices.createInvoiceWithInvoiceLineViaApi({
      vendorId: testData.organization.id,
      fiscalYearId: testData.fiscalYear.id,
      poLineId: testData.orderLine.id,
      batchGroupId,
      fundDistributions: testData.orderLine.fundDistribution,
      accountingCode: testData.organization.erpCode,
      subTotal: 50,
      invoiceStatus: INVOICE_STATUSES.OPEN,
      adjustments: [
        {
          description: 'Test adjustment',
          value: 10,
          prorate: ADJUSTMENT_PRORATE.BY_AMOUNT,
          relationToTotal: ADJUSTMENT_RELATION_TO_TOTAL.IN_ADDITION_TO,
          type: ADJUSTMENT_DISTRIBUTION_TYPES.AMOUNT,
        },
      ],
    })
      .then((invoice) => {
        testData.invoice = invoice;
        return InvoiceLineDetails.getInvoiceLinesViaApi({ query: `invoiceId=="${invoice.id}"` });
      })
      .then((invoiceLinesResponse) => {
        testData.invoiceLine = invoiceLinesResponse.invoiceLines[0];
      });
  };

  const createOrderData = () => {
    return Organizations.createOrganizationViaApi({
      ...NewOrganization.defaultUiOrganizations,
      isVendor: true,
    }).then((organizationId) => {
      testData.organization = {
        id: organizationId,
        name: NewOrganization.defaultUiOrganizations.name,
        erpCode: NewOrganization.defaultUiOrganizations.erpCode,
      };

      return cy
        .getAcquisitionMethodsApi({
          query: `value="${ACQUISITION_METHOD_NAMES_IN_PROFILE.PURCHASE}"`,
        })
        .then((acquisitionMethod) => {
          return createOrderWithLine(acquisitionMethod.body.acquisitionMethods[0].id).then(() => {
            return cy.getBatchGroups().then((batchGroup) => {
              return createInvoice(batchGroup.id);
            });
          });
        });
    });
  };

  before('Create test data', () => {
    cy.getAdminToken();
    Approvals.setApprovePayValueViaApi(false);

    return createFinanceData()
      .then(() => createOrderData())
      .then(() => {
        return cy.createTempUser([
          Permissions.uiFinanceViewFundAndBudget.gui,
          Permissions.uiInvoicesApproveInvoices.gui,
          Permissions.viewEditCreateInvoiceInvoiceLine.gui,
          Permissions.uiInvoicesPayInvoices.gui,
        ]);
      })
      .then((userProperties) => {
        testData.user = userProperties;

        cy.login(testData.user.username, testData.user.password, {
          path: TopMenu.invoicesPath,
          waiter: Invoices.waitLoading,
        });
      });
  });

  after('Delete test data', () => {
    cy.getAdminToken();
    Organizations.deleteOrganizationViaApi(testData.organization.id);
    Invoices.deleteInvoiceViaApi(testData.invoice.id);
    Orders.deleteOrderViaApi(testData.order.id);
    Budgets.deleteViaApi(testData.budgetA.id);
    Budgets.deleteViaApi(testData.budgetB.id);
    Funds.deleteFundViaApi(testData.fundA.id);
    Funds.deleteFundViaApi(testData.fundB.id);
    Ledgers.deleteLedgerViaApi(testData.ledger.id);
    FiscalYears.deleteFiscalYearViaApi(testData.fiscalYear.id);
    Users.deleteViaApi(testData.user.userId);
  });

  it(
    'C407745 Check error message when approve invoice with an invoice-level adjustment and its invoice line is multi-fund distributed by amounts (thunderjet)',
    { tags: ['extendedPath', 'thunderjet', 'C407745'] },
    () => {
      Invoices.searchByNumber(testData.invoice.vendorInvoiceNo);
      Invoices.selectInvoice(testData.invoice.vendorInvoiceNo);
      InvoiceView.checkInvoiceDetails({
        title: testData.invoice.vendorInvoiceNo,
        invoiceInformation: [
          { key: INVOICE_VIEW_FIELDS.INVOICE_STATUS, value: INVOICE_STATUSES.OPEN },
        ],
      });
      InvoiceView.clickApproveAndPayInvoice({ isApprovePayEnabled: false });
      ApproveInvoiceModal.verifyModalView({ isApprovePayEnabled: false });
      ApproveInvoiceModal.clickOnlySubmitButton();
      InteractorsTools.checkCalloutErrorMessage(
        InvoiceStates.cannotApproveOrPayFundDistributionNot100Percent(
          testData.invoiceLine.invoiceLineNumber,
        ),
      );
      InvoiceView.checkInvoiceDetails({
        title: testData.invoice.vendorInvoiceNo,
        invoiceInformation: [
          { key: INVOICE_VIEW_FIELDS.INVOICE_STATUS, value: INVOICE_STATUSES.OPEN },
        ],
      });
    },
  );
});
