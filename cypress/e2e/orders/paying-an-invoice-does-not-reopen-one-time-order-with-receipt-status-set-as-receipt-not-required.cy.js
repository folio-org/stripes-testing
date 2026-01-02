import permissions from '../../support/dictionary/permissions';
import FiscalYears from '../../support/fragments/finance/fiscalYears/fiscalYears';
import Funds from '../../support/fragments/finance/funds/funds';
import Ledgers from '../../support/fragments/finance/ledgers/ledgers';
import Budgets from '../../support/fragments/finance/budgets/budgets';
import NewOrder from '../../support/fragments/orders/newOrder';
import Orders from '../../support/fragments/orders/orders';
import OrderLines from '../../support/fragments/orders/orderLines';
import OrderLineDetails from '../../support/fragments/orders/orderLineDetails';
import Invoices from '../../support/fragments/invoices/invoices';
import NewOrganization from '../../support/fragments/organizations/newOrganization';
import Organizations from '../../support/fragments/organizations/organizations';
import NewLocation from '../../support/fragments/settings/tenant/locations/newLocation';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import TopMenu from '../../support/fragments/topMenu';
import {
  ACQUISITION_METHOD_NAMES_IN_PROFILE,
  ORDER_STATUSES,
  INVOICE_STATUSES,
} from '../../support/constants';
import BasicOrderLine from '../../support/fragments/orders/basicOrderLine';
import Users from '../../support/fragments/users/users';
import { OrderDetails } from '../../support/fragments/orders';

