import BasicOrderLine from '../../support/fragments/orders/basicOrderLine';
import getRandomPostfix from '../../support/utils/stringTools';
import Permissions from '../../support/dictionary/permissions';
import NewOrder from '../../support/fragments/orders/newOrder';
import NewOrganization from '../../support/fragments/organizations/newOrganization';
import NewLocation from '../../support/fragments/settings/tenant/locations/newLocation';
import NewRoutingList from '../../support/fragments/orders/routingLists/newRoutingList';
import Orders from '../../support/fragments/orders/orders';
import OrderLines from '../../support/fragments/orders/orderLines';
import Organizations from '../../support/fragments/organizations/organizations';
import RoutingListDetails from '../../support/fragments/orders/routingLists/routingListDetails';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import {
  ACQUISITION_METHOD_NAMES_IN_PROFILE,
  ORDER_FORMAT_NAMES_IN_PROFILE,
  ORDER_LINE_ACCORDION_NAMES,
  ORDER_TYPES,
  POL_CREATE_INVENTORY_SETTINGS,
} from '../../support/constants';
import { OrderDetails, OrderLineDetails } from '../../support/fragments/orders';

describe('Orders', () => {
  const testData = {
    order: {},
    location: {},
    organization: {},
    routingUser: {},
    user: {},
  };

  const createLocation = (servicePointId) => {
    return NewLocation.createViaApi(NewLocation.getDefaultLocation(servicePointId)).then(
      (location) => {
        testData.location = location;
      },
    );
  };

  const createOrderWithRoutingList = (
    routingUserId,
    vendorId,
    locationId,
    materialTypeId,
    acquisitionMethodId,
  ) => {
    const order = {
      ...NewOrder.getDefaultOngoingOrder,
      orderType: ORDER_TYPES.ONGOING,
      ongoing: { isSubscription: false, manualRenewal: false },
      approved: true,
      reEncumber: true,
      vendor: vendorId,
    };

    return Orders.createOrderViaApi(order).then((orderResponse) => {
      return OrderLines.createOrderLineViaApi({
        ...BasicOrderLine.defaultOrderLine,
        titleOrPackage: `autotest_title_${getRandomPostfix()}`,
        orderFormat: ORDER_FORMAT_NAMES_IN_PROFILE.PE_MIX,
        acquisitionMethod: acquisitionMethodId,
        purchaseOrderId: orderResponse.id,
        cost: {
          currency: 'USD',
          discountType: 'percentage',
          quantityPhysical: 1,
          quantityElectronic: 1,
          listUnitPriceElectronic: 5,
          listUnitPrice: 5,
        },
        eresource: {
          createInventory: POL_CREATE_INVENTORY_SETTINGS.INSTANCE_HOLDING,
          accessProvider: vendorId,
        },
        physical: {
          createInventory: POL_CREATE_INVENTORY_SETTINGS.INSTANCE_HOLDING_ITEM,
          materialType: materialTypeId,
        },
        locations: [
          {
            locationId,
            quantityPhysical: 1,
            quantityElectronic: 1,
          },
        ],
      }).then((orderLineResponse) => {
        const routingList = {
          ...NewRoutingList.getDefaultRoutingList(),
          poLineId: orderLineResponse.id,
          userIds: [routingUserId],
        };

        return NewRoutingList.createFullRoutingListViaApi(routingList).then(
          (routingListResponse) => {
            testData.order = {
              order: { ...order, id: orderResponse.id },
              orderNumber: orderResponse.poNumber,
              orderLine: orderLineResponse,
              routingList: routingListResponse,
            };
          },
        );
      });
    });
  };

  before('Create test data', () => {
    cy.getAdminToken();

    ServicePoints.getViaApi()
      .then((servicePoints) => createLocation(servicePoints[0].id))
      .then(() => cy.getBookMaterialType())
      .then((materialType) => {
        return cy
          .getAcquisitionMethodsApi({
            query: `value="${ACQUISITION_METHOD_NAMES_IN_PROFILE.PURCHASE}"`,
          })
          .then((response) => ({
            materialType,
            acquisitionMethod: response.body.acquisitionMethods[0],
          }));
      })
      .then(({ materialType, acquisitionMethod }) => {
        return Organizations.createOrganizationViaApi({
          ...NewOrganization.defaultUiOrganizations,
          isVendor: true,
        }).then((organizationId) => {
          testData.organization = {
            id: organizationId,
            erpCode: NewOrganization.defaultUiOrganizations.erpCode,
          };

          return cy.createTempUser([]).then((routingUser) => {
            testData.routingUser = routingUser;

            return createOrderWithRoutingList(
              routingUser.userId,
              organizationId,
              testData.location.id,
              materialType.id,
              acquisitionMethod.id,
            );
          });
        });
      })
      .then(() => {
        return cy.createTempUser([
          Permissions.uiOrdersView.gui,
          Permissions.uiSettingsOrdersCanViewAllSettings.gui,
        ]);
      })
      .then((userProperties) => {
        testData.user = userProperties;
        cy.login(testData.user.username, testData.user.password, {
          path: TopMenu.ordersPath,
          waiter: Orders.waitLoading,
        });
      });
  });

  after('Delete test data', () => {
    cy.getAdminToken();
    RoutingListDetails.deleteRoutingListViaApi(testData.order.routingList.id);
    Orders.deleteOrderViaApi(testData.order.order.id);
    NewLocation.deleteInstitutionCampusLibraryLocationViaApi(
      testData.location.institutionId,
      testData.location.campusId,
      testData.location.libraryId,
      testData.location.id,
    );
    Organizations.deleteOrganizationViaApi(testData.organization.id);
    Users.deleteViaApi(testData.user.userId);
    Users.deleteViaApi(testData.routingUser.userId);
  });

  it(
    'C466245 "Routing lists" accordion is expanded when PO line has related Routing list and Order format = "P/E Mix" (thunderjet)',
    { tags: ['extendedPath', 'thunderjet', 'C466245'] },
    () => {
      Orders.searchByParameter('PO number', testData.order.orderNumber);
      Orders.selectFromResultsList(testData.order.orderNumber);
      OrderDetails.openPolDetails(testData.order.orderLine.titleOrPackage);
      OrderLineDetails.checkRoutingListSectionExpanded();
      OrderLineDetails.checkAccordionPosition({
        previousAccordionLabel: ORDER_LINE_ACCORDION_NAMES.E_RESOURCES_DETAILS,
        targetAccordionLabel: ORDER_LINE_ACCORDION_NAMES.ROUTING_LISTS,
        nextAccordionLabel: ORDER_LINE_ACCORDION_NAMES.RELATED_INVOICE_LINES,
      });
      OrderLineDetails.checkRoutingListTableContent([
        {
          name: testData.order.routingList.name,
          notes: testData.order.routingList.notes,
          users: [`${testData.routingUser.lastName} ${testData.routingUser.firstName}`],
        },
      ]);
    },
  );
});
