import Permissions from '../../support/dictionary/permissions';
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
import InteractorsTools from '../../support/utils/interactorsTools';
import { OrderLineEditForm } from '../../support/fragments/orders';

describe('Orders', () => {
  const testData = {
    fiscalYear: {},
    ledger: {},
    fund: {},
    budget: {},
    organization: {},
    order: {},
    orderLine: {},
    user: {},
    location1: {},
    location2: {},
  };

  const createOrderLine = (purchaseOrderId, locationId, materialTypeId, acquisitionMethodId) => {
    return {
      ...BasicOrderLine.defaultOrderLine,
      purchaseOrderId,
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
      acquisitionMethod: acquisitionMethodId,
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

        const fund = {
          ...Funds.getDefaultFund(),
          ledgerId: ledgerResponse.id,
        };

        return Funds.createViaApi(fund).then((fundResponse) => {
          testData.fund = fundResponse.fund;

          const budget = {
            ...Budgets.getDefaultBudget(),
            fiscalYearId: fiscalYearResponse.id,
            fundId: fundResponse.fund.id,
            allocated: 100,
          };

          return Budgets.createViaApi(budget).then((budgetResponse) => {
            testData.budget = budgetResponse;
          });
        });
      });
    });
  };

  const createLocations = (servicePointId) => {
    return NewLocation.createViaApi(NewLocation.getDefaultLocation(servicePointId)).then(
      (location1) => {
        testData.location1 = location1;

        return NewLocation.createViaApi(NewLocation.getDefaultLocation(servicePointId)).then(
          (location2) => {
            testData.location2 = location2;
          },
        );
      },
    );
  };

  const restrictFundByLocation = () => {
    return Funds.updateFundViaApi({
      ...testData.fund,
      restrictByLocations: true,
      locations: [{ locationId: testData.location2.id }],
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
      .then((servicePoints) => createLocations(servicePoints[0].id))
      .then(() => cy.getMaterialTypes({ limit: 1 }))
      .then((materialType) => cy
        .getAcquisitionMethodsApi({
          query: `value="${ACQUISITION_METHOD_NAMES_IN_PROFILE.PURCHASE}"`,
        })
        .then((acquisitionMethod) => ({
          materialType,
          acquisitionMethod: acquisitionMethod.body.acquisitionMethods[0],
        })))
      .then(({ materialType, acquisitionMethod }) => createOrderWithLine(testData.location1.id, materialType.id, acquisitionMethod.id))
      .then(() => restrictFundByLocation());
  };

  before('Create test data', () => {
    cy.getAdminToken();
    return createFinanceData().then(() => {
      return createOrderData().then(() => {
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
        NewLocation.deleteInstitutionCampusLibraryLocationViaApi(
          testData.location1.institutionId,
          testData.location1.campusId,
          testData.location1.libraryId,
          testData.location1.id,
        );
        NewLocation.deleteInstitutionCampusLibraryLocationViaApi(
          testData.location2.institutionId,
          testData.location2.campusId,
          testData.location2.libraryId,
          testData.location2.id,
        );
        Budgets.deleteViaApi(testData.budget.id);
        Funds.deleteFundViaApi(testData.fund.id);
        Ledgers.deleteLedgerViaApi(testData.ledger.id);
        FiscalYears.deleteFiscalYearViaApi(testData.fiscalYear.id);
        Users.deleteViaApi(testData.user.userId);
        Organizations.deleteOrganizationViaApi(testData.organization.id);
      });
    });
  });

  it(
    'C435899 An order with invalid location for restricted fund can not be opened (thunderjet)',
    { tags: ['criticalPath', 'thunderjet', 'C435899'] },
    () => {
      Orders.searchByParameter('PO number', testData.order.poNumber);
      Orders.selectFromResultsList(testData.order.poNumber);
      OrderDetails.checkOrderStatus(ORDER_STATUSES.PENDING);
      Orders.openOrder();
      Orders.checkInvalidLocationErrorMessage(testData.orderLine.poLineNumber);
      OrderDetails.checkOrderStatus(ORDER_STATUSES.PENDING);
      InteractorsTools.closeCalloutMessage();
      OrderDetails.openPolDetails(testData.orderLine.titleOrPackage);
      OrderLines.checkLocationRestrictedErrorMessage();
      InteractorsTools.closeCalloutMessage();
      OrderLineDetails.openOrderLineEditForm();
      OrderLineEditForm.checkButtonsConditions([
        { label: 'Cancel', conditions: { disabled: false } },
        { label: 'Save & close', conditions: { disabled: true } },
      ]);
      OrderLines.deleteLocationsInPOL();
      OrderLineEditForm.clickAddLocationButton();
      OrderLines.addLocationToPOLWithoutSave({
        location: testData.location2,
        physicalQuantity: '1',
      });
      OrderLines.saveOrderLine();
      InteractorsTools.checkNoErrorCallouts();
      OrderLineDetails.checkOrderLineDetails({
        locationDetails: [
          { key: 'Name (code)', value: `${testData.location2.name} (${testData.location2.code})` },
        ],
      });
      OrderLineDetails.backToOrderDetails();
      OrderDetails.openOrder({ orderNumber: testData.order.poNumber });
      InteractorsTools.checkNoErrorCallouts();
      OrderDetails.checkOrderStatus(ORDER_STATUSES.OPEN);
    },
  );
});
