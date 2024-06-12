import permissions from '../../../support/dictionary/permissions';
import BasicOrderLine from '../../../support/fragments/orders/basicOrderLine';
import NewOrder from '../../../support/fragments/orders/newOrder';
import Orders from '../../../support/fragments/orders/orders';
import NewOrganization from '../../../support/fragments/organizations/newOrganization';
import Organizations from '../../../support/fragments/organizations/organizations';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import FileManager from '../../../support/utils/fileManager';
import generateItemBarcode from '../../../support/utils/generateItemBarcode';
import { ACQUISITION_METHOD_NAMES_IN_PROFILE, ORDER_STATUSES } from '../../../support/constants';
import MaterialTypes from '../../../support/fragments/settings/inventory/materialTypes';
import NewLocation from '../../../support/fragments/settings/tenant/locations/newLocation';
import ServicePoints from '../../../support/fragments/settings/tenant/servicePoints/servicePoints';
import OrderLines from '../../../support/fragments/orders/orderLines';

describe('Orders', () => {
  describe('Export', () => {
    let user;
    const organization = { ...NewOrganization.defaultUiOrganizations };
    const order = {
      ...NewOrder.defaultOneTimeOrder,
      poNumberPrefix: 'pref',
      poNumberSuffix: 'suf',
      poNumber: `pref${generateItemBarcode()}suf`,
      reEncumber: true,
      manualPo: true,
      approved: true,
    };
    let location;
    let servicePointId;
    before(() => {
      cy.getAdminToken();

      ServicePoints.getViaApi().then((servicePoint) => {
        servicePointId = servicePoint[0].id;
        NewLocation.createViaApi(NewLocation.getDefaultLocation(servicePointId)).then((res) => {
          location = res;

          MaterialTypes.createMaterialTypeViaApi(MaterialTypes.getDefaultMaterialType()).then(
            (mtypes) => {
              cy.getAcquisitionMethodsApi({
                query: `value="${ACQUISITION_METHOD_NAMES_IN_PROFILE.PURCHASE}"`,
              }).then((params) => {
                Organizations.createOrganizationViaApi(organization).then(
                  (organizationsResponse) => {
                    organization.id = organizationsResponse;
                    order.vendor = organizationsResponse;
                    const firstOrderLine = {
                      ...BasicOrderLine.defaultOrderLine,
                      cost: {
                        listUnitPrice: 100.0,
                        currency: 'USD',
                        discountType: 'percentage',
                        quantityPhysical: 1,
                        poLineEstimatedPrice: 100.0,
                      },
                      fundDistribution: [],
                      locations: [{ locationId: location.id, quantity: 1, quantityPhysical: 1 }],
                      acquisitionMethod: params.body.acquisitionMethods[0].id,
                      physical: {
                        createInventory: 'Instance, Holding, Item',
                        materialType: mtypes.body.id,
                        materialSupplier: organizationsResponse,
                        volumes: [],
                      },
                    };
                    cy.createOrderApi(order).then((firstOrderResponse) => {
                      firstOrderLine.purchaseOrderId = firstOrderResponse.body.id;
                      OrderLines.createOrderLineViaApi(firstOrderLine);
                      Orders.updateOrderViaApi({
                        ...firstOrderResponse.body,
                        workflowStatus: ORDER_STATUSES.OPEN,
                      });
                    });
                  },
                );
              });
            },
          );
        });
      });
      cy.createTempUser([permissions.uiOrdersView.gui, permissions.uiExportOrders.gui]).then(
        (userProperties) => {
          user = userProperties;
          cy.login(user.username, user.password, {
            path: TopMenu.ordersPath,
            waiter: Orders.waitLoading,
          });
        },
      );
    });

    after(() => {
      cy.getAdminToken();
      Orders.deleteOrderViaApi(order.id);
      Organizations.deleteOrganizationViaApi(organization.id);
      Users.deleteViaApi(user.userId);
      FileManager.deleteFolder(Cypress.config('downloadsFolder'));
    });

    it(
      'C196749 Export orders based on orders search (thunderjet)',
      { tags: ['smoke', 'thunderjet', 'eurekaPhase1'] },
      () => {
        Orders.selectOpenStatusFilter();
        Orders.waitOrdersListLoading();
        Orders.exportResultsToCsv();
      },
    );
  });
});
