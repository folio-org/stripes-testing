import uuid from 'uuid';
import {
  FULFILMENT_PREFERENCES,
  ITEM_STATUS_NAMES,
  REQUEST_LEVELS,
  REQUEST_TYPES,
  LOCATION_IDS,
} from '../../support/constants';
import permissions from '../../support/dictionary/permissions';
import CirculationRules from '../../support/fragments/circulation/circulation-rules';
import RequestPolicy from '../../support/fragments/circulation/request-policy';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import RequestDetail from '../../support/fragments/requests/requestDetail';
import Requests from '../../support/fragments/requests/requests';
import TitleLevelRequests from '../../support/fragments/settings/circulation/titleLevelRequests';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import PatronGroups from '../../support/fragments/settings/users/patronGroups';
import TopMenu from '../../support/fragments/topMenu';
import UserEdit from '../../support/fragments/users/userEdit';
import Users from '../../support/fragments/users/users';
import generateItemBarcode from '../../support/utils/generateItemBarcode';
import getRandomPostfix from '../../support/utils/stringTools';

describe('Request Detail.TLR', () => {
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
    itemBarcode: generateItemBarcode(),
  };
  let userServicePoint;
  const requestPolicyBody = {
    requestTypes: [REQUEST_TYPES.PAGE, REQUEST_TYPES.HOLD],
    name: `requestPolicy${getRandomPostfix()}`,
    id: uuid(),
  };

  before('Preconditions', () => {
    cy.getAdminToken()
      .then(() => {
        ServicePoints.getCircDesk1ServicePointViaApi().then((sp) => {
          userServicePoint = sp;
        });
        cy.getInstanceTypes({ limit: 1 }).then((instanceTypes) => {
          testData.instanceTypeId = instanceTypes[0].id;
        });
        cy.getHoldingTypes({ limit: 1 }).then((holdingTypes) => {
          testData.holdingTypeId = holdingTypes[0].id;
        });
        cy.createLoanType({
          name: `type_C350563_${getRandomPostfix()}`,
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
              permanentLocationId: LOCATION_IDS.MAIN_LIBRARY,
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
      UserEdit.addServicePointViaApi(userServicePoint.id, userForTLR.userId, userServicePoint.id);
    });

    cy.createTempUser(
      [
        permissions.uiRequestsView.gui,
        permissions.uiRequestsCreate.gui,
        permissions.uiRequestsAll.gui,
        permissions.uiRequestsEdit.gui,
        permissions.uiMoveRequest.gui,
        permissions.uiRequestsReorderQueue.gui,
      ],
      patronGroup.name,
    ).then((userProperties) => {
      userData = userProperties;
      UserEdit.addServicePointViaApi(userServicePoint.id, userData.userId, userServicePoint.id);
      TitleLevelRequests.enableTLRViaApi();
      Requests.createNewRequestViaApi({
        fulfillmentPreference: FULFILMENT_PREFERENCES.HOLD_SHELF,
        holdingsRecordId: testData.holdingTypeId,
        instanceId: instanceData.instanceId,
        item: { barcode: testData.itemBarcode },
        itemId: instanceData.itemId[0],
        pickupServicePointId: userServicePoint.id,
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
        pickupServicePointId: userServicePoint.id,
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
        authRefresh: true,
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
    Users.deleteViaApi(userForTLR.userId);
    Users.deleteViaApi(userData.userId);
    PatronGroups.deleteViaApi(patronGroup.id);
  });

  it(
    'C350563 Check that the user can click on the "Reorder queue" option (vega) (TaaS)',
    { tags: ['extendedPath', 'vega', 'C350563'] },
    () => {
      Requests.selectItemRequestLevel();
      Requests.findCreatedRequest(instanceData.title);
      Requests.selectFirstRequest(instanceData.title);
      RequestDetail.waitLoading();
      RequestDetail.openActions();
      RequestDetail.verifyActionButtonsPresence();
      RequestDetail.clickReorderQueue();
      RequestDetail.verifyQueueInstance(instanceData.title);
      RequestDetail.verifyAccordionsPresence();
      RequestDetail.verifyRequestQueueColumnsPresence(true, false);
      Requests.closeRequestQueue();
      RequestDetail.verifyAccordionsPresence(false);
    },
  );
});
