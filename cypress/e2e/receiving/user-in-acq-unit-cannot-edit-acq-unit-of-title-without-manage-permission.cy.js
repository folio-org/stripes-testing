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
import { ACQUISITION_METHOD_NAMES_IN_PROFILE, ORDER_STATUSES } from '../../support/constants';
import InteractorsTools from '../../support/utils/interactorsTools';
import getRandomPostfix from '../../support/utils/stringTools';

describe('Receiving', () => {
  describe('Acquisition units', () => {
    const organization = { ...NewOrganization.defaultUiOrganizations };
    const randomPostfix = getRandomPostfix();
    const instanceTitle = `C430248_Title_${randomPostfix}`;
    const editionValue = `C430248_Edition_${randomPostfix}`;
    const quantity = 1;
    let order;
    let orderLine;
    let user;
    let firstAcquisitionUnit;
    let secondAcquisitionUnit;
    let location;

    before('Create test data', () => {
      cy.getAdminToken();

      firstAcquisitionUnit = AcquisitionUnits.getDefaultAcquisitionUnit({
        protectRead: false,
        protectUpdate: true,
        protectCreate: true,
        protectDelete: true,
      });
      secondAcquisitionUnit = AcquisitionUnits.getDefaultAcquisitionUnit({
        protectRead: false,
        protectUpdate: true,
        protectCreate: true,
        protectDelete: true,
      });

      AcquisitionUnits.createAcquisitionUnitViaApi(firstAcquisitionUnit).then((firstAUResponse) => {
        firstAcquisitionUnit.id = firstAUResponse.id;

        AcquisitionUnits.createAcquisitionUnitViaApi(secondAcquisitionUnit).then(
          (secondAUResponse) => {
            secondAcquisitionUnit.id = secondAUResponse.id;

            cy.createTempUser([
              permissions.inventoryAll.gui,
              permissions.uiReceivingViewEditCreate.gui,
              permissions.uiReceivingAssignAcquisitionUnitsToNewTitle.gui,
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
                          titleOrPackage: instanceTitle,
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
                              cy.getAdminToken();
                              Receiving.getTitleByPoLineIdViaApi(orderLine.id).then((titleData) => {
                                Receiving.updateTitleViaApi({
                                  ...titleData,
                                  acqUnitIds: [firstAcquisitionUnit.id],
                                });
                              });

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
    });

    it(
      'C430248 User included in Acq unit can not edit Acq unit of a Title without Receiving: Manage acquisition units permission (thunderjet)',
      { tags: ['criticalPath', 'thunderjet', 'C430248'] },
      () => {
        Receiving.searchByParameter({ parameter: 'Keyword', value: instanceTitle });
        Receiving.selectFromResultsList(instanceTitle);
        ReceivingDetails.waitLoading();

        ReceivingDetails.expandTitleInformationAccordion();
        ReceivingDetails.verifyAcquisitionUnitInTitleInformation(firstAcquisitionUnit.name, true);

        ReceivingDetails.editReceivingItem();
        ReceivingEditForm.waitLoading();
        ReceivingEditForm.verifyAcquisitionUnitsDropdownDisabled();
        ReceivingEditForm.verifyAcquisitionUnitDisplayed(firstAcquisitionUnit.name, true);

        ReceivingEditForm.tryRemoveAcquisitionUnit(firstAcquisitionUnit.name);

        ReceivingEditForm.tryExpandAcquisitionUnitsDropdown();

        ReceivingEditForm.fillItemDetailsFields({ edition: editionValue });
        ReceivingEditForm.verifySaveButtonEnabled(true);

        ReceivingEditForm.clickSaveButton({ itemSaved: false });
        ReceivingDetails.waitLoading();
        InteractorsTools.checkCalloutMessage(
          `The title ${instanceTitle} has been successfully added for PO line ${orderLine.poLineNumber}`,
        );

        ReceivingDetails.verifyAcquisitionUnitInTitleInformation(firstAcquisitionUnit.name, true);
      },
    );
  });
});
