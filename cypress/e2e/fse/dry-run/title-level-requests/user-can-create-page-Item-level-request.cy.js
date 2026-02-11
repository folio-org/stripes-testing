import uuid from 'uuid';
import { ITEM_STATUS_NAMES, LOCATION_IDS, REQUEST_TYPES } from '../../../../support/constants';
import permissions from '../../../../support/dictionary/permissions';
import CirculationRules from '../../../../support/fragments/circulation/circulation-rules';
import RequestPolicy from '../../../../support/fragments/circulation/request-policy';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import NewRequest from '../../../../support/fragments/requests/newRequest';
import Requests from '../../../../support/fragments/requests/requests';
import TitleLevelRequests from '../../../../support/fragments/settings/circulation/titleLevelRequests';
import ServicePoints from '../../../../support/fragments/settings/tenant/servicePoints/servicePoints';
import PatronGroups from '../../../../support/fragments/settings/users/patronGroups';
import TopMenu from '../../../../support/fragments/topMenu';
import UserEdit from '../../../../support/fragments/users/userEdit';
import Users from '../../../../support/fragments/users/users';
import generateItemBarcode from '../../../../support/utils/generateItemBarcode';
import getRandomPostfix from '../../../../support/utils/stringTools';
import { parseSanityParameters } from '../../../../support/utils/users';

describe('Create Item or Title level request', () => {
  const { user, memberTenant } = parseSanityParameters();
  let userData = {};
  const patronGroup = {
    name: 'groupToRenew' + getRandomPostfix(),
  };
  const instanceData = {
    title: `Instance ${getRandomPostfix()}`,
  };
  const testData = {
    itemBarcode: generateItemBarcode(),
  };
  const requestPolicyBody = {
    requestTypes: [REQUEST_TYPES.PAGE],
    name: `page${getRandomPostfix()}`,
    id: uuid(),
  };
  before('Preconditions', () => {
    cy.setTenant(memberTenant.id);
    cy.wrap(true).then(() => {
      cy.allure().logCommandSteps(false);
      cy.getUserToken(user.username, user.password);
      cy.allure().logCommandSteps();
    }).then(() => {
      ServicePoints.getCircDesk1ServicePointViaApi().then((servicePoint) => {
        testData.userServicePoint = servicePoint;
        testData.defaultLocationId = LOCATION_IDS.MAIN_LIBRARY;
      });
      cy.getInstanceTypes({ limit: 1 }).then((instanceTypes) => {
        testData.instanceTypeId = instanceTypes[0].id;
      });
      cy.getHoldingTypes({ limit: 1 }).then((holdingTypes) => {
        testData.holdingTypeId = holdingTypes[0].id;
      });
      cy.createLoanType({
        name: `type_C350422_${getRandomPostfix()}`,
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
              permanentLocationId: testData.defaultLocationId,
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
        permissions.uiUsersfeefinesCRUD.gui,
        permissions.uiUsersfeefinesView.gui,
        permissions.uiRequestsAll.gui,
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

      cy.allure().logCommandSteps(false);
      cy.login(user.username, user.password, {
        path: TopMenu.requestsPath,
        waiter: Requests.waitLoading,
        authRefresh: true,
      });
      cy.allure().logCommandSteps();
    });
  });

  after('Deleting created entities', () => {
    cy.getAdminToken();
    cy.get('@requestId').then((id) => {
      Requests.deleteRequestViaApi(id);
    });
    InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(testData.itemBarcode);
    RequestPolicy.deleteViaApi(requestPolicyBody.id);
    CirculationRules.deleteRuleViaApi(testData.addedRule);
    cy.deleteLoanType(testData.loanTypeId);
    UserEdit.changeServicePointPreferenceViaApi(userData.userId, [testData.userServicePoint.id]);
    Users.deleteViaApi(userData.userId);
    PatronGroups.deleteViaApi(patronGroup.id);
  });
  it(
    'C350422 Check that user can create "Page" Item level request (vega)',
    { tags: ['criticalPath', 'vega', 'shiftLeft', 'C350422'] },
    () => {
      NewRequest.openNewRequestPane();
      NewRequest.waitLoadingNewRequestPage(true);
      NewRequest.enterItemInfo('wrongBarcode');
      NewRequest.verifyErrorMessage('Item with this barcode does not exist');
      NewRequest.enterItemInfo(testData.itemBarcode);
      NewRequest.verifyItemInformation([testData.itemBarcode, instanceData.title]);
      NewRequest.verifyRequestInformation(ITEM_STATUS_NAMES.AVAILABLE);
      NewRequest.enterRequesterInfoWithRequestType({
        requesterBarcode: userData.barcode,
        pickupServicePoint: testData.userServicePoint.name,
      });
      NewRequest.saveRequestAndClose();
      NewRequest.waitLoading();
      cy.wait('@createRequest').then((intercept) => {
        cy.wrap(intercept.response.body.id).as('requestId');
      });
    },
  );
});
