import { v4 as uuid } from 'uuid';
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
import OrderLinesLimit from '../../support/fragments/settings/orders/orderLinesLimit';
import { ACQUISITION_METHOD_NAMES_IN_PROFILE, ORDER_STATUSES } from '../../support/constants';
import BasicOrderLine from '../../support/fragments/orders/basicOrderLine';
import Users from '../../support/fragments/users/users';
import DateTools from '../../support/utils/dateTools';
import InteractorsTools from '../../support/utils/interactorsTools';

describe('Orders', () => {
  const testData = {
    fiscalYears: {
      fiscalYear1: {},
      fiscalYear2: {},
    },
    ledgers: {
      ledger1: {},
      ledger2: {},
    },
    funds: {
      fundA: {},
      fundB: {},
    },
    budgets: {
      fundA: {},
      fundB: {},
    },
    organization: {},
    order: {},
    orderLines: {
      orderLine1: {},
      orderLine2: {},
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

  const createOrderLine = (
    purchaseOrderId,
    locationId,
    materialTypeId,
    acquisitionMethodId,
    fundCode,
    fundId,
    title,
  ) => {
    return {
      ...BasicOrderLine.defaultOrderLine,
      id: uuid(),
      purchaseOrderId,
      titleOrPackage: title,
      cost: {
        listUnitPrice: 10.0,
        currency: 'USD',
        discountType: 'percentage',
        quantityPhysical: 1,
        poLineEstimatedPrice: 10.0,
      },
      fundDistribution: [
        {
          code: fundCode,
          fundId,
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

  const createOrderWithTwoLines = (locationId, materialTypeId, acquisitionMethodId) => {
    const order = {
      ...NewOrder.getDefaultOrder({ vendorId: testData.organization.id }),
      orderType: 'One-Time',
      reEncumber: true,
    };

    return Orders.createOrderViaApi(order).then((orderResponse) => {
      testData.order = orderResponse;

      const orderLine1 = createOrderLine(
        orderResponse.id,
        locationId,
        materialTypeId,
        acquisitionMethodId,
        testData.funds.fundA.code,
        testData.funds.fundA.id,
        'POL 1 with Fund A',
      );

      const orderLine2 = createOrderLine(
        orderResponse.id,
        locationId,
        materialTypeId,
        acquisitionMethodId,
        testData.funds.fundB.code,
        testData.funds.fundB.id,
        'POL 2 with Fund B',
      );

      return OrderLines.createOrderLineViaApi(orderLine1).then((orderLine1Response) => {
        testData.orderLines.orderLine1 = orderLine1Response;

        return OrderLines.createOrderLineViaApi(orderLine2).then((orderLine2Response) => {
          testData.orderLines.orderLine2 = orderLine2Response;
        });
      });
    });
  };

  const createFinanceData = () => {
    const fiscalYear1 = {
      ...FiscalYears.getDefaultFiscalYear(),
      ...DateTools.getFullFiscalYearStartAndEnd(0),
    };

    const fiscalYear2 = {
      ...FiscalYears.getDefaultFiscalYear(),
      ...DateTools.getFullFiscalYearStartAndEnd(0),
    };

    return FiscalYears.createViaApi(fiscalYear1).then((fiscalYear1Response) => {
      testData.fiscalYears.fiscalYear1 = fiscalYear1Response;

      return FiscalYears.createViaApi(fiscalYear2).then((fiscalYear2Response) => {
        testData.fiscalYears.fiscalYear2 = fiscalYear2Response;

        const ledger1 = {
          ...Ledgers.getDefaultLedger(),
          fiscalYearOneId: testData.fiscalYears.fiscalYear1.id,
        };

        const ledger2 = {
          ...Ledgers.getDefaultLedger(),
          fiscalYearOneId: testData.fiscalYears.fiscalYear2.id,
        };

        return Ledgers.createViaApi(ledger1).then((ledger1Response) => {
          testData.ledgers.ledger1 = ledger1Response;

          return Ledgers.createViaApi(ledger2).then((ledger2Response) => {
            testData.ledgers.ledger2 = ledger2Response;

            return createFundWithBudget(
              ledger1Response.id,
              testData.fiscalYears.fiscalYear1.id,
            ).then((fundAData) => {
              testData.funds.fundA = fundAData.fund;
              testData.budgets.fundA = fundAData.budget;

              return createFundWithBudget(
                ledger2Response.id,
                testData.fiscalYears.fiscalYear2.id,
              ).then((fundBData) => {
                testData.funds.fundB = fundBData.fund;
                testData.budgets.fundB = fundBData.budget;
              });
            });
          });
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
                  return createOrderWithTwoLines(
                    locationResponse.id,
                    materialType.id,
                    acquisitionMethod.body.acquisitionMethods[0].id,
                  );
                });
            });
          },
        );
      });
    });
  };

  before('Create test data', () => {
    cy.getAdminToken();
    OrderLinesLimit.setPOLLimitViaApi(99);

    return createFinanceData().then(() => {
      return createOrderData().then(() => {
        cy.createTempUser([
          permissions.uiOrdersEdit.gui,
          permissions.uiOrdersApprovePurchaseOrders.gui,
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
      Orders.deleteOrderViaApi(testData.order.id);
      Budgets.deleteViaApi(testData.budgets.fundA.id);
      Budgets.deleteViaApi(testData.budgets.fundB.id);
      Funds.deleteFundViaApi(testData.funds.fundA.id);
      Funds.deleteFundViaApi(testData.funds.fundB.id);
      Ledgers.deleteLedgerViaApi(testData.ledgers.ledger1.id);
      Ledgers.deleteLedgerViaApi(testData.ledgers.ledger2.id);
      FiscalYears.deleteFiscalYearViaApi(testData.fiscalYears.fiscalYear1.id);
      FiscalYears.deleteFiscalYearViaApi(testData.fiscalYears.fiscalYear2.id);
    });
  });

  it(
    'C385651 DevTools. Error message appears while opening an order with PO lines related to different fiscal years (thunderjet)',
    { tags: ['extendedPath', 'thunderjet', 'C385651'] },
    () => {
      Orders.searchByParameter('PO number', testData.order.poNumber);
      Orders.selectFromResultsList(testData.order.poNumber);
      OrderDetails.checkOrderStatus(ORDER_STATUSES.PENDING);
      cy.intercept('PUT', `/orders/composite-orders/${testData.order.id}`).as('openOrder');
      Orders.openOrder();
      cy.wait('@openOrder').then((interception) => {
        OrderDetails.checkApiErrorResponse(interception, {
          expectedStatus: 422,
          expectedErrorCode: 'multipleFiscalYears',
          expectedErrorMessage:
            'Order line fund distributions have active budgets in multiple fiscal years.',
        });
      });
      InteractorsTools.checkCalloutErrorMessage(
        'Order line fund distributions have active budgets in multiple fiscal years.',
      );
      OrderDetails.checkOrderStatus(ORDER_STATUSES.PENDING);
      OrderDetails.openPolDetails(testData.orderLines.orderLine1.titleOrPackage);
      OrderLineDetails.checkFundDistibutionTableContent([
        {
          name: testData.funds.fundA.name,
          expenseClass: '-',
          value: '100%',
          amount: '$10.00',
          initialEncumbrance: '-',
          currentEncumbrance: '-',
        },
      ]);
      OrderLineDetails.backToOrderDetails();
      OrderDetails.openPolDetails(testData.orderLines.orderLine2.titleOrPackage);
      OrderLineDetails.checkFundDistibutionTableContent([
        {
          name: testData.funds.fundB.name,
          expenseClass: '-',
          value: '100%',
          amount: '$10.00',
          initialEncumbrance: '-',
          currentEncumbrance: '-',
        },
      ]);
    },
  );
});
