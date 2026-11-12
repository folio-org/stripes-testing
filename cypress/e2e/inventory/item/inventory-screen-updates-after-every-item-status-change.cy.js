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
import Checkout from '../../../support/fragments/checkout/checkout';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventoryItems from '../../../support/fragments/inventory/item/inventoryItems';
import ItemRecordView from '../../../support/fragments/inventory/item/itemRecordView';
import MarkItemAsMissing from '../../../support/fragments/inventory/markItemAsMissing';
import Requests from '../../../support/fragments/requests/requests';
import { Locations } from '../../../support/fragments/settings/tenant/location-setup';
import ServicePoints from '../../../support/fragments/settings/tenant/servicePoints/servicePoints';
import TopMenu from '../../../support/fragments/topMenu';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import UserEdit from '../../../support/fragments/users/userEdit';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Inventory', () => {
  describe('Item', () => {
    const randomPostfix = getRandomPostfix();
    const testData = {
      folioInstances: InventoryInstances.generateFolioInstances({ count: 1 }),
      // Service point Y is assigned to the item's effective location, service point Z is not
      servicePointY: ServicePoints.getDefaultServicePointWithPickUpLocation({
        name: `AT_C563_SP_Y_${randomPostfix}`,
      }),
      servicePointZ: ServicePoints.getDefaultServicePointWithPickUpLocation({
        name: `AT_C563_SP_Z_${randomPostfix}`,
      }),
    };
    const requestIds = [];
    let instance;
    let item;
    let patron;
    let staffUser;

    const openItemFromInventory = () => {
      TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
      InventoryInstances.searchByTitle(instance.instanceId);
      InventoryInstances.selectInstanceById(instance.instanceId);
      InventoryInstance.waitLoading();
      InventoryInstance.waitInstanceRecordViewOpened();
      InventoryInstance.openHoldings(testData.location.name);
      InventoryInstance.openItemByBarcode(item.barcode);
    };

    const closeItem = () => {
      ItemRecordView.closeDetailView();
      InventoryInstance.waitLoading();
      InventoryInstance.waitInstanceRecordViewOpened();
    };

    // Item record "Loan and availability" section; the item is opened and closed by the caller
    const verifyItemRecord = ({ status, isCheckedOut = false, requestsCount }) => {
      ItemRecordView.verifyItemStatusInPane(status);
      ItemRecordView.verifyItemStatus(including(status));
      // The "status updated" date and time are the time of the last status change
      MarkItemAsMissing.verifyItemStatusUpdatedDate();

      if (isCheckedOut) {
        ItemRecordView.verifyItemStatusLinkedToLoan(patron.userId);
        ItemRecordView.verifyBorrower(patron.barcode);
        ItemRecordView.verifyBorrowerLinkedToPatron(patron.userId);
      } else {
        ItemRecordView.verifyItemStatusIsNotLinked();
        ItemRecordView.verifyBorrower();
      }
      ItemRecordView.verifyLoanAndDueDatesPopulated(isCheckedOut);

      if (requestsCount) {
        ItemRecordView.verifyRequestsCount(requestsCount);
        ItemRecordView.verifyRequestsLinkedToRequestsApp();
      }
    };

    const checkInItem = (servicePoint) => {
      CheckInActions.checkinItemViaApi({
        itemBarcode: item.barcode,
        servicePointId: servicePoint.id,
      });
    };

    const createRequest = (requestFields) => {
      Requests.createNewRequestViaApi({
        holdingsRecordId: instance.holdings[0].id,
        instanceId: instance.instanceId,
        item: { barcode: item.barcode },
        itemId: item.id,
        requestDate: new Date(),
        requestExpirationDate: new Date(new Date().getTime() + 86400000),
        requestLevel: REQUEST_LEVELS.ITEM,
        requesterId: patron.userId,
        ...requestFields,
      }).then((request) => {
        requestIds.push(request.body.id);
      });
    };

    before('Create test data', () => {
      cy.getAdminToken();
      InventoryInstances.deleteFullInstancesByTitleViaApi('C563_');

      [instance] = testData.folioInstances;
      instance.instanceTitle = `AT_C563_FolioInstance_${randomPostfix}`;
      [item] = instance.items;

      ServicePoints.createViaApi(testData.servicePointY);
      ServicePoints.createViaApi(testData.servicePointZ);
      testData.location = Locations.getDefaultLocation({
        servicePointId: testData.servicePointY.id,
        locationName: `AT_C563_Location_${randomPostfix}`,
      }).location;
      Locations.createViaApi(testData.location).then(() => {
        InventoryInstances.createFolioInstancesViaApi({
          folioInstances: testData.folioInstances,
          location: testData.location,
        });
      });

      // Active patron with an address and "Delivery" enabled in the request preferences
      cy.getAddressTypesApi({ limit: 1 }).then((addressTypes) => {
        testData.addressTypeId = addressTypes[0].id;

        cy.createTempUser([]).then((userProperties) => {
          patron = userProperties;

          cy.getUsers({ limit: 1, query: `id=="${patron.userId}"` }).then(([user]) => {
            cy.updateUser({
              ...user,
              personal: {
                ...user.personal,
                addresses: [
                  {
                    addressLine1: '123 Main St',
                    city: 'Test City',
                    region: 'Test Region',
                    postalCode: '12345',
                    addressTypeId: testData.addressTypeId,
                    primaryAddress: true,
                  },
                ],
              },
            });
          });
          cy.getRequestPreference({ query: `userId=="${patron.userId}"` }).then((response) => {
            const existing = response.body.requestPreferences[0];

            cy.updateRequestPreference(existing.id, {
              ...existing,
              delivery: true,
              defaultDeliveryAddressTypeId: testData.addressTypeId,
            });
          });
        });
      });

      cy.createTempUser([
        Permissions.checkinAll.gui,
        Permissions.checkoutAll.gui,
        Permissions.uiInventoryViewInstances.gui,
        Permissions.uiInventoryViewCreateEditItems.gui,
        Permissions.uiInventoryMarkAsMissing.gui,
        Permissions.uiRequestsAll.gui,
        Permissions.uiUsersViewLoans.gui,
      ]).then((userProperties) => {
        staffUser = userProperties;
        UserEdit.addServicePointsViaApi(
          [testData.servicePointY.id, testData.servicePointZ.id],
          staffUser.userId,
          testData.servicePointY.id,
        );

        cy.login(staffUser.username, staffUser.password, {
          path: TopMenu.inventoryPath,
          waiter: InventoryInstances.waitContentLoading,
        });
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken(false);
      requestIds.forEach((id) => Requests.deleteRequestViaApi(id));
      InventoryInstances.deleteInstanceViaApi({
        instance,
        servicePoint: testData.servicePointY,
        shouldCheckIn: true,
      });
      UserEdit.changeServicePointPreferenceViaApi(staffUser.userId, [
        testData.servicePointY.id,
        testData.servicePointZ.id,
      ]);
      Locations.deleteViaApi(testData.location);
      ServicePoints.deleteViaApi(testData.servicePointY.id);
      ServicePoints.deleteViaApi(testData.servicePointZ.id);
      Users.deleteViaApi(staffUser.userId);
      Users.deleteViaApi(patron.userId);
    });

    it(
      'C563 Check if inventory screen updates properly after every status change (non-acquisitions) (promin)',
      { tags: ['extendedPath', 'promin', 'C563'] },
      () => {
        // The circulation actions of the steps are made via API, the item record is checked in UI
        cy.getToken(staffUser.username, staffUser.password);

        // Step 1: Check out the item to the patron; "Checked out", borrower and loan dates are shown
        Checkout.checkoutItemViaApi({
          itemBarcode: item.barcode,
          servicePointId: testData.servicePointY.id,
          userBarcode: patron.barcode,
        });
        openItemFromInventory();
        verifyItemRecord({ status: ITEM_STATUS_NAMES.CHECKED_OUT, isCheckedOut: true });
        closeItem();

        // Step 2: Check in at service point Z (not assigned to the location); "In transit"
        checkInItem(testData.servicePointZ);
        openItemFromInventory();
        verifyItemRecord({ status: ITEM_STATUS_NAMES.IN_TRANSIT });
        closeItem();

        // Step 3: Check in at service point Y (assigned to the location); "Available"
        checkInItem(testData.servicePointY);
        openItemFromInventory();
        verifyItemRecord({ status: ITEM_STATUS_NAMES.AVAILABLE });
        closeItem();

        // Step 4: Page request with Hold shelf fulfillment; "Paged", 1 request
        createRequest({
          fulfillmentPreference: FULFILMENT_PREFERENCES.HOLD_SHELF,
          pickupServicePointId: testData.servicePointY.id,
          requestType: REQUEST_TYPES.PAGE,
        });
        openItemFromInventory();
        verifyItemRecord({ status: ITEM_STATUS_NAMES.PAGED, requestsCount: 1 });
        closeItem();

        // Step 5: Check in at the pickup service point; "Awaiting pickup"
        checkInItem(testData.servicePointY);
        openItemFromInventory();
        verifyItemRecord({ status: ITEM_STATUS_NAMES.AWAITING_PICKUP, requestsCount: 1 });

        // Step 6: Mark the item as Missing in Inventory; "Missing"
        InventoryItems.markAsMissing();
        InventoryItems.confirmMarkAsMissing();
        verifyItemRecord({ status: ITEM_STATUS_NAMES.MISSING, requestsCount: 1 });
        closeItem();

        // Step 7: The fulfillment preference of an "Awaiting pickup" request can't be edited, so the
        // request is replaced with a Delivery one; check in the item; "Awaiting delivery"
        // The id is read inside cy.then - it is saved when the request of step 4 is created
        cy.getAdminToken(false);
        cy.then(() => Requests.deleteRequestViaApi(requestIds.pop()));
        cy.wait(1000); // Wait for the request to be deleted before creating a new one
        cy.getToken(staffUser.username, staffUser.password);
        createRequest({
          fulfillmentPreference: FULFILMENT_PREFERENCES.DELIVERY,
          deliveryAddressTypeId: testData.addressTypeId,
          requestType: REQUEST_TYPES.HOLD,
        });
        checkInItem(testData.servicePointY);
        openItemFromInventory();
        verifyItemRecord({ status: ITEM_STATUS_NAMES.AWAITING_DELIVERY, requestsCount: 1 });
      },
    );
  });
});
