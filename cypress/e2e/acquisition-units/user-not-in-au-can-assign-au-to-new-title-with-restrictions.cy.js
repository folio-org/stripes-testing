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
    const instanceTitle = `C430263_Title_${randomPostfix}`;
    const packageName = `C430263_Package_${randomPostfix}`;
    const quantity = 1;
    let order;
    let orderLine;
    let user;
    let acquisitionUnit;
    let location;
    let instance;

    before('Create test data', () => {
      cy.getAdminToken();

      acquisitionUnit = AcquisitionUnits.getDefaultAcquisitionUnit({
        protectRead: false,
        protectUpdate: true,
        protectCreate: false,
        protectDelete: true,
      });

      AcquisitionUnits.createAcquisitionUnitViaApi(acquisitionUnit).then((auResponse) => {
        acquisitionUnit.id = auResponse.id;

        InventoryInstance.createInstanceViaApi({
          instanceTitle,
        }).then((instanceData) => {
          instance = instanceData.instanceData;
        });

        cy.createTempUser([
          permissions.uiReceivingAssignAcquisitionUnitsToNewTitle.gui,
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
                      id: uuid(),
                      purchaseOrderId: orderResponse.id,
                      isPackage: true,
                      titleOrPackage: packageName,
                      checkinItems: false,
                      cost: {
                        listUnitPrice: 100.0,
                        currency: 'USD',
                        discountType: 'percentage',
                        quantityPhysical: quantity,
                        poLineEstimatedPrice: 100.0,
                      },
                      fundDistribution: [],
                      locations: [
                        {
                          locationId: location.id,
                          quantity,
                          quantityPhysical: quantity,
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
                        cy.login(user.username, user.password, {
                          path: TopMenu.receivingPath,
                          waiter: Receiving.waitLoading,
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
      InventoryInstance.deleteInstanceViaApi(instance.instanceId);
    });

    it(
      'C430263 User not included in Acq unit is able to assign an Acq unit to a new Title with appropriate Acq unit restrictions (thunderjet)',
      { tags: ['criticalPath', 'thunderjet', 'C430263'] },
      () => {
        Receiving.clickNewTitleOption();
        ReceivingEditForm.waitLoading();
        Receiving.verifyNewTitlePageOpened();

        ReceivingEditForm.openAcquisitionUnitsDropdown();
        ReceivingEditForm.verifyAcquisitionUnitsInDropdown([acquisitionUnit.name]);

        ReceivingEditForm.selectAcquisitionUnit(acquisitionUnit.name);
        ReceivingEditForm.verifyAcquisitionUnitDisplayed(acquisitionUnit.name, true);

        Receiving.fillTitleLookup(instanceTitle);
        Receiving.fillPOLNumberLookup(orderLine.poLineNumber);
        ReceivingEditForm.verifySaveButtonEnabled(true);

        ReceivingEditForm.clickSaveButton({ itemSaved: false });
        ReceivingDetails.waitLoading();
        InteractorsTools.checkCalloutMessage(
          `The title ${instanceTitle} has been successfully added for PO line ${orderLine.poLineNumber}`,
        );

        cy.wait(1000);

        ReceivingDetails.expandTitleInformationAccordion();
        ReceivingDetails.verifyAcquisitionUnitInTitleInformation(acquisitionUnit.name, true);
      },
    );
  });
});
