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
    const firstInstanceTitle = `C430259_Title_1_${randomPostfix}`;
    const secondInstanceTitle = `C430259_Title_2_${randomPostfix}`;
    const packageName = `C430259_Package_${randomPostfix}`;
    let order;
    let orderLine;
    let user;
    let firstAcquisitionUnit;
    let secondAcquisitionUnit;
    let location;
    let firstInstance;
    let secondInstance;

    before('Create test data', () => {
      cy.getAdminToken();

      firstAcquisitionUnit = AcquisitionUnits.getDefaultAcquisitionUnit({
        protectRead: true,
        protectUpdate: true,
        protectCreate: true,
        protectDelete: true,
      });
      secondAcquisitionUnit = AcquisitionUnits.getDefaultAcquisitionUnit({
        protectRead: true,
        protectUpdate: true,
        protectCreate: true,
        protectDelete: true,
      });

      AcquisitionUnits.createAcquisitionUnitViaApi(firstAcquisitionUnit).then((firstAUResponse) => {
        firstAcquisitionUnit.id = firstAUResponse.id;

        AcquisitionUnits.createAcquisitionUnitViaApi(secondAcquisitionUnit).then(
          (secondAUResponse) => {
            secondAcquisitionUnit.id = secondAUResponse.id;

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
              permissions.uiReceivingManageAcquisitionUnits.gui,
              permissions.uiReceivingAssignAcquisitionUnitsToNewTitle.gui,
              permissions.uiReceivingViewEditCreate.gui,
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
                          acquisitionMethod:
                            acquisitionMethodResponse.body.acquisitionMethods[0].id,
                          physical: {
                            createInventory: 'Instance, Holding, Item',
                            materialType: materialType.id,
                            materialSupplier: organization.id,
                            volumes: [],
                          },
                        };

                        OrderLines.createOrderLineViaApi(orderLineData).then(
                          (orderLineResponse) => {
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
                          },
                        );
                      });
                    });
                  });
                });
              });
            });
          },
        );
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      Orders.deleteOrderViaApi(order.id);
      Organizations.deleteOrganizationViaApi(organization.id);
      Users.deleteViaApi(user.userId);
      AcquisitionUnits.deleteAcquisitionUnitViaApi(firstAcquisitionUnit.id);
      AcquisitionUnits.deleteAcquisitionUnitViaApi(secondAcquisitionUnit.id);
      InventoryInstance.deleteInstanceViaApi(firstInstance.instanceId);
      InventoryInstance.deleteInstanceViaApi(secondInstance.instanceId);
    });

    it(
      'C430259 User included in Acq unit is able to add Acq units to new Titles with appropriate permissions (thunderjet)',
      { tags: ['criticalPath', 'thunderjet', 'C430259'] },
      () => {
        Receiving.openNewTitleForm();
        ReceivingEditForm.waitLoading();

        ReceivingEditForm.verifyAcquisitionUnitsInDropdown([
          firstAcquisitionUnit.name,
          secondAcquisitionUnit.name,
        ]);

        ReceivingEditForm.selectAcquisitionUnit(firstAcquisitionUnit.name);
        ReceivingEditForm.verifyAcquisitionUnitDisplayed(firstAcquisitionUnit.name, true);

        Receiving.fillTitleLookup(firstInstanceTitle);
        Receiving.fillPOLNumberLookup(orderLine.poLineNumber);
        ReceivingEditForm.verifySaveButtonEnabled(true);

        ReceivingEditForm.clickSaveButton({ itemSaved: false });
        ReceivingDetails.waitLoading();
        InteractorsTools.checkCalloutMessage(
          `The title ${firstInstanceTitle} has been successfully added for PO line ${orderLine.poLineNumber}`,
        );

        cy.wait(1000);
        ReceivingDetails.verifyAcquisitionUnitInTitleInformation(firstAcquisitionUnit.name, true);

        Receiving.openNewTitleForm();
        ReceivingEditForm.waitLoading();

        ReceivingEditForm.verifyAcquisitionUnitsInDropdown([
          firstAcquisitionUnit.name,
          secondAcquisitionUnit.name,
        ]);

        ReceivingEditForm.selectAcquisitionUnit(secondAcquisitionUnit.name);
        ReceivingEditForm.verifyAcquisitionUnitDisplayed(secondAcquisitionUnit.name, true);

        Receiving.fillTitleLookup(secondInstanceTitle);
        Receiving.fillPOLNumberLookup(orderLine.poLineNumber);
        ReceivingEditForm.verifySaveButtonEnabled(true);

        ReceivingEditForm.clickSaveButton({ itemSaved: false });
        ReceivingDetails.waitLoading();
        InteractorsTools.checkCalloutMessage(
          `The title ${secondInstanceTitle} has been successfully added for PO line ${orderLine.poLineNumber}`,
        );

        cy.wait(1000);
        ReceivingDetails.verifyAcquisitionUnitInTitleInformation(secondAcquisitionUnit.name, true);
      },
    );
  });
});
