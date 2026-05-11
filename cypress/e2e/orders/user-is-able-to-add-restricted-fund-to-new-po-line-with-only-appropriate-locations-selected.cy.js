import Budgets from '../../support/fragments/finance/budgets/budgets';
import FiscalYears from '../../support/fragments/finance/fiscalYears/fiscalYears';
import Funds from '../../support/fragments/finance/funds/funds';
import InteractorsTools from '../../support/utils/interactorsTools';
import Ledgers from '../../support/fragments/finance/ledgers/ledgers';
import NewLocation from '../../support/fragments/settings/tenant/locations/newLocation';
import NewOrder from '../../support/fragments/orders/newOrder';
import NewOrganization from '../../support/fragments/organizations/newOrganization';
import Orders from '../../support/fragments/orders/orders';
import OrderLines from '../../support/fragments/orders/orderLines';
import OrderLineDetails from '../../support/fragments/orders/orderLineDetails';
import OrderLineEditForm from '../../support/fragments/orders/orderLineEditForm';
import Organizations from '../../support/fragments/organizations/organizations';
import Permissions from '../../support/dictionary/permissions';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import getRandomPostfix from '../../support/utils/stringTools';
import {
  ACQUISITION_METHOD_NAMES_IN_PROFILE,
  MATERIAL_TYPE_NAMES,
  ORDER_FORMAT_NAMES,
  ORDER_SEARCH_OPTIONS,
  ORDER_TYPES,
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
    user: {},
  };

  const polData = {
    itemDetails: {
      title: `autotest_pol_title_${getRandomPostfix()}`,
    },
    poLineDetails: {
      acquisitionMethod: ACQUISITION_METHOD_NAMES_IN_PROFILE.PURCHASE,
      orderFormat: ORDER_FORMAT_NAMES.PHYSICAL_RESOURCE,
      materialType: MATERIAL_TYPE_NAMES.TEXT,
    },
    costDetails: {
      physicalUnitPrice: '20',
      quantityPhysical: '2',
    },
  };

  const createLocations = (servicePointId) => {
    return NewLocation.createViaApi(NewLocation.getDefaultLocation(servicePointId))
      .then((location1) => {
        testData.locations.location1 = location1;
        return NewLocation.createViaApi(NewLocation.getDefaultLocation(servicePointId));
      })
      .then((location2) => {
        testData.locations.location2 = location2;
        return NewLocation.createViaApi(NewLocation.getDefaultLocation(servicePointId));
      })
      .then((location3) => {
        testData.locations.location3 = location3;
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
            allocated: 1000,
          };

          return Budgets.createViaApi(budget).then((budgetResponse) => {
            testData.budget = budgetResponse;
          });
        });
      });
    });
  };

  const createOrderData = () => {
    return Organizations.createOrganizationViaApi({
      ...NewOrganization.defaultUiOrganizations,
      isVendor: true,
    }).then((organizationId) => {
      testData.organization = {
        id: organizationId,
        erpCode: NewOrganization.defaultUiOrganizations.erpCode,
      };

      const order = {
        ...NewOrder.getDefaultOrder({ vendorId: testData.organization.id }),
        orderType: ORDER_TYPES.ONE_TIME_API,
        reEncumber: true,
      };

      return Orders.createOrderViaApi(order).then((orderResponse) => {
        testData.order = orderResponse;
      });
    });
  };

  before('Create test data', () => {
    cy.getAdminToken();
    return ServicePoints.getViaApi()
      .then((servicePoints) => createLocations(servicePoints[0].id))
      .then(() => createFinanceData())
      .then(() => createOrderData())
      .then(() => {
        cy.createTempUser([Permissions.uiOrdersCreate.gui, Permissions.uiOrdersEdit.gui]).then(
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

  after('Delete test data', () => {
    cy.getAdminToken().then(() => {
      Orders.deleteOrderViaApi(testData.order.id);
      Object.values(testData.locations).forEach((location) => {
        NewLocation.deleteInstitutionCampusLibraryLocationViaApi(
          location.institutionId,
          location.campusId,
          location.libraryId,
          location.id,
        );
      });
      Budgets.deleteViaApi(testData.budget.id);
      Funds.deleteFundViaApi(testData.fund.id);
      Ledgers.deleteLedgerViaApi(testData.ledger.id);
      FiscalYears.deleteFiscalYearViaApi(testData.fiscalYear.id);
      Organizations.deleteOrganizationViaApi(testData.organization.id);
      Users.deleteViaApi(testData.user.userId);
    });
  });

  it(
    'C434141 User is able to add restricted Fund to new PO line with only appropriate locations selected (thunderjet)',
    { tags: ['criticalPath', 'thunderjet', 'C434141'] },
    () => {
      // Step 0: Reset filters and search for the order
      Orders.resetFiltersIfActive();
      Orders.searchByParameter(ORDER_SEARCH_OPTIONS.PO_NUMBER, testData.order.poNumber);
      Orders.selectFromResultsList(testData.order.poNumber);

      // Step 1: Click "Add PO line" button
      OrderLines.addPOLine();

      // Step 2: Fill in required fields
      OrderLineEditForm.fillOrderLineFields(polData);

      // Step 3: Click "Add location" button
      OrderLineEditForm.clickAddLocationButton();

      // Step 4 - 5: Select incompatible location
      OrderLineEditForm.expandLocationDropdown(0);
      OrderLineEditForm.selectLocationFromDropdown(testData.locations.location3.name);

      // Step 6-7: Verify that restricted fund is not displayed in dropdown
      OrderLineEditForm.clickAddFundDistributionButton();
      OrderLineEditForm.expandFundIdDropdown();
      OrderLineEditForm.verifyFundInDropdown(testData.fund.name, testData.fund.code, false);

      // Step 8: Delete incompatible location
      OrderLines.deleteLocationsInPOL(0);

      // Step 9: Add the first compatible location
      OrderLineEditForm.clickAddLocationButton();
      OrderLineEditForm.expandLocationDropdown(0);
      OrderLineEditForm.selectLocationFromDropdown(testData.locations.location1.name);

      // Step 10: Add the second compatible location
      OrderLineEditForm.clickAddLocationButton();
      OrderLineEditForm.expandLocationDropdown(1);
      OrderLineEditForm.selectLocationFromDropdown(testData.locations.location2.name);

      // Step 11: Fill in quantity for each location
      OrderLineEditForm.fillLocationDetails([{ quantityPhysical: '1' }, { quantityPhysical: '1' }]);

      // Step 12-13: Select fund from dropdown
      OrderLineEditForm.expandFundIdDropdown();
      OrderLineEditForm.verifyFundInDropdown(testData.fund.name, testData.fund.code, true);
      OrderLineEditForm.selectFundFromOpenDropdown(testData.fund.name, testData.fund.code);

      // Step 14: Save POL and verify POL details
      OrderLineEditForm.clickSaveButton({ orderLineCreated: true, orderLineUpdated: false });
      OrderLineDetails.checkFundDistibutionTableContent([{ name: testData.fund.code }]);
      OrderLineDetails.checkLocationsSection({
        locations: [
          [
            { key: POLINE_DETAILS_FIELDS.LOCATION_NAME, value: testData.locations.location1.name },
            { key: POLINE_DETAILS_FIELDS.QUANTITY_PHYSICAL, value: '1' },
          ],
          [
            { key: POLINE_DETAILS_FIELDS.LOCATION_NAME, value: testData.locations.location2.name },
            { key: POLINE_DETAILS_FIELDS.QUANTITY_PHYSICAL, value: '1' },
          ],
        ],
      });
      InteractorsTools.checkNoErrorCallouts();
    },
  );
});
