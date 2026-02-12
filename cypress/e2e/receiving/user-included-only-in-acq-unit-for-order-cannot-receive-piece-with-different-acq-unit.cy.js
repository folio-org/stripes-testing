import uuid from 'uuid';
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
import getRandomPostfix from '../../support/utils/stringTools';
import EditPieceModal from '../../support/fragments/receiving/modals/editPieceModal';

describe('Receiving', () => {
  describe('Acquisition units', () => {
    const organization = { ...NewOrganization.defaultUiOrganizations };
    const randomPostfix = getRandomPostfix();
    const instanceTitle = `C436813_Title_${randomPostfix}`;
    const quantity = 1;
    let orderLine;
    let user;
    let acquisitionUnitForTitle;
    let acquisitionUnitForOrder;
    let location;

    before('Create test data', () => {
      cy.getAdminToken();

      acquisitionUnitForTitle = AcquisitionUnits.getDefaultAcquisitionUnit({
        protectRead: false,
        protectUpdate: true,
        protectCreate: true,
        protectDelete: true,
      });

      acquisitionUnitForOrder = AcquisitionUnits.getDefaultAcquisitionUnit({
        protectRead: false,
        protectUpdate: true,
        protectCreate: true,
        protectDelete: true,
      });

      AcquisitionUnits.createAcquisitionUnitViaApi(acquisitionUnitForTitle).then(
        (auTitleResponse) => {
          acquisitionUnitForTitle.id = auTitleResponse.id;

          AcquisitionUnits.createAcquisitionUnitViaApi(acquisitionUnitForOrder).then(
            (auOrderResponse) => {
              acquisitionUnitForOrder.id = auOrderResponse.id;

              cy.createTempUser([
                permissions.uiInventoryViewInstances.gui,
                permissions.uiReceivingViewEditCreate.gui,
              ]).then((userProperties) => {
                user = userProperties;

                AcquisitionUnits.assignUserViaApi(user.userId, acquisitionUnitForOrder.id);

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
                                acqUnitIds: [acquisitionUnitForOrder.id],
                              }).then(() => {
                                cy.getAdminToken();
                                Receiving.getTitleByPoLineIdViaApi(orderLine.id).then(
                                  (titleData) => {
                                    Receiving.updateTitleViaApi({
                                      ...titleData,
                                      acqUnitIds: [acquisitionUnitForTitle.id],
                                    });
                                  },
                                );

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
        },
      );
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      Organizations.deleteOrganizationViaApi(organization.id);
      Users.deleteViaApi(user.userId);
      AcquisitionUnits.deleteAcquisitionUnitViaApi(acquisitionUnitForTitle.id);
      AcquisitionUnits.deleteAcquisitionUnitViaApi(acquisitionUnitForOrder.id);
    });

    it(
      'C436813 User included only in Acq unit for Order is not able to receive a piece having another Acq unit (thunderjet)',
      { tags: ['criticalPath', 'thunderjet', 'C436813'] },
      () => {
        Receiving.searchByParameter({ parameter: 'Keyword', value: instanceTitle });
        Receiving.selectFromResultsList(instanceTitle);
        ReceivingDetails.waitLoading();
        ReceivingDetails.verifyExpectedRecordsCount(1);

        ReceivingDetails.expandTitleInformationAccordion();
        ReceivingDetails.verifyAcquisitionUnitInTitleInformation(
          acquisitionUnitForTitle.name,
          true,
        );

        ReceivingDetails.openEditPieceModal({ row: 0 });
        EditPieceModal.waitLoading();
        EditPieceModal.verifySaveAndCloseButtonState({ disabled: true });
        EditPieceModal.verifyActionsMenuState({ disabled: true });
      },
    );
  });
});
