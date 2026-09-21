import AcquisitionUnits from '../../support/fragments/settings/acquisitionUnits/acquisitionUnits';
import BasicOrderLine from '../../support/fragments/orders/basicOrderLine';
import Budgets from '../../support/fragments/finance/budgets/budgets';
import FiscalYears from '../../support/fragments/finance/fiscalYears/fiscalYears';
import Funds from '../../support/fragments/finance/funds/funds';
import InteractorsTools from '../../support/utils/interactorsTools';
import Ledgers from '../../support/fragments/finance/ledgers/ledgers';
import Locations from '../../support/fragments/settings/tenant/location-setup/locations';
import NewOrder from '../../support/fragments/orders/newOrder';
import NewOrganization from '../../support/fragments/organizations/newOrganization';
import Orders from '../../support/fragments/orders/orders';
import OrderDetails from '../../support/fragments/orders/orderDetails';
import OrderLines from '../../support/fragments/orders/orderLines';
import OrderLineDetails from '../../support/fragments/orders/orderLineDetails';
import OrderLineEditForm from '../../support/fragments/orders/orderLineEditForm';
import Organizations from '../../support/fragments/organizations/organizations';
import Permissions from '../../support/dictionary/permissions';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import {
  ACQUISITION_METHOD_NAMES_IN_PROFILE,
  ORDER_STATUSES,
  POL_CREATE_INVENTORY_SETTINGS,
  POLINE_DETAILS_FIELDS,
} from '../../support/constants';

describe('Orders', () => {
  const quantityPhysical = '1';
  let testData;

  const createFinanceData = () => {
    return FiscalYears.getCurrentFiscalYearOrCreateViaApi().then((fiscalYearResponse) => {
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
          locationId: testData.locations.location1.id,
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
        testData.organization = { id: organizationId };

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
    testData = {
      fiscalYear: {},
      ledger: {},
      fund: {},
      budget: {},
      locations: {
        location1: {},
        location2: {},
      },
      organization: {},
      order: {},
      orderLine: {},
      acquisitionUnit: {},
      user: {},
    };

    cy.getAdminToken();
    return Locations.getViaApiAnyDefault(2)
      .then(([location1, location2]) => {
        testData.locations = { location1, location2 };
      })
      .then(() => createFinanceData())
      .then(() => cy.createTempUser([Permissions.uiOrdersEdit.gui]))
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
        Orders.searchByParameter('PO number', testData.order.poNumber);
        Orders.selectFromResultsList(testData.order.poNumber);
        OrderDetails.checkOrderStatus(ORDER_STATUSES.PENDING);
      });
  });

  after('Delete test data', () => {
    cy.getAdminToken().then(() => {
      Orders.deleteOrderViaApi(testData.order.id);
      Budgets.deleteViaApi(testData.budget.id);
      Funds.deleteFundViaApi(testData.fund.id);
      Ledgers.deleteLedgerViaApi(testData.ledger.id);
      AcquisitionUnits.deleteAcquisitionUnitViaApi(testData.acquisitionUnit.id);
      Users.deleteViaApi(testData.user.userId);
      Organizations.deleteOrganizationViaApi(testData.organization.id);
    });
  });

  it(
    'C435895 Changing locations in existing POL when Fund distribution is specified with restricted Fund and Order has Acquisition unit assigned (thunderjet)',
    { tags: ['extendedPath', 'thunderjet', 'C435895'] },
    () => {
      const { location1, location2 } = testData.locations;

      // Step 1: Click on "PO line" record in "PO lines" accordion
      OrderDetails.openPolDetails(testData.orderLine.titleOrPackage);
      OrderLineDetails.checkFundDistibutionTableContent([{ name: testData.fund.code }]);

      // Step 2: Click on "Actions" button and select "Edit" option
      OrderLineDetails.openOrderLineEditForm();

      // Step 3: Check the Fund displayed in "Fund distribution" accordion
      OrderLineEditForm.checkFundDistributionFundSelected({ fund: testData.fund.code });

      // Step 4: Check the existing location record in "Location" accordion
      OrderLineEditForm.checkLocationSelected({ location: location1.name });

      // Step 5: Delete the existing Location record
      OrderLineEditForm.removeLocationByIndex(0);
      OrderLineEditForm.checkIsLocationRequired(true);

      // Step 6: Click on "Add location" button
      OrderLineEditForm.clickAddLocationButton();
      OrderLineEditForm.checkLocationDetailsSection();

      // Step 7: Expand "Name (code)" dropdown - only two locations from the fund are available
      OrderLineEditForm.expandLocationDropdown(0);
      OrderLineEditForm.checkLocationDropdownOptions([
        `${location1.name} (${location1.code})`,
        `${location2.name} (${location2.code})`,
      ]);

      // Step 8: Select the second Location
      OrderLineEditForm.selectLocationFromDropdown(location2.name);
      OrderLineEditForm.checkLocationSelected({ location: location2.name });

      // Step 9: Enter "1" in "Quantity" field
      OrderLines.setPhysicalQuantity({ quantity: quantityPhysical, changeQuantity: false });

      // Step 10: Click on "Save & close" button
      OrderLineEditForm.clickSaveButton();
      InteractorsTools.checkNoErrorCallouts();
      OrderLineDetails.checkFundDistibutionTableContent([{ name: testData.fund.code }]);
      OrderLineDetails.checkLocationsSection({
        locations: [
          [
            { key: POLINE_DETAILS_FIELDS.LOCATION_NAME, value: location2.name },
            { key: POLINE_DETAILS_FIELDS.QUANTITY_PHYSICAL, value: quantityPhysical },
          ],
        ],
      });
      OrderLineDetails.verifyLocationAbsentInSection(location1.name);
    },
  );
});
