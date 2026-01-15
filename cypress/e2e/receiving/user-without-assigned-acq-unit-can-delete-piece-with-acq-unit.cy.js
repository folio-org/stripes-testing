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
import InventoryInstance from '../../support/fragments/inventory/inventoryInstance';
import { ACQUISITION_METHOD_NAMES_IN_PROFILE, ORDER_STATUSES } from '../../support/constants';
import getRandomPostfix from '../../support/utils/stringTools';
import EditPieceModal from '../../support/fragments/receiving/modals/editPieceModal';
import DeletePieceModal from '../../support/fragments/receiving/modals/deletePieceModal';

describe('Receiving', () => {
  describe('Acquisition units', () => {
    const organization = { ...NewOrganization.defaultUiOrganizations };
    const randomPostfix = getRandomPostfix();
    const instanceTitle = `C430219_Title_${randomPostfix}`;
    const quantity = 2;
    let order;
    let orderLine;
    let user;
    let acquisitionUnit;
    let location;

    before('Create test data', () => {
      cy.getAdminToken();

      acquisitionUnit = AcquisitionUnits.getDefaultAcquisitionUnit({
        protectRead: false,
        protectUpdate: true,
        protectCreate: true,
        protectDelete: false,
      });

      AcquisitionUnits.createAcquisitionUnitViaApi(acquisitionUnit).then((auResponse) => {
        acquisitionUnit.id = auResponse.id;

        cy.createTempUser([
          permissions.inventoryAll.gui,
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
                      id: uuid(),
                      purchaseOrderId: orderResponse.id,
                      titleOrPackage: instanceTitle,
                      cost: {
                        listUnitPrice: 100.0,
                        currency: 'USD',
                        discountType: 'percentage',
                        quantityPhysical: quantity,
                        poLineEstimatedPrice: 200.0,
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
                        cy.getAdminToken();
                        Receiving.getTitleByPoLineIdViaApi(orderLine.id).then((titleData) => {
                          Receiving.updateTitleViaApi({
                            ...titleData,
                            acqUnitIds: [acquisitionUnit.id],
                          });
                        });

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
    });

    it(
      'C430219 User without assigned Acq unit can view and delete Piece with appropriate Acq unit restrictions (thunderjet)',
      { tags: ['criticalPath', 'thunderjet', 'C430219'] },
      () => {
        Receiving.searchByParameter({ parameter: 'Keyword', value: instanceTitle });
        Receiving.selectFromResultsList(instanceTitle);
        ReceivingDetails.waitLoading();
        ReceivingDetails.verifyExpectedRecordsCount(2);

        ReceivingDetails.expandTitleInformationAccordion();
        ReceivingDetails.verifyAcquisitionUnitInTitleInformation(acquisitionUnit.name, true);

        ReceivingDetails.openEditPieceModal({ row: 0 });
        EditPieceModal.waitLoading();

        Receiving.openDropDownInEditPieceModal();
        EditPieceModal.clickDeleteButton({ isLastPiece: false });

        DeletePieceModal.confirmDelete({ pieceDeleted: true });

        ReceivingDetails.waitLoading();
        ReceivingDetails.verifyExpectedRecordsCount(1);

        ReceivingDetails.expandTitleInformationAccordion();
        ReceivingDetails.verifyAcquisitionUnitInTitleInformation(acquisitionUnit.name, true);

        ReceivingDetails.openInstanceDetails();
        InventoryInstance.waitInventoryLoading();

        cy.wait(2000);
        InventoryInstance.verifyNumberOfItemsInHoldingByName(location.name, 1);
        InventoryInstance.checkHoldingsTableContent({
          name: location.name,
          records: [{}],
          shouldOpen: true,
        });
      },
    );
  });
});
