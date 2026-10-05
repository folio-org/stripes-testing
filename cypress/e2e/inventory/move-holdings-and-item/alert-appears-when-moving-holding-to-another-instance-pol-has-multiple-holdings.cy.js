import {
  ACQUISITION_METHOD_NAMES_IN_PROFILE,
  DEFAULT_WAIT_TIME,
  INSTANCE_DETAILS_ACCORDION_LABELS,
  ORDER_LINE_DISCOUNT_TYPES,
  ORDER_STATUSES,
  POL_CREATE_INVENTORY_SETTINGS,
  POLINE_DETAILS_FIELDS,
} from '../../../support/constants';
import Permissions from '../../../support/dictionary/permissions';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventoryInstancesMovement, {
  inventoryInstancesMovementPaneFrom,
  inventoryInstancesMovementPaneTo,
} from '../../../support/fragments/inventory/holdingsMove/inventoryInstancesMovement';
import InventoryInstanceSelectInstanceModal from '../../../support/fragments/inventory/modals/inventoryInstanceSelectInstanceModal';
import {
  BasicOrderLine,
  NewOrder,
  OrderLineDetails,
  OrderLines,
  Orders,
  Pieces,
} from '../../../support/fragments/orders';
import Receiving from '../../../support/fragments/receiving/receiving';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import { ExecutionFlowManager } from '../../../support/utils';
import getRandomPostfix from '../../../support/utils/stringTools';
import { CURRENCIES } from '../../../support/fragments/settings/tenant/general/localization';
import { NewOrganization, Organizations } from '../../../support/fragments/organizations';
import MaterialTypes from '../../../support/fragments/settings/inventory/materialTypes';
import InventoryHoldings from '../../../support/fragments/inventory/holdings/inventoryHoldings';
import SelectInstanceModal from '../../../support/fragments/orders/modals/selectInstanceModal';
import InteractorsTools from '../../../support/utils/interactorsTools';
import ReceivingDetails from '../../../support/fragments/receiving/receivingDetails';

const USER_PERMISSIONS = [
  Permissions.uiInventoryViewInstances.gui,
  Permissions.uiInventoryMoveItems.gui,
  Permissions.uiInventoryHoldingsMove.gui,
  Permissions.uiOrdersView.gui,
  Permissions.uiReceivingView.gui,
];

