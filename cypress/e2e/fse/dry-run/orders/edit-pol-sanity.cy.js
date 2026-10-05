import { ACQUISITION_METHOD_NAMES_IN_PROFILE } from '../../../../support/constants';
import BasicOrderLine from '../../../../support/fragments/orders/basicOrderLine';
import NewOrder from '../../../../support/fragments/orders/newOrder';
import OrderLines from '../../../../support/fragments/orders/orderLines';
import Orders from '../../../../support/fragments/orders/orders';
import NewOrganization from '../../../../support/fragments/organizations/newOrganization';
import Organizations from '../../../../support/fragments/organizations/organizations';
import Locations from '../../../../support/fragments/settings/tenant/location-setup/locations';
import TopMenu from '../../../../support/fragments/topMenu';
import InteractorsTools from '../../../../support/utils/interactorsTools';
import getRandomPostfix from '../../../../support/utils/stringTools';
import { parseSanityParameters } from '../../../../support/utils/users';

const { user, memberTenant } = parseSanityParameters();

describe('orders: create', () => {
  const order = {
    ...NewOrder.defaultOneTimeOrder,
    orderType: 'Ongoing',
    ongoing: { isSubscription: false, manualRenewal: false },
    approved: true,
  };
  const organization = {
    ...NewOrganization.defaultUiOrganizations,
    accounts: [
      {
        accountNo: getRandomPostfix(),
        accountStatus: 'Active',
        acqUnitIds: [],
        appSystemNo: '',
        description: 'Main library account',
        libraryCode: 'COB',
        libraryEdiCode: getRandomPostfix(),
        name: 'TestAccout1',
        notes: '',
        paymentMethod: 'Cash',
      },
    ],
  };
  const testData = {};

  before(() => {
    cy.setTenant(memberTenant.id);
    cy.getUserToken(user.username, user.password, { log: false });

    Locations.getLocations({ limit: 2 }).then((res) => {
      testData.locations = res;

      Organizations.createOrganizationViaApi(organization).then((organizationsResponse) => {
        organization.id = organizationsResponse;
        order.vendor = organizationsResponse;

        cy.getDefaultMaterialType().then((mtypes) => {
          cy.getAcquisitionMethodsApi({
            query: `value="${ACQUISITION_METHOD_NAMES_IN_PROFILE.PURCHASE_AT_VENDOR_SYSTEM}"`,
          }).then((params) => {
            Orders.createOrderViaApi(order).then((orderResponse) => {
              order.id = orderResponse.id;
              const orderLine = {
                ...BasicOrderLine.defaultOrderLine,
                cost: {
                  listUnitPrice: 5.0,
                  currency: 'USD',
                  discountType: 'percentage',
                  quantityPhysical: 1,
                  poLineEstimatedPrice: 5.0,
                },
                fundDistribution: [],
                locations: [
                  {
                    locationId: testData.locations[0].id,
                    quantity: 1,
                    quantityPhysical: 1,
                  },
                ],
                acquisitionMethod: params.body.acquisitionMethods[0].id,
                physical: {
                  createInventory: 'Instance, Holding, Item',
                  materialType: mtypes.id,
                  materialSupplier: organizationsResponse,
                  volumes: [],
                },
              };

              orderLine.purchaseOrderId = orderResponse.id;
              testData.orderNumber = orderResponse.poNumber;
              OrderLines.createOrderLineViaApi(orderLine);
            });
          });
        });
      });
    });

    cy.allure().logCommandSteps(false);
    cy.login(user.username, user.password, {
      path: TopMenu.ordersPath,
      waiter: Orders.waitLoading,
    });
    cy.allure().logCommandSteps(true);
  });

  after(() => {
    cy.setTenant(memberTenant.id);
    cy.getUserToken(user.username, user.password, { log: false });
    Orders.deleteOrderViaApi(order.id);
    Organizations.deleteOrganizationViaApi(organization.id);
  });

  it(
    'C665 Edit an existing PO Line on a "Pending" order (thunderjet)',
    { tags: ['dryRun', 'thunderjet', 'C665'] },
    () => {
      Orders.resetFiltersIfActive();
      Orders.selectPendingStatusFilter();
      Orders.searchByParameter('PO number', testData.orderNumber);
      Orders.selectFromResultsList(testData.orderNumber);
      OrderLines.selectPOLInOrder(0);
      OrderLines.editPOLInOrder();
      OrderLines.changeLocation(testData.locations[1].name, '1');
      OrderLines.saveOrderLine();
      InteractorsTools.checkCalloutMessage(
        `The purchase order line ${testData.orderNumber}-1 was successfully updated`,
      );
    },
  );
});
