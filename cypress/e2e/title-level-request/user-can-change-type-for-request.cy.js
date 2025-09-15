import uuid from 'uuid';
import { ITEM_STATUS_NAMES, REQUEST_TYPES } from '../../support/constants';
import permissions from '../../support/dictionary/permissions';
import CirculationRules from '../../support/fragments/circulation/circulation-rules';
import RequestPolicy from '../../support/fragments/circulation/request-policy';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import NewRequest from '../../support/fragments/requests/newRequest';
import RequestDetail from '../../support/fragments/requests/requestDetail';
import Requests from '../../support/fragments/requests/requests';
import RequestsSearchResultsPane from '../../support/fragments/requests/requestsSearchResultsPane';
import TitleLevelRequests from '../../support/fragments/settings/circulation/titleLevelRequests';
import Location from '../../support/fragments/settings/tenant/locations/newLocation';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import PatronGroups from '../../support/fragments/settings/users/patronGroups';
import TopMenu from '../../support/fragments/topMenu';
import UserEdit from '../../support/fragments/users/userEdit';
import Users from '../../support/fragments/users/users';
import generateItemBarcode from '../../support/utils/generateItemBarcode';
import getRandomPostfix from '../../support/utils/stringTools';

describe('Title Level Request. Request detail', () => {
  let instanceHRID;
  const unchecked = false;
  let requestId;
  const tlrCheckboxExists = true;
  let userData = {};
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
    requestTypes: [REQUEST_TYPES.PAGE, REQUEST_TYPES.HOLD, REQUEST_TYPES.RECALL],
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
        cy.getDefaultMaterialType().then((materialTypes) => {
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
          cy.wait(3000).then(() => {
            cy.getInstance({
              limit: 1,
              expandAll: true,
              query: `"id"=="${instanceData.instanceId}"`,
            }).then((instance) => {
              instanceHRID = instance.hrid;
            });
          });
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
    cy.createTempUser(
      [
        permissions.uiRequestsCreate.gui,
        permissions.uiRequestsView.gui,
        permissions.uiRequestsEdit.gui,
        permissions.uiRequestsAll.gui,
        permissions.uiNotesItemView.gui,
      ],
      patronGroup.name,
    ).then((userProperties) => {
      userData = userProperties;
      UserEdit.addServicePointViaApi(
        testData.userServicePoint.id,
        userData.userId,
        testData.userServicePoint.id,
      );
      TitleLevelRequests.enableTLRViaApi();
    });
  });

  beforeEach('login', () => {
    cy.waitForAuthRefresh(() => {
      cy.login(userData.username, userData.password, {
        path: TopMenu.requestsPath,
        waiter: RequestsSearchResultsPane.waitLoading,
      });
      cy.wait(2000);
    });
  });

  after('Deleting created entities', () => {
    cy.getAdminToken();
    CirculationRules.deleteRuleViaApi(testData.addedRule);
    InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(testData.itemBarcode);
    RequestPolicy.deleteViaApi(requestPolicyBody.id);
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

  afterEach('deleting request', () => {
    cy.getAdminToken();
    Requests.deleteRequestViaApi(requestId);
  });

  it(
    'C350385 Check that user can change type from "Item" level to "Title" and save the request (vega)',
    { tags: ['criticalPath', 'vega', 'C350385'] },
    () => {
      NewRequest.openNewRequestPane();
      NewRequest.waitLoadingNewRequestPage(tlrCheckboxExists);
      NewRequest.verifyTitleLevelRequestsCheckbox(unchecked);
      NewRequest.enterItemInfo(testData.itemBarcode);
      NewRequest.verifyItemInformation([
        testData.itemBarcode,
        instanceData.title,
        testData.defaultLocation.name,
        ITEM_STATUS_NAMES.AVAILABLE,
      ]);
      NewRequest.verifyRequestInformation(ITEM_STATUS_NAMES.AVAILABLE);
      NewRequest.enableTitleLevelRequest();
      NewRequest.verifyItemInformation(['0', instanceData.title]);
      NewRequest.enterRequesterInfoWithRequestType({
        requesterBarcode: userData.barcode,
        pickupServicePoint: testData.userServicePoint.name,
      });
      NewRequest.saveRequestAndClose();
      RequestDetail.waitLoading();
      cy.wait('@createRequest').then((intercept) => {
        requestId = intercept.response.body.id;
      });
    },
  );

  it(
    'C350386 Check that user can change type from "Title" level to "Item" and save the request (vega)',
    { tags: ['criticalPath', 'vega', 'C350386'] },
    () => {
      NewRequest.openNewRequestPane();
      NewRequest.waitLoadingNewRequestPage(tlrCheckboxExists);
      NewRequest.verifyTitleLevelRequestsCheckbox(unchecked);
      NewRequest.enterHridInfo(instanceHRID);
      NewRequest.verifyItemInformation(['0', instanceData.title]);
      NewRequest.enableTitleLevelRequest();

      NewRequest.chooseItemInSelectItemPane(testData.itemBarcode);
      NewRequest.verifyItemInformation([
        testData.itemBarcode,
        instanceData.title,
        testData.defaultLocation.name,
        ITEM_STATUS_NAMES.AVAILABLE,
      ]);
      NewRequest.verifyRequestInformation(ITEM_STATUS_NAMES.AVAILABLE);

      NewRequest.enterRequesterInfoWithRequestType({
        requesterBarcode: userData.barcode,
        pickupServicePoint: testData.userServicePoint.name,
      });
      NewRequest.saveRequestAndClose();
      RequestDetail.waitLoading();
      cy.wait('@createRequest').then((intercept) => {
        requestId = intercept.response.body.id;
      });
    },
  );
});
