import uuid from 'uuid';
import permissions from '../../support/dictionary/permissions';
import FiscalYears from '../../support/fragments/finance/fiscalYears/fiscalYears';
import Funds from '../../support/fragments/finance/funds/funds';
import Ledgers from '../../support/fragments/finance/ledgers/ledgers';
import Budgets from '../../support/fragments/finance/budgets/budgets';
import NewOrder from '../../support/fragments/orders/newOrder';
import Orders from '../../support/fragments/orders/orders';
import OrderDetails from '../../support/fragments/orders/orderDetails';
import OrderLineDetails from '../../support/fragments/orders/orderLineDetails';
import OrderLines from '../../support/fragments/orders/orderLines';
import NewOrganization from '../../support/fragments/organizations/newOrganization';
import Organizations from '../../support/fragments/organizations/organizations';
import NewLocation from '../../support/fragments/settings/tenant/locations/newLocation';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import { ACQUISITION_METHOD_NAMES_IN_PROFILE, ORDER_STATUSES } from '../../support/constants';
import BasicOrderLine from '../../support/fragments/orders/basicOrderLine';

describe('Orders', () => {
  const testData = {
    fiscalYear: {},
    ledger: {},
    funds: {
      fundA: {},
      fundB: {},
    },
    budgets: {
      fundA: {},
      fundB: {},
    },
    organization: {},
    orders: {
      order1: {},
      order2: {},
      order3: {},
    },
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
        allocated: 1000,
      };

      return Budgets.createViaApi(budget).then((budgetResponse) => {
        return { fund: fundResponse.fund, budget: budgetResponse };
      });
    });
  };

  const createOrderLine = (purchaseOrderId, locationId, materialTypeId, acquisitionMethodId) => {
    return {
      ...BasicOrderLine.defaultOrderLine,
      id: uuid(),
      purchaseOrderId,
      cost: {
        listUnitPrice: 100.0,
        currency: 'USD',
        discountType: 'percentage',
        quantityPhysical: 1,
        poLineEstimatedPrice: 100.0,
      },
      fundDistribution: [
        {
          code: testData.funds.fundA.code,
          fundId: testData.funds.fundA.id,
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
      orderType: 'Ongoing',
      ongoing: { isSubscription: false, manualRenewal: false },
      reEncumber: true,
    };

    return Orders.createOrderViaApi(order).then((orderResponse) => {
      const orderLine = createOrderLine(
        orderResponse.id,
        locationId,
        materialTypeId,
        acquisitionMethodId,
      );

      return OrderLines.createOrderLineViaApi(orderLine).then((orderLineResponse) => {
        return Orders.updateOrderViaApi({
          ...orderResponse,
          workflowStatus: ORDER_STATUSES.OPEN,
        }).then(() => {
          return {
            order: orderResponse,
            orderLine: orderLineResponse,
          };
        });
      });
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

        return createFundWithBudget(ledgerResponse.id, fiscalYearResponse.id).then((fundAData) => {
          testData.funds.fundA = fundAData.fund;
          testData.budgets.fundA = fundAData.budget;

          return createFundWithBudget(ledgerResponse.id, fiscalYearResponse.id).then(
            (fundBData) => {
              testData.funds.fundB = fundBData.fund;
              testData.budgets.fundB = fundBData.budget;
            },
          );
        });
      });
    });
  };

  const createOrganization = () => {
    return Organizations.createOrganizationViaApi({
      ...NewOrganization.defaultUiOrganizations,
      isVendor: true,
      exportToAccounting: false,
    }).then((organizationResponse) => {
      testData.organization = {
        id: organizationResponse,
        erpCode: NewOrganization.defaultUiOrganizations.erpCode,
      };
    });
  };

  const createLocationAndMaterialData = () => {
    return ServicePoints.getViaApi()
      .then((servicePoint) => {
        return NewLocation.createViaApi(NewLocation.getDefaultLocation(servicePoint[0].id));
      })
      .then((locationResponse) => {
        testData.location = locationResponse;
        return cy.getMaterialTypes({ limit: 1 });
      })
      .then((materialType) => {
        testData.materialType = materialType;
        return cy.getAcquisitionMethodsApi({
          query: `value="${ACQUISITION_METHOD_NAMES_IN_PROFILE.PURCHASE}"`,
        });
      })
      .then((acquisitionMethod) => {
        testData.acquisitionMethodId = acquisitionMethod.body.acquisitionMethods[0].id;
      });
  };

  const createThreeOrders = () => {
    return createOrderWithLine(
      testData.location.id,
      testData.materialType.id,
      testData.acquisitionMethodId,
    )
      .then((order1) => {
        testData.orders.order1 = order1;
        return createOrderWithLine(
          testData.location.id,
          testData.materialType.id,
          testData.acquisitionMethodId,
        );
      })
      .then((order2) => {
        testData.orders.order2 = order2;
        return createOrderWithLine(
          testData.location.id,
          testData.materialType.id,
          testData.acquisitionMethodId,
        );
      })
      .then((order3) => {
        testData.orders.order3 = order3;
      });
  };

  const updateOrdersToPending = () => {
    return Orders.updateOrderViaApi({
      ...testData.orders.order1.order,
      workflowStatus: ORDER_STATUSES.PENDING,
    })
      .then(() => {
        return Orders.updateOrderViaApi({
          ...testData.orders.order2.order,
          workflowStatus: ORDER_STATUSES.PENDING,
        });
      })
      .then(() => {
        return Orders.updateOrderViaApi({
          ...testData.orders.order3.order,
          workflowStatus: ORDER_STATUSES.PENDING,
        });
      });
  };

  const deactivateBudget = () => {
    return Budgets.getBudgetViaApi({
      query: `id=="${testData.budgets.fundA.id}"`,
    }).then((budgetsResponse) => {
      return Budgets.updateBudgetViaApi({
        ...budgetsResponse.budgets[0],
        budgetStatus: 'Inactive',
      });
    });
  };

  const createOrderData = () => {
    return createOrganization()
      .then(createLocationAndMaterialData)
      .then(createThreeOrders)
      .then(updateOrdersToPending)
      .then(deactivateBudget);
  };

  before('Create test data', () => {
    cy.getAdminToken();
    return createFinanceData().then(() => {
      return createOrderData().then(() => {
        cy.createTempUser([permissions.uiOrdersEdit.gui, permissions.uiOrdersDelete.gui]).then(
          (userProperties) => {
            testData.user = userProperties;

            cy.login(testData.user.username, testData.user.password, {
              path: TopMenu.ordersPath,
              waiter: Orders.waitLoading,
            });
          },
        );
      });
    });
  });

  after(() => {
    cy.getAdminToken().then(() => {
      Users.deleteViaApi(testData.user.userId);
      Orders.deleteOrderViaApi(testData.orders.order1.order.id);
      Orders.deleteOrderViaApi(testData.orders.order2.order.id);
      Orders.deleteOrderViaApi(testData.orders.order3.order.id);
      Budgets.deleteViaApi(testData.budgets.fundA.id);
      Budgets.deleteViaApi(testData.budgets.fundB.id);
      Funds.deleteFundViaApi(testData.funds.fundA.id);
      Funds.deleteFundViaApi(testData.funds.fundB.id);
      Ledgers.deleteLedgerViaApi(testData.ledger.id);
      FiscalYears.deleteFiscalYearViaApi(testData.fiscalYear.id);
      Organizations.deleteOrganizationViaApi(testData.organization.id);
    });
  });

  it(
    'C663258 User can edit fund distribution for unopened ongoing order with inactive budget in POL (thunderjet)',
    { tags: ['criticalPath', 'thunderjet', 'C663258'] },
    () => {
      Orders.searchByParameter('PO number', testData.orders.order1.order.poNumber);
      Orders.selectFromResultsList(testData.orders.order1.order.poNumber);
      OrderDetails.checkOrderStatus(ORDER_STATUSES.PENDING);
      OrderDetails.openPolDetails(testData.orders.order1.orderLine.titleOrPackage);
      OrderLineDetails.openOrderLineEditForm();
      OrderLines.changeFundInPOLWithoutSaveInPercents(0, testData.funds.fundB, '100');
      OrderLines.saveOrderLine();
      OrderLineDetails.checkFundDistibutionTableContent([
        {
          name: testData.funds.fundB.name,
        },
      ]);
      OrderLineDetails.backToOrderDetails();
      OrderDetails.openOrder();
      OrderDetails.checkOrderStatus(ORDER_STATUSES.OPEN);
      OrderDetails.openPolDetails(testData.orders.order1.orderLine.titleOrPackage);
      OrderLineDetails.checkFundDistibutionTableContent([
        {
          name: testData.funds.fundB.name,
          expenseClass: '-',
          value: '100%',
          amount: '$100.00',
          initialEncumbrance: '$100.00',
          currentEncumbrance: '$100.00',
        },
      ]);
      Orders.searchByParameter('PO number', testData.orders.order2.order.poNumber);
      Orders.selectFromResultsList(testData.orders.order2.order.poNumber);
      OrderDetails.openPolDetails(testData.orders.order2.orderLine.titleOrPackage);
      OrderLineDetails.openOrderLineEditForm();
      OrderLines.deleteFundInPOLwithoutSave(0);
      OrderLines.saveOrderLine();
      OrderLineDetails.checkFundDistibutionTableContent([]);
      OrderLineDetails.backToOrderDetails();
      OrderDetails.openOrder();
      OrderDetails.checkOrderStatus(ORDER_STATUSES.OPEN);
      OrderDetails.openPolDetails(testData.orders.order2.orderLine.titleOrPackage);
      OrderLineDetails.checkFundDistibutionTableContent([]);
      Orders.searchByParameter('PO number', testData.orders.order3.order.poNumber);
      Orders.selectFromResultsList(testData.orders.order3.order.poNumber);
      OrderDetails.openPolDetails(testData.orders.order3.orderLine.titleOrPackage);
      OrderLines.deleteOrderLine();
    },
  );
});
