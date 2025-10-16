import {
  FULFILMENT_PREFERENCES,
  ITEM_STATUS_NAMES,
  REQUEST_LEVELS,
  REQUEST_TYPES,
} from '../../support/constants';
import { Permissions } from '../../support/dictionary';
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

describe('Check that user can Duplicate Title level request if request closed', () => {
  let userData = {};
  let servicePoint;
  const itemData = {
    barcode: generateItemBarcode(),
    instanceTitle: `AT_C350528_Instance_${getRandomPostfix()}`,
  };
  let defaultLocation;
  let instanceData;
  let titleLevelRequestId;
  let duplicateRequestId;

  before('Create test data', () => {
    cy.getAdminToken()
      .then(() => {
        TitleLevelRequests.enableTLRViaApi();
        ServicePoints.getCircDesk1ServicePointViaApi();
      })
      .then((sp) => {
        servicePoint = sp;
        itemData.servicePointId = servicePoint.id;
        defaultLocation = Location.getDefaultLocation(servicePoint.id);
        Location.createViaApi(defaultLocation);
      })
      .then((location) => {
        defaultLocation = location;
        cy.getInstanceTypes({ limit: 1 });
      })
      .then((instanceTypes) => {
        itemData.instanceTypeId = instanceTypes[0].id;
        cy.getHoldingTypes({ limit: 1 });
      })
      .then((holdingTypes) => {
        itemData.holdingTypeId = holdingTypes[0].id;
        cy.getLoanTypes({ limit: 1 });
      })
      .then((loanTypes) => {
        itemData.loanTypeId = loanTypes[0].id;
        cy.getDefaultMaterialType();
      })
      .then((materialType) => {
        itemData.materialTypeId = materialType.id;
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
        instanceData = specialInstanceIds;
      });

    cy.createTempUser([
      Permissions.uiRequestsView.gui,
      Permissions.uiRequestsCreate.gui,
      Permissions.uiRequestsAll.gui,
      Permissions.uiRequestsEdit.gui,
    ])
      .then((userProperties) => {
        userData = userProperties;
        UserEdit.addServicePointViaApi(servicePoint.id, userData.userId, servicePoint.id);
      })
      .then(() => {
        Requests.createNewRequestViaApi({
          fulfillmentPreference: FULFILMENT_PREFERENCES.HOLD_SHELF,
          instanceId: instanceData.instanceId,
          pickupServicePointId: servicePoint.id,
          requestDate: new Date(),
          requestLevel: REQUEST_LEVELS.TITLE,
          requestType: REQUEST_TYPES.PAGE,
          requesterId: userData.userId,
        }).then((request) => {
          titleLevelRequestId = request.body.id;

          cy.getCancellationReasonsApi({ limit: 1 }).then((cancellationReasons) => {
            const cancellationReasonId = cancellationReasons[0].id;
            const requestToUpdate = {
              ...request.body,
              status: 'Closed - Cancelled',
              cancelledByUserId: userData.userId,
              cancellationReasonId,
              cancelledDate: new Date().toISOString(),
            };
            EditRequest.updateRequestApi(requestToUpdate);
          });
        });
      })
      .then(() => {
        cy.login(userData.username, userData.password, {
          path: TopMenu.requestsPath,
          waiter: Requests.waitLoading,
        });
      });
  });

  after('Delete test data', () => {
    cy.getAdminToken();
    Requests.deleteRequestViaApi(duplicateRequestId);
    Requests.deleteRequestViaApi(titleLevelRequestId);
    Users.deleteViaApi(userData.userId);
    InventoryInstances.deleteInstanceViaApi({
      instance: instanceData,
      servicePoint,
      shouldCheckIn: true,
    });
    Location.deleteInstitutionCampusLibraryLocationViaApi(
      defaultLocation.institutionId,
      defaultLocation.campusId,
      defaultLocation.libraryId,
      defaultLocation.id,
    );
  });

  it(
    'C350528 Check that user can Duplicate Title level request if request closed (vega)',
    { tags: ['extendedPath', 'vega', 'C350528'] },
    () => {
      // Navigate to closed request detail page
      Requests.selectClosedCancelledRequest();
      Requests.findCreatedRequest(userData.barcode);
      Requests.selectFirstRequest(itemData.instanceTitle);
      RequestDetail.waitLoading();

      // Verify request is closed
      RequestDetail.checkRequestStatus('Closed - Cancelled');

      // Verify Actions options opened with Duplicate option
      RequestDetail.verifyActionsAvailableOptions(['Duplicate']);
      RequestDetail.openActions();
      RequestDetail.openDuplicateRequest();

      // Verify redirect to "New request" with pre-filled information
      NewRequest.waitLoadingNewRequestPage();
      NewRequest.verifyTitleLevelRequestsCheckbox(true);
      NewRequest.verifyRequesterInformation(userData.username, userData.barcode);

      // Select "Request type" and "Pickup service point"
      NewRequest.chooseRequestType(REQUEST_TYPES.PAGE);
      NewRequest.choosePickupServicePoint(servicePoint.name);

      // Click on the "Save&close" button
      cy.intercept('POST', '/circulation/requests').as('createRequest');
      NewRequest.saveRequestAndClose();

      cy.wait('@createRequest').then((intercept) => {
        duplicateRequestId = intercept.response.body.id;
        cy.location('pathname').should('eq', `/requests/view/${duplicateRequestId}`);
      });

      // Verify new request details
      RequestDetail.waitLoading();
      RequestDetail.checkTitleInformation({
        TLRs: '1',
        title: itemData.instanceTitle,
      });
      RequestDetail.checkRequestInformation({
        type: REQUEST_TYPES.PAGE,
        status: EditRequest.requestStatuses.NOT_YET_FILLED,
        level: REQUEST_LEVELS.TITLE,
      });
    },
  );
});