describe('Orders', () => {
  const testData = {
    fiscalYear: {},
    ledger: {},
    fund: {},
    budget: {},
    organization: {},
    order: {},
    orderLine: {},
    invoice: {},
    user: {},
  };

  const createFundWithBudget = (ledgerId, fiscalYearId) => {
    const fund = {
      ...Funds.getDefaultFund(),
      ledgerId,
    };

    return Funds.createViaApi(fund).then((fundResponse) => {
      const budget = {
        ...Budgets.getDefaultBudget(),
        fiscalYearId,
        fundId: fundResponse.fund.id,
        allocated: 100,
      };

      return Budgets.createViaApi(budget).then((budgetResponse) => {
        return { fund: fundResponse.fund, budget: budgetResponse };
      });
    });
  };

  const createOrderLine = (purchaseOrderId, locationId, materialTypeId, acquisitionMethodId) => {
    return {
      ...BasicOrderLine.defaultOrderLine,
      purchaseOrderId,
      checkinItems: true,
      orderFormat: 'Physical Resource',
      receiptStatus: 'Receipt Not Required',
      acquisitionMethod: acquisitionMethodId,
      cost: {
        listUnitPrice: 10.0,
        currency: 'USD',
        quantityPhysical: 1,
        poLineEstimatedPrice: 10.0,
      },
      fundDistribution: [
        {
          code: testData.fund.code,
          fundId: testData.fund.id,
          distributionType: 'percentage',
          value: 100,
        },
      ],
      locations: [
        {
          locationId,
          quantity: 1,
          quantityPhysical: 1,
        },
      ],
      physical: {
        createInventory: 'Instance, Holding, Item',
        materialType: materialTypeId,
        materialSupplier: testData.organization.id,
      },
    };
  };

  const createOrderWithLine = (locationId, materialTypeId, acquisitionMethodId) => {
    const order = {
      ...NewOrder.getDefaultOrder({ vendorId: testData.organization.id }),
      orderType: 'One-Time',
      reEncumber: true,
    };

    return Orders.createOrderViaApi(order).then((orderResponse) => {
      testData.order = orderResponse;

      const orderLine = createOrderLine(
        orderResponse.id,
        locationId,
        materialTypeId,
        acquisitionMethodId,
      );

      return OrderLines.createOrderLineViaApi(orderLine).then((orderLineResponse) => {
        testData.orderLine = orderLineResponse;

        return Orders.updateOrderViaApi({
          ...orderResponse,
          workflowStatus: ORDER_STATUSES.OPEN,
        });
      });
    });
  };

  const createInvoiceForOrder = () => {
    return cy.getBatchGroups().then((batchGroup) => {
      return Invoices.createInvoiceWithInvoiceLineViaApi({
        vendorId: testData.organization.id,
        poLineId: testData.orderLine.id,
        fiscalYearId: testData.fiscalYear.id,
        batchGroupId: batchGroup.id,
        fundDistributions: testData.orderLine.fundDistribution,
        accountingCode: testData.organization.erpCode,
        subTotal: 10.0,
        releaseEncumbrance: true,
      }).then((invoiceResponse) => {
        testData.invoice = invoiceResponse;

        return Invoices.changeInvoiceStatusViaApi({
          invoice: invoiceResponse,
          status: INVOICE_STATUSES.APPROVED,
        });
      });
    });
  };

  const closeOrder = (order) => {
    return Orders.updateOrderViaApi({
      ...order,
      workflowStatus: ORDER_STATUSES.CLOSED,
      closeReason: {
        reason: 'Duplication',
        note: '',
      },
    });
  };

  const payInvoice = (invoice) => {
    return Invoices.changeInvoiceStatusViaApi({
      invoice,
      status: INVOICE_STATUSES.PAID,
    });
  };

  const createFinanceData = () => {
    return FiscalYears.createViaApi(FiscalYears.defaultUiFiscalYear).then((fiscalYearResponse) => {
      testData.fiscalYear = fiscalYearResponse;

      const ledger = {
        ...Ledgers.defaultUiLedger,
        fiscalYearOneId: fiscalYearResponse.id,
      };

      return Ledgers.createViaApi(ledger).then((ledgerResponse) => {
        testData.ledger = ledgerResponse;

        return createFundWithBudget(ledgerResponse.id, fiscalYearResponse.id).then((fundData) => {
          testData.fund = fundData.fund;
          testData.budget = fundData.budget;
        });
      });
    });
  };

  const createOrderData = () => {
    return Organizations.createOrganizationViaApi({
      ...NewOrganization.defaultUiOrganizations,
      isVendor: true,
    })
      .then((organizationId) => {
        testData.organization = {
          id: organizationId,
          erpCode: NewOrganization.defaultUiOrganizations.erpCode,
        };

        return ServicePoints.getViaApi();
      })
      .then((servicePoint) => NewLocation.createViaApi(NewLocation.getDefaultLocation(servicePoint[0].id)))
      .then((location) => cy.getMaterialTypes({ limit: 1 }).then((materialType) => ({ location, materialType })))
      .then(({ location, materialType }) => {
        return cy
          .getAcquisitionMethodsApi({
            query: `value="${ACQUISITION_METHOD_NAMES_IN_PROFILE.PURCHASE}"`,
          })
          .then((acquisitionMethod) => {
            return createOrderWithLine(
              location.id,
              materialType.id,
              acquisitionMethod.body.acquisitionMethods[0].id,
            );
          });
      })
      .then(() => createInvoiceForOrder())
      .then(() => closeOrder(testData.order))
      .then(() => payInvoice(testData.invoice));
  };

  before('Create test data', () => {
    cy.getAdminToken();

    return createFinanceData().then(() => {
      return createOrderData().then(() => {
        cy.createTempUser([permissions.uiOrdersView.gui]).then((userProperties) => {
          testData.user = userProperties;

          cy.login(testData.user.username, testData.user.password, {
            path: TopMenu.ordersPath,
            waiter: Orders.waitLoading,
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
    'C566490 Paying an invoice does not reopen one-time order with "Receipt status" set as "Receipt not required" (thunderjet)',
    { tags: ['extendedPath', 'thunderjet', 'C566490'] },
    () => {
      Orders.searchByParameter('PO number', testData.order.poNumber);
      Orders.selectFromResultsList(testData.order.poNumber);
      Orders.checkOrderStatus(ORDER_STATUSES.CLOSED);
      OrderDetails.openPolDetails(testData.orderLine.titleOrPackage);
      OrderLineDetails.checkFieldsConditions([
        { label: 'Receipt status', conditions: { value: 'Receipt Not Required' } },
        { label: 'Payment status', conditions: { value: 'Fully Paid' } },
      ]);
    },
  );
});
