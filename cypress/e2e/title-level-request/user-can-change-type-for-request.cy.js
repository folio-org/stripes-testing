import uuid from 'uuid';
import testTypes from '../../support/dictionary/testTypes';
import devTeams from '../../support/dictionary/devTeams';
import permissions from '../../support/dictionary/permissions';
import { ITEM_STATUS_NAMES, REQUEST_TYPES } from '../../support/constants';
import UserEdit from '../../support/fragments/users/userEdit';
import TopMenu from '../../support/fragments/topMenu';
import generateItemBarcode from '../../support/utils/generateItemBarcode';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import PatronGroups from '../../support/fragments/settings/users/patronGroups';
import Location from '../../support/fragments/settings/tenant/locations/newLocation';
import Users from '../../support/fragments/users/users';
import CirculationRules from '../../support/fragments/circulation/circulation-rules';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import getRandomPostfix from '../../support/utils/stringTools';
import RequestPolicy from '../../support/fragments/circulation/request-policy';
import SettingsMenu from '../../support/fragments/settingsMenu';
import TitleLevelRequests from '../../support/fragments/settings/circulation/titleLevelRequests';
import Requests from '../../support/fragments/requests/requests';
import RequestDetail from '../../support/fragments/requests/requestDetail';
import RequestsSearchResultsPane from '../../support/fragments/requests/requestsSearchResultsPane';
import NewRequest from '../../support/fragments/requests/newRequest';

describe('Title Level Request. Request Detail', () => {
  let instanceHRID;
  const unchecked = false;
  let requestId;
  const tlrCheckboxExists = true;
  let addedCirculationRule;
  let originalCirculationRules;
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
        cy.loginAsAdmin({
          path: SettingsMenu.circulationTitleLevelRequestsPath,
          waiter: TitleLevelRequests.waitLoading,
        });
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
          cy.getInstance({
            limit: 1,
            expandAll: true,
            query: `"id"=="${instanceData.instanceId}"`,
          }).then((instance) => {
            instanceHRID = instance.hrid;
          });
        });
      });
    PatronGroups.createViaApi(patronGroup.name).then((patronGroupResponse) => {
      patronGroup.id = patronGroupResponse;
    });
    RequestPolicy.createViaApi(requestPolicyBody);
    CirculationRules.getViaApi().then((circulationRule) => {
      originalCirculationRules = circulationRule.rulesAsText;
      const ruleProps = CirculationRules.getRuleProps(circulationRule.rulesAsText);
      ruleProps.r = requestPolicyBody.id;
      addedCirculationRule =
        't ' +
        testData.loanTypeId +
        ': i ' +
        ruleProps.i +
        ' l ' +
        ruleProps.l +
        ' r ' +
        ruleProps.r +
        ' o ' +
        ruleProps.o +
        ' n ' +
        ruleProps.n;
      CirculationRules.addRuleViaApi(
        originalCirculationRules,
        ruleProps,
        't ',
        testData.loanTypeId,
      );
    });

    cy.createTempUser(
      [
        permissions.uiRequestsCreate.gui,
        permissions.uiRequestsView.gui,
        permissions.uiRequestsEdit.gui,
        permissions.requestsAll.gui,
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
      TitleLevelRequests.changeTitleLevelRequestsStatus('allow');
    });
  });

  beforeEach('login', () => {
    cy.login(userData.username, userData.password, {
      path: TopMenu.requestsPath,
      waiter: RequestsSearchResultsPane.waitLoading,
    });
    cy.intercept('POST', 'circulation/requests').as('createRequest');
  });

  after('Deleting created entities', () => {
    CirculationRules.deleteRuleViaApi(addedCirculationRule);
    cy.loginAsAdmin({
      path: SettingsMenu.circulationTitleLevelRequestsPath,
      waiter: TitleLevelRequests.waitLoading,
    });
    InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(testData.itemBarcode);
    RequestPolicy.deleteViaApi(requestPolicyBody.id);
    cy.deleteLoanType(testData.loanTypeId);
    UserEdit.changeServicePointPreferenceViaApi(userData.userId, [testData.userServicePoint.id]);
    ServicePoints.deleteViaApi(testData.userServicePoint.id);
    Users.deleteViaApi(userData.userId);
    PatronGroups.deleteViaApi(patronGroup.id);
    Location.deleteViaApiIncludingInstitutionCampusLibrary(
      testData.defaultLocation.institutionId,
      testData.defaultLocation.campusId,
      testData.defaultLocation.libraryId,
      testData.defaultLocation.id,
    );
    TitleLevelRequests.changeTitleLevelRequestsStatus('forbid');
  });

  afterEach('deleting request', () => {
    Requests.deleteRequestViaApi(requestId);
  });

  it(
    'C350385 Check that user can change type from "Item" level to "Title" and save the request (vega)',
    { tags: [testTypes.criticalPath, devTeams.vega] },
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
    { tags: [testTypes.criticalPath, devTeams.vega] },
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
