import uuid from 'uuid';

import {
  ENCUMBRANCE_STATUSES,
  FUND_DISTRIBUTION_TYPES,
  INVOICE_STATUSES,
  ORDER_LINE_PAYMENT_STATUS,
  ORDER_SEARCH_OPTIONS,
  ORDER_STATUSES,
  ORDER_SYSTEM_CLOSING_REASONS,
  ORDER_TYPES,
  POL_CREATE_INVENTORY_SETTINGS,
  RECEIPT_STATUS_VIEW,
  TRANSACTION_DETAIL_FIELDS,
  TRANSACTION_TYPES,
} from '../../support/constants';
import permissions from '../../support/dictionary/permissions';
import Budgets from '../../support/fragments/finance/budgets/budgets';
import FiscalYears from '../../support/fragments/finance/fiscalYears/fiscalYears';
import Funds from '../../support/fragments/finance/funds/funds';
import Ledgers from '../../support/fragments/finance/ledgers/ledgers';
import Invoices from '../../support/fragments/invoices/invoices';
import BasicOrderLine from '../../support/fragments/orders/basicOrderLine';
import OrderLines from '../../support/fragments/orders/orderLines';
import Orders from '../../support/fragments/orders/orders';
import NewOrganization from '../../support/fragments/organizations/newOrganization';
import Organizations from '../../support/fragments/organizations/organizations';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import { ExecutionFlowManager, NumberTools } from '../../support/utils';
import { TransactionDetails } from '../../support/fragments/finance';

const R = {
  ACQ_METHOD: 'acquisitionMethod',
  BUDGET: 'budget',
  FISCAL_YEAR: 'fiscalYear',
  FUND: 'fund',
  INVOICE: 'invoice',
  LEDGER: 'ledger',
  LOCALE: 'locale',
  LOCATION: 'location',
  MATERIAL_TYPE: 'materialType',
  ORDER: 'order',
  ORDER_LINE: 'orderLine',
  ORGANIZATION: 'organization',
  USER: 'user',
};

const toNormalizedMoney = (value, locale) => {
  return NumberTools.formatCurrency(Number(value), locale).replaceAll(/[^0-9.-]/g, '');
};

describe('Finance', () => {
  const flow = new ExecutionFlowManager();

  before('Create C494339 preconditions', () => {
    cy.getAdminToken();
    cy.getTenantLocaleApi().then((locale) => flow.set(R.LOCALE, locale));

    const steps = getPreconditionSteps(); // eslint-disable-line no-use-before-define

    flow
      .step(steps.createFiscalYearAndLedger)
      .step(steps.createFundAndBudget)
      .step(steps.fetchReferenceData)
      .step(steps.createOrganization)
      .step(steps.createOrderAndLine)
      .step(steps.createAndProcessInvoice)
      .step(steps.refreshContext)
      .step(steps.cancelOrderAndInvoice)
      .step(steps.createAndLoginUser);
  });

  after('Delete C494339 test data', () => {
    cy.getAdminToken();
    flow.cleanup();
  });

  it(
    'C494339 Encumbrance has "0" amount when related order was closed and paid invoice was cancelled (thunderjet)',
    { tags: ['criticalPath', 'thunderjet', 'C494339'] },
    () => {
      const {
        fiscalYear,
        fund: { fund },
        locale,
        order,
        orderLine,
      } = flow.ctx();

      const orderNumber = order.poNumber;
      const encumbranceValue = toNormalizedMoney(1, locale);

      cy.log('<----- STEP 1 ----->');
      Orders.searchByParameter(ORDER_SEARCH_OPTIONS.PO_NUMBER, orderNumber);
      Orders.selectFromResultsList(orderNumber);
      OrderLines.selectPOLInOrder();
      OrderLines.checkPOLReceiptStatus(RECEIPT_STATUS_VIEW.AWAITING_RECEIPT);
      OrderLines.checkPaymentStatusInPOL(ORDER_LINE_PAYMENT_STATUS.AWAITING_PAYMENT);

      cy.log('<----- STEP 2 ----->');
      OrderLines.openPageCurrentEncumbrance(encumbranceValue);
      TransactionDetails.checkTransactionDetails({
        information: [
          { key: TRANSACTION_DETAIL_FIELDS.FISCAL_YEAR, value: fiscalYear.code },
          { key: TRANSACTION_DETAIL_FIELDS.AMOUNT, value: encumbranceValue },
          { key: TRANSACTION_DETAIL_FIELDS.SOURCE, value: orderLine.poLineNumber },
          { key: TRANSACTION_DETAIL_FIELDS.TYPE, value: TRANSACTION_TYPES.ENCUMBRANCE },
          { key: TRANSACTION_DETAIL_FIELDS.FROM, value: `${fund.name} (${fund.code})` },
          { key: TRANSACTION_DETAIL_FIELDS.INITIAL_ENCUMBRANCE, value: encumbranceValue },
          { key: TRANSACTION_DETAIL_FIELDS.AWAITING_PAYMENT, value: toNormalizedMoney(0, locale) },
          { key: TRANSACTION_DETAIL_FIELDS.EXPENDED, value: toNormalizedMoney(0, locale) },
          { key: TRANSACTION_DETAIL_FIELDS.STATUS, value: ENCUMBRANCE_STATUSES.UNRELEASED },
        ],
      });
      Funds.checkStatusInTransactionDetails(ENCUMBRANCE_STATUSES.UNRELEASED);
    },
  );
});

