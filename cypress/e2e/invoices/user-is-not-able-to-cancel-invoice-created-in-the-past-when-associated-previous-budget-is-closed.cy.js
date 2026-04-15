import BasicOrderLine from '../../support/fragments/orders/basicOrderLine';
import Budgets from '../../support/fragments/finance/budgets/budgets';
import FiscalYears from '../../support/fragments/finance/fiscalYears/fiscalYears';
import Funds from '../../support/fragments/finance/funds/funds';
import Invoices from '../../support/fragments/invoices/invoices';
import InvoiceStates from '../../support/fragments/invoices/invoiceStates';
import InvoiceView from '../../support/fragments/invoices/invoiceView';
import Ledgers from '../../support/fragments/finance/ledgers/ledgers';
import LedgerRollovers from '../../support/fragments/finance/ledgers/ledgerRollovers';
import NewOrder from '../../support/fragments/orders/newOrder';
import Orders from '../../support/fragments/orders/orders';
import OrderLines from '../../support/fragments/orders/orderLines';
import NewOrganization from '../../support/fragments/organizations/newOrganization';
import Organizations from '../../support/fragments/organizations/organizations';
import Permissions from '../../support/dictionary/permissions';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import { CodeTools, DateTools, StringTools } from '../../support/utils';
import {
  ACQUISITION_METHOD_NAMES_IN_PROFILE,
  FUND_DISTRIBUTION_TYPES,
  INVOICE_STATUSES,
  INVOICE_VIEW_FIELDS,
  ORDER_STATUSES,
  ORDER_TYPES,
  ORDER_TYPES_FOR_ROLLOVER,
  POL_CREATE_INVENTORY_SETTINGS,
  ROLLOVER_ENCUMBRANCE_BASED_ON,
  ROLLOVER_BUDGET_VALUE,
  ROLLOVER_BUDGET_VALUE_AS,
} from '../../support/constants';

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
    ledger: {},
    fund: {},
    budget: {},
    organization: {},
    order: {},
    orderLine: {},
    invoice: {},
    user: {},
  };

  const createFinanceData = () => {
    return FiscalYears.createViaApi(testData.fiscalYears.first).then(() => {
      return FiscalYears.createViaApi(testData.fiscalYears.second).then(() => {
        const ledger = {
          ...Ledgers.defaultUiLedger,
          fiscalYearOneId: testData.fiscalYears.first.id,
          restrictEncumbrance: true,
          restrictExpenditures: true,
        };

        return Ledgers.createViaApi(ledger).then((ledgerResponse) => {
          testData.ledger = ledgerResponse;

          const fund = {
            ...Funds.getDefaultFund(),
            ledgerId: ledgerResponse.id,
          };

          return Funds.createViaApi(fund).then((fundResponse) => {
            testData.fund = fundResponse.fund;

            const budget = {
              ...Budgets.getDefaultBudget(),
              fiscalYearId: testData.fiscalYears.first.id,
              fundId: fundResponse.fund.id,
              allocated: 100,
            };

            return Budgets.createViaApi(budget).then((budgetResponse) => {
              testData.budget = budgetResponse;
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
        listUnitPrice: 20.0,
        currency: 'USD',
        quantityPhysical: 1,
        poLineEstimatedPrice: 20.0,
      },
      fundDistribution: [
        {
          code: testData.fund.code,
          fundId: testData.fund.id,
          distributionType: FUND_DISTRIBUTION_TYPES.PERCENTAGE,
          value: 100,
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
      poLineId: testData.orderLine.id,
      batchGroupId,
      fundDistributions: testData.orderLine.fundDistribution,
      accountingCode: testData.organization.erpCode,
      subTotal: 20.0,
      releaseEncumbrance: true,
      invoiceStatus: INVOICE_STATUSES.OPEN,
    }).then((invoiceResponse) => {
      testData.invoice = invoiceResponse;

      return Invoices.changeInvoiceStatusViaApi({
        invoice: invoiceResponse,
        status: INVOICE_STATUSES.APPROVED,
      }).then(() => {
        return Invoices.changeInvoiceStatusViaApi({
          invoice: invoiceResponse,
          status: INVOICE_STATUSES.PAID,
        });
      });
    });
  };

  const performRollover = () => {
    const rollover = LedgerRollovers.generateLedgerRollover({
      ledger: testData.ledger,
      needCloseBudgets: true,
      fromFiscalYear: testData.fiscalYears.first,
      toFiscalYear: testData.fiscalYears.second,
      restrictEncumbrance: true,
      restrictExpenditures: true,
      budgetsRollover: [
        {
          rolloverAllocation: true,
          rolloverBudgetValue: ROLLOVER_BUDGET_VALUE.NONE,
          addAvailableTo: ROLLOVER_BUDGET_VALUE_AS.ALLOCATION,
        },
      ],
      encumbrancesRollover: [
        {
          orderType: ORDER_TYPES_FOR_ROLLOVER.ONE_TIME,
          basedOn: ROLLOVER_ENCUMBRANCE_BASED_ON.INITIAL_AMOUNT,
        },
      ],
    });

    return LedgerRollovers.createLedgerRolloverViaApi(rollover);
  };

  const performRolloverAndUpdateFiscalYears = () => {
    return performRollover()
      .then(() => {
        return FiscalYears.updateFiscalYearViaApi({
          ...testData.fiscalYears.first,
          _version: 1,
          ...DateTools.getFullFiscalYearStartAndEnd(-1),
        });
      })
      .then(() => {
        return FiscalYears.updateFiscalYearViaApi({
          ...testData.fiscalYears.second,
          _version: 1,
          ...DateTools.getFullFiscalYearStartAndEnd(0),
        });
      });
  };

  const createOrderData = () => {
    return Organizations.createOrganizationViaApi({
      ...NewOrganization.defaultUiOrganizations,
      isVendor: true,
    }).then((organizationResponse) => {
      testData.organization = {
        id: organizationResponse,
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
              return createInvoice(batchGroup.id).then(() => performRolloverAndUpdateFiscalYears());
            });
          });
        });
    });
  };

  before('Create test data', () => {
    cy.getAdminToken();

    return createFinanceData().then(() => {
      return createOrderData().then(() => {
        cy.createTempUser([
          Permissions.viewEditCreateInvoiceInvoiceLine.gui,
          Permissions.uiInvoicesCancelInvoices.gui,
        ]).then((userProperties) => {
          testData.user = userProperties;

          cy.login(testData.user.username, testData.user.password, {
            path: TopMenu.invoicesPath,
            waiter: Invoices.waitLoading,
          });
        });
      });
    });
  });

  after('Delete test data', () => {
    cy.getAdminToken().then(() => {
      Users.deleteViaApi(testData.user.userId);
      Organizations.deleteOrganizationViaApi(testData.organization.id);
    });
  });

  it(
    'C422007 User is not able to cancel Invoice created in the past when associated previous budget is closed (thunderjet)',
    { tags: ['extendedPath', 'thunderjet', 'C422007'] },
    () => {
      Invoices.searchByNumber(testData.invoice.vendorInvoiceNo);
      Invoices.selectInvoice(testData.invoice.vendorInvoiceNo);
      InvoiceView.waitLoading();
      InvoiceView.checkInvoiceDetails({
        title: testData.invoice.vendorInvoiceNo,
        invoiceInformation: [
          { key: INVOICE_VIEW_FIELDS.FISCAL_YEAR, value: testData.fiscalYears.first.code },
          { key: INVOICE_VIEW_FIELDS.INVOICE_STATUS, value: INVOICE_STATUSES.PAID },
        ],
        invoiceLines: [
          {
            poNumber: testData.orderLine.poLineNumber,
            fundCode: testData.fund.code,
          },
        ],
        vendorDetailsInformation: [
          { key: INVOICE_VIEW_FIELDS.VENDOR_NAME, value: testData.organization.name },
        ],
      });
      cy.intercept('PUT', `/invoice/invoices/${testData.invoice.id}?*`).as('cancelInvoice');
      InvoiceView.cancelInvoiceWithUpdatePOLPaymentStatus({
        errorMessage: InvoiceStates.budgetNotFoundByFund(testData.fund.code),
      });
      cy.wait('@cancelInvoice', { timeout: 60000 }).then((interception) => {
        InvoiceView.checkErrorInvoiceApiResponse(interception, {
          expectedStatus: 404,
          expectedMessage: InvoiceStates.activeBudgetNotFoundMessage,
          expectedErrorCode: InvoiceStates.budgetNotFoundCode,
          expectedFundId: testData.fund.id,
          expectedFiscalYearId: testData.fiscalYears.first.id,
        });
      });
      InvoiceView.checkInvoiceDetails({
        invoiceInformation: [
          { key: INVOICE_VIEW_FIELDS.INVOICE_STATUS, value: INVOICE_STATUSES.PAID },
        ],
      });
      InvoiceView.verifyWarningMessage(InvoiceStates.POLineFullyPaid);
    },
  );
});
