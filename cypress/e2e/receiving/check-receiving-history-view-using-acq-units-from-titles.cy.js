import {
  ACQUISITION_METHOD_NAMES_IN_PROFILE,
  HOLDING_RECEIVING_HISTORY,
  ITEM_STATUS_NAMES,
  LOCATION_NAMES,
  ORDER_STATUSES,
  ORDER_TYPES,
  RECEIPT_STATUS_VIEW,
  RECEIVING_PIECE_FORM_FIELD_LABELS,
} from '../../support/constants';
import AcquisitionUnits from '../../support/fragments/settings/acquisitionUnits/acquisitionUnits';
import { BasicOrderLine, NewOrder, OrderLines, Orders } from '../../support/fragments/orders';
import DateTools from '../../support/utils/dateTools';
import EditPieceModal from '../../support/fragments/receiving/modals/editPieceModal';
import InventoryInstance from '../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import ItemRecordView from '../../support/fragments/inventory/item/itemRecordView';
import getRandomPostfix from '../../support/utils/stringTools';
import HoldingsRecordView from '../../support/fragments/inventory/holdingsRecordView';
import { NewOrganization, Organizations } from '../../support/fragments/organizations';
import { OrderLinesLimit } from '../../support/fragments/settings/orders';
import Permissions from '../../support/dictionary/permissions';
import PieceForm from '../../support/fragments/receiving/pieceForm';
import Receiving from '../../support/fragments/receiving/receiving';
import ReceivingDetails from '../../support/fragments/receiving/receivingDetails';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';