function getPreconditionSteps() {
  const createFiscalYearAndLedger = (flow) => {
    FiscalYears.createViaApi({ ...FiscalYears.defaultUiFiscalYear })
      .then((fiscalYearResponse) => {
        flow.set(R.FISCAL_YEAR, fiscalYearResponse);

        return Ledgers.createViaApi({
          ...Ledgers.defaultUiLedger,
          fiscalYearOneId: fiscalYearResponse.id,
        });
      })
      .then((ledgerResponse) => {
        flow.set(R.LEDGER, ledgerResponse);
      });
  };

  const createFundAndBudget = (flow) => {
    Funds.createViaApi({ ...Funds.defaultUiFund, ledgerId: flow.get(R.LEDGER).id })
      .then((fundResponse) => {
        flow.set(R.FUND, fundResponse);

        return Budgets.createViaApi({
          ...Budgets.getDefaultBudget(),
          allocated: 100,
          fiscalYearId: flow.get(R.FISCAL_YEAR).id,
          fundId: fundResponse.fund.id,
        });
      })
      .then((budgetResponse) => {
        flow.set(R.BUDGET, budgetResponse);
      });
  };

  const fetchReferenceData = (flow) => {
    cy.getLocations({ limit: 1 }).then((res) => flow.set(R.LOCATION, res));
    cy.getDefaultMaterialType().then((mt) => flow.set(R.MATERIAL_TYPE, mt));
    cy.getAcquisitionMethodsApi().then(({ body }) => flow.set(R.ACQ_METHOD, body.acquisitionMethods[0]));
  };

  const createOrganization = (flow) => {
    const organization = { ...NewOrganization.defaultUiOrganizations };

    Organizations.createOrganizationViaApi(organization).then((orgId) => {
      flow.set(R.ORGANIZATION, { ...organization, id: orgId });
    });
  };

  const createOrderAndLine = (flow) => {
    const fund = flow.get(R.FUND).fund;
    const location = flow.get(R.LOCATION);
    const materialType = flow.get(R.MATERIAL_TYPE);
    const acquisitionMethod = flow.get(R.ACQ_METHOD);
    const organization = flow.get(R.ORGANIZATION);

    Orders.createOrderViaApi({
      id: uuid(),
      vendor: organization.id,
      orderType: ORDER_TYPES.ONE_TIME_API,
      approved: true,
      reEncumber: true,
    })
      .then((orderResponse) => {
        flow.set(R.ORDER, orderResponse);

        return OrderLines.createOrderLineViaApi({
          ...BasicOrderLine.defaultOrderLine,
          purchaseOrderId: orderResponse.id,
          cost: {
            listUnitPrice: 1,
            currency: 'USD',
            discountType: FUND_DISTRIBUTION_TYPES.PERCENTAGE,
            quantityPhysical: 1,
            poLineEstimatedPrice: 1,
          },
          fundDistribution: [{ code: fund.code, fundId: fund.id, value: 100 }],
          locations: [{ locationId: location.id, quantity: 1, quantityPhysical: 1 }],
          acquisitionMethod: acquisitionMethod.id,
          physical: {
            createInventory: POL_CREATE_INVENTORY_SETTINGS.INSTANCE_HOLDING_ITEM,
            materialType: materialType.id,
            materialSupplier: organization.id,
            volumes: [],
          },
        });
      })
      .then((orderLineResponse) => {
        flow.set(R.ORDER_LINE, orderLineResponse);
      })
      .then(() => {
        Orders.updateOrderViaApi({
          ...flow.get(R.ORDER),
          workflowStatus: ORDER_STATUSES.OPEN,
        });
      });
  };

  const createAndProcessInvoice = (flow) => {
    const organization = flow.get(R.ORGANIZATION);
    const fiscalYear = flow.get(R.FISCAL_YEAR);
    const orderLine = flow.get(R.ORDER_LINE);

    Invoices.createInvoiceWithInvoiceLineViaApi({
      vendorId: organization.id,
      fiscalYearId: fiscalYear.id,
      poLineId: orderLine.id,
      fundDistributions: orderLine.fundDistribution,
      accountingCode: organization.erpCode,
      releaseEncumbrance: true,
      subTotal: 1,
    }).then((invoice) => {
      flow.set(R.INVOICE, invoice);

      return Invoices.changeInvoiceStatusViaApi({
        invoice,
        status: INVOICE_STATUSES.PAID,
      });
    });
  };

  const cancelOrderAndInvoice = (flow) => {
    const order = flow.get(R.ORDER);
    const invoice = flow.get(R.INVOICE);

    Orders.updateOrderViaApi({
      ...order,
      workflowStatus: ORDER_STATUSES.CLOSED,
      closeReason: {
        reason: ORDER_SYSTEM_CLOSING_REASONS.CANCELLED,
        note: 'Test',
      },
    });

    Invoices.changeInvoiceStatusViaApi({
      invoice,
      status: INVOICE_STATUSES.CANCELLED,
    });
  };

  const createAndLoginUser = (flow) => {
    cy.createTempUser([
      permissions.uiOrdersView.gui,
      permissions.uiFinanceViewFundAndBudget.gui,
    ]).then((userProperties) => {
      flow.set(R.USER, userProperties, () => Users.deleteViaApi(userProperties.userId));

      cy.login(userProperties.username, userProperties.password, {
        path: TopMenu.ordersPath,
        waiter: Orders.waitLoading,
      });
    });
  };

  const refreshContext = (flow) => {
    const order = flow.get(R.ORDER);
    const invoice = flow.get(R.INVOICE);

    Orders.getOrderByIdViaApi(order.id).then((orderResponse) => flow.set(R.ORDER, orderResponse));
    Invoices.getInvoiceByIdViaApi(invoice.id).then((invoiceResponse) => flow.set(R.INVOICE, invoiceResponse));
  };

  return {
    cancelOrderAndInvoice,
    createAndLoginUser,
    createAndProcessInvoice,
    createFiscalYearAndLedger,
    createFundAndBudget,
    createOrderAndLine,
    createOrganization,
    fetchReferenceData,
    refreshContext,
  };
}
