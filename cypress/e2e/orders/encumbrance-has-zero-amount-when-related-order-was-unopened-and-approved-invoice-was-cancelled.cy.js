import permissions from '../../support/dictionary/permissions';
import FiscalYears from '../../support/fragments/finance/fiscalYears/fiscalYears';
import Funds from '../../support/fragments/finance/funds/funds';
import Ledgers from '../../support/fragments/finance/ledgers/ledgers';
import Budgets from '../../support/fragments/finance/budgets/budgets';
import { TransactionDetails } from '../../support/fragments/finance';
import NewOrder from '../../support/fragments/orders/newOrder';
import Orders from '../../support/fragments/orders/orders';
import OrderDetails from '../../support/fragments/orders/orderDetails';
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
    location: {},
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
      cost: {
        listUnitPrice: 1.0,
        currency: 'USD',
        discountType: 'percentage',
        quantityPhysical: 1,
        poLineEstimatedPrice: 1.0,
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
      acquisitionMethod: acquisitionMethodId,
      physical: {
        createInventory: 'Instance, Holding, Item',
        materialType: materialTypeId,
        materialSupplier: testData.organization.id,
        volumes: [],
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

  const createInvoiceForOrder = () => {
    return cy.getBatchGroups().then((batchGroup) => {
      return Invoices.createInvoiceWithInvoiceLineViaApi({
        vendorId: testData.organization.id,
        poLineId: testData.orderLine.id,
        fiscalYearId: testData.fiscalYear.id,
        batchGroupId: batchGroup.id,
        fundDistributions: testData.orderLine.fundDistribution,
        accountingCode: testData.organization.erpCode,
        subTotal: 1.0,
        releaseEncumbrance: true,
        exportToAccounting: false,
      }).then((invoiceResponse) => {
        testData.invoice = invoiceResponse;

        return Invoices.changeInvoiceStatusViaApi({
          invoice: invoiceResponse,
          status: INVOICE_STATUSES.APPROVED,
        });
      });
    });
  };

  const unopenOrder = (order) => {
    return Orders.updateOrderViaApi({
      ...order,
      workflowStatus: ORDER_STATUSES.PENDING,
    });
  };

  const cancelInvoice = (invoice) => {
    return Invoices.changeInvoiceStatusViaApi({
      invoice,
      status: INVOICE_STATUSES.CANCELLED,
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
      exportToAccounting: false,
    }).then((organizationResponse) => {
      testData.organization = {
        id: organizationResponse,
        erpCode: NewOrganization.defaultUiOrganizations.erpCode,
      };

      return ServicePoints.getViaApi().then((servicePoint) => {
        return NewLocation.createViaApi(NewLocation.getDefaultLocation(servicePoint[0].id)).then(
          (locationResponse) => {
            testData.location = locationResponse;

            return cy.getMaterialTypes({ limit: 1 }).then((materialType) => {
              return cy
                .getAcquisitionMethodsApi({
                  query: `value="${ACQUISITION_METHOD_NAMES_IN_PROFILE.PURCHASE}"`,
                })
                .then((acquisitionMethod) => {
                  return createOrderWithLine(
                    locationResponse.id,
                    materialType.id,
                    acquisitionMethod.body.acquisitionMethods[0].id,
                  ).then(() => {
                    return createInvoiceForOrder().then(() => {
                      return unopenOrder(testData.order).then(() => {
                        return cancelInvoice(testData.invoice);
                      });
                    });
                  });
                });
            });
          },
        );
      });
    });
  };

  before('Create test data', () => {
    cy.getAdminToken();
    return createFinanceData().then(() => {
      return createOrderData().then(() => {
        cy.createTempUser([
          permissions.uiFinanceViewFundAndBudget.gui,
          permissions.uiOrdersView.gui,
        ]).then((userProperties) => {
          testData.user = userProperties;

          cy.login(testData.user.username, testData.user.password, {
            path: TopMenu.ordersPath,
            waiter: Orders.waitLoading,
          });
        });
      });
    });
  });

  after(() => {
    cy.getAdminToken().then(() => {
      Users.deleteViaApi(testData.user.userId);
      Organizations.deleteOrganizationViaApi(testData.organization.id);
    });
  });

  it(
    'C494358 Encumbrance has "0" amount when related order was unopened and approved invoice was cancelled (thunderjet)',
    { tags: ['extendedPath', 'thunderjet', 'C494358'] },
    () => {
      Orders.searchByParameter('PO number', testData.order.poNumber);
      Orders.selectFromResultsList(testData.order.poNumber);
      OrderDetails.checkOrderStatus(ORDER_STATUSES.PENDING);

      OrderDetails.openPolDetails(testData.orderLine.titleOrPackage);
      OrderLineDetails.checkFieldsConditions([
        { label: 'Receipt status', conditions: { value: 'Pending' } },
        { label: 'Payment status', conditions: { value: 'Pending' } },
      ]);
      OrderLineDetails.checkFundDistibutionTableContent([
        {
          name: testData.fund.name,
          expenseClass: '-',
          value: '100%',
          amount: '$1.00',
          initialEncumbrance: '$0.00',
          currentEncumbrance: '$0.00',
        },
      ]);

      OrderLineDetails.openEncumbrancePane(testData.fund.name);
      TransactionDetails.checkTransactionDetails({
        information: [
          { key: 'Fiscal year', value: testData.fiscalYear.code },
          { key: 'Amount', value: '$0.00' },
          { key: 'Source', value: testData.orderLine.poLineNumber },
          { key: 'Type', value: 'Encumbrance' },
          { key: 'From', value: testData.fund.name },
          { key: 'Initial encumbrance', value: '$0.00' },
          { key: 'Awaiting payment', value: '$0.00' },
          { key: 'Expended', value: '$0.00' },
          { key: 'Status', value: 'Pending' },
        ],
      });
    },
  );
});
