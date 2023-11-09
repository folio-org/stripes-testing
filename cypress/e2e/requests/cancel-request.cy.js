import uuid from 'uuid';

import { DevTeams, Permissions, TestTypes } from '../../support/dictionary';
import { REQUEST_LEVELS, REQUEST_TYPES } from '../../support/constants';
import UserEdit from '../../support/fragments/users/userEdit';
import TopMenu from '../../support/fragments/topMenu';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import Location from '../../support/fragments/settings/tenant/locations/newLocation';
import Users from '../../support/fragments/users/users';
import CirculationRules from '../../support/fragments/circulation/circulation-rules';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import getRandomPostfix from '../../support/utils/stringTools';
import NewRequest from '../../support/fragments/requests/newRequest';
import RequestPolicy from '../../support/fragments/circulation/request-policy';
import Requests from '../../support/fragments/requests/requests';
import RequestDetail from '../../support/fragments/requests/requestDetail';
import generateUniqueItemBarcodeWithShift from '../../support/utils/generateUniqueItemBarcodeWithShift';
import CheckInActions from '../../support/fragments/check-in-actions/checkInActions';
import AwaitingPickupForARequest from '../../support/fragments/checkin/modals/awaitingPickupForARequest';
import { Locations } from '../../support/fragments/settings/tenant';

describe('Title Level Request', () => {
  let addedCirculationRule;
  let originalCirculationRules;
  let itemData;
  const instanceData = {
    title: `Instance title_${getRandomPostfix()}`,
    itemBarcode: `item${generateUniqueItemBarcodeWithShift()}`,
  };
  const testData = {
    folioInstances: InventoryInstances.generateFolioInstances(),
    servicePoint: ServicePoints.getDefaultServicePointWithPickUpLocation(),
    requestsId: '',
  };
  const requestPolicyBody = {
    requestTypes: [REQUEST_TYPES.PAGE],
    name: `requestPolicy${getRandomPostfix()}`,
    id: uuid(),
  };

  before('Preconditions:', () => {
    cy.getAdminToken().then(() => {
      ServicePoints.createViaApi(testData.servicePoint);
      testData.defaultLocation = Location.getDefaultLocation(testData.servicePoint.id);
      Locations.createViaApi(testData.defaultLocation).then((location) => {
        InventoryInstances.createFolioInstancesViaApi({
          folioInstances: testData.folioInstances,
          location,
        });
        instanceData.instanceId = testData.folioInstances[0].instanceId;

        cy.getInstance({
          limit: 1,
          expandAll: true,
          query: `"id"=="${instanceData.instanceId}"`,
        }).then((instance) => {
          instanceData.instanceHRID = instance.hrid;
        });
        itemData = testData.folioInstances[0];
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
      cy.createTempUser([Permissions.requestsAll.gui, Permissions.checkinAll.gui])
        .then((userProperties) => {
          testData.user = userProperties;
        })
        .then(() => {
          UserEdit.addServicePointsViaApi(
            [testData.servicePoint.id],
            testData.user.userId,
            testData.servicePoint.id,
          );

          cy.login(testData.user.username, testData.user.password, {
            path: TopMenu.requestsPath,
            waiter: Requests.waitLoading,
          });
          NewRequest.openNewRequestPane();
          NewRequest.waitLoadingNewRequestPage();
          NewRequest.enterHridInfo(instanceData.instanceHRID);
          NewRequest.verifyHridInformation([instanceData.title]);
          NewRequest.enterRequesterInfoWithRequestType(
            {
              requesterBarcode: testData.user.barcode,
              pickupServicePoint: testData.servicePoint.name,
            },
            testData.requestType,
          );
          NewRequest.verifyRequestInformation(testData.requestType);
          NewRequest.saveRequestAndClose();
          cy.intercept('POST', 'circulation/requests').as('createRequest');
          cy.wait('@createRequest').then((intercept) => {
            testData.requestId = intercept.response.body.id;
            cy.location('pathname').should('eq', `/requests/view/${testData.requestId}`);
          });
          NewRequest.verifyRequestSuccessfullyCreated(testData.user.username);
          RequestDetail.checkRequestStatus('Open - Not yet filled');
          RequestDetail.checkItemStatus('Paged');
        });
    });
  });

  after('delete test data', () => {
    cy.getAdminToken().then(() => {
      RequestPolicy.deleteViaApi(requestPolicyBody.id);
      Requests.deleteRequestViaApi(testData.requestId);
      UserEdit.changeServicePointPreferenceViaApi(testData.user.userId, [testData.servicePoint.id]);
      ServicePoints.deleteViaApi(testData.servicePoint.id);
      Users.deleteViaApi(testData.user.userId);
      InventoryInstances.deleteInstanceViaApi({
        instance: testData.folioInstances[0],
        servicePoint: testData.servicePoint,
        shouldCheckIn: true,
      });
      Locations.deleteViaApi(testData.defaultLocation);
      CirculationRules.deleteRuleViaApi(addedCirculationRule);
    });
  });

  it(
    'C3533 Cancel request (vega) (TaaS)',
    { tags: [TestTypes.criticalPath, DevTeams.vega] },
    () => {
      cy.visit(TopMenu.checkInPath);
      CheckInActions.checkInItemGui(itemData.barcodes[0]);
      AwaitingPickupForARequest.unselectCheckboxPrintSlip();
      AwaitingPickupForARequest.closeModal();
      CheckInActions.verifyLastCheckInItem(itemData.barcodes[0]);

      cy.visit(TopMenu.requestsPath);
      Requests.waitLoading();
      Requests.findCreatedRequest(itemData.instanceTitle);
      Requests.selectFirstRequest(itemData.instanceTitle);
      RequestDetail.checkRequestStatus('Open - Awaiting pickup');
      RequestDetail.checkItemStatus('Awaiting pickup');
      RequestDetail.openActions();
      RequestDetail.verifyCancelRequestOptionDisplayed();
      RequestDetail.openCancelRequest();
      RequestDetail.verifyCancelRequestModalDisplayed();
      RequestDetail.clickOnBackButton();
      RequestDetail.openActions();
      RequestDetail.openCancelRequest();
      RequestDetail.checkRequestCancellationModalInfo();
      RequestDetail.confirmRequestCancellation();
      RequestDetail.checkRequestStatus('Closed - Cancelled');

      cy.visit(TopMenu.checkInPath);
      CheckInActions.checkInItemGui(itemData.barcodes[0]);
      CheckInActions.verifyLastCheckInItem(itemData.barcodes[0]);

      cy.visit(TopMenu.requestsPath);
      Requests.waitLoading();
      Requests.findCreatedRequest(itemData.instanceTitle);
      Requests.selectFirstRequest(itemData.instanceTitle);
      RequestDetail.checkItemStatus('Available');
      RequestDetail.verifyEditButtonAbsent();
      RequestDetail.checkRequestInformation({
        type: REQUEST_TYPES.PAGE,
        status: 'Closed - Cancelled',
        level: REQUEST_LEVELS.TITLE,
      });
    },
  );
});
