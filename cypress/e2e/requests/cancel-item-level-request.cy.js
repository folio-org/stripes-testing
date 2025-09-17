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
import RequestDetail from '../../support/fragments/requests/requestDetail';
import Requests from '../../support/fragments/requests/requests';
import Location from '../../support/fragments/settings/tenant/locations/newLocation';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import TopMenu from '../../support/fragments/topMenu';
import UserEdit from '../../support/fragments/users/userEdit';
import Users from '../../support/fragments/users/users';
import generateItemBarcode from '../../support/utils/generateItemBarcode';
import getRandomPostfix from '../../support/utils/stringTools';

describe('Cancel item level request', () => {
  const userData = {};
  const servicePoint = ServicePoints.getDefaultServicePointWithPickUpLocation();
  const itemData = {
    barcode: generateItemBarcode(),
    instanceTitle: `AT_C358999_Instance_${getRandomPostfix()}`,
  };
  const patronComments = 'test comment';
  const cancellationReason = {
    id: uuid(),
    name: uuid(),
    description: 'description',
    publicDescription: 'publicDescription',
  };
  let defaultLocation;

  const requestData = {
    id: uuid(),
    requestType: REQUEST_TYPES.PAGE,
    requestLevel: REQUEST_LEVELS.ITEM,
    requestDate: new Date().toISOString(),
    fulfillmentPreference: FULFILMENT_PREFERENCES.HOLD_SHELF,
  };

  before('Prepare test data', () => {
    cy.getAdminToken()
      .then(() => {
        cy.addCancellationReasonApi(cancellationReason);

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
        requestData.holdingsRecordId = specialInstanceIds.holdingIds[0].id;
        requestData.itemId = specialInstanceIds.holdingIds[0].itemIds[0];
      })
      .then(() => {
        cy.createTempUser([Permissions.uiRequestsAll.gui])
          .then((userProperties) => {
            userData.username = userProperties.username;
            userData.password = userProperties.password;
            userData.userId = userProperties.userId;
            userData.barcode = userProperties.barcode;
            userData.firstName = userProperties.firstName;
            userData.patronGroup = userProperties.userGroup.group;
            userData.fullName = `${userData.username}, ${Users.defaultUser.personal.preferredFirstName} ${Users.defaultUser.personal.middleName}`;
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
          });
      });
  });

  beforeEach('Login', () => {
    cy.login(userData.username, userData.password, {
      path: TopMenu.requestsPath,
      waiter: Requests.waitLoading,
      authRefresh: true,
    });
  });

  after('Delete test data', () => {
    cy.getAdminToken();
    cy.deleteCancellationReasonApi(cancellationReason.id);

    Requests.deleteRequestViaApi(requestData.id);
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
  });

  it(
    'C358999 Check user is able to see all "Cancellation reasons" in dropdown (vega)',
    { tags: ['extendedPath', 'vega', 'C358999'] },
    () => {
      Requests.findCreatedRequest(itemData.barcode);
      Requests.selectTheFirstRequest();

      RequestDetail.openCancelRequestForm();
      RequestDetail.selectCancellationReason(cancellationReason.name);
      RequestDetail.clickOnBackButton();
    },
  );

  it(
    'C350562 Check that the user can Cancel request (Item level request) (vega)',
    { tags: ['extendedPath', 'vega', 'C350562'] },
    () => {
      Requests.findCreatedRequest(itemData.barcode);
      Requests.selectTheFirstRequest();

      RequestDetail.openCancelRequestForm();
      RequestDetail.selectCancellationReason('Other');
      RequestDetail.provideAdditionalInformationForCancelation('test info');
      RequestDetail.cancelRequest();

      RequestDetail.waitLoading('no staff');
      RequestDetail.checkTitleInformation({
        TLRs: '0',
        title: itemData.instanceTitle,
      });
      RequestDetail.checkItemInformation({
        itemBarcode: itemData.barcode,
        title: itemData.instanceTitle,
        effectiveLocation: defaultLocation.name,
        itemStatus: ITEM_STATUS_NAMES.PAGED,
        requestsOnItem: '1',
      });
      RequestDetail.checkRequestInformation({
        type: requestData.requestType,
        status: EditRequest.requestStatuses.CLOSED_CANCELLED,
        level: requestData.requestLevel,
        comments: requestData.patronComments,
      });
      RequestDetail.checkRequesterInformation({
        lastName: userData.fullName,
        barcode: userData.barcode,
        group: userData.patronGroup,
        preference: requestData.fulfillmentPreference,
        pickupSP: servicePoint.name,
      });
    },
  );
});
