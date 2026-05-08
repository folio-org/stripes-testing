import BasicOrderLine from '../../support/fragments/orders/basicOrderLine';
import NewLocation from '../../support/fragments/settings/tenant/locations/newLocation';
import NewOrder from '../../support/fragments/orders/newOrder';
import NewOrganization from '../../support/fragments/organizations/newOrganization';
import Orders from '../../support/fragments/orders/orders';
import OrderDetails from '../../support/fragments/orders/orderDetails';
import OrderLines from '../../support/fragments/orders/orderLines';
import Organizations from '../../support/fragments/organizations/organizations';
import Permissions from '../../support/dictionary/permissions';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import {
  ACQUISITION_METHOD_NAMES_IN_PROFILE,
  ORDER_FORMAT_NAMES_IN_PROFILE,
  ORDER_SEARCH_OPTIONS,
  ORDER_STATUSES,
  ORDER_TYPES,
  POL_CREATE_INVENTORY_SETTINGS,
} from '../../support/constants';

describe('Orders', () => {
  const testData = {
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
          orderFormat: ORDER_FORMAT_NAMES_IN_PROFILE.PE_MIX,
          cost: {
            listUnitPrice: 10,
            listUnitPriceElectronic: 10,
            currency: 'USD',
            quantityPhysical: 1,
            quantityElectronic: 1,
          },
          locations: [
            {
              locationId: testData.location.id,
              quantityPhysical: 1,
              quantityElectronic: 0,
            },
            {
              locationId: testData.location.id,
              quantityPhysical: 0,
              quantityElectronic: 1,
            },
          ],
          acquisitionMethod: acquisitionMethod.id,
          physical: {
            createInventory: POL_CREATE_INVENTORY_SETTINGS.INSTANCE_HOLDING_ITEM,
            materialType: materialType.id,
            materialSupplier: testData.organization.id,
          },
          eresource: {
            createInventory: POL_CREATE_INVENTORY_SETTINGS.INSTANCE_HOLDING,
            accessProvider: testData.organization.id,
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

  const unopenOrder = () => {
    return Orders.updateOrderViaApi({
      ...testData.order,
      workflowStatus: ORDER_STATUSES.PENDING,
    });
  };

  before('Create test data', () => {
    cy.getAdminToken();
    return ServicePoints.getViaApi()
      .then((servicePoints) => createLocation(servicePoints[0].id))
      .then(() => createOrderWithLine())
      .then(() => openOrder())
      .then(() => unopenOrder())
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
        NewLocation.deleteInstitutionCampusLibraryLocationViaApi(
          testData.location.institutionId,
          testData.location.campusId,
          testData.location.libraryId,
          testData.location.id,
        );
        Organizations.deleteOrganizationViaApi(testData.organization.id);
        Users.deleteViaApi(testData.user.userId);
      });
    });
  });

  it(
    'C436935 Open previously unopened P/E mix order with same location both for physical and electronic resources (thunderjet)',
    { tags: ['criticalPath', 'thunderjet', 'C436935'] },
    () => {
      Orders.resetFiltersIfActive();
      Orders.searchByParameter(ORDER_SEARCH_OPTIONS.PO_NUMBER, testData.order.poNumber);
      Orders.selectFromResultsList(testData.order.poNumber);
      OrderDetails.checkOrderStatus(ORDER_STATUSES.PENDING);
      OrderDetails.openOrder({ orderNumber: testData.order.poNumber });
      OrderDetails.checkOrderStatus(ORDER_STATUSES.OPEN);
    },
  );
});
