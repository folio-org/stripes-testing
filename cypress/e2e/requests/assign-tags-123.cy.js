import uuid from 'uuid';
import {
  FULFILMENT_PREFERENCES,
  ITEM_STATUS_NAMES,
  REQUEST_LEVELS,
  REQUEST_TYPES,
} from '../../support/constants';
import Requests from '../../support/fragments/requests/requests';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import generateItemBarcode from '../../support/utils/generateItemBarcode';
import getRandomPostfix from '../../support/utils/stringTools';
import Permissions from '../../support/dictionary/permissions';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import Location from '../../support/fragments/settings/tenant/locations/newLocation';
import UserEdit from '../../support/fragments/users/userEdit';
import InteractorsTools from '../../support/utils/interactorsTools';

describe('ui-requests: Assign Tags to Request', () => {
  const tag = `autotest_tag${getRandomPostfix()}[`;
  const userData = {};
  const servicePoint = ServicePoints.getDefaultServicePointWithPickUpLocation();
  const itemData = {
    barcode: generateItemBarcode(),
    instanceTitle: `Instance ${getRandomPostfix()}`,
  };
  const patronComments = 'test comment';
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
        cy.getMaterialTypes({ limit: 1 }).then((res) => {
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
        cy.createTempUser([Permissions.requestsAll.gui])
          .then((userProperties) => {
            userData.username = userProperties.username;
            userData.password = userProperties.password;
            userData.userId = userProperties.userId;
            userData.barcode = userProperties.barcode;
            userData.firstName = userProperties.firstName;
            userData.patronGroup = userProperties.patronGroup;
            userData.fullName = `${userData.username}, ${Users.defaultUser.personal.firstName} ${Users.defaultUser.personal.middleName}`;
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

            cy.login(userData.username, userData.password);
          });
      });
  });

  after('Delete test data', () => {
    cy.getAdminToken();
    Requests.deleteRequestViaApi(requestData.id);
    InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(itemData.barcode);
    UserEdit.changeServicePointPreferenceViaApi(userData.userId, [servicePoint.id]);
    Users.deleteViaApi(userData.userId);
    Location.deleteViaApiIncludingInstitutionCampusLibrary(
      defaultLocation.institutionId,
      defaultLocation.campusId,
      defaultLocation.libraryId,
      defaultLocation.id,
    );
    ServicePoints.deleteViaApi(servicePoint.id);
  });

  it(
    'C374173 Verify filtering Requests by Tags with one special symbol (vega) (TaaS)',
    { tags: ['extended', 'vega'] },
    () => {
      cy.visit(TopMenu.requestsPath);
      Requests.selectNotYetFilledRequest();
      Requests.findCreatedRequest(itemData.instanceTitle);
      Requests.selectFirstRequest(itemData.instanceTitle);
      Requests.openTagsPane();
      Requests.addNewTag(tag);
      cy.wait(5000);
      InteractorsTools.checkCalloutMessage('New tag created');

      // JobProfileView.verifyAssignedTags(newTag, 2);

      //     JobProfileView.removeTag(tag);
      //     JobProfileView.verifyAssignedTagsIsAbsent(tag);

      // Requests.closePane('Tags');
      // Requests.closePane('Request Detail');
      // Requests.findCreatedRequest(itemData.instanceTitle);
      // Requests.selectFirstRequest(itemData.instanceTitle);
      // Requests.openTagsPane();
      // Requests.verifyAssignedTags(tag);
      // // cancel request for verifying tags can't be added or removed from a closed request
      // Requests.cancelRequest();
      // Requests.resetAllFilters();
      // Requests.selectClosedCancelledRequest();
      // Requests.findCreatedRequest(itemData.instanceTitle);
      // Requests.selectFirstRequest(itemData.instanceTitle);
      // Requests.verifyShowTagsButtonIsDisabled();
    },
  );
});
