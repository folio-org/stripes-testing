import uuid from 'uuid';
import moment from 'moment';
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
import NewRequest from '../../support/fragments/requests/newRequest';
import RequestPolicy from '../../support/fragments/circulation/request-policy';
import SettingsMenu from '../../support/fragments/settingsMenu';
import TitleLevelRequests from '../../support/fragments/settings/circulation/titleLevelRequests';
import Requests from '../../support/fragments/requests/requests';
import Checkout from '../../support/fragments/checkout/checkout';
import CheckInActions from '../../support/fragments/check-in-actions/checkInActions';

describe('Create Item or Title level request', () => {
  let addedCirculationRule;
  let originalCirculationRules;
  let userData = {};
  let userForHold = {};
  const patronGroup = {
    name: 'groupToTLR' + getRandomPostfix(),
  };
  const instanceData = {
    title: `Instance ${getRandomPostfix()}`,
  };
  const testData = {
    userServicePoint: ServicePoints.getDefaultServicePointWithPickUpLocation(),
    itemBarcode: generateItemBarcode(),
  };
  const requestPolicyBody = {
    requestTypes: [REQUEST_TYPES.HOLD],
    name: `hold${getRandomPostfix()}`,
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
      userForHold = userProperties;
      UserEdit.addServicePointViaApi(
        testData.userServicePoint.id,
        userForHold.userId,
        testData.userServicePoint.id,
      );
    });

    cy.createTempUser(
      [
        permissions.uiUsersfeefinesCRUD.gui,
        permissions.uiUsersfeefinesView.gui,
        permissions.requestsAll.gui,
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
      cy.getInstance({
        limit: 1,
        expandAll: true,
        query: `"id"=="${instanceData.instanceId}"`,
      }).then((instance) => {
        testData.instanceHRID = instance.hrid;
      });
      Checkout.checkoutItemViaApi({
        id: uuid(),
        itemBarcode: testData.itemBarcode,
        loanDate: moment.utc().format(),
        servicePointId: testData.userServicePoint.id,
        userBarcode: userData.barcode,
      });
      cy.login(userData.username, userData.password, {
        path: TopMenu.requestsPath,
        waiter: Requests.waitLoading,
      });
    });
  });

  after('Deleting created entities', () => {
    cy.loginAsAdmin({
      path: SettingsMenu.circulationTitleLevelRequestsPath,
      waiter: TitleLevelRequests.waitLoading,
    });
    CheckInActions.checkinItemViaApi({
      itemBarcode: testData.itemBarcode,
      servicePointId: testData.userServicePoint.id,
      checkInDate: new Date().toISOString(),
    });
    cy.get('@requestId').then((id) => {
      Requests.deleteRequestViaApi(id);
    });
    InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(testData.itemBarcode);
    RequestPolicy.deleteViaApi(requestPolicyBody.id);
    CirculationRules.deleteRuleViaApi(addedCirculationRule);
    cy.deleteLoanType(testData.loanTypeId);
    UserEdit.changeServicePointPreferenceViaApi(userForHold.userId, [testData.userServicePoint.id]);
    UserEdit.changeServicePointPreferenceViaApi(userData.userId, [testData.userServicePoint.id]);
    ServicePoints.deleteViaApi(testData.userServicePoint.id);
    Users.deleteViaApi(userForHold.userId);
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
    'C350417 Check that user can create "Hold" Title level request (vega)',
    { tags: [testTypes.criticalPath, devTeams.vega] },
    () => {
      cy.intercept('POST', 'circulation/requests').as('createRequest');
      NewRequest.openNewRequestPane();
      NewRequest.waitLoadingNewRequestPage(true);
      NewRequest.enterHridInfo(testData.instanceHRID);
      NewRequest.verifyHridInformation([instanceData.title]);
      NewRequest.enterRequesterInfoWithRequestType(
        {
          requesterBarcode: userForHold.barcode,
          pickupServicePoint: testData.userServicePoint.name,
        },
        REQUEST_TYPES.HOLD,
      );
      NewRequest.verifyRequestInformation(REQUEST_TYPES.HOLD);
      NewRequest.saveRequestAndClose();
      NewRequest.waitLoading();
      cy.wait('@createRequest').then((intercept) => {
        cy.wrap(intercept.response.body.id).as('requestId');
      });
    },
  );
});
