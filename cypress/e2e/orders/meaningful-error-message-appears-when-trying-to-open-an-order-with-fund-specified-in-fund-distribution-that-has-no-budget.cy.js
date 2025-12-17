import permissions from '../../support/dictionary/permissions';
import FiscalYears from '../../support/fragments/finance/fiscalYears/fiscalYears';
import Funds from '../../support/fragments/finance/funds/funds';
import Ledgers from '../../support/fragments/finance/ledgers/ledgers';
import NewOrder from '../../support/fragments/orders/newOrder';
import Orders from '../../support/fragments/orders/orders';
import OrderDetails from '../../support/fragments/orders/orderDetails';
import OrderLines from '../../support/fragments/orders/orderLines';
import NewOrganization from '../../support/fragments/organizations/newOrganization';
import Organizations from '../../support/fragments/organizations/organizations';
import NewLocation from '../../support/fragments/settings/tenant/locations/newLocation';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import { ACQUISITION_METHOD_NAMES_IN_PROFILE, ORDER_STATUSES } from '../../support/constants';
import BasicOrderLine from '../../support/fragments/orders/basicOrderLine';
import { OrderLineDetails } from '../../support/fragments/orders';

describe('Orders', () => {
  const testData = {
    fiscalYear: {},
    ledger: {},
    fund: {},
    organization: {},
    order: {},
    orderLine: {},
    user: {},
    location: {},
  };

  const createOrderLine = (purchaseOrderId, locationId, materialTypeId, acquisitionMethodId) => {
    return {
      ...BasicOrderLine.defaultOrderLine,
      purchaseOrderId,
      cost: {
        listUnitPrice: 100.0,
        currency: 'USD',
        discountType: 'percentage',
        quantityPhysical: 1,
        poLineEstimatedPrice: 100.0,
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
        volumes: [],
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
        });
      });
    });
  };

  const createOrderData = () => {
    return Organizations.createOrganizationViaApi({
      ...NewOrganization.defaultUiOrganizations,
      isVendor: true,
      exportToAccounting: false,
    }).then((organizationResponse) => {
      testData.organization = {
        id: organizationResponse,
        erpCode: NewOrganization.defaultUiOrganizations.erpCode,
      };

      return ServicePoints.getViaApi().then((servicePoint) => {
        return NewLocation.createViaApi(NewLocation.getDefaultLocation(servicePoint[0].id)).then(
          (locationResponse) => {
            testData.location = locationResponse;

            return cy.getMaterialTypes({ limit: 1 }).then((materialType) => {
              return cy
                .getAcquisitionMethodsApi({
                  query: `value="${ACQUISITION_METHOD_NAMES_IN_PROFILE.PURCHASE}"`,
                })
                .then((acquisitionMethod) => {
                  return createOrderWithLine(
                    locationResponse.id,
                    materialType.id,
                    acquisitionMethod.body.acquisitionMethods[0].id,
                  );
                });
            });
          },
        );
      });
    });
  };

  before('Create test data', () => {
    cy.getAdminToken();
    return createFinanceData().then(() => {
      return createOrderData().then(() => {
        cy.createTempUser([permissions.uiOrdersEdit.gui]).then((userProperties) => {
          testData.user = userProperties;

          cy.login(testData.user.username, testData.user.password, {
            path: TopMenu.ordersPath,
            waiter: Orders.waitLoading,
          });
        });
      });
    });
  });

  after(() => {
    cy.getAdminToken().then(() => {
      Users.deleteViaApi(testData.user.userId);
      Orders.deleteOrderViaApi(testData.order.id);
      Organizations.deleteOrganizationViaApi(testData.organization.id);
      Funds.deleteFundViaApi(testData.fund.id);
      Ledgers.deleteLedgerViaApi(testData.ledger.id);
      FiscalYears.deleteFiscalYearViaApi(testData.fiscalYear.id);
    });
  });

  it(
    'C569590 Meaningful error message appears when trying to open an order with fund specified in "Fund distribution" that has NO budget (thunderjet)',
    { tags: ['criticalPath', 'thunderjet', 'C569590'] },
    () => {
      Orders.searchByParameter('PO number', testData.order.poNumber);
      Orders.selectFromResultsList(testData.order.poNumber);
      Orders.openOrder();
      OrderLines.checkErrorToastMessage(
        `Order cannot be opened because there is no current budget for fund(s) ${testData.fund.code} for fiscal year ${testData.fiscalYear.code}.`,
      );
      OrderDetails.checkOrderStatus(ORDER_STATUSES.PENDING);
      OrderDetails.openPolDetails(testData.orderLine.titleOrPackage);
      OrderLineDetails.checkFieldsConditions([
        { label: 'Receipt status', conditions: { value: 'Pending' } },
        { label: 'Payment status', conditions: { value: 'Pending' } },
      ]);
    },
  );
});
