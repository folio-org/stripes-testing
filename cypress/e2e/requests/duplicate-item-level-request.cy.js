import uuid from 'uuid';
import {
  FULFILMENT_PREFERENCES,
  ITEM_STATUS_NAMES,
  REQUEST_LEVELS,
  REQUEST_TYPES,
} from '../../support/constants';
import Permissions from '../../support/dictionary/permissions';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import EditRequest from '../../support/fragments/requests/edit-request';
import NewRequest from '../../support/fragments/requests/newRequest';
import RequestDetail from '../../support/fragments/requests/requestDetail';
import Requests from '../../support/fragments/requests/requests';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import TopMenu from '../../support/fragments/topMenu';
import UserEdit from '../../support/fragments/users/userEdit';
import Users from '../../support/fragments/users/users';
import generateItemBarcode from '../../support/utils/generateItemBarcode';
import getRandomPostfix from '../../support/utils/stringTools';

describe('Duplicate item level request', () => {
  const userData1 = {};
  const userData2 = {};
  const servicePoint1 = ServicePoints.getDefaultServicePointWithPickUpLocation();
  const servicePoint2 = ServicePoints.getDefaultServicePointWithPickUpLocation();
  const itemData = {
    barcode: generateItemBarcode(),
    instanceTitle: `AT_C350560_Instance_${getRandomPostfix()}`,
  };
  const patronComments = 'test comment';
  let cancellationReason;
  let requestId;

  const requestData = {
    id: uuid(),
    requestType: REQUEST_TYPES.PAGE,
    requestLevel: REQUEST_LEVELS.ITEM,
    requestDate: new Date().toISOString(),
    fulfillmentPreference: FULFILMENT_PREFERENCES.HOLD_SHELF,
  };

  before('Create preconditions', () => {
    cy.getAdminToken()
      .then(() => {
        ServicePoints.createViaApi(servicePoint1);
        ServicePoints.createViaApi(servicePoint2);
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
        cy.createTempUser([Permissions.uiRequestsAll.gui]).then((userProperties) => {
          userData1.username = userProperties.username;
          userData1.password = userProperties.password;
          userData1.userId = userProperties.userId;
          userData1.barcode = userProperties.barcode;
          userData1.firstName = userProperties.firstName;
          userData1.patronGroup = userProperties.patronGroup;
          userData1.fullName = `${userData1.username}, ${Users.defaultUser.personal.preferredFirstName} ${Users.defaultUser.personal.middleName}`;
        });

        cy.createTempUser([Permissions.uiRequestsAll.gui])
          .then((userProperties) => {
            userData2.username = userProperties.username;
            userData2.password = userProperties.password;
            userData2.userId = userProperties.userId;
            userData2.barcode = userProperties.barcode;
            userData2.firstName = userProperties.firstName;
            userData2.patronGroup = userProperties.patronGroup;
            userData2.fullName = `${userData2.username}, ${Users.defaultUser.personal.preferredFirstName} ${Users.defaultUser.personal.middleName}`;
          })
          .then(() => {
            cy.wrap(true)
              .then(() => {
                requestData.requesterId = userData1.userId;
                requestData.pickupServicePointId = servicePoint1.id;
                requestData.patronComments = patronComments;
              })
              .then(() => {
                cy.createItemRequestApi(requestData);
              });

            UserEdit.addServicePointsViaApi(
              [servicePoint1.id, servicePoint2.id],
              userData1.userId,
              servicePoint1.id,
            );

            cy.login(userData1.username, userData1.password, {
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
    Requests.deleteRequestViaApi(requestId);
    InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(itemData.barcode);
    UserEdit.changeServicePointPreferenceViaApi(userData1.userId, [servicePoint1.id]);
    Users.deleteViaApi(userData1.userId);
    Users.deleteViaApi(userData2.userId);
    ServicePoints.deleteViaApi(servicePoint1.id);
    ServicePoints.deleteViaApi(servicePoint2.id);
  });

  it(
    'C350560 C782 Check that the user can Duplicate request (Item level request) (vega)',
    { tags: ['extendedPath', 'vega', 'C350560'] },
    () => {
      Requests.selectNotYetFilledRequest();
      Requests.findCreatedRequest(itemData.barcode);
      Requests.selectTheFirstRequest();
      RequestDetail.openActions();
      RequestDetail.openDuplicateRequest();

      NewRequest.enterRequesterBarcode(userData2.barcode);
      NewRequest.verifyRequesterInformation(userData2.username, userData2.barcode);
      // Select "Recall" request type
      NewRequest.chooseRequestType(REQUEST_TYPES.HOLD);
      NewRequest.choosePickupServicePoint(servicePoint2.name);
      NewRequest.saveRequestAndClose();
      cy.wait('@createRequest').then((intercept) => {
        requestId = intercept.response.body.id;
        // Request is created
        cy.location('pathname').should('eq', `/requests/view/${requestId}`);
      });

      RequestDetail.waitLoading('no staff');
      RequestDetail.waitLoading('no staff');
      RequestDetail.checkTitleInformation({
        TLRs: '0',
        title: itemData.instanceTitle,
      });
      RequestDetail.checkItemInformation({
        itemBarcode: itemData.barcode,
        title: itemData.instanceTitle,
        effectiveLocation: Cypress.env('locations')[0].name,
        itemStatus: ITEM_STATUS_NAMES.PAGED,
        requestsOnItem: '2',
      });
      RequestDetail.checkRequestInformation({
        type: REQUEST_TYPES.HOLD,
        status: EditRequest.requestStatuses.NOT_YET_FILLED,
        level: requestData.requestLevel,
        comments: requestData.patronComments,
      });
      RequestDetail.checkRequesterInformation({
        lastName: userData2.fullName,
        barcode: userData2.barcode,
        group: userData2.patronGroup,
        preference: requestData.fulfillmentPreference,
        pickupSP: servicePoint2.name,
      });
    },
  );
});
