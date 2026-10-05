import { ACQUISITION_METHOD_NAMES_IN_PROFILE, ORDER_STATUSES } from '../../../../support/constants';
import Budgets from '../../../../support/fragments/finance/budgets/budgets';
import FiscalYears from '../../../../support/fragments/finance/fiscalYears/fiscalYears';
import Funds from '../../../../support/fragments/finance/funds/funds';
import Ledgers from '../../../../support/fragments/finance/ledgers/ledgers';
import BasicOrderLine from '../../../../support/fragments/orders/basicOrderLine';
import NewOrder from '../../../../support/fragments/orders/newOrder';
import OrderDetails from '../../../../support/fragments/orders/orderDetails';
import OrderLines from '../../../../support/fragments/orders/orderLines';
import Orders from '../../../../support/fragments/orders/orders';
import NewOrganization from '../../../../support/fragments/organizations/newOrganization';
import Organizations from '../../../../support/fragments/organizations/organizations';
import NewLocation from '../../../../support/fragments/settings/tenant/locations/newLocation';
import ServicePoints from '../../../../support/fragments/settings/tenant/servicePoints/servicePoints';
import TopMenu from '../../../../support/fragments/topMenu';
import InteractorsTools from '../../../../support/utils/interactorsTools';
import { parseSanityParameters } from '../../../../support/utils/users';

const { user, memberTenant } = parseSanityParameters();

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
          locations: [
            { locationId: testData.locations.location1.id },
            { locationId: testData.locations.location3.id },
          ],
        };

        return Funds.createViaApi(fundA).then((fundAResponse) => {
          testData.funds.fundA = fundAResponse.fund;

          const budgetA = {
            ...Budgets.getDefaultBudget(),
            fiscalYearId: fiscalYearResponse.id,
            fundId: fundAResponse.fund.id,
            allocated: 150,
          };

          return Budgets.createViaApi(budgetA).then((budgetAResponse) => {
            testData.budgets.budgetA = budgetAResponse;

            const fundB = {
              ...Funds.getDefaultFund(),
              ledgerId: ledgerResponse.id,
              restrictByLocations: true,
              locations: [{ locationId: testData.locations.location2.id }],
            };

            return Funds.createViaApi(fundB).then((fundBResponse) => {
              testData.funds.fundB = fundBResponse.fund;

              const budgetB = {
                ...Budgets.getDefaultBudget(),
                fiscalYearId: fiscalYearResponse.id,
                fundId: fundBResponse.fund.id,
                allocated: 150,
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
        listUnitPrice: 20,
        currency: 'USD',
        quantityPhysical: 2,
        poLineEstimatedPrice: 20,
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
          locationId: testData.locations.location1.id,
          quantity: 1,
          quantityPhysical: 1,
        },
        {
          locationId: testData.locations.location2.id,
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
    cy.setTenant(memberTenant.id);
    cy.getUserToken(user.username, user.password, { log: false });
    return ServicePoints.getViaApi()
      .then((servicePoints) => createLocations(servicePoints[0].id))
      .then(() => createFinanceData())
      .then(() => createOrderData())
      .then(() => {
        cy.allure().logCommandSteps(false);
        cy.login(user.username, user.password, {
          path: TopMenu.ordersPath,
          waiter: Orders.waitLoading,
        });
        cy.allure().logCommandSteps(true);
      });
  });

  after('Delete test data', () => {
    cy.setTenant(memberTenant.id);
    cy.getUserToken(user.username, user.password, { log: false });

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
      Organizations.deleteOrganizationViaApi(testData.organization.id);
    });
  });

  it(
    'C435912 An order with two funds (both are restricted by location) can be opened (thunderjet)',
    { tags: ['dryRun', 'thunderjet', 'C435912'] },
    () => {
      Orders.searchByParameter('PO number', testData.order.poNumber);
      Orders.selectFromResultsList(testData.order.poNumber);
      OrderDetails.checkOrderStatus(ORDER_STATUSES.PENDING);
      OrderDetails.openOrder({ orderNumber: testData.order.poNumber });
      InteractorsTools.checkNoErrorCallouts();
      OrderDetails.checkOrderStatus(ORDER_STATUSES.OPEN);
    },
  );
});
