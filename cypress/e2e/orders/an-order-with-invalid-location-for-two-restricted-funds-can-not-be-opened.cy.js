import BasicOrderLine from '../../support/fragments/orders/basicOrderLine';
import Budgets from '../../support/fragments/finance/budgets/budgets';
import FiscalYears from '../../support/fragments/finance/fiscalYears/fiscalYears';
import Funds from '../../support/fragments/finance/funds/funds';
import InteractorsTools from '../../support/utils/interactorsTools';
import Ledgers from '../../support/fragments/finance/ledgers/ledgers';
import NewLocation from '../../support/fragments/settings/tenant/locations/newLocation';
import NewOrder from '../../support/fragments/orders/newOrder';
import NewOrganization from '../../support/fragments/organizations/newOrganization';
import Orders from '../../support/fragments/orders/orders';
import OrderDetails from '../../support/fragments/orders/orderDetails';
import OrderLines from '../../support/fragments/orders/orderLines';
import OrderLineDetails from '../../support/fragments/orders/orderLineDetails';
import Organizations from '../../support/fragments/organizations/organizations';
import Permissions from '../../support/dictionary/permissions';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import {
  ACQUISITION_METHOD_NAMES_IN_PROFILE,
  ORDER_STATUSES,
  POL_CREATE_INVENTORY_SETTINGS,
} from '../../support/constants';
import { OrderLineEditForm } from '../../support/fragments/orders';

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
      location3: {},
    },
    organization: {},
    order: {},
    orderLine: {},
    user: {},
  };

  const createLocations = (servicePointId) => {
    return NewLocation.createViaApi(NewLocation.getDefaultLocation(servicePointId)).then(
      (location1) => {
        testData.locations.location1 = location1;

        return NewLocation.createViaApi(NewLocation.getDefaultLocation(servicePointId)).then(
          (location2) => {
            testData.locations.location2 = location2;

            return NewLocation.createViaApi(NewLocation.getDefaultLocation(servicePointId)).then(
              (location3) => {
                testData.locations.location3 = location3;
              },
            );
          },
        );
      },
    );
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
          restrictByLocations: true,
          locations: [{ locationId: testData.locations.location1.id }],
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
              restrictByLocations: false,
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

  const createOrderLine = (purchaseOrderId, materialTypeId, acquisitionMethodId) => {
    return {
      ...BasicOrderLine.defaultOrderLine,
      purchaseOrderId,
      cost: {
        listUnitPrice: 20.0,
        currency: 'USD',
        quantityPhysical: 2,
        poLineEstimatedPrice: 20.0,
      },
      fundDistribution: [
        {
          code: testData.funds.fundA.code,
          fundId: testData.funds.fundA.id,
          distributionType: 'percentage',
          value: 50,
        },
        {
          code: testData.funds.fundB.code,
          fundId: testData.funds.fundB.id,
          distributionType: 'percentage',
          value: 50,
        },
      ],
      locations: [
        {
          locationId: testData.locations.location2.id,
          quantity: 1,
          quantityPhysical: 1,
        },
        {
          locationId: testData.locations.location3.id,
          quantity: 1,
          quantityPhysical: 1,
        },
      ],
      acquisitionMethod: acquisitionMethodId,
      physical: {
        createInventory: POL_CREATE_INVENTORY_SETTINGS.INSTANCE_HOLDING_ITEM,
        materialType: materialTypeId,
        materialSupplier: testData.organization.id,
      },
    };
  };

  const createOrderWithLine = (materialTypeId, acquisitionMethodId) => {
    const order = {
      ...NewOrder.getDefaultOrder({ vendorId: testData.organization.id }),
      orderType: 'One-Time',
      reEncumber: true,
      approved: true,
    };

    return Orders.createOrderViaApi(order).then((orderResponse) => {
      testData.order = orderResponse;

      const orderLine = createOrderLine(orderResponse.id, materialTypeId, acquisitionMethodId);

      return OrderLines.createOrderLineViaApi(orderLine).then((orderLineResponse) => {
        testData.orderLine = orderLineResponse;
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

        return cy.getMaterialTypes({ limit: 1 });
      })
      .then((materialType) => cy
        .getAcquisitionMethodsApi({
          query: `value="${ACQUISITION_METHOD_NAMES_IN_PROFILE.PURCHASE}"`,
        })
        .then((acquisitionMethod) => ({
          materialType,
          acquisitionMethod: acquisitionMethod.body.acquisitionMethods[0],
        })))
      .then(({ materialType, acquisitionMethod }) => createOrderWithLine(materialType.id, acquisitionMethod.id));
  };

  const deleteLocations = (locations) => {
    Object.values(locations).forEach((location) => {
      NewLocation.deleteInstitutionCampusLibraryLocationViaApi(
        location.institutionId,
        location.campusId,
        location.libraryId,
        location.id,
      );
    });
  };

  before('Create test data', () => {
    cy.getAdminToken();
    return ServicePoints.getViaApi()
      .then((servicePoints) => createLocations(servicePoints[0].id))
      .then(() => createFinanceData())
      .then(() => createOrderData())
      .then(() => Funds.updateFundViaApi({
        ...testData.funds.fundB,
        restrictByLocations: true,
        locations: [{ locationId: testData.locations.location2.id }],
      }))
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
      Orders.updateOrderViaApi(
        {
          ...testData.order,
          workflowStatus: ORDER_STATUSES.PENDING,
        },
        true,
      ).then(() => {
        Orders.deleteOrderViaApi(testData.order.id);
        deleteLocations(testData.locations);
        Budgets.deleteViaApi(testData.budgets.budgetA.id);
        Budgets.deleteViaApi(testData.budgets.budgetB.id);
        Funds.deleteFundViaApi(testData.funds.fundA.id);
        Funds.deleteFundViaApi(testData.funds.fundB.id);
        Ledgers.deleteLedgerViaApi(testData.ledger.id);
        FiscalYears.deleteFiscalYearViaApi(testData.fiscalYear.id);
        Users.deleteViaApi(testData.user.userId);
        Organizations.deleteOrganizationViaApi(testData.organization.id);
      });
    });
  });

  it(
    'C435914 An order with invalid location for two restricted funds can not be opened (thunderjet)',
    { tags: ['criticalPath', 'thunderjet', 'C435914'] },
    () => {
      Orders.searchByParameter('PO number', testData.order.poNumber);
      Orders.selectFromResultsList(testData.order.poNumber);
      OrderDetails.checkOrderStatus(ORDER_STATUSES.PENDING);
      Orders.openOrder();
      Orders.checkInvalidLocationErrorMessage(testData.orderLine.poLineNumber);
      InteractorsTools.closeCalloutMessage();
      OrderDetails.checkOrderStatus(ORDER_STATUSES.PENDING);
      OrderDetails.openPolDetails(testData.orderLine.titleOrPackage);
      OrderLines.checkLocationRestrictedErrorMessage();
      InteractorsTools.closeCalloutMessage();
      OrderLineDetails.openOrderLineEditForm();
      OrderLines.deleteLocationsInPOL('1');
      OrderLineEditForm.clickAddLocationButton();
      OrderLines.addLocationToPOLWithoutSave({
        index: 1,
        location: testData.locations.location1,
        physicalQuantity: '1',
      });
      OrderLines.saveOrderLine();
      OrderLineDetails.checkOrderLineDetails({
        locationDetails: [
          {
            key: 'Name (code)',
            value: `${testData.locations.location2.name} (${testData.locations.location2.code})`,
          },
          {
            key: 'Name (code)',
            value: `${testData.locations.location1.name} (${testData.locations.location1.code})`,
          },
        ],
      });
      InteractorsTools.checkNoErrorCallouts();
      OrderLineDetails.backToOrderDetails();
      OrderDetails.openOrder({ orderNumber: testData.order.poNumber });
      OrderDetails.checkOrderStatus(ORDER_STATUSES.OPEN);
    },
  );
});
