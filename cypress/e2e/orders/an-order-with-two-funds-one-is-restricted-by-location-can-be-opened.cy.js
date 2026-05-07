import BasicOrderLine from '../../support/fragments/orders/basicOrderLine';
import Budgets from '../../support/fragments/finance/budgets/budgets';
import FiscalYears from '../../support/fragments/finance/fiscalYears/fiscalYears';
import Funds from '../../support/fragments/finance/funds/funds';
import InteractorsTools from '../../support/utils/interactorsTools';
import InventoryInstance from '../../support/fragments/inventory/inventoryInstance';
import Ledgers from '../../support/fragments/finance/ledgers/ledgers';
import NewLocation from '../../support/fragments/settings/tenant/locations/newLocation';
import NewOrder from '../../support/fragments/orders/newOrder';
import NewOrganization from '../../support/fragments/organizations/newOrganization';
import Orders from '../../support/fragments/orders/orders';
import OrderDetails from '../../support/fragments/orders/orderDetails';
import OrderLineDetails from '../../support/fragments/orders/orderLineDetails';
import OrderLineEditForm from '../../support/fragments/orders/orderLineEditForm';
import OrderLines from '../../support/fragments/orders/orderLines';
import Organizations from '../../support/fragments/organizations/organizations';
import Permissions from '../../support/dictionary/permissions';
import SelectLocationModal from '../../support/fragments/orders/modals/selectLocationModal';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import {
  ACQUISITION_METHOD_NAMES_IN_PROFILE,
  FUND_DISTRIBUTION_TYPES,
  ORDER_SEARCH_OPTIONS,
  ORDER_STATUSES,
  ORDER_TYPES,
  POL_CREATE_INVENTORY_SETTINGS,
} from '../../support/constants';

