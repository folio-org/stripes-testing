import permissions from '../../support/dictionary/permissions';
import NewOrder from '../../support/fragments/orders/newOrder';
import OrderLines from '../../support/fragments/orders/orderLines';
import Orders from '../../support/fragments/orders/orders';
import NewOrganization from '../../support/fragments/organizations/newOrganization';
import Organizations from '../../support/fragments/organizations/organizations';
import Receiving from '../../support/fragments/receiving/receiving';
import ReceivingDetails from '../../support/fragments/receiving/receivingDetails';
import AcquisitionUnits from '../../support/fragments/settings/acquisitionUnits/acquisitionUnits';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import BasicOrderLine from '../../support/fragments/orders/basicOrderLine';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import { ACQUISITION_METHOD_NAMES_IN_PROFILE, ORDER_STATUSES } from '../../support/constants';

describe('Orders', () => {
  const organization = { ...NewOrganization.defaultUiOrganizations };
  let order;
  let orderLine;
  let user;
  let acquisitionUnit;
  let location;
  let title;

  before(() => {
    cy.getAdminToken();
    acquisitionUnit = AcquisitionUnits.getDefaultAcquisitionUnit({
      protectCreate: true,
      protectRead: false,
      protectUpdate: true,
      protectDelete: true,
    });

    AcquisitionUnits.createAcquisitionUnitViaApi(acquisitionUnit).then((auResponse) => {
      acquisitionUnit.id = auResponse.id;

      cy.createTempUser([
        permissions.uiInventoryViewInstances.gui,
        permissions.uiReceivingManageAcquisitionUnits.gui,
        permissions.uiReceivingViewEditCreate.gui,
      ]).then((userProperties) => {
        user = userProperties;

        InventoryInstances.getLocations({ limit: 1 }).then((locations) => {
          location = locations[0];

          Organizations.createOrganizationViaApi(organization).then((orgResponse) => {
            organization.id = orgResponse;

            cy.getDefaultMaterialType().then((materialType) => {
              cy.getAcquisitionMethodsApi({
                query: `value="${ACQUISITION_METHOD_NAMES_IN_PROFILE.PURCHASE_AT_VENDOR_SYSTEM}"`,
              }).then((acquisitionMethodResponse) => {
                const orderData = {
                  ...NewOrder.getDefaultOrder({ vendorId: organization.id }),
                  orderType: 'One-Time',
                  approved: true,
                };
                Orders.createOrderViaApi(orderData).then((orderResponse) => {
                  order = orderResponse;

                  const orderLineData = {
                    ...BasicOrderLine.defaultOrderLine,
                    purchaseOrderId: orderResponse.id,
                    cost: {
                      listUnitPrice: 100.0,
                      currency: 'USD',
                      discountType: 'percentage',
                      quantityPhysical: 1,
                      poLineEstimatedPrice: 100.0,
                    },
                    fundDistribution: [],
                    locations: [
                      {
                        locationId: location.id,
                        quantity: 1,
                        quantityPhysical: 1,
                      },
                    ],
                    acquisitionMethod: acquisitionMethodResponse.body.acquisitionMethods[0].id,
                    physical: {
                      createInventory: 'Instance, Holding, Item',
                      materialType: materialType.id,
                      materialSupplier: organization.id,
                      volumes: [],
                    },
                  };
                  OrderLines.createOrderLineViaApi(orderLineData).then((orderLineResponse) => {
                    orderLine = orderLineResponse;

                    Orders.updateOrderViaApi({
                      ...orderResponse,
                      workflowStatus: ORDER_STATUSES.OPEN,
                    }).then(() => {
                      Receiving.getTitleByPoLineIdViaApi(orderLineResponse.id).then(
                        (titleResponse) => {
                          title = titleResponse;
                          title.acqUnitIds = [acquisitionUnit.id];
                          Receiving.updateTitleViaApi(title).then(() => {});
                        },
                      );
                    });
                  });
                });
              });
            });
          });
        });
      });
    });
  });

  after(() => {
    cy.getAdminToken();
    Orders.deleteOrderViaApi(order.id);
    Organizations.deleteOrganizationViaApi(organization.id);
    Users.deleteViaApi(user.userId);
    AcquisitionUnits.deleteAcquisitionUnitViaApi(acquisitionUnit.id);
  });

  it(
    'C430217 User not assigned to Acq unit is able to view Acq unit of Title in Receiving but not edit it (thunderjet)',
    { tags: ['extendedPath', 'thunderjet', 'C430217'] },
    () => {
      cy.login(user.username, user.password, {
        path: TopMenu.receivingPath,
        waiter: Receiving.waitLoading,
      });
      Receiving.searchByParameter({ value: orderLine.titleOrPackage });
      Receiving.selectFromResultsList(orderLine.titleOrPackage);
      ReceivingDetails.waitLoading();

      ReceivingDetails.expandTitleInformationAccordion();
      ReceivingDetails.verifyAcquisitionUnitInTitleInformation(acquisitionUnit.name, true);
      ReceivingDetails.verifyEditButtonIsInactive();
    },
  );
});
