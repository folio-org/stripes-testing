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
import AcquisitionUnits from '../../support/fragments/settings/acquisitionUnits/acquisitionUnits';
import {
  ACQUISITION_METHOD_NAMES_IN_PROFILE,
  ORDER_STATUSES,
  POL_CREATE_INVENTORY_SETTINGS,
} from '../../support/constants';

describe('Orders', () => {
  const testData = {
    fiscalYear: {},
    ledger: {},
    fund: {},
    budget: {},
    location: {},
    organization: {},
    order: {},
    orderLine: {},
    acquisitionUnit: {},
    user: {},
  };

  const createLocation = (servicePointId) => {
    return NewLocation.createViaApi(NewLocation.getDefaultLocation(servicePointId)).then(
      (location) => {
        testData.location = location;
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

        const fund = {
          ...Funds.getDefaultFund(),
          ledgerId: ledgerResponse.id,
          restrictByLocations: true,
          locations: [{ locationId: testData.location.id }],
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

  const createAcquisitionUnit = (adminUserId, userId) => {
    const acquisitionUnit = AcquisitionUnits.getDefaultAcquisitionUnit({
      protectRead: true,
      protectUpdate: true,
      protectCreate: true,
      protectDelete: true,
    });

    return AcquisitionUnits.createAcquisitionUnitViaApi(acquisitionUnit).then((auResponse) => {
      testData.acquisitionUnit = auResponse;

      return AcquisitionUnits.assignUserViaApi(adminUserId, auResponse.id).then(() => AcquisitionUnits.assignUserViaApi(userId, auResponse.id));
    });
  };

  const createOrderLine = (purchaseOrderId, materialTypeId, acquisitionMethodId) => {
    return {
      ...BasicOrderLine.defaultOrderLine,
      purchaseOrderId,
      cost: {
        listUnitPrice: 20,
        currency: 'USD',
        quantityPhysical: 1,
        poLineEstimatedPrice: 20,
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
          locationId: testData.location.id,
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
      acqUnitIds: [testData.acquisitionUnit.id],
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

  before('Create test data', () => {
    cy.getAdminToken();
    return ServicePoints.getViaApi()
      .then((servicePoints) => createLocation(servicePoints[0].id))
      .then(() => createFinanceData())
      .then(() => cy.createTempUser([
        Permissions.uiOrdersApprovePurchaseOrders.gui,
        Permissions.uiOrdersEdit.gui,
      ]))
      .then((userProperties) => {
        testData.user = userProperties;

        return cy.getAdminUserDetails();
      })
      .then((adminUser) => createAcquisitionUnit(adminUser.id, testData.user.userId))
      .then(() => createOrderData())
      .then(() => {
        cy.login(testData.user.username, testData.user.password, {
          path: TopMenu.ordersPath,
          waiter: Orders.waitLoading,
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
          testData.location.institutionId,
          testData.location.campusId,
          testData.location.libraryId,
          testData.location.id,
        );
        Budgets.deleteViaApi(testData.budget.id);
        Funds.deleteFundViaApi(testData.fund.id);
        Ledgers.deleteLedgerViaApi(testData.ledger.id);
        FiscalYears.deleteFiscalYearViaApi(testData.fiscalYear.id);
        AcquisitionUnits.deleteAcquisitionUnitViaApi(testData.acquisitionUnit.id);
        Users.deleteViaApi(testData.user.userId);
        Organizations.deleteOrganizationViaApi(testData.organization.id);
      });
    });
  });

  it(
    'C435903 An order with restricted fund and acquisition unit can be opened (thunderjet)',
    { tags: ['extendedPath', 'thunderjet', 'C435903'] },
    () => {
      Orders.searchByParameter('PO number', testData.order.poNumber);
      Orders.selectFromResultsList(testData.order.poNumber);
      OrderDetails.checkOrderStatus(ORDER_STATUSES.PENDING);
      OrderDetails.openOrder({ orderNumber: testData.order.poNumber });
      InteractorsTools.checkNoErrorCallouts();
      OrderDetails.checkOrderStatus(ORDER_STATUSES.OPEN);
      OrderDetails.openPolDetails(testData.orderLine.titleOrPackage);
      OrderLineDetails.checkLocationsSection({
        locations: [
          [
            { key: 'Holding', value: testData.location.name },
            { key: 'Quantity physical', value: testData.orderLine.cost.quantityPhysical },
          ],
        ],
      });
      OrderLineDetails.checkFundDistibutionTableContent([
        { name: testData.fund.code, amount: `$${testData.orderLine.cost.poLineEstimatedPrice}.00` },
      ]);
      InteractorsTools.checkNoErrorCallouts();
    },
  );
});
