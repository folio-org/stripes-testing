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
  FUND_DISTRIBUTION_TYPES,
  ORDER_SEARCH_OPTIONS,
  ORDER_STATUSES,
  ORDER_TYPES,
  POLINE_DETAILS_FIELDS,
  POL_CREATE_INVENTORY_SETTINGS,
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
    },
    organization: {},
    order: {},
    orderLine: {},
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

        const fund = {
          ...Funds.getDefaultFund(),
          ledgerId: ledgerResponse.id,
          restrictByLocations: false,
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
          checkinItems: false,
          cost: {
            listUnitPrice: 20,
            currency: 'USD',
            quantityPhysical: 1,
            poLineEstimatedPrice: 20,
          },
          fundDistribution: [
            {
              fundId: testData.fund.id,
              code: testData.fund.code,
              value: 100,
              distributionType: FUND_DISTRIBUTION_TYPES.PERCENTAGE,
            },
          ],
          locations: [
            {
              locationId: testData.locations.location1.id,
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

  const openOrder = () => {
    return Orders.updateOrderViaApi({
      ...testData.order,
      workflowStatus: ORDER_STATUSES.OPEN,
    });
  };

  const restrictFundByLocation = () => {
    return Funds.updateFundViaApi({
      ...testData.fund,
      restrictByLocations: true,
      locations: [{ locationId: testData.locations.location2.id }],
    });
  };

  before('Create test data', () => {
    cy.getAdminToken();
    return ServicePoints.getViaApi()
      .then((servicePoints) => createLocations(servicePoints[0].id))
      .then(() => createFinanceData())
      .then(() => createOrderWithLine())
      .then(() => openOrder())
      .then(() => restrictFundByLocation())
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
      Orders.updateOrderViaApi(
        {
          ...testData.order,
          workflowStatus: ORDER_STATUSES.PENDING,
        },
        true,
      ).then(() => {
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
  });

  it(
    'C435909 Edit opened order with invalid location for restricted fund (thunderjet)',
    { tags: ['criticalPath', 'thunderjet', 'C435909'] },
    () => {
      // Step 1: Go to Order details pane
      Orders.resetFiltersIfActive();
      Orders.searchByParameter(ORDER_SEARCH_OPTIONS.PO_NUMBER, testData.order.poNumber);
      Orders.selectFromResultsList(testData.order.poNumber);
      OrderDetails.checkOrderStatus(ORDER_STATUSES.OPEN);

      // Step 2: Click PO line record and check error toast
      OrderDetails.openPolDetails(testData.orderLine.titleOrPackage);
      OrderLines.checkLocationRestrictedErrorMessage();
      InteractorsTools.closeCalloutMessage();

      // Step 3: Edit PO line
      OrderLineDetails.openOrderLineEditForm();

      // Step 4: Make changes NOT related to location (change unit price)
      OrderLineEditForm.fillCostDetails({ physicalUnitPrice: '25' });

      // Step 5: Save PO line and check error toast
      OrderLineEditForm.clickSaveButton();
      OrderLines.checkLocationRestrictedErrorMessage();
      OrderLineDetails.checkCostDetailsSection([
        { key: POLINE_DETAILS_FIELDS.PHYSICAL_UNIT_PRICE, value: '$25.00' },
      ]);
    },
  );
});