describe('Inventory', () => {
  describe('Move Holdings and Item', () => {
    const polTitle = `AT_C569615_POL_${getRandomPostfix()}`;
    const targetTitle = `AT_C569615_TARGET_${getRandomPostfix()}`;
    const flow = new ExecutionFlowManager();
    const R = {
      LOCATION: 'location',
      ACQUISITION_METHOD: 'acquisitionMethod',
      MATERIAL_TYPE: 'mType',
      ORDER: 'order',
      ORDER_LINE: 'orderLine',
      ORGANIZATION: 'organization',
      TARGET_INSTANCE_ID: 'targetInstanceId',
      INSTANCE_HOLDINGS: 'instanceHoldings',
      POL_HOLDINGS: 'polHoldings',
      ITEM_BARCODE: 'itemBarcode',
      USER: 'user',
    };
    const instanceIds = [];

    before(() => {
      cy.getAdminToken();

      flow
        .step((f) => {
          const organization = { ...NewOrganization.getDefaultOrganization() };

          return Organizations.createOrganizationViaApi(organization).then((id) => {
            return f.set(R.ORGANIZATION, organization, () => Organizations.deleteOrganizationViaApi(id));
          });
        })
        .step((f) => {
          return MaterialTypes.getMaterialTypesViaApi().then(({ mtypes }) => f.set(R.MATERIAL_TYPE, mtypes[0]));
        })
        .step((f) => {
          cy.log('Precondition: Get active location for creating test data');
          return cy
            .getLocations({
              limit: 1,
              query: '(isActive=true and name<>"AT_*" and name<>"autotest*")',
            })
            .then((location) => f.set(R.LOCATION, location));
        })
        .step((f) => {
          cy.log(
            'Precondition 1: Create target instance with 2 empty holdings (Holding 1 and Holding 2 without items)',
          );
          const instances = InventoryInstances.generateFolioInstances({
            count: 1,
            instanceTitlePrefix: targetTitle,
            holdingsCount: 2,
            itemsCount: 0,
          });

          return InventoryInstances.createFolioInstancesViaApi({
            folioInstances: instances,
            location: f.get(R.LOCATION),
          }).then(() => {
            instanceIds.push(instances[0].instanceId);
            f.set(R.TARGET_INSTANCE_ID, instances[0].instanceId);
          });
        })
        .step((f) => {
          cy.log('Precondition: Get Purchase acquisition method');
          return cy
            .getAcquisitionMethodsApi({
              query: `value="${ACQUISITION_METHOD_NAMES_IN_PROFILE.PURCHASE}"`,
            })
            .then(({ body }) => f.set(R.ACQUISITION_METHOD, body.acquisitionMethods[0]));
        })
        .step((f) => {
          cy.log('Precondition 1: Create order in Open status with PO line linked to POL instance');
          const order = {
            ...NewOrder.defaultOneTimeOrder,
            vendor: f.get(R.ORGANIZATION).id,
            approved: true,
          };

          return cy
            .createOrderApi(order)
            .then(({ body }) => {
              f.set(R.ORDER, body, (o) => Orders.deleteOrderViaApi(o.id, false));
              return body.id;
            })
            .then((orderId) => {
              const locationId = f.get(R.LOCATION).id;
              const orderLine = {
                ...BasicOrderLine.defaultOrderLine,
                purchaseOrderId: orderId,
                titleOrPackage: polTitle,
                acquisitionMethod: f.get(R.ACQUISITION_METHOD).id,
                cost: {
                  listUnitPrice: 20,
                  currency: CURRENCIES.US_DOLLAR.value,
                  discountType: ORDER_LINE_DISCOUNT_TYPES.PERCENTAGE,
                  quantityPhysical: 5,
                  poLineEstimatedPrice: 100,
                },
                locations: [
                  { locationId, quantity: 2, quantityPhysical: 2 },
                  { locationId, quantity: 2, quantityPhysical: 2 },
                  { locationId, quantity: 1, quantityPhysical: 1 },
                ],
                physical: {
                  createInventory: POL_CREATE_INVENTORY_SETTINGS.INSTANCE_HOLDING_ITEM,
                  materialType: f.get(R.MATERIAL_TYPE).id,
                },
              };
              return OrderLines.createOrderLineViaApi(orderLine).then((line) => {
                f.set(R.ORDER_LINE, line, (ol) => OrderLines.deleteOrderLineViaApi(ol.id, false));
              });
            });
        })
        .step((f) => {
          cy.log('Precondition 1: Set order to Open status');
          return Orders.updateOrderViaApi({
            ...f.get(R.ORDER),
            workflowStatus: ORDER_STATUSES.OPEN,
          }).then(() => {
            return OrderLines.getOrderLineByIdViaApi(f.get(R.ORDER_LINE).id).then((updatedLine) => f.set(R.ORDER_LINE, updatedLine));
          });
        })
        .step((f) => {
          cy.log(
            'Precondition 1c: Receive one piece from Holding 1 (first item with barcode in In process status)',
          );
          return Pieces.getOrderPiecesViaApi({
            query: `poLineId==${f.get(R.ORDER_LINE).id} and holdingId==${f.get(R.ORDER_LINE).locations[0].holdingId}`,
          }).then(({ pieces }) => {
            const pieceToReceive = pieces[0];

            return Receiving.receivePieceViaApi({
              poLineId: f.get(R.ORDER_LINE).id,
              pieces: [{ ...pieceToReceive, barcode: f.get(R.ITEM_BARCODE) }],
            });
          });
        })
        .step((f) => {
          [
            [flow.get(R.TARGET_INSTANCE_ID), R.INSTANCE_HOLDINGS],
            [flow.get(R.ORDER_LINE).instanceId, R.POL_HOLDINGS],
          ].forEach(([instanceId, holdingsKey]) => {
            return InventoryHoldings.getHoldingsRecordsViaApi({
              query: `instanceId==${instanceId}`,
            }).then((holdings) => {
              f.set(holdingsKey, holdings);

              cy.log(
                'Precondition 1: Update POL holdings with call numbers to distinguish them by name',
              );
              holdings.forEach((h, indx) => {
                InventoryHoldings.getHoldingsRecordByIdViaApi(h.id).then((holding) => InventoryHoldings.updateInventoryHoldingRecordViaApi({
                  ...holding,
                  callNumber: `${holdingsKey}-${indx}`,
                }));
              });
            });
          });
        })
        .step((f) => {
          cy.log(
            'Precondition: Create user with Inventory Move holdings, Move items, View instances/holdings/items, Orders View, and Receiving View permissions',
          );
          return cy
            .createTempUser(USER_PERMISSIONS)
            .then((user) => f.set(R.USER, user, (u) => Users.deleteViaApi(u.userId)));
        })
        .step((f) => {
          cy.log('Precondition: Login and navigate to Inventory app');
          return cy.login(f.get(R.USER).username, f.get(R.USER).password, {
            path: TopMenu.inventoryPath,
            waiter: InventoryInstances.waitContentLoading,
          });
        });
    });

    after(() => {
      cy.getAdminToken();
      instanceIds.forEach((id) => {
        InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(id);
      });
      flow.cleanup();
    });

    it(
      'C569615 Alert appears when moving holding to another instance (related POL contains more than one holding) (thunderjet)',
      { tags: ['extendedPath', 'thunderjet', 'C569615'] },
      () => {
        const { orderLine, location } = flow.ctx();

        const getHoldingLabel = (index, suffix = R.POL_HOLDINGS) => `${location.name} >  ${suffix}-${index}`;

        cy.log('Step 1. Navigate to POL instance details pane from created POL in Preconditions');
        InventoryInstances.searchByTitle(polTitle);
        InventoryInstance.waitLoading();
        InventoryInstance.openAccordion(INSTANCE_DETAILS_ACCORDION_LABELS.ACQUISITION);
        InventoryInstance.verifyAcquisitionAccordionOrderLineLink(orderLine.poLineNumber);

        cy.log(
          'Step 2. Click "Actions" button on Instance details pane and select "Move holdings/items to another instance" option',
        );
        InventoryInstance.clickActionsButton();
        InventoryInstance.clickMoveHoldingsToAnotherInstanceButton();
        InventoryInstanceSelectInstanceModal.waitLoading();
        SelectInstanceModal.checkTableContent();

        cy.log(
          'Step 3. Search for Instance from Preconditions (different from POL title) and click on it',
        );
        InventoryInstanceSelectInstanceModal.searchByTitle(targetTitle);
        InventoryInstanceSelectInstanceModal.selectInstance();
        cy.wait(DEFAULT_WAIT_TIME);
        InventoryInstancesMovement.verifyHoldingsMoved(getHoldingLabel(0), '2', {
          instancePaneIndex: 0,
        });
        InventoryInstancesMovement.verifyHoldingsMoved(getHoldingLabel(1), '2', {
          instancePaneIndex: 0,
        });
        InventoryInstancesMovement.verifyHoldingsMoved(getHoldingLabel(2), '1', {
          instancePaneIndex: 0,
        });
        InventoryInstancesMovement.verifyHoldingsMoved(
          getHoldingLabel(0, R.INSTANCE_HOLDINGS),
          '0',
          { instancePaneIndex: 1 },
        );
        InventoryInstancesMovement.verifyHoldingsMoved(
          getHoldingLabel(1, R.INSTANCE_HOLDINGS),
          '0',
          { instancePaneIndex: 1 },
        );

        cy.log(
          'Step 4-5. Click "Move to" button for Holding 1 and confirm move - verification popup contains warning about POL',
        );
        InventoryInstancesMovement.moveFromMultiple(getHoldingLabel(0), targetTitle, {
          confirm: false,
        });

        cy.log('Step 6. All 3 holdings move successfully with toast confirmation');
        InventoryInstancesMovement.clickConfirmMoveButton();
        InventoryInstancesMovement.checkHoldingsMoveSuccessCallout(3);
        InteractorsTools.closeAllVisibleCallouts();
        InventoryInstancesMovement.verifyHoldingsMoved(getHoldingLabel(0), '2', {
          instancePaneIndex: 1,
        });
        InventoryInstancesMovement.verifyHoldingsMoved(getHoldingLabel(1), '2', {
          instancePaneIndex: 1,
        });
        InventoryInstancesMovement.verifyHoldingsMoved(getHoldingLabel(2), '1', {
          instancePaneIndex: 1,
        });
        InventoryInstancesMovement.verifyHoldingsMoved(
          getHoldingLabel(0, R.INSTANCE_HOLDINGS),
          '0',
          { instancePaneIndex: 1 },
        );
        InventoryInstancesMovement.verifyHoldingsMoved(
          getHoldingLabel(1, R.INSTANCE_HOLDINGS),
          '0',
          { instancePaneIndex: 1 },
        );

        cy.log('Step 7. On the left pane, Acquisition accordion does not contain POL link');
        InventoryInstance.openAccordion(INSTANCE_DETAILS_ACCORDION_LABELS.ACQUISITION, {
          pane: inventoryInstancesMovementPaneFrom,
        });
        InventoryInstance.verifyAcquisitionAccordionOrderLineLink(orderLine.poLineNumber, {
          pane: inventoryInstancesMovementPaneFrom,
          shouldExist: false,
        });

        cy.log('Step 8. On the right pane, Acquisition accordion contains POL link');
        InventoryInstance.openAccordion(INSTANCE_DETAILS_ACCORDION_LABELS.ACQUISITION, {
          pane: inventoryInstancesMovementPaneTo,
        });
        InventoryInstance.verifyAcquisitionAccordionOrderLineLink(orderLine.poLineNumber, {
          pane: inventoryInstancesMovementPaneTo,
        });

        cy.log('Step 9. Click POL hyperlink - order line details show target instance title');
        InventoryInstance.clickAcquisitionOrderLineLink(orderLine.poLineNumber, {
          pane: inventoryInstancesMovementPaneTo,
        });
        OrderLineDetails.waitLoading();
        OrderLineDetails.verifyLinesDetailTitle(targetTitle);

        cy.log(
          'Step 10. Click "Version history" icon - shows current version with Instance ID change',
        );
        OrderLineDetails.openVersionHistory();
        OrderLines.assertVersionHistoryCard({
          index: 0,
          changedFields: [POLINE_DETAILS_FIELDS.TITLE, 'Instance ID'],
        });

        cy.log(
          'Step 11. Verify title in Receiving app - only target title appears in search results',
        );
        OrderLines.closeVersionHistory();
        OrderLines.receiveOrderLinesViaActions();
        Receiving.waitLoading();
        Receiving.checkTitleInReceivingList(targetTitle);
        Receiving.checkTitleInReceivingList(polTitle, { shouldExist: false });

        cy.log('Step 12. Open title details - Expected has 4 records, Received has 1 record');
        Receiving.selectFromResultsList(targetTitle);
        Receiving.waitLoading();
        ReceivingDetails.assertExpectedPiecesTotalCount(4);
        ReceivingDetails.assertReceivedPiecesTotalCount(1);
      },
    );
  });
});
