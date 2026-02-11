import uuid from 'uuid';
import {
  ACQUISITION_METHOD_NAMES_IN_PROFILE,
  APPLICATION_NAMES,
  ORDER_STATUSES,
} from '../../support/constants';
import Permissions from '../../support/dictionary/permissions';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import BasicOrderLine from '../../support/fragments/orders/basicOrderLine';
import NewOrder from '../../support/fragments/orders/newOrder';
import OrderLines from '../../support/fragments/orders/orderLines';
import Orders from '../../support/fragments/orders/orders';
import NewOrganization from '../../support/fragments/organizations/newOrganization';
import Organizations from '../../support/fragments/organizations/organizations';
import Receiving from '../../support/fragments/receiving/receiving';
import ReceivingDetails from '../../support/fragments/receiving/receivingDetails';
import ReceivingEditForm from '../../support/fragments/receiving/receivingEditForm';
import AcquisitionUnits from '../../support/fragments/settings/acquisitionUnits/acquisitionUnits';
import TopMenuNavigation from '../../support/fragments/topMenuNavigation';
import Users from '../../support/fragments/users/users';
import InteractorsTools from '../../support/utils/interactorsTools';

describe('Orders', () => {
  const organization = { ...NewOrganization.defaultUiOrganizations };
  let order;
  let orderLine;
  let user;
  let firstAcquisitionUnit;
  let secondAcquisitionUnit;
  let location;
  let title;

  before(() => {
    cy.getAdminToken();
    firstAcquisitionUnit = AcquisitionUnits.getDefaultAcquisitionUnit({
      protectRead: true,
    });
    secondAcquisitionUnit = AcquisitionUnits.getDefaultAcquisitionUnit({
      protectRead: true,
    });

    AcquisitionUnits.createAcquisitionUnitViaApi(firstAcquisitionUnit).then((firstAUResponse) => {
      firstAcquisitionUnit.id = firstAUResponse.id;

      AcquisitionUnits.createAcquisitionUnitViaApi(secondAcquisitionUnit).then(
        (secondAUResponse) => {
          secondAcquisitionUnit.id = secondAUResponse.id;

          cy.createTempUser([
            Permissions.uiInventoryViewInstances.gui,
            Permissions.uiOrdersView.gui,
            Permissions.uiReceivingManageAcquisitionUnits.gui,
            Permissions.uiReceivingViewEditCreate.gui,
          ]).then((userProperties) => {
            user = userProperties;

            AcquisitionUnits.assignUserViaApi(user.userId, firstAcquisitionUnit.id).then(() => {
              AcquisitionUnits.assignUserViaApi(user.userId, secondAcquisitionUnit.id);
            });

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
                        id: uuid(),
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
                              title.acqUnitIds = [firstAcquisitionUnit.id];
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
            cy.login(user.username, user.password);
            TopMenuNavigation.navigateToApp(APPLICATION_NAMES.ORDERS);
            Orders.selectOrdersPane();
            Orders.waitLoading();
          });
        },
      );
    });
  });

  after(() => {
    cy.getAdminToken();
    Orders.deleteOrderViaApi(order.id);
    Organizations.deleteOrganizationViaApi(organization.id);
    Users.deleteViaApi(user.userId);
    AcquisitionUnits.deleteAcquisitionUnitViaApi(firstAcquisitionUnit.id);
    AcquisitionUnits.deleteAcquisitionUnitViaApi(secondAcquisitionUnit.id);
  });

  it(
    'C430218 Replace acquisition unit in title record (thunderjet)',
    { tags: ['criticalPath', 'thunderjet', 'C430218'] },
    () => {
      Orders.searchByParameter('PO number', order.poNumber);
      Orders.selectFromResultsList(order.poNumber);
      Orders.receiveOrderViaActions();
      Receiving.waitLoading();
      Receiving.selectFromResultsList(orderLine.titleOrPackage);
      ReceivingDetails.waitLoading();
      ReceivingDetails.expandTitleInformationAccordion();
      cy.wait(1000);
      ReceivingDetails.verifyAcquisitionUnitInTitleInformation(firstAcquisitionUnit.name, true);
      ReceivingDetails.editReceivingItem();
      ReceivingEditForm.waitLoading();
      cy.wait(1000);
      ReceivingEditForm.verifyAcquisitionUnitDisplayed(firstAcquisitionUnit.name, true);
      ReceivingEditForm.removeAcquisitionUnit(firstAcquisitionUnit.name);
      ReceivingEditForm.selectAcquisitionUnit(secondAcquisitionUnit.name);
      ReceivingEditForm.verifyAcquisitionUnitDisplayed(secondAcquisitionUnit.name, true);
      cy.wait(1000);
      ReceivingEditForm.clickSaveButton({ itemSaved: true });
      ReceivingDetails.waitLoading();
      cy.wait(1000);
      InteractorsTools.checkCalloutMessage(
        `The title ${orderLine.titleOrPackage} has been successfully added for PO line ${orderLine.poLineNumber}`,
      );
      cy.reload();
      ReceivingDetails.waitLoading();
      cy.wait(3000);
      ReceivingDetails.verifyAcquisitionUnitInTitleInformation(secondAcquisitionUnit.name, true);
      ReceivingDetails.verifyAcquisitionUnitInTitleInformation(firstAcquisitionUnit.name, false);
    },
  );
});
