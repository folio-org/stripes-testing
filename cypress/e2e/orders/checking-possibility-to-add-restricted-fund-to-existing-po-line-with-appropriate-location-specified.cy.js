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
import OrderLineEditForm from '../../support/fragments/orders/orderLineEditForm';
import Organizations from '../../support/fragments/organizations/organizations';
import Permissions from '../../support/dictionary/permissions';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import {
  ACQUISITION_METHOD_NAMES_IN_PROFILE,
  ORDER_SEARCH_OPTIONS,
  ORDER_TYPES,
  POLINE_DETAILS_FIELDS,
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
    location: {},
    organization: {},
    order: {},
    orderLine: {},
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

        const fundA = {
          ...Funds.getDefaultFund(),
          ledgerId: ledgerResponse.id,
          restrictByLocations: true,
          locations: [{ locationId: testData.location.id }],
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

  const createOrderWithLine = () => {
    return Organizations.createOrganizationViaApi({
      ...NewOrganization.defaultUiOrganizations,
      isVendor: true,
    })
      .then((organizationId) => {
        testData.organization = { id: organizationId };
        return cy.getAcquisitionMethodsApi({
          query: `value="${ACQUISITION_METHOD_NAMES_IN_PROFILE.PURCHASE}"`,
        });
      })
      .then((acquisitionMethodResponse) => {
        const order = {
          ...NewOrder.getDefaultOrder({ vendorId: testData.organization.id }),
          orderType: ORDER_TYPES.ONE_TIME_API,
          reEncumber: true,
        };

        return Orders.createOrderViaApi(order).then((orderResponse) => {
          testData.order = orderResponse;
          return cy.getMaterialTypes({ limit: 1 }).then((materialType) => ({
            orderResponse,
            materialType,
            acquisitionMethod: acquisitionMethodResponse.body.acquisitionMethods[0],
          }));
        });
      })
      .then(({ orderResponse, materialType, acquisitionMethod }) => {
        const orderLine = {
          ...BasicOrderLine.defaultOrderLine,
          purchaseOrderId: orderResponse.id,
          cost: {
            listUnitPrice: 20,
            currency: 'USD',
            quantityPhysical: 1,
            poLineEstimatedPrice: 20,
          },
          fundDistribution: [],
          locations: [
            {
              locationId: testData.location.id,
              quantity: 1,
              quantityPhysical: 1,
            },
          ],
          acquisitionMethod: acquisitionMethod.id,
          physical: {
            createInventory: POL_CREATE_INVENTORY_SETTINGS.INSTANCE_HOLDING_ITEM,
            materialType: materialType.id,
            materialSupplier: testData.organization.id,
          },
        };

        return OrderLines.createOrderLineViaApi(orderLine).then((orderLineResponse) => {
          testData.orderLine = orderLineResponse;
        });
      });
  };

  before('Create test data', () => {
    cy.getAdminToken();
    return ServicePoints.getViaApi()
      .then((servicePoints) => createLocation(servicePoints[0].id))
      .then(() => createFinanceData())
      .then(() => createOrderWithLine())
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
      NewLocation.deleteInstitutionCampusLibraryLocationViaApi(
        testData.location.institutionId,
        testData.location.campusId,
        testData.location.libraryId,
        testData.location.id,
      );
      Object.values(testData.budgets).forEach((budget) => Budgets.deleteViaApi(budget.id));
      Object.values(testData.funds).forEach((fund) => Funds.deleteFundViaApi(fund.id));
      Ledgers.deleteLedgerViaApi(testData.ledger.id);
      FiscalYears.deleteFiscalYearViaApi(testData.fiscalYear.id);
      Organizations.deleteOrganizationViaApi(testData.organization.id);
      Users.deleteViaApi(testData.user.userId);
    });
  });

  it(
    'C434146 Checking possibility to add restricted fund to existing PO line with appropriate location specified (thunderjet)',
    { tags: ['criticalPath', 'thunderjet', 'C434146'] },
    () => {
      // Step 0: Reset filters and search for the order
      Orders.resetFiltersIfActive();
      Orders.searchByParameter(ORDER_SEARCH_OPTIONS.PO_NUMBER, testData.order.poNumber);
      Orders.selectFromResultsList(testData.order.poNumber);

      // Step 1: Click on PO line record
      OrderDetails.openPolDetails(testData.orderLine.titleOrPackage);
      OrderLineDetails.checkFundDistibutionTableContent([]);
      OrderLineDetails.checkLocationsSection({
        locations: [
          [
            { key: POLINE_DETAILS_FIELDS.LOCATION_NAME, value: testData.location.name },
            { key: POLINE_DETAILS_FIELDS.QUANTITY_PHYSICAL, value: '1' },
          ],
        ],
      });

      // Step 2: Edit PO line
      OrderLineDetails.openOrderLineEditForm();

      // Step 3-4: Add fund distribution
      OrderLineEditForm.clickAddFundDistributionButton();
      OrderLineEditForm.expandFundIdDropdown(0);

      // Step 5: Verify: Both funds (A and B) are displayed
      OrderLineEditForm.verifyFundInDropdown(
        testData.funds.fundA.name,
        testData.funds.fundA.code,
        true,
      );
      OrderLineEditForm.verifyFundInDropdown(
        testData.funds.fundB.name,
        testData.funds.fundB.code,
        true,
      );

      // Step 6: Select not restricted Fund B
      OrderLineEditForm.selectFundFromOpenDropdown(
        testData.funds.fundB.name,
        testData.funds.fundB.code,
      );

      // Step 7: Save POL and verify POL details
      OrderLineEditForm.clickSaveButton({ orderLineCreated: false, orderLineUpdated: true });
      OrderLineDetails.checkFundDistibutionTableContent([{ name: testData.funds.fundB.code }]);
      OrderLineDetails.checkLocationsSection({
        locations: [
          [
            { key: POLINE_DETAILS_FIELDS.LOCATION_NAME, value: testData.location.name },
            { key: POLINE_DETAILS_FIELDS.QUANTITY_PHYSICAL, value: '1' },
          ],
        ],
      });
      InteractorsTools.checkNoErrorCallouts();
    },
  );
});
