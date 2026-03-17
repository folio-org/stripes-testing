import {
  FULFILMENT_PREFERENCES,
  ITEM_STATUS_NAMES,
  REQUEST_LEVELS,
  REQUEST_TYPES,
} from '../../support/constants';
import Permissions from '../../support/dictionary/permissions';
import EditRequest from '../../support/fragments/requests/edit-request';
import NewRequest from '../../support/fragments/requests/newRequest';
import RequestDetail from '../../support/fragments/requests/requestDetail';
import Requests from '../../support/fragments/requests/requests';
import { Locations } from '../../support/fragments/settings/tenant/location-setup';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import PatronGroups from '../../support/fragments/settings/users/patronGroups';
import TopMenu from '../../support/fragments/topMenu';
import UserEdit from '../../support/fragments/users/userEdit';
import Users from '../../support/fragments/users/users';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import getRandomPostfix from '../../support/utils/stringTools';

describe('Requests', () => {
  describe('Effective call number string', () => {
    const testData = {
      servicePoint: ServicePoints.getDefaultServicePointWithPickUpLocation(),
    };
    const patronGroup = {
      name: `groupEffectiveCallNumber${getRandomPostfix()}`,
    };
    const callNumberData = {
      itemCallNumberPrefix: 'AT',
      itemCallNumber: 'PR9199.3 .L33',
      itemCallNumberSuffix: getRandomPostfix(),
      volume: 'v. 1',
      enumeration: 'no. 2',
      chronology: '1995',
      copyNumber: 'c. 1',
    };
    const itemData = {
      instanceTitle: `Instance ${getRandomPostfix()}`,
      barcode: getRandomPostfix(),
    };
    const expectedEffectiveCallNumber = `${callNumberData.itemCallNumberPrefix} ${callNumberData.itemCallNumber} ${callNumberData.itemCallNumberSuffix} ${callNumberData.volume} ${callNumberData.enumeration} ${callNumberData.chronology} ${callNumberData.copyNumber}`;
    let userData;
    let requestId;

    before('Create test data', () => {
      cy.getAdminToken()
        .then(() => {
          cy.getInstanceTypes({ limit: 1 }).then((instanceTypes) => {
            itemData.instanceTypeId = instanceTypes[0].id;
          });
          cy.getHoldingTypes({ limit: 1 }).then((res) => {
            itemData.holdingTypeId = res[0].id;
          });
          cy.getLoanTypes({ limit: 1 }).then((res) => {
            itemData.loanTypeId = res[0].id;
          });
          cy.getDefaultMaterialType().then((res) => {
            itemData.materialTypeId = res.id;
          });
        })
        .then(() => {
          ServicePoints.createViaApi(testData.servicePoint);
          testData.defaultLocation = Locations.getDefaultLocation({
            servicePointId: testData.servicePoint.id,
          }).location;
          Locations.createViaApi(testData.defaultLocation);
        })
        .then(() => {
          InventoryInstances.createFolioInstanceViaApi({
            instance: {
              instanceTypeId: itemData.instanceTypeId,
              title: itemData.instanceTitle,
            },
            holdings: [
              {
                holdingsTypeId: itemData.holdingTypeId,
                permanentLocationId: testData.defaultLocation.id,
              },
            ],
            items: [
              {
                barcode: itemData.barcode,
                status: { name: ITEM_STATUS_NAMES.AVAILABLE },
                permanentLoanType: { id: itemData.loanTypeId },
                materialType: { id: itemData.materialTypeId },
                itemLevelCallNumber: callNumberData.itemCallNumber,
                itemLevelCallNumberPrefix: callNumberData.itemCallNumberPrefix,
                itemLevelCallNumberSuffix: callNumberData.itemCallNumberSuffix,
                volume: callNumberData.volume,
                enumeration: callNumberData.enumeration,
                chronology: callNumberData.chronology,
                copyNumber: callNumberData.copyNumber,
              },
            ],
          });
        })
        .then((specialInstanceIds) => {
          itemData.testInstanceIds = specialInstanceIds;
        })
        .then(() => {
          PatronGroups.createViaApi(patronGroup.name).then((patronGroupResponse) => {
            patronGroup.id = patronGroupResponse;
          });
        })
        .then(() => {
          cy.createTempUser(
            [Permissions.uiRequestsAll.gui, Permissions.uiInventoryViewInstances.gui],
            patronGroup.name,
          ).then((userProperties) => {
            userData = userProperties;
            UserEdit.addServicePointViaApi(
              testData.servicePoint.id,
              userData.userId,
              testData.servicePoint.id,
            );

            Requests.createNewRequestViaApi({
              fulfillmentPreference: FULFILMENT_PREFERENCES.HOLD_SHELF,
              holdingsRecordId: itemData.testInstanceIds.holdingIds[0].id,
              instanceId: itemData.testInstanceIds.instanceId,
              item: { barcode: itemData.barcode },
              itemId: itemData.testInstanceIds.holdingIds[0].itemIds[0],
              pickupServicePointId: testData.servicePoint.id,
              requestDate: new Date().toISOString(),
              requestLevel: REQUEST_LEVELS.ITEM,
              requestType: REQUEST_TYPES.PAGE,
              requesterId: userData.userId,
            }).then((request) => {
              requestId = request.body.id;
            });
          });
        });
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      Requests.deleteRequestViaApi(requestId);
      UserEdit.changeServicePointPreferenceViaApi(userData.userId, [testData.servicePoint.id]);
      Users.deleteViaApi(userData.userId);
      InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(itemData.barcode);
      ServicePoints.deleteViaApi(testData.servicePoint.id);
      PatronGroups.deleteViaApi(patronGroup.id);
      Locations.deleteViaApi(testData.defaultLocation);
    });

    it(
      'C9232 Display effective call number string on Request (vega)',
      { tags: ['extendedPath', 'vega', 'C9232'] },
      () => {
        cy.login(userData.username, userData.password, {
          path: TopMenu.requestsPath,
          waiter: Requests.waitLoading,
        });

        // Step 1: Search for the created request
        Requests.findCreatedRequest(itemData.instanceTitle);
        Requests.selectFirstRequest(itemData.instanceTitle);
        RequestDetail.waitLoading();

        // Step 2: Verify effective call number string in request detail view
        RequestDetail.checkItemInformation({
          itemBarcode: itemData.barcode,
          title: itemData.instanceTitle,
          effectiveLocation: testData.defaultLocation.name,
          callNumber: expectedEffectiveCallNumber,
          itemStatus: ITEM_STATUS_NAMES.PAGED,
          requestsOnItem: '1',
        });

        // Step 3: Open edit request and verify effective call number string
        EditRequest.openRequestEditForm();
        EditRequest.waitLoading('item');

        // Step 4: Verify effective call number string in edit view
        EditRequest.verifyItemInformation({
          itemBarcode: itemData.barcode,
          effectiveLocation: testData.defaultLocation.name,
          itemStatus: ITEM_STATUS_NAMES.PAGED,
          title: itemData.instanceTitle,
          effectiveCallNumber: expectedEffectiveCallNumber,
          currentDueDate: 'No value set-',
          contributor: 'No value set-',
          requestsOnItem: '1',
        });

        // Step 5: Close edit view and return to request detail
        EditRequest.closeRequestPreview();
        RequestDetail.waitLoading();

        // Step 6: Open new request form to verify effective call number string
        cy.login(userData.username, userData.password, {
          path: TopMenu.requestsPath,
          waiter: Requests.waitLoading,
        });

        NewRequest.openNewRequestPane();
        NewRequest.waitLoadingNewRequestPage();

        // Search for the item by barcode
        NewRequest.enterItemInfo(itemData.barcode);

        // Verify effective call number string is displayed in item information section
        EditRequest.verifyItemInformation({
          itemBarcode: itemData.barcode,
          effectiveLocation: testData.defaultLocation.name,
          itemStatus: ITEM_STATUS_NAMES.PAGED,
          title: itemData.instanceTitle,
          effectiveCallNumber: expectedEffectiveCallNumber,
          currentDueDate: 'No value set-',
          contributor: 'No value set-',
          requestsOnItem: '1',
        });
      },
    );
  });
});
