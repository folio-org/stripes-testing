import uuid from 'uuid';
import permissions from '../../support/dictionary/permissions';
import NewOrder from '../../support/fragments/orders/newOrder';
import OrderLines from '../../support/fragments/orders/orderLines';
import Orders from '../../support/fragments/orders/orders';
import NewOrganization from '../../support/fragments/organizations/newOrganization';
import Organizations from '../../support/fragments/organizations/organizations';
import Receiving from '../../support/fragments/receiving/receiving';
import ReceivingDetails from '../../support/fragments/receiving/receivingDetails';
import ReceivingEditForm from '../../support/fragments/receiving/receivingEditForm';
import AcquisitionUnits from '../../support/fragments/settings/acquisitionUnits/acquisitionUnits';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import BasicOrderLine from '../../support/fragments/orders/basicOrderLine';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import InventoryInstance from '../../support/fragments/inventory/inventoryInstance';
import { ACQUISITION_METHOD_NAMES_IN_PROFILE, ORDER_STATUSES } from '../../support/constants';
import InteractorsTools from '../../support/utils/interactorsTools';
import getRandomPostfix from '../../support/utils/stringTools';

describe('Receiving', () => {
  describe('Acquisition units', () => {
    const organization = { ...NewOrganization.defaultUiOrganizations };
    const randomPostfix = getRandomPostfix();
    const firstInstanceTitle = `C430213_Title_1_${randomPostfix}`;
    const secondInstanceTitle = `C430213_Title_2_${randomPostfix}`;
    const packageName = `C430213_Package_${randomPostfix}`;
    let order;
    let orderLine;
    let user;
    let acquisitionUnit;
    let location;
    let firstInstance;
    let secondInstance;

    before('Create test data', () => {
      cy.getAdminToken();

      acquisitionUnit = AcquisitionUnits.getDefaultAcquisitionUnit({
        protectRead: true,
        protectUpdate: true,
        protectCreate: true,
        protectDelete: true,
      });

      AcquisitionUnits.createAcquisitionUnitViaApi(acquisitionUnit).then((auResponse) => {
        acquisitionUnit.id = auResponse.id;

        InventoryInstance.createInstanceViaApi({
          instanceTitle: firstInstanceTitle,
        }).then((instanceData) => {
          firstInstance = instanceData.instanceData;
        });

        InventoryInstance.createInstanceViaApi({
          instanceTitle: secondInstanceTitle,
        }).then((instanceData) => {
          secondInstance = instanceData.instanceData;
        });

        cy.createTempUser([
          permissions.inventoryAll.gui,
          permissions.uiOrdersView.gui,
          permissions.uiReceivingManageAcquisitionUnits.gui,
          permissions.uiReceivingViewEditCreate.gui,
        ]).then((userProperties) => {
          user = userProperties;

          AcquisitionUnits.assignUserViaApi(user.userId, acquisitionUnit.id);

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
                      isPackage: true,
                      titleOrPackage: packageName,
                      cost: {
                        listUnitPrice: 100.0,
                        currency: 'USD',
                        discountType: 'percentage',
                        quantityPhysical: 2,
                        poLineEstimatedPrice: 200.0,
                      },
                      fundDistribution: [],
                      locations: [
                        {
                          locationId: location.id,
                          quantity: 2,
                          quantityPhysical: 2,
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

                      Promise.all([
                        OrderLines.addPackageTitleViaApi({
                          title: firstInstanceTitle,
                          poLineId: orderLineResponse.id,
                          instanceId: firstInstance.instanceId,
                        }),
                        OrderLines.addPackageTitleViaApi({
                          title: secondInstanceTitle,
                          poLineId: orderLineResponse.id,
                          instanceId: secondInstance.instanceId,
                        }),
                      ]).then(() => {
                        Orders.updateOrderViaApi({
                          ...orderResponse,
                          workflowStatus: ORDER_STATUSES.OPEN,
                        }).then(() => {
                          cy.login(user.username, user.password, {
                            path: TopMenu.ordersPath,
                            waiter: Orders.waitLoading,
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
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      Orders.deleteOrderViaApi(order.id);
      Organizations.deleteOrganizationViaApi(organization.id);
      Users.deleteViaApi(user.userId);
      AcquisitionUnits.deleteAcquisitionUnitViaApi(acquisitionUnit.id);
      InventoryInstance.deleteInstanceViaApi(firstInstance.instanceId);
      InventoryInstance.deleteInstanceViaApi(secondInstance.instanceId);
    });

    it(
      'C430213 User included in Acquisition unit can assign an Acquisition unit to a Title in Receiving app (thunderjet)',
      { tags: ['criticalPath', 'thunderjet', 'C430213'] },
      () => {
        Orders.searchByParameter('PO number', order.poNumber);
        Orders.selectFromResultsList(order.poNumber);
        OrderLines.selectPOLInOrder();

        OrderLines.expandPackageTitles();
        OrderLines.verifyPackageTitleExists(firstInstanceTitle);
        OrderLines.verifyPackageTitleExists(secondInstanceTitle);

        OrderLines.receiveOrderLinesViaActions();
        Receiving.waitLoading();

        Receiving.checkTitleInReceivingList(firstInstanceTitle);
        Receiving.checkTitleInReceivingList(secondInstanceTitle);

        Receiving.selectFromResultsList(firstInstanceTitle);
        ReceivingDetails.waitLoading();

        ReceivingDetails.expandTitleInformationAccordion();
        ReceivingDetails.verifyAcquisitionUnitNotSpecified();

        ReceivingDetails.openReceivingEditForm();
        ReceivingEditForm.waitLoading();

        ReceivingEditForm.verifyAcquisitionUnitDisplayed(acquisitionUnit.name, false);

        ReceivingEditForm.selectAcquisitionUnit(acquisitionUnit.name);
        ReceivingEditForm.verifyAcquisitionUnitDisplayed(acquisitionUnit.name, true);

        ReceivingEditForm.clickSaveButton({ itemSaved: true });
        ReceivingDetails.waitLoading();

        InteractorsTools.checkCalloutMessage(
          `The title ${firstInstanceTitle} has been successfully added for PO line ${orderLine.poLineNumber}`,
        );

        ReceivingDetails.verifyAcquisitionUnitInTitleInformation(acquisitionUnit.name, true);

        ReceivingDetails.closeDetailsPane();

        Receiving.checkTitleInReceivingList(firstInstanceTitle);
        Receiving.checkTitleInReceivingList(secondInstanceTitle);

        Receiving.selectFromResultsList(secondInstanceTitle);
        ReceivingDetails.waitLoading();

        ReceivingDetails.expandTitleInformationAccordion();
        ReceivingDetails.verifyAcquisitionUnitNotSpecified();
      },
    );
  });
});
