import uuid from 'uuid';
import {
  FULFILMENT_PREFERENCES,
  ITEM_STATUS_NAMES,
  REQUEST_LEVELS,
  REQUEST_TYPES,
} from '../../support/constants';
import permissions from '../../support/dictionary/permissions';
import CirculationRules from '../../support/fragments/circulation/circulation-rules';
import RequestPolicy from '../../support/fragments/circulation/request-policy';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import RequestDetail from '../../support/fragments/requests/requestDetail';
import Requests from '../../support/fragments/requests/requests';
import TitleLevelRequests from '../../support/fragments/settings/circulation/titleLevelRequests';
import Location from '../../support/fragments/settings/tenant/locations/newLocation';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import PatronGroups from '../../support/fragments/settings/users/patronGroups';
import TopMenu from '../../support/fragments/topMenu';
import UserEdit from '../../support/fragments/users/userEdit';
import Users from '../../support/fragments/users/users';
import ItemRecordView from '../../support/fragments/inventory/item/itemRecordView';
import InstanceRecordView from '../../support/fragments/inventory/instanceRecordView';
import UsersCard from '../../support/fragments/users/usersCard';
import generateItemBarcode from '../../support/utils/generateItemBarcode';
import getRandomPostfix from '../../support/utils/stringTools';

describe('Title Level Request. Request Detail', () => {
  let userData = {};
  let userForTLR = {};
  const requestIds = [];
  const patronGroup = {
    name: 'groupTLR' + getRandomPostfix(),
  };
  const instanceData = {
    title: `Instance ${getRandomPostfix()}`,
  };
  const testData = {
    userServicePoint: ServicePoints.getDefaultServicePointWithPickUpLocation(),
    itemBarcode: generateItemBarcode(),
  };
  const requestPolicyBody = {
    requestTypes: [REQUEST_TYPES.PAGE, REQUEST_TYPES.HOLD],
    name: `requestPolicy${getRandomPostfix()}`,
    id: uuid(),
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
        cy.getMaterialTypes({ limit: 1 }).then((materialTypes) => {
          testData.materialTypeId = materialTypes.id;
        });
      })
      .then(() => {
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
          items: [
            {
              barcode: testData.itemBarcode,
              status: { name: ITEM_STATUS_NAMES.AVAILABLE },
              permanentLoanType: { id: testData.loanTypeId },
              materialType: { id: testData.materialTypeId },
            },
          ],
        }).then((specialInstanceIds) => {
          instanceData.instanceId = specialInstanceIds.instanceId;
          instanceData.holdingId = specialInstanceIds.holdingIds[0].id;
          instanceData.itemId = specialInstanceIds.holdingIds[0].itemIds;
        });
      })
      .then(() => {
        RequestPolicy.createViaApi(requestPolicyBody);
        CirculationRules.addRuleViaApi(
          { t: testData.loanTypeId },
          { r: requestPolicyBody.id },
        ).then((newRule) => {
          testData.addedRule = newRule;
        });
      });

    PatronGroups.createViaApi(patronGroup.name).then((patronGroupResponse) => {
      patronGroup.id = patronGroupResponse;
    });
    cy.createTempUser([permissions.uiRequestsAll.gui], patronGroup.name).then((userProperties) => {
      userForTLR = userProperties;
      UserEdit.addServicePointViaApi(
        testData.userServicePoint.id,
        userForTLR.userId,
        testData.userServicePoint.id,
      );
    });

    cy.createTempUser(
      [permissions.uiRequestsAll.gui, permissions.inventoryAll.gui, permissions.uiUsersView.gui],
      patronGroup.name,
    ).then((userProperties) => {
      cy.log(JSON.stringify(userProperties));
      userData = userProperties;
      UserEdit.addServicePointViaApi(
        testData.userServicePoint.id,
        userData.userId,
        testData.userServicePoint.id,
      );
      TitleLevelRequests.enableTLRViaApi();
      Requests.createNewRequestViaApi({
        fulfillmentPreference: FULFILMENT_PREFERENCES.HOLD_SHELF,
        holdingsRecordId: testData.holdingTypeId,
        instanceId: instanceData.instanceId,
        item: { barcode: testData.itemBarcode },
        itemId: instanceData.itemId[0],
        pickupServicePointId: testData.userServicePoint.id,
        requestDate: new Date(),
        requestLevel: REQUEST_LEVELS.ITEM,
        requestType: REQUEST_TYPES.PAGE,
        requesterId: userData.userId,
      }).then((request) => {
        requestIds.push(request.body.id);
      });
      Requests.createNewRequestViaApi({
        fulfillmentPreference: FULFILMENT_PREFERENCES.HOLD_SHELF,
        instanceId: instanceData.instanceId,
        pickupServicePointId: testData.userServicePoint.id,
        requestDate: new Date(),
        requestLevel: REQUEST_LEVELS.TITLE,
        requestType: REQUEST_TYPES.HOLD,
        requesterId: userForTLR.userId,
      }).then((request) => {
        requestIds.push(request.body.id);
      });
      cy.login(userData.username, userData.password, {
        path: TopMenu.requestsPath,
        waiter: Requests.waitLoading,
      });
    });
  });

  after('Deleting created entities', () => {
    cy.getAdminToken();
    cy.wrap(requestIds).each((id) => {
      Requests.deleteRequestViaApi(id);
    });
    InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(testData.itemBarcode);
    RequestPolicy.deleteViaApi(requestPolicyBody.id);
    CirculationRules.deleteRuleViaApi(testData.addedRule);
    cy.deleteLoanType(testData.loanTypeId);
    UserEdit.changeServicePointPreferenceViaApi(userForTLR.userId, [testData.userServicePoint.id]);
    UserEdit.changeServicePointPreferenceViaApi(userData.userId, [testData.userServicePoint.id]);
    ServicePoints.deleteViaApi(testData.userServicePoint.id);
    Users.deleteViaApi(userForTLR.userId);
    Users.deleteViaApi(userData.userId);
    PatronGroups.deleteViaApi(patronGroup.id);
    Location.deleteViaApiIncludingInstitutionCampusLibrary(
      testData.defaultLocation.institutionId,
      testData.defaultLocation.campusId,
      testData.defaultLocation.libraryId,
      testData.defaultLocation.id,
    );
  });
  it(
    'C350424 Check that user is redirect to Item page, User page and Instance page (vega) (TaaS)',
    { tags: ['extendedPath', 'vega'] },
    () => {
      Requests.selectItemRequestLevel();
      Requests.findCreatedRequest(instanceData.title);
      Requests.selectFirstRequest(instanceData.title);
      RequestDetail.waitLoading();
      RequestDetail.openActions();
      RequestDetail.clickReorderQueue();
      RequestDetail.clickBarcodeTitle(testData.itemBarcode);
      cy.url().should('include', '/inventory/view');
      ItemRecordView.verifyItemBarcode(testData.itemBarcode);

      cy.go('back');
      Requests.clickInstanceDescription();
      InstanceRecordView.verifyInstancePaneExists();

      cy.go('back');
      RequestDetail.clickRequesterBarcode(userData.barcode);
      cy.url().should('include', '/users/view');
      UsersCard.verifyUserInformationPresence();
    },
  );
});
