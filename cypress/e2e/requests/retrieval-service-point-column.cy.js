import uuid from 'uuid';
import {
  APPLICATION_NAMES,
  FULFILMENT_PREFERENCES,
  ITEM_STATUS_NAMES,
  REQUEST_LEVELS,
  REQUEST_TYPES,
} from '../../support/constants';
import Permissions from '../../support/dictionary/permissions';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import EditRequest from '../../support/fragments/requests/edit-request';
import Requests from '../../support/fragments/requests/requests';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import TopMenu from '../../support/fragments/topMenu';
import TopMenuNavigation from '../../support/fragments/topMenuNavigation';
import UserEdit from '../../support/fragments/users/userEdit';
import Users from '../../support/fragments/users/users';
import UsersSearchPane from '../../support/fragments/users/usersSearchPane';
import generateItemBarcode from '../../support/utils/generateItemBarcode';
import getRandomPostfix from '../../support/utils/stringTools';

describe('Retrieval service point', () => {
  let userData = {};
  const servicePoint = ServicePoints.getDefaultServicePointWithPickUpLocation();
  const itemData = {
    barcode: generateItemBarcode(),
    instanceTitle: `AT_C627236_Instance_${getRandomPostfix()}`,
  };
  const patronComments = 'test comment';
  let cancellationReason;

  const requestData = {
    id: uuid(),
    requestType: REQUEST_TYPES.PAGE,
    requestLevel: REQUEST_LEVELS.ITEM,
    requestDate: new Date().toISOString(),
    fulfillmentPreference: FULFILMENT_PREFERENCES.HOLD_SHELF,
  };

  before('Create test data', () => {
    cy.getAdminToken()
      .then(() => {
        ServicePoints.createViaApi(servicePoint);
        cy.getLocations({ limit: 2 });
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
          itemData.materialTypeName = res.name;
        });
        cy.getCancellationReasonsApi({ limit: 1 }).then((cancellationReasons) => {
          cancellationReason = cancellationReasons[0].id;
        });
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
              permanentLocationId: Cypress.env('locations')[0].id,
            },
          ],
          items: [
            {
              barcode: itemData.barcode,
              status: { name: ITEM_STATUS_NAMES.AVAILABLE },
              permanentLoanType: { id: itemData.loanTypeId },
              materialType: { id: itemData.materialTypeId },
            },
          ],
        });
      })
      .then((specialInstanceIds) => {
        itemData.testInstanceIds = specialInstanceIds;
        requestData.instanceId = specialInstanceIds.instanceId;
        requestData.holdingsRecordId = specialInstanceIds.holdingIds[0].id;
        requestData.itemId = specialInstanceIds.holdingIds[0].itemIds[0];
      })
      .then(() => {
        cy.createTempUser([Permissions.uiRequestsView.gui, Permissions.uiUsersView.gui])
          .then((userProperties) => {
            userData = userProperties;
          })
          .then(() => {
            cy.wrap(true)
              .then(() => {
                requestData.requesterId = userData.userId;
                requestData.pickupServicePointId = servicePoint.id;
                requestData.patronComments = patronComments;
              })
              .then(() => {
                cy.createItemRequestApi(requestData);
              });

            UserEdit.addServicePointsViaApi([servicePoint.id], userData.userId, servicePoint.id);

            cy.login(userData.username, userData.password, {
              path: TopMenu.requestsPath,
              waiter: Requests.waitLoading,
            });
          });
      });
  });

  after('Delete test data', () => {
    cy.getAdminToken();
    EditRequest.updateRequestApi({
      ...requestData,
      status: 'Closed - Cancelled',
      cancelledByUserId: requestData.requesterId,
      cancellationReasonId: cancellationReason,
      cancelledDate: new Date().toISOString(),
    });
    Requests.deleteRequestViaApi(requestData.id);
    InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(itemData.barcode);
    UserEdit.changeServicePointPreferenceViaApi(userData.userId, [servicePoint.id]);
    Users.deleteViaApi(userData.userId);
    ServicePoints.deleteViaApi(servicePoint.id);
  });

  it(
    'C627236 Adding and hiding "Retrieval service point" column in "Requests" app (volaris)',
    { tags: ['criticalPath', 'volaris', 'C627236'] },
    () => {
      Requests.findCreatedRequest(itemData.barcode);

      Requests.selectPickupServicePointColumn(true);
      TopMenuNavigation.navigateToApp(APPLICATION_NAMES.USERS);
      UsersSearchPane.waitLoading();
      TopMenuNavigation.navigateToApp(APPLICATION_NAMES.REQUESTS);
      Requests.waitLoading();
      Requests.verifyPickupServicePointColumnIsPresent(true);
      Requests.verifyPickupServicePoint(servicePoint.name, true);

      Requests.selectPickupServicePointColumn(false);
      TopMenuNavigation.navigateToApp(APPLICATION_NAMES.USERS);
      UsersSearchPane.waitLoading();
      TopMenuNavigation.navigateToApp(APPLICATION_NAMES.REQUESTS);
      Requests.waitLoading();
      Requests.verifyPickupServicePointColumnIsPresent(false);
      Requests.verifyPickupServicePoint(servicePoint.name, false);
    },
  );
});
