import Budgets from '../../support/fragments/finance/budgets/budgets';
import FiscalYears from '../../support/fragments/finance/fiscalYears/fiscalYears';
import Funds from '../../support/fragments/finance/funds/funds';
import Ledgers from '../../support/fragments/finance/ledgers/ledgers';
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
import getRandomPostfix from '../../support/utils/stringTools';
import {
  ACQUISITION_METHOD_NAMES_IN_PROFILE,
  MATERIAL_TYPE_NAMES,
  ORDER_FORMAT_NAMES,
  ORDER_SEARCH_OPTIONS,
  ORDER_STATUSES,
  ORDER_TYPES,
  POLINE_DETAILS_FIELDS,
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
    order: {},
    user: {},
  };

  const polData = {
    itemDetails: {
      title: `autotest_pol_title_${getRandomPostfix()}`,
    },
    poLineDetails: {
      acquisitionMethod: ACQUISITION_METHOD_NAMES_IN_PROFILE.APPROVAL_PLAN,
      orderFormat: ORDER_FORMAT_NAMES.PHYSICAL_RESOURCE,
      materialType: MATERIAL_TYPE_NAMES.TEXT,
    },
    costDetails: {
      physicalUnitPrice: '20',
      quantityPhysical: '1',
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
          restrictByLocations: true,
          locations: [{ locationId: testData.locations.location1.id }],
        };

        return Funds.createViaApi(fundA).then((fundAResponse) => {
          testData.funds.fundA = fundAResponse.fund;

          const budgetA = {
            ...Budgets.getDefaultBudget(),
            fiscalYearId: fiscalYearResponse.id,
            fundId: fundAResponse.fund.id,
            allocated: 1000,
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
                allocated: 1000,
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
      Object.values(testData.budgets).forEach((budget) => Budgets.deleteViaApi(budget.id));
      Object.values(testData.funds).forEach((fund) => Funds.deleteFundViaApi(fund.id));
      Ledgers.deleteLedgerViaApi(testData.ledger.id);
      FiscalYears.deleteFiscalYearViaApi(testData.fiscalYear.id);
      Organizations.deleteOrganizationViaApi(testData.organization.id);
      Users.deleteViaApi(testData.user.userId);
    });
  });

  it(
    'C434147 Adding location not related to restricted Fund when POL is created with both restricted and unrestricted Funds (thunderjet)',
    { tags: ['criticalPath', 'thunderjet', 'C434147'] },
    () => {
      // Step 0: Reset filters and search for the order
      Orders.resetFiltersIfActive();
      Orders.searchByParameter(ORDER_SEARCH_OPTIONS.PO_NUMBER, testData.order.poNumber);
      Orders.selectFromResultsList(testData.order.poNumber);
      OrderDetails.checkOrderStatus(ORDER_STATUSES.PENDING);

      // Step 1: Click "Add PO line" button
      OrderLines.addPOLine();

      // Step 2: Fill in required fields
      OrderLineEditForm.fillOrderLineFields(polData);

      // Step 3-4: Add first fund distribution - Fund A (restricted)
      OrderLineEditForm.clickAddFundDistributionButton();
      OrderLineEditForm.expandFundIdDropdown(0);
      OrderLineEditForm.selectFundFromOpenDropdown(
        testData.funds.fundA.name,
        testData.funds.fundA.code,
      );

      // Step 5-6: Add second fund distribution - Fund B (unrestricted)
      OrderLineEditForm.clickAddFundDistributionButton();
      OrderLineEditForm.expandFundIdDropdown(1);
      OrderLineEditForm.selectFundFromOpenDropdown(
        testData.funds.fundB.name,
        testData.funds.fundB.code,
      );

      // Step 7: Set 50% distribution value for each fund
      OrderLineEditForm.setFundDistributionValue('50', 0);
      OrderLineEditForm.setFundDistributionValue('50', 1);

      // Step 8: Click "Add location" button
      OrderLineEditForm.clickAddLocationButton();

      // Step 9-10: select location not related to restricted Fund A
      OrderLineEditForm.expandLocationDropdown(0);
      OrderLineEditForm.selectLocationFromDropdown(testData.locations.location2.name);

      // Step 11: Fill in quantity
      OrderLineEditForm.fillLocationDetails([{ quantityPhysical: '1' }]);

      // Step 12: Save POL and verify POL details
      OrderLineEditForm.clickSaveButton({ orderLineCreated: true, orderLineUpdated: false });
      OrderLines.checkLocationRestrictedErrorMessage();
      OrderLineDetails.checkFundDistibutionTableContent([
        { name: testData.funds.fundA.code },
        { name: testData.funds.fundB.code },
      ]);

      OrderLineDetails.checkLocationsSection({
        locations: [
          [
            { key: POLINE_DETAILS_FIELDS.LOCATION_NAME, value: testData.locations.location2.name },
            { key: POLINE_DETAILS_FIELDS.QUANTITY_PHYSICAL, value: '1' },
          ],
        ],
      });
      OrderLines.checkLocationRestrictedErrorMessage();
    },
  );
});