describe('Receiving', () => {
  describe('Acquisition units', () => {
    const randomPostfix = getRandomPostfix();

    const testData = {
      organization: NewOrganization.getDefaultOrganization(),
      acquisitionUnits: {
        first: AcquisitionUnits.getDefaultAcquisitionUnit({
          name: `AT_C436941_AU1_${randomPostfix}`,
        }),
        second: AcquisitionUnits.getDefaultAcquisitionUnit({
          name: `AT_C436941_AU2_${randomPostfix}`,
        }),
      },
      adminMemberships: [],
      location: {},
      materialType: {},
      acquisitionMethod: {},
      order: {},
      orderLine1: {},
      orderLine2: {},
      piece1: {},
      piece2: {},
      user: {},
    };

    const createAcquisitionUnit = (acquisitionUnitKey) => {
      return AcquisitionUnits.createAcquisitionUnitViaApi(
        testData.acquisitionUnits[acquisitionUnitKey],
      );
    };

    const addAdminToAcquisitionUnit = (acquisitionUnitKey) => {
      return cy
        .getAdminUserDetails()
        .then((admin) => AcquisitionUnits.assignUserViaApi(
          admin.id,
          testData.acquisitionUnits[acquisitionUnitKey].id,
        ))
        .then((membershipId) => {
          testData.adminMemberships.push(membershipId);
        });
    };

    const createAcquisitionUnits = () => {
      return createAcquisitionUnit('first')
        .then(() => createAcquisitionUnit('second'))
        .then(() => addAdminToAcquisitionUnit('first'))
        .then(() => addAdminToAcquisitionUnit('second'));
    };

    const createOrganization = () => {
      return Organizations.createOrganizationViaApi(testData.organization).then((id) => {
        testData.organization.id = id;
      });
    };

    const fetchReferenceData = () => {
      return cy
        .getLocations({ limit: 1, query: `name=${LOCATION_NAMES.MAIN_LIBRARY_UI}` })
        .then((location) => {
          testData.location = location;
        })
        .then(() => cy.getBookMaterialType())
        .then((materialType) => {
          testData.materialType = materialType;
        })
        .then(() => cy.getAcquisitionMethodsApi({
          query: `value="${ACQUISITION_METHOD_NAMES_IN_PROFILE.PURCHASE_AT_VENDOR_SYSTEM}"`,
        }))
        .then(({ body }) => {
          testData.acquisitionMethod = body.acquisitionMethods[0];
        });
    };

    const createOrderLine = (orderLineKey, titleSuffix) => {
      return OrderLines.createOrderLineViaApi(
        BasicOrderLine.getDefaultOrderLine({
          title: `AT_C436941_${titleSuffix}_${randomPostfix}`,
          purchaseOrderId: testData.order.id,
          acquisitionMethod: testData.acquisitionMethod.id,
          specialLocationId: testData.location.id,
          specialMaterialTypeId: testData.materialType.id,
        }),
      ).then((orderLine) => {
        testData[orderLineKey] = orderLine;
      });
    };

    const createOrderWithTwoLines = () => {
      return Orders.createOrderViaApi({
        ...NewOrder.getDefaultOrder({ vendorId: testData.organization.id }),
        acqUnitIds: [testData.acquisitionUnits.first.id],
      })
        .then((order) => {
          testData.order = order;

          return createOrderLine('orderLine1', 'Title1');
        })
        .then(() => createOrderLine('orderLine2', 'Title2'));
    };

    const openOrder = () => {
      return Orders.updateOrderViaApi({
        ...testData.order,
        workflowStatus: ORDER_STATUSES.OPEN,
      })
        .then(() => Orders.getOrderByIdViaApi(testData.order.id))
        .then((order) => {
          testData.order = order;
        });
    };

    const assignAcquisitionUnitToTitle = (orderLineKey, acquisitionUnitKey) => {
      return Receiving.getTitleByPoLineIdViaApi(testData[orderLineKey].id).then((title) => {
        return Receiving.updateTitleViaApi({
          ...title,
          acqUnitIds: [testData.acquisitionUnits[acquisitionUnitKey].id],
        });
      });
    };

    const assignAcquisitionUnitsToTitles = () => {
      return assignAcquisitionUnitToTitle('orderLine1', 'second').then(() => {
        return assignAcquisitionUnitToTitle('orderLine2', 'first');
      });
    };

    const receivePiece = (orderLineKey, pieceKey) => {
      const poLineId = testData[orderLineKey].id;

      return Receiving.getPiecesViaApi(poLineId)
        .then(([piece]) => Receiving.receivePieceViaApi({
          poLineId,
          pieces: [
            {
              id: piece.id,
              displaySummary: `AT_C436941_${pieceKey}_${randomPostfix}`,
              displayOnHolding: true,
            },
          ],
        }))
        .then(() => Receiving.getPiecesViaApi(poLineId))
        .then(([piece]) => {
          testData[pieceKey] = piece;
        });
    };

    const receivePieces = () => {
      return receivePiece('orderLine1', 'piece1').then(() => receivePiece('orderLine2', 'piece2'));
    };

    const fetchOpenedOrderLines = () => {
      return OrderLines.getOrderLineByIdViaApi(testData.orderLine1.id)
        .then((orderLine) => {
          testData.orderLine1 = orderLine;

          return OrderLines.getOrderLineByIdViaApi(testData.orderLine2.id);
        })
        .then((orderLine) => {
          testData.orderLine2 = orderLine;
        });
    };

    const createUserInSecondAcquisitionUnitAndLogin = () => {
      return cy
        .createTempUser([
          Permissions.uiInventoryViewInstances.gui,
          Permissions.uiReceivingViewEditCreate.gui,
        ])
        .then((userProperties) => {
          testData.user = userProperties;

          return AcquisitionUnits.assignUserViaApi(
            testData.user.userId,
            testData.acquisitionUnits.second.id,
          );
        })
        .then(() => {
          cy.login(testData.user.username, testData.user.password, {
            path: TopMenu.receivingPath,
            waiter: Receiving.waitLoading,
          });
        });
    };

    before('Create test data', () => {
      cy.getAdminToken();
      OrderLinesLimit.setPOLLimitViaApi(2);

      createAcquisitionUnits()
        .then(createOrganization)
        .then(fetchReferenceData)
        .then(createOrderWithTwoLines)
        .then(openOrder)
        .then(fetchOpenedOrderLines)
        .then(assignAcquisitionUnitsToTitles)
        .then(receivePieces)
        .then(createUserInSecondAcquisitionUnitAndLogin);
    });

    after('Delete test data', () => {
      cy.getAdminToken().then(() => {
        [
          { poLineId: testData.orderLine1.id, pieceIds: [testData.piece1.id] },
          { poLineId: testData.orderLine2.id, pieceIds: [testData.piece2.id] },
        ].forEach((receivedPieces) => Receiving.unreceivePiecesViaApi(receivedPieces));

        Orders.updateOrderViaApi(
          { ...testData.order, workflowStatus: ORDER_STATUSES.PENDING },
          true,
          false,
        );
        Orders.deleteOrderViaApi(testData.order.id, false);
        InventoryInstance.deleteInstanceViaApi(testData.orderLine1.instanceId);
        InventoryInstance.deleteInstanceViaApi(testData.orderLine2.instanceId);
        Organizations.deleteOrganizationViaApi(testData.organization.id);
        Users.deleteViaApi(testData.user.userId);

        testData.adminMemberships.forEach((membershipId) => {
          AcquisitionUnits.unAssignUserViaApi(membershipId);
        });
        AcquisitionUnits.deleteAcquisitionUnitViaApi(testData.acquisitionUnits.first.id, false);
        AcquisitionUnits.deleteAcquisitionUnitViaApi(testData.acquisitionUnits.second.id, false);
      });
    });

    it(
      'C436941 Check Receiving History View using acq units from Titles (thunderjet)',
      { tags: ['extendedPath', 'thunderjet', 'C436941'] },
      () => {
        // Step 1: Open Title from PO line #1
        Receiving.searchByParameter({ value: testData.orderLine1.titleOrPackage });
        Receiving.selectFromResultsList(testData.orderLine1.titleOrPackage);
        ReceivingDetails.verifyReceivedRecordsCount(1);

        // Step 2: Open the record in "Received" accordion
        Receiving.selectRecordInReceivedList();
        EditPieceModal.waitLoading();
        EditPieceModal.verifyCheckboxState(
          RECEIVING_PIECE_FORM_FIELD_LABELS.DISPLAY_ON_HOLDING,
          true,
        );

        // Step 3: Open connected item
        PieceForm.clickConnectedItemLink();
        ItemRecordView.waitLoading();
        ItemRecordView.verifyItemStatus(ITEM_STATUS_NAMES.IN_PROCESS);

        // Step 4: Open holdings of the item
        ItemRecordView.openHoldingsRecord(testData.piece1.holdingId);
        HoldingsRecordView.waitLoading();
        HoldingsRecordView.checkReceivingHistoryValues({
          displaySummary: testData.piece1.displaySummary,
          publicDisplay: false,
          source: HOLDING_RECEIVING_HISTORY.RECEIVING,
        });

        // Step 5: Close holdings and check "Acquisitions" accordion of the instance
        HoldingsRecordView.close();
        InventoryInstance.waitLoading();
        InventoryInstance.checkAcquisitionsDetails([
          {
            polNumber: testData.orderLine1.poLineNumber,
            orderStatus: ORDER_STATUSES.OPEN,
            receiptStatus: RECEIPT_STATUS_VIEW.FULLY_RECEIVED,
            dateOpened: DateTools.getFormattedEndDateWithTimUTC(testData.order.dateOrdered),
            unit: testData.acquisitionUnits.first.name,
            orderType: ORDER_TYPES.ONE_TIME,
          },
        ]);

        // Step 6: Open holdings of the instance related to PO line #2
        InventoryInstances.searchByTitle(testData.orderLine2.titleOrPackage);
        InventoryInstances.selectInstance();
        InventoryInstance.waitLoading();
        InventoryInstance.viewHoldings();
        HoldingsRecordView.waitLoading();
        HoldingsRecordView.checkReceivingHistoryValues({
          displaySummary: testData.piece2.displaySummary,
          source: HOLDING_RECEIVING_HISTORY.RECEIVING,
          publicDisplay: false,
        });
      },
    );
  });
});
