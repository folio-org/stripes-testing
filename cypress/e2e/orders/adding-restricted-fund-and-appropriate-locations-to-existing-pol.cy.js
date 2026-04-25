import BasicOrderLine from '../../support/fragments/orders/basicOrderLine';
import Budgets from '../../support/fragments/finance/budgets/budgets';
import FiscalYears from '../../support/fragments/finance/fiscalYears/fiscalYears';
import Funds from '../../support/fragments/finance/funds/funds';
import Ledgers from '../../support/fragments/finance/ledgers/ledgers';
import InteractorsTools from '../../support/utils/interactorsTools';
import NewLocation from '../../support/fragments/settings/tenant/locations/newLocation';
import NewOrder from '../../support/fragments/orders/newOrder';
import NewOrganization from '../../support/fragments/organizations/newOrganization';
import Orders from '../../support/fragments/orders/orders';
import OrderDetails from '../../support/fragments/orders/orderDetails';
import OrderLines from '../../support/fragments/orders/orderLines';
import OrderLineDetails from '../../support/fragments/orders/orderLineDetails';
import OrderLineEditForm from '../../support/fragments/orders/orderLineEditForm';
import Organizations from '../../support/fragments/organizations/organizations';
import Permissions from '../../support/dictionary/permissions';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import {
  ACQUISITION_METHOD_NAMES_IN_PROFILE,
  ORDER_STATUSES,
  POL_CREATE_INVENTORY_SETTINGS,
  POLINE_DETAILS_FIELDS,
} from '../../support/constants';

describe('Orders', () => {
  const testData = {
    fiscalYear: {},
    ledger: {},
    fund: {},
    budget: {},
    locations: {
      location1: {},
      location2: {},
      location3: {},
    },
    organization: {},
    order: {},
    orderLine: {},
    quantityPhysical: '1',
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

        const fund = {
          ...Funds.getDefaultFund(),
          ledgerId: ledgerResponse.id,
          restrictByLocations: true,
          locations: [
            { locationId: testData.locations.location1.id },
            { locationId: testData.locations.location2.id },
          ],
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

  const createOrderLine = (purchaseOrderId, materialTypeId, acquisitionMethodId) => {
    return {
      ...BasicOrderLine.defaultOrderLine,
      purchaseOrderId,
      cost: {
        listUnitPrice: 20,
        currency: 'USD',
        quantityPhysical: 2,
        poLineEstimatedPrice: 40,
      },
      locations: [
        {
          locationId: testData.locations.location3.id,
          quantity: 2,
          quantityPhysical: 2,
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

    return Orders.createOrderViaApi(order)
      .then((orderResponse) => {
        testData.order = orderResponse;
        return createOrderLine(orderResponse.id, materialTypeId, acquisitionMethodId);
      })
      .then((orderLine) => OrderLines.createOrderLineViaApi(orderLine))
      .then((orderLineResponse) => {
        testData.orderLine = orderLineResponse;
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
      .then(() => {
        cy.createTempUser([Permissions.uiOrdersEdit.gui]).then((userProperties) => {
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
      Orders.deleteOrderViaApi(testData.order.id);
      deleteLocations(testData.locations);
      Budgets.deleteViaApi(testData.budget.id);
      Funds.deleteFundViaApi(testData.fund.id);
      Ledgers.deleteLedgerViaApi(testData.ledger.id);
      FiscalYears.deleteFiscalYearViaApi(testData.fiscalYear.id);
      Users.deleteViaApi(testData.user.userId);
      Organizations.deleteOrganizationViaApi(testData.organization.id);
    });
  });

  it(
    'C434140 Adding restricted Fund and appropriate locations to an existing PO line (thunderjet)',
    { tags: ['criticalPath', 'thunderjet', 'C434140'] },
    () => {
      Orders.searchByParameter('PO number', testData.order.poNumber);
      Orders.selectFromResultsList(testData.order.poNumber);
      OrderDetails.checkOrderStatus(ORDER_STATUSES.PENDING);
      OrderDetails.openPolDetails(testData.orderLine.titleOrPackage);
      OrderLineDetails.checkFundDistibutionTableContent([]);
      OrderLineDetails.openOrderLineEditForm();
      OrderLines.deleteLocationsInPOL();
      OrderLineEditForm.checkIsLocationRequired(true);
      OrderLineEditForm.clickAddFundDistributionButton();
      OrderLineEditForm.expandFundIdDropdown();
      OrderLineEditForm.selectFundFromOpenDropdown(testData.fund.name, testData.fund.code);
      OrderLineEditForm.clickAddLocationButton();
      OrderLineEditForm.expandLocationDropdown(0);
      OrderLineEditForm.checkLocationDropdownOptions([
        `${testData.locations.location1.name} (${testData.locations.location1.code})`,
        `${testData.locations.location2.name} (${testData.locations.location2.code})`,
      ]);
      OrderLineEditForm.selectLocationFromDropdown(testData.locations.location1.name);
      OrderLineEditForm.checkIsLocationRequired(false);
      OrderLineEditForm.clickAddLocationButton();
      OrderLineEditForm.expandLocationDropdown(1);
      OrderLineEditForm.selectLocationFromDropdown(testData.locations.location2.name);
      OrderLines.setPhysicalQuantity({
        quantity: testData.quantityPhysical,
        index: 0,
        changeQuantity: false,
      });
      OrderLines.setPhysicalQuantity({
        quantity: testData.quantityPhysical,
        index: 1,
        changeQuantity: false,
      });
      OrderLineEditForm.clickSaveButton();
      InteractorsTools.checkNoErrorCallouts();
      OrderLineDetails.checkFundDistibutionTableContent([{ name: testData.fund.code }]);
      OrderLineDetails.checkLocationsSection({
        locations: [
          [
            { key: POLINE_DETAILS_FIELDS.LOCATION_NAME, value: testData.locations.location1.name },
            { key: POLINE_DETAILS_FIELDS.QUANTITY_PHYSICAL, value: testData.quantityPhysical },
          ],
          [
            { key: POLINE_DETAILS_FIELDS.LOCATION_NAME, value: testData.locations.location2.name },
            { key: POLINE_DETAILS_FIELDS.QUANTITY_PHYSICAL, value: testData.quantityPhysical },
          ],
        ],
      });
    },
  );
});
