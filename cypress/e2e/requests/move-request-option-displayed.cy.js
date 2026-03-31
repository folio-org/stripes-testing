import {
  FULFILMENT_PREFERENCES,
  ITEM_STATUS_NAMES,
  REQUEST_LEVELS,
  REQUEST_TYPES,
} from '../../support/constants';
import Permissions from '../../support/dictionary/permissions';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import MoveRequest from '../../support/fragments/requests/move-request';
import RequestDetail from '../../support/fragments/requests/requestDetail';
import Requests from '../../support/fragments/requests/requests';
import { Locations } from '../../support/fragments/settings/tenant/location-setup';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import PatronGroups from '../../support/fragments/settings/users/patronGroups';
import TopMenu from '../../support/fragments/topMenu';
import UserEdit from '../../support/fragments/users/userEdit';
import Users from '../../support/fragments/users/users';
import getRandomPostfix from '../../support/utils/stringTools';

describe('Move request', () => {
  const testData = {
    servicePoint: ServicePoints.getDefaultServicePointWithPickUpLocation(),
  };
  const patronGroup = {
    name: `groupMoveRequest${getRandomPostfix()}`,
  };
  const itemData = {
    instanceTitle: `Instance ${getRandomPostfix()}`,
    barcode: getRandomPostfix(),
    secondBarcode: getRandomPostfix(),
  };
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
            },
            {
              barcode: itemData.secondBarcode,
              status: { name: ITEM_STATUS_NAMES.AVAILABLE },
              permanentLoanType: { id: itemData.loanTypeId },
              materialType: { id: itemData.materialTypeId },
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
        cy.createTempUser([Permissions.uiRequestsAll.gui], patronGroup.name).then(
          (userProperties) => {
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
              requestDate: new Date(),
              requestLevel: REQUEST_LEVELS.ITEM,
              requestType: REQUEST_TYPES.PAGE,
              requesterId: userData.userId,
            }).then((request) => {
              requestId = request.body.id;
            });

            cy.login(userData.username, userData.password, {
              path: TopMenu.requestsPath,
              waiter: Requests.waitLoading,
            });
          },
        );
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
    'C2362 Move request option is displayed on the request pane header (vega)',
    { tags: ['extendedPath', 'vega', 'C2362'] },
    () => {
      Requests.selectNotYetFilledRequest();
      Requests.findCreatedRequest(itemData.barcode);
      Requests.selectFirstRequest(itemData.instanceTitle);
      RequestDetail.waitLoading();

      RequestDetail.checkRequestInformation({
        status: 'Open - Not yet filled',
      });

      RequestDetail.openActions();
      RequestDetail.verifyMoveRequestButtonExists();
    },
  );

  it(
    'C2363 When move request is selected, select item is displayed (vega)',
    { tags: ['extendedPath', 'vega', 'C2363'] },
    () => {
      Requests.selectNotYetFilledRequest();
      Requests.findCreatedRequest(itemData.barcode);
      Requests.selectFirstRequest(itemData.instanceTitle);
      RequestDetail.waitLoading();

      RequestDetail.openActions();
      RequestDetail.openMoveRequest();

      MoveRequest.waitLoading();
      MoveRequest.verifySelectItemModal(itemData.instanceTitle);
    },
  );
});
