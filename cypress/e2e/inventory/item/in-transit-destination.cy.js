import { including } from '@interactors/html';
import {
  APPLICATION_NAMES,
  FULFILMENT_PREFERENCES,
  ITEM_STATUS_NAMES,
  REQUEST_LEVELS,
  REQUEST_TYPES,
} from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import CheckInActions from '../../../support/fragments/check-in-actions/checkInActions';
import CheckInPane from '../../../support/fragments/check-in-actions/checkInPane';
import InTransit from '../../../support/fragments/checkin/modals/inTransit';
import HoldingsRecordEdit from '../../../support/fragments/inventory/holdingsRecordEdit';
import HoldingsRecordView from '../../../support/fragments/inventory/holdingsRecordView';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import ItemRecordView from '../../../support/fragments/inventory/item/itemRecordView';
import EditRequest from '../../../support/fragments/requests/edit-request';
import Requests from '../../../support/fragments/requests/requests';
import { Locations } from '../../../support/fragments/settings/tenant/location-setup';
import ServicePoints from '../../../support/fragments/settings/tenant/servicePoints/servicePoints';
import SwitchServicePoint from '../../../support/fragments/settings/tenant/servicePoints/switchServicePoint';
import TopMenu from '../../../support/fragments/topMenu';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import UserEdit from '../../../support/fragments/users/userEdit';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Inventory', () => {
  describe('Item', () => {
    const randomPostfix = getRandomPostfix();
    const testData = {
      // [0] - instance with item M, [1] - instance with item N
      folioInstances: InventoryInstances.generateFolioInstances({ count: 2 }),
      servicePointY: ServicePoints.getDefaultServicePointWithPickUpLocation({
        name: `AT_C15211_SP_Y_${randomPostfix}`,
      }),
      servicePointZ: ServicePoints.getDefaultServicePointWithPickUpLocation({
        name: `AT_C15211_SP_Z_${randomPostfix}`,
      }),
    };
    const itemM = {};
    const itemN = {};

    const openItemFromInventory = (instance, locationName, barcode) => {
      TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
      InventoryInstances.searchByTitle(instance.instanceId);
      InventoryInstances.selectInstanceById(instance.instanceId);
      InventoryInstance.waitLoading();
      InventoryInstance.waitInstanceRecordViewOpened();
      InventoryInstance.openHoldings(locationName);
      InventoryInstance.openItemByBarcode(barcode);
    };

    before('Create test data', () => {
      cy.getAdminToken();
      InventoryInstances.deleteFullInstancesByTitleViaApi('C15211_');

      // Instance titles must differ, the generator gives the same title to every instance
      testData.folioInstances[0].instanceTitle = `AT_C15211_FolioInstance_M_${randomPostfix}`;
      testData.folioInstances[1].instanceTitle = `AT_C15211_FolioInstance_N_${randomPostfix}`;
      itemM.barcode = testData.folioInstances[0].items[0].barcode;
      itemN.barcode = testData.folioInstances[1].items[0].barcode;

      ServicePoints.createViaApi(testData.servicePointY);
      ServicePoints.createViaApi(testData.servicePointZ);

      // Location A has service point Y as primary (but not Z), location B - service point Z (but not Y)
      testData.locationA = Locations.getDefaultLocation({
        servicePointId: testData.servicePointY.id,
        locationName: `AT_C15211_LocationA_${randomPostfix}`,
      }).location;
      testData.locationB = Locations.getDefaultLocation({
        servicePointId: testData.servicePointZ.id,
        locationName: `AT_C15211_LocationB_${randomPostfix}`,
      }).location;
      Locations.createViaApi(testData.locationA);
      Locations.createViaApi(testData.locationB).then(() => {
        InventoryInstances.createFolioInstancesViaApi({
          folioInstances: testData.folioInstances,
          location: testData.locationA,
        });
      });

      cy.createTempUser([
        Permissions.checkinAll.gui,
        Permissions.uiInventoryViewInstances.gui,
        Permissions.uiInventoryViewCreateEditHoldings.gui,
        Permissions.uiInventoryViewCreateEditItems.gui,
        Permissions.uiRequestsEdit.gui,
      ]).then((userProperties) => {
        testData.user = userProperties;
        UserEdit.addServicePointsViaApi(
          [testData.servicePointY.id, testData.servicePointZ.id],
          testData.user.userId,
          testData.servicePointY.id,
        );

        // Item N has an open request with pickup service point Y
        Requests.createNewRequestViaApi({
          fulfillmentPreference: FULFILMENT_PREFERENCES.HOLD_SHELF,
          holdingsRecordId: testData.folioInstances[1].holdings[0].id,
          instanceId: testData.folioInstances[1].instanceId,
          item: { barcode: itemN.barcode },
          itemId: testData.folioInstances[1].items[0].id,
          pickupServicePointId: testData.servicePointY.id,
          requestDate: new Date(),
          requestExpirationDate: new Date(new Date().getTime() + 86400000),
          requestLevel: REQUEST_LEVELS.ITEM,
          requestType: REQUEST_TYPES.PAGE,
          requesterId: testData.user.userId,
        }).then((request) => {
          testData.requestId = request.body.id;
        });

        cy.login(testData.user.username, testData.user.password, {
          path: TopMenu.checkInPath,
          waiter: CheckInActions.waitLoading,
          authRefresh: true,
        });
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken(false);
      Requests.deleteRequestViaApi(testData.requestId);
      testData.folioInstances.forEach((instance) => {
        InventoryInstances.deleteInstanceViaApi({
          instance,
          servicePoint: testData.servicePointY,
          shouldCheckIn: true,
        });
      });
      UserEdit.changeServicePointPreferenceViaApi(testData.user.userId, [
        testData.servicePointY.id,
        testData.servicePointZ.id,
      ]);
      Locations.deleteViaApi(testData.locationA);
      Locations.deleteViaApi(testData.locationB);
      ServicePoints.deleteViaApi(testData.servicePointY.id);
      ServicePoints.deleteViaApi(testData.servicePointZ.id);
      Users.deleteViaApi(testData.user.userId);
    });

    it(
      'C15211 In transit destination (promin)',
      { tags: ['extendedPath', 'promin', 'C15211'] },
      () => {
        const inTransitToY = `In transit to ${testData.servicePointY.name}`;
        const inTransitInCheckInRow = `${ITEM_STATUS_NAMES.IN_TRANSIT} - ${testData.servicePointY.name}`;

        // Step 1: Check In app, switch to service point Z, check in item M; status "In transit - Y"
        SwitchServicePoint.switchServicePoint(testData.servicePointZ.name);
        SwitchServicePoint.checkIsServicePointSwitched(testData.servicePointZ.name);
        CheckInActions.checkInItemGui(itemM.barcode);
        InTransit.verifyModalTitle();
        InTransit.unselectCheckboxPrintSlip();
        InTransit.closeModal();
        CheckInPane.checkResultsInTheRow([inTransitInCheckInRow, itemM.barcode]);

        // Step 2: Open item M record, "Loan and availability" shows "In transit to Y"
        CheckInActions.openItemRecordInInventory(inTransitInCheckInRow);
        ItemRecordView.verifyItemStatus(inTransitToY);

        // Step 3: Set holdings temporary location to B; item status is unchanged, effective location is B
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
        InventoryInstances.searchByTitle(testData.folioInstances[0].instanceId);
        InventoryInstances.selectInstanceById(testData.folioInstances[0].instanceId);
        InventoryInstance.waitLoading();
        InventoryInstance.waitInstanceRecordViewOpened();
        InventoryInstance.openHoldingView();
        HoldingsRecordView.edit();
        HoldingsRecordEdit.selectTemporaryLocation(testData.locationB.name);
        HoldingsRecordEdit.saveAndClose({ holdingSaved: true });
        HoldingsRecordView.waitLoading();
        // The holdings accordion is still titled by the permanent location (A)
        openItemFromInventory(testData.folioInstances[0], testData.locationA.name, itemM.barcode);
        ItemRecordView.verifyItemStatus(inTransitToY);
        ItemRecordView.verifyEffectiveLocation(testData.locationB.name);
        ItemRecordView.closeDetailView();
        InventoryInstance.waitLoading();
        InventoryInstance.waitInstanceRecordViewOpened();

        // Step 4: Check in item N (open request, pickup service point Y); status "In transit - Y"
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.CHECK_IN);
        CheckInActions.waitLoading();
        CheckInActions.checkInItemGui(itemN.barcode);
        InTransit.verifyModalTitle();
        InTransit.unselectCheckboxPrintSlip();
        InTransit.closeModal();
        CheckInPane.checkResultsInTheRow([inTransitInCheckInRow, itemN.barcode]);

        // Step 5: Open item N record, "Loan and availability" shows "In transit to Y"
        CheckInActions.openItemRecordInInventory(inTransitInCheckInRow);
        ItemRecordView.verifyItemStatus(inTransitToY);
        ItemRecordView.closeDetailView();
        InventoryInstance.waitLoading();
        InventoryInstance.waitInstanceRecordViewOpened();

        // Step 6: Edit the request pickup service point to Z; item status is still "In transit to Y"
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.REQUESTS);
        Requests.waitLoading();
        EditRequest.findAndOpenCreatedRequest(testData.folioInstances[1]);
        EditRequest.editPickupServicePoint(testData.servicePointZ.name);
        openItemFromInventory(testData.folioInstances[1], testData.locationA.name, itemN.barcode);
        ItemRecordView.verifyItemStatus(including(inTransitToY));
      },
    );
  });
});
