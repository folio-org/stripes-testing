import uuid from 'uuid';
import testTypes from '../../support/dictionary/testTypes';
import devTeams from '../../support/dictionary/devTeams';
import permissions from '../../support/dictionary/permissions';
import {
  FULFILMENT_PREFERENCES,
  ITEM_STATUS_NAMES,
  REQUEST_LEVELS,
  REQUEST_TYPES,
} from '../../support/constants';
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

describe('Title Level Request. Request Detail', () => {
  let addedCirculationRule;
  let originalCirculationRules;
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

    cy.createTempUser([permissions.requestsAll.gui], patronGroup.name).then((userProperties) => {
      userForTLR = userProperties;
      UserEdit.addServicePointViaApi(
        testData.userServicePoint.id,
        userForTLR.userId,
        testData.userServicePoint.id,
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
      cy.log(JSON.stringify(userProperties));
      userData = userProperties;
      UserEdit.addServicePointViaApi(
        testData.userServicePoint.id,
        userData.userId,
        testData.userServicePoint.id,
      );
      TitleLevelRequests.changeTitleLevelRequestsStatus('allow');
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

  afterEach('Reset filters', () => {
    Requests.resetAllFilters();
  });

  after('Deleting created entities', () => {
    cy.loginAsAdmin({
      path: SettingsMenu.circulationTitleLevelRequestsPath,
      waiter: TitleLevelRequests.waitLoading,
    });
    cy.wrap(requestIds).each((id) => {
      Requests.deleteRequestViaApi(id);
    });
    InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(testData.itemBarcode);
    RequestPolicy.deleteViaApi(requestPolicyBody.id);
    CirculationRules.deleteRuleViaApi(addedCirculationRule);
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
    TitleLevelRequests.changeTitleLevelRequestsStatus('forbid');
  });
  it(
    'C350415 Check that the user can see "Request Detail" for Item request (vega)',
    { tags: [testTypes.criticalPath, devTeams.vega] },
    () => {
      Requests.selectItemRequestLevel();
      Requests.findCreatedRequest(instanceData.title);
      Requests.selectFirstRequest(instanceData.title);
      RequestDetail.waitLoading();

      RequestDetail.checkTitleInformation({
        TLRs: '1',
        title: instanceData.title,
      });

      RequestDetail.checkItemInformation({
        itemBarcode: testData.itemBarcode,
        title: instanceData.title,
        effectiveLocation: testData.defaultLocation.name,
        itemStatus: ITEM_STATUS_NAMES.PAGED,
        requestsOnItem: '1',
      });

      RequestDetail.checkRequestInformation({
        type: REQUEST_TYPES.PAGE,
        status: 'Open',
        level: REQUEST_LEVELS.ITEM,
      });

      RequestDetail.checkRequesterInformation({
        lastName: userData.lastName,
        barcode: userData.barcode,
        group: patronGroup.name,
        preference: FULFILMENT_PREFERENCES.HOLD_SHELF,
        pickupSP: testData.userServicePoint.name,
      });
    },
  );

  it(
    'C350416 Check that the user can see "Request Detail" for Title request (vega)',
    { tags: [testTypes.criticalPath, devTeams.vega] },
    () => {
      Requests.selectTitleRequestLevel();
      Requests.findCreatedRequest(instanceData.title);
      Requests.selectFirstRequest(instanceData.title);
      RequestDetail.waitLoading();

      RequestDetail.checkTitleInformation({
        TLRs: '1',
        title: instanceData.title,
      });

      RequestDetail.checkItemInformation();

      RequestDetail.checkRequestInformation({
        type: REQUEST_TYPES.HOLD,
        status: 'Open',
        level: REQUEST_LEVELS.TITLE,
      });

      RequestDetail.checkRequesterInformation({
        lastName: userForTLR.lastName,
        barcode: userForTLR.barcode,
        group: patronGroup.name,
        preference: FULFILMENT_PREFERENCES.HOLD_SHELF,
        pickupSP: testData.userServicePoint.name,
      });
    },
  );
});
