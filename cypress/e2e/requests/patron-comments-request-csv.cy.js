import uuid from 'uuid';
import {
  FULFILMENT_PREFERENCES,
  ITEM_STATUS_NAMES,
  REQUEST_LEVELS,
  REQUEST_TYPES,
} from '../../support/constants';
import Permissions from '../../support/dictionary/permissions';
import CheckInActions from '../../support/fragments/check-in-actions/checkInActions';
import AwaitingPickupForARequest from '../../support/fragments/checkin/modals/awaitingPickupForARequest';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import EditRequest from '../../support/fragments/requests/edit-request';
import Requests from '../../support/fragments/requests/requests';
import Location from '../../support/fragments/settings/tenant/locations/newLocation';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import TopMenu from '../../support/fragments/topMenu';
import UserEdit from '../../support/fragments/users/userEdit';
import Users from '../../support/fragments/users/users';
import generateItemBarcode from '../../support/utils/generateItemBarcode';
import getRandomPostfix from '../../support/utils/stringTools';

describe('Requests Export CSV File', () => {
  const patronComment = 'patron test comment';
  const fileName = 'export.csv';

  const userData = {};
  const servicePoint = ServicePoints.getDefaultServicePointWithPickUpLocation();
  const itemData = {
    barcode: generateItemBarcode(),
    instanceTitle: `AT_C199705_Instance_${getRandomPostfix()}`,
  };
  let defaultLocation;
  let cancellationReason;

  const requestData = {
    id: uuid(),
    requestType: REQUEST_TYPES.PAGE,
    requesterId: null,
    requestLevel: REQUEST_LEVELS.ITEM,
    requestDate: new Date().toISOString(),
    fulfillmentPreference: FULFILMENT_PREFERENCES.HOLD_SHELF,
    pickupServicePointId: null,
  };

  before('Create New Item and New User', () => {
    cy.getAdminToken()
      .then(() => {
        ServicePoints.createViaApi(servicePoint);
        defaultLocation = Location.getDefaultLocation(servicePoint.id);
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
        requestData.instanceId = specialInstanceIds.id;
        requestData.holdingsRecordId = specialInstanceIds.holdingIds[0].id;
        requestData.itemId = specialInstanceIds.holdingIds[0].itemIds[0];
      })
      .then(() => {
        cy.createTempUser([Permissions.uiRequestsAll.gui, Permissions.checkinAll.gui])
          .then((userProperties) => {
            userData.username = userProperties.username;
            userData.password = userProperties.password;
            userData.userId = userProperties.userId;
            userData.barcode = userProperties.barcode;
            userData.firstName = userProperties.firstName;
          })
          .then(() => {
            cy.wrap(true)
              .then(() => {
                requestData.instanceId = itemData.testInstanceIds.instanceId;
                requestData.holdingsRecordId = itemData.testInstanceIds.holdingIds[0].id;
                requestData.itemId = itemData.testInstanceIds.holdingIds[0].itemIds[0];
                requestData.requesterId = userData.userId;
                requestData.pickupServicePointId = servicePoint.id;
                requestData.patronComments = patronComment;
              })
              .then(() => {
                cy.createItemRequestApi(requestData);
              });

            UserEdit.addServicePointViaApi(servicePoint.id, userData.userId, servicePoint.id);

            cy.login(userData.username, userData.password);
          });
      });
  });

  after('Delete New Service point, Item and User', () => {
    cy.getAdminToken();
    EditRequest.updateRequestApi({
      ...requestData,
      status: 'Closed - Cancelled',
      cancelledByUserId: requestData.requesterId,
      cancellationReasonId: cancellationReason,
      cancelledDate: new Date().toISOString(),
    });
    InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(itemData.barcode);
    UserEdit.changeServicePointPreferenceViaApi(userData.userId, [servicePoint.id]);
    Users.deleteViaApi(userData.userId);
    Location.deleteInstitutionCampusLibraryLocationViaApi(
      defaultLocation.institutionId,
      defaultLocation.campusId,
      defaultLocation.libraryId,
      defaultLocation.id,
    );
    ServicePoints.deleteViaApi(servicePoint.id);
    Requests.deleteDownloadedFile(fileName);
  });

  it(
    'C199705 Patron Comments are Displayed in Requests Export CSV File (vega)',
    { tags: ['criticalPath', 'vega', 'C199705'] },
    () => {
      cy.visit(TopMenu.requestsPath);
      Requests.selectNotYetFilledRequest();
      Requests.findCreatedRequest(itemData.barcode);
      Requests.exportRequestToCsv();
      Requests.checkCellInCsvFileContainsValue(fileName, 1, 32, patronComment);
    },
  );

  it(
    'C199708 Patron Comments are Displayed in the "Awaiting pickup for a request" Modal at Check In (vega)',
    { tags: ['criticalPath', 'vega', 'C199708'] },
    () => {
      cy.visit(TopMenu.checkInPath);
      CheckInActions.checkInItemGui(itemData.barcode);
      AwaitingPickupForARequest.checkPatronComments(patronComment);
      AwaitingPickupForARequest.unselectCheckboxPrintSlip();
      AwaitingPickupForARequest.closeModal();
    },
  );
});
