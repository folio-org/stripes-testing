import {
  FULFILMENT_PREFERENCES,
  ITEM_STATUS_NAMES,
  REQUEST_LEVELS,
  REQUEST_TYPES,
} from '../../support/constants';
import permissions from '../../support/dictionary/permissions';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import MoveRequest from '../../support/fragments/requests/move-request';
import RequestDetail from '../../support/fragments/requests/requestDetail';
import Requests from '../../support/fragments/requests/requests';
import TitleLevelRequests from '../../support/fragments/settings/circulation/titleLevelRequests';
import Location from '../../support/fragments/settings/tenant/locations/newLocation';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import PatronGroups from '../../support/fragments/settings/users/patronGroups';
import TopMenu from '../../support/fragments/topMenu';
import UserEdit from '../../support/fragments/users/userEdit';
import Users from '../../support/fragments/users/users';
import generateUniqueItemBarcodeWithShift from '../../support/utils/generateUniqueItemBarcodeWithShift';
import getRandomPostfix, { getTestEntityValue } from '../../support/utils/stringTools';

describe('Title Level Request', () => {
  let userData = {};
  const patronGroup = {
    name: getTestEntityValue('groupTLR'),
  };
  const instanceData = {
    title: getTestEntityValue('InstanceTLR'),
  };
  const testData = {
    userServicePoint: ServicePoints.getDefaultServicePointWithPickUpLocation(),
  };

  before('Preconditions', () => {
    cy.getAdminToken()
      .then(() => {
        ServicePoints.createViaApi(testData.userServicePoint);
        testData.defaultLocation = Location.getDefaultLocation(testData.userServicePoint.id);
        Location.createViaApi(testData.defaultLocation);
        cy.getInstanceTypes({ limit: 1 }).then((instanceTypes) => {
          testData.instanceTypeId = instanceTypes[0].id;
        });
        cy.getHoldingTypes({ limit: 1 }).then((holdingTypes) => {
          testData.holdingTypeId = holdingTypes[0].id;
        });
        cy.createLoanType({
          name: `type_${getRandomPostfix()}`,
        }).then((loanType) => {
          testData.loanTypeId = loanType.id;
        });
        cy.getDefaultMaterialType().then((materialTypes) => {
          testData.materialTypeId = materialTypes.id;
        });
      })
      .then(() => {
        instanceData.itemsData = [
          {
            barcode: generateUniqueItemBarcodeWithShift(),
            status: { name: ITEM_STATUS_NAMES.AVAILABLE },
            permanentLoanType: { id: testData.loanTypeId },
            materialType: { id: testData.materialTypeId },
          },
          {
            barcode: generateUniqueItemBarcodeWithShift(),
            status: { name: ITEM_STATUS_NAMES.AVAILABLE },
            permanentLoanType: { id: testData.loanTypeId },
            materialType: { id: testData.materialTypeId },
          },
          {
            barcode: generateUniqueItemBarcodeWithShift(),
            status: { name: ITEM_STATUS_NAMES.AVAILABLE },
            permanentLoanType: { id: testData.loanTypeId },
            materialType: { id: testData.materialTypeId },
          },
        ];
        InventoryInstances.createFolioInstanceViaApi({
          instance: {
            instanceTypeId: testData.instanceTypeId,
            title: instanceData.title,
          },
          holdings: [
            {
              holdingsTypeId: testData.holdingTypeId,
              permanentLocationId: testData.defaultLocation.id,
            },
          ],
          items: instanceData.itemsData,
        }).then((specialInstanceIds) => {
          instanceData.instanceId = specialInstanceIds.instanceId;
          instanceData.holdingId = specialInstanceIds.holdingIds[0].id;
          instanceData.itemIds = specialInstanceIds.holdingIds[0].itemIds;
        });
        cy.wrap(instanceData.itemsData).as('itemsToMove');
      });
    PatronGroups.createViaApi(patronGroup.name).then((patronGroupResponse) => {
      patronGroup.id = patronGroupResponse;
    });

    cy.createTempUser([permissions.uiRequestsAll.gui], patronGroup.name)
      .then((userProperties) => {
        userData = userProperties;
        UserEdit.addServicePointViaApi(
          testData.userServicePoint.id,
          userData.userId,
          testData.userServicePoint.id,
        );
      })
      .then(() => {
        TitleLevelRequests.enableTLRViaApi();
        Requests.createNewRequestViaApi({
          fulfillmentPreference: FULFILMENT_PREFERENCES.HOLD_SHELF,
          instanceId: instanceData.instanceId,
          pickupServicePointId: testData.userServicePoint.id,
          requestDate: new Date(),
          requestLevel: REQUEST_LEVELS.TITLE,
          requestType: REQUEST_TYPES.PAGE,
          requesterId: userData.userId,
        }).then((request) => {
          testData.requestId = request.body.id;
          testData.currentItem = request.body.item.barcode;
        });
        cy.login(userData.username, userData.password);
      });
  });

  after('Deleting created entities', () => {
    cy.getAdminToken();
    Requests.deleteRequestViaApi(testData.requestId);
    InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(testData.currentItem);
    cy.deleteLoanType(testData.loanTypeId);
    UserEdit.changeServicePointPreferenceViaApi(userData.userId, [testData.userServicePoint.id]);
    ServicePoints.deleteViaApi(testData.userServicePoint.id);
    Users.deleteViaApi(userData.userId);
    PatronGroups.deleteViaApi(patronGroup.id);
    Location.deleteInstitutionCampusLibraryLocationViaApi(
      testData.defaultLocation.institutionId,
      testData.defaultLocation.campusId,
      testData.defaultLocation.libraryId,
      testData.defaultLocation.id,
    );
  });

  it(
    'C353980 Check that user can choose the item to which to move Title Level Request (vega)',
    { tags: ['criticalPathBroken', 'vega', 'C353980'] },
    () => {
      cy.get('@itemsToMove').each((item) => {
        if (item.barcode !== testData.currentItem) {
          cy.visit(TopMenu.requestsPath);
          Requests.waitLoading();
          Requests.findCreatedRequest(instanceData.title);
          Requests.selectFirstRequest(instanceData.title);
          RequestDetail.openActions();
          RequestDetail.openMoveRequest();
          MoveRequest.waitLoading();
          MoveRequest.chooseItem(item.barcode);
          MoveRequest.checkIsRequestMovedSuccessfully();
        }
      });
    },
  );
});