describe('Orders', () => {
  const testData = {
    fiscalYear: {},
    ledger: {},
    funds: {
      fundA: {},
      fundB: {},
    },
    budgets: {
      budgetA: {},
      budgetB: {},
    },
    locations: {
      location1: {},
      location2: {},
    },
    organization: {},
    instance: {},
    order1: {},
    orderLine1: {},
    order2: {},
    orderLine2: {},
    user: {},
  };

  const createLocations = (servicePointId) => {
    return NewLocation.createViaApi(NewLocation.getDefaultLocation(servicePointId))
      .then((location1) => {
        testData.locations.location1 = location1;
        return NewLocation.createViaApi(NewLocation.getDefaultLocation(servicePointId));
      })
      .then((location2) => {
        testData.locations.location2 = location2;
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

        const fundA = {
          ...Funds.getDefaultFund(),
          ledgerId: ledgerResponse.id,
          restrictByLocations: false,
        };

        return Funds.createViaApi(fundA).then((fundAResponse) => {
          testData.funds.fundA = fundAResponse.fund;

          const budgetA = {
            ...Budgets.getDefaultBudget(),
            fiscalYearId: fiscalYearResponse.id,
            fundId: fundAResponse.fund.id,
            allocated: 100,
          };

          return Budgets.createViaApi(budgetA).then((budgetAResponse) => {
            testData.budgets.budgetA = budgetAResponse;

            const fundB = {
              ...Funds.getDefaultFund(),
              ledgerId: ledgerResponse.id,
              restrictByLocations: true,
              locations: [{ locationId: testData.locations.location1.id }],
            };

            return Funds.createViaApi(fundB).then((fundBResponse) => {
              testData.funds.fundB = fundBResponse.fund;

              const budgetB = {
                ...Budgets.getDefaultBudget(),
                fiscalYearId: fiscalYearResponse.id,
                fundId: fundBResponse.fund.id,
                allocated: 100,
              };

              return Budgets.createViaApi(budgetB).then((budgetBResponse) => {
                testData.budgets.budgetB = budgetBResponse;
              });
            });
          });
        });
      });
    });
  };

  const createOrderLine = (purchaseOrderId, materialTypeId, acquisitionMethodId, config) => {
    // eslint-disable-next-line no-unused-vars
    const { id, ...baseOrderLine } = {
      ...BasicOrderLine.defaultOrderLine,
      purchaseOrderId,
      cost: {
        listUnitPrice: 20,
        currency: 'USD',
        quantityPhysical: config.quantity,
        poLineEstimatedPrice: 20,
      },
      fundDistribution: config.fundDistribution,
      locations: config.locations,
      acquisitionMethod: acquisitionMethodId,
      instanceId: config.instanceId,
      physical: {
        createInventory: POL_CREATE_INVENTORY_SETTINGS.INSTANCE_HOLDING_ITEM,
        materialType: materialTypeId,
        materialSupplier: testData.organization.id,
      },
    };

    return baseOrderLine;
  };

  const createOrder1WithLine = (materialTypeId, acquisitionMethodId) => {
    const order = {
      ...NewOrder.getDefaultOrder({ vendorId: testData.organization.id }),
      orderType: ORDER_TYPES.ONE_TIME_API,
      reEncumber: true,
    };

    return Orders.createOrderViaApi(order).then((orderResponse) => {
      testData.order1 = orderResponse;

      const orderLine = createOrderLine(orderResponse.id, materialTypeId, acquisitionMethodId, {
        fundDistribution: [
          {
            code: testData.funds.fundB.code,
            fundId: testData.funds.fundB.id,
            distributionType: FUND_DISTRIBUTION_TYPES.PERCENTAGE,
            value: 100,
          },
        ],
        locations: [
          {
            locationId: testData.locations.location1.id,
            quantity: 1,
            quantityPhysical: 1,
          },
        ],
        quantity: 1,
        instanceId: testData.instance.instanceId,
      });

      return OrderLines.createOrderLineViaApi(orderLine).then((orderLineResponse) => {
        testData.orderLine1 = orderLineResponse;

        return Orders.updateOrderViaApi({
          ...testData.order1,
          workflowStatus: ORDER_STATUSES.OPEN,
        });
      });
    });
  };

  const createOrder2WithLine = (materialTypeId, acquisitionMethodId) => {
    const order = {
      ...NewOrder.getDefaultOrder({ vendorId: testData.organization.id }),
      orderType: ORDER_TYPES.ONE_TIME_API,
      reEncumber: true,
      approved: true,
    };

    return Orders.createOrderViaApi(order).then((orderResponse) => {
      testData.order2 = orderResponse;

      const orderLine = createOrderLine(orderResponse.id, materialTypeId, acquisitionMethodId, {
        fundDistribution: [
          {
            code: testData.funds.fundA.code,
            fundId: testData.funds.fundA.id,
            distributionType: FUND_DISTRIBUTION_TYPES.PERCENTAGE,
            value: 50,
          },
          {
            code: testData.funds.fundB.code,
            fundId: testData.funds.fundB.id,
            distributionType: FUND_DISTRIBUTION_TYPES.PERCENTAGE,
            value: 50,
          },
        ],
        locations: [
          {
            locationId: testData.locations.location2.id,
            quantity: 2,
            quantityPhysical: 2,
          },
        ],
        quantity: 2,
        instanceId: testData.instance.instanceId,
      });

      return OrderLines.createOrderLineViaApi(orderLine).then((orderLineResponse) => {
        testData.orderLine2 = orderLineResponse;
      });
    });
  };

  const createOrderData = () => {
    return InventoryInstance.createInstanceViaApi()
      .then(({ instanceData }) => {
        testData.instance = instanceData;
        return Organizations.createOrganizationViaApi({
          ...NewOrganization.defaultUiOrganizations,
          isVendor: true,
        });
      })
      .then((organizationId) => {
        testData.organization = {
          id: organizationId,
          erpCode: NewOrganization.defaultUiOrganizations.erpCode,
        };
        return cy.getMaterialTypes({ limit: 1 });
      })
      .then((materialType) => cy
        .getAcquisitionMethodsApi({
          query: `value="${ACQUISITION_METHOD_NAMES_IN_PROFILE.PURCHASE}"`,
        })
        .then((acquisitionMethodResponse) => ({
          materialType,
          acquisitionMethod: acquisitionMethodResponse.body.acquisitionMethods[0],
        })))
      .then(({ materialType, acquisitionMethod }) => {
        return createOrder1WithLine(materialType.id, acquisitionMethod.id).then(() => createOrder2WithLine(materialType.id, acquisitionMethod.id));
      });
  };

  before('Create test data', () => {
    cy.getAdminToken();
    return ServicePoints.getViaApi()
      .then((servicePoints) => createLocations(servicePoints[0].id))
      .then(() => createFinanceData())
      .then(() => createOrderData())
      .then(() => {
        cy.createTempUser([
          Permissions.uiOrdersApprovePurchaseOrders.gui,
          Permissions.uiOrdersEdit.gui,
        ]).then((userProperties) => {
          testData.user = userProperties;

          cy.login(testData.user.username, testData.user.password, {
            path: TopMenu.ordersPath,
            waiter: Orders.waitLoading,
          });
        });
      });
  });

  after('Delete test data', () => {
    cy.getAdminToken().then(() => {
      Promise.all(
        Object.values({ order1: testData.order1, order2: testData.order2 }).map((order) => Orders.updateOrderViaApi(
          {
            ...order,
            workflowStatus: ORDER_STATUSES.PENDING,
          },
          true,
        )),
      ).then(() => {
        Object.values({ order1: testData.order1, order2: testData.order2 }).forEach((order) => Orders.deleteOrderViaApi(order.id));
        Object.values(testData.locations).forEach((location) => {
          NewLocation.deleteInstitutionCampusLibraryLocationViaApi(
            location.institutionId,
            location.campusId,
            location.libraryId,
            location.id,
          );
        });
        Object.values(testData.budgets).forEach((budget) => Budgets.deleteViaApi(budget.id));
        Object.values(testData.funds).forEach((fund) => Funds.deleteFundViaApi(fund.id));
        Ledgers.deleteLedgerViaApi(testData.ledger.id);
        FiscalYears.deleteFiscalYearViaApi(testData.fiscalYear.id);
        Users.deleteViaApi(testData.user.userId);
        Organizations.deleteOrganizationViaApi(testData.organization.id);
      });
    });
  });

  it(
    'C435907 An order with two funds (one is restricted by location) can be opened (thunderjet)',
    { tags: ['criticalPath', 'thunderjet', 'C435907'] },
    () => {
      Orders.searchByParameter(ORDER_SEARCH_OPTIONS.PO_NUMBER, testData.order2.poNumber);
      Orders.selectFromResultsList(testData.order2.poNumber);
      OrderDetails.checkOrderStatus(ORDER_STATUSES.PENDING);
      Orders.openOrder();
      Orders.checkInvalidLocationErrorMessage(testData.orderLine2.poLineNumber);
      OrderDetails.checkOrderStatus(ORDER_STATUSES.PENDING);
      InteractorsTools.closeCalloutMessage();
      OrderDetails.checkOrderStatus(ORDER_STATUSES.PENDING);
      OrderDetails.openPolDetails(testData.orderLine2.titleOrPackage);
      OrderLines.checkLocationRestrictedErrorMessage();
      InteractorsTools.closeCalloutMessage();
      OrderLineDetails.openOrderLineEditForm();
      OrderLines.setPhysicalQuantity({
        quantity: '1',
        index: 0,
      });
      OrderLines.openCreateHoldingForLocation();
      SelectLocationModal.selectLocation(testData.locations.location1.name);
      OrderLines.setPhysicalQuantity({
        quantity: '1',
        index: 1,
        changeQuantity: false,
      });
      OrderLineEditForm.clickSaveButton();
      InteractorsTools.checkNoErrorCallouts();
      OrderLineDetails.backToOrderDetails();
      OrderDetails.openOrder({ orderNumber: testData.order2.poNumber });
      OrderDetails.checkOrderStatus(ORDER_STATUSES.OPEN);
    },
  );
});
