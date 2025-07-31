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
import TitleLevelRequests from '../../support/fragments/settings/circulation/titleLevelRequests';
import Location from '../../support/fragments/settings/tenant/locations/newLocation';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import TopMenu from '../../support/fragments/topMenu';
import UserEdit from '../../support/fragments/users/userEdit';
import Users from '../../support/fragments/users/users';
import generateItemBarcode from '../../support/utils/generateItemBarcode';
import getRandomPostfix from '../../support/utils/stringTools';

describe('Title Level Request', () => {
  const userData1 = {};
  const userData2 = {};
  const servicePoint1 = ServicePoints.getDefaultServicePointWithPickUpLocation();
  const servicePoint2 = ServicePoints.getDefaultServicePointWithPickUpLocation();
  const itemData = {
    barcode: generateItemBarcode(),
    instanceTitle: `AT_C350561_Instance_${getRandomPostfix()}`,
  };
  const patronComments = 'test comment';
  let defaultLocation;
  let requestId1;
  let requestId2;

  const requestData = {
    id: uuid(),
    requestType: REQUEST_TYPES.PAGE,
    requestLevel: REQUEST_LEVELS.TITLE,
    requestDate: new Date().toISOString(),
    fulfillmentPreference: FULFILMENT_PREFERENCES.HOLD_SHELF,
  };

  before('Create preconditions', () => {
    cy.getAdminToken()
      .then(() => {
        TitleLevelRequests.enableTLRViaApi();
        ServicePoints.createViaApi(servicePoint1);
        ServicePoints.createViaApi(servicePoint2);
        defaultLocation = Location.getDefaultLocation(servicePoint1.id);
        Location.createViaApi(defaultLocation);
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
              permanentLocationId: defaultLocation.id,
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
                Requests.createNewRequestViaApi(requestData).then((createdRequest) => {
                  requestId1 = createdRequest.body.id;
                });
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
    Requests.deleteRequestViaApi(requestId1);
    Requests.deleteRequestViaApi(requestId2);
    InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(itemData.barcode);
    UserEdit.changeServicePointPreferenceViaApi(userData1.userId, [servicePoint1.id]);
    Users.deleteViaApi(userData1.userId);
    Users.deleteViaApi(userData2.userId);
    Location.deleteInstitutionCampusLibraryLocationViaApi(
      defaultLocation.institutionId,
      defaultLocation.campusId,
      defaultLocation.libraryId,
      defaultLocation.id,
    );
    ServicePoints.deleteViaApi(servicePoint1.id);
    ServicePoints.deleteViaApi(servicePoint2.id);
  });

  it(
    'C350561 Check that the user can Duplicate request (Title level request) (vega)',
    { tags: ['extendedPathFlaky', 'vega', 'C350561'] },
    () => {
      cy.visit(TopMenu.requestsPath);
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
        requestId2 = intercept.response.body.id;
        // Request is created
        cy.location('pathname').should('eq', `/requests/view/${requestId2}`);
      });

      RequestDetail.waitLoading('no staff');
      RequestDetail.checkTitleInformation({
        TLRs: '2',
        title: itemData.instanceTitle,
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
