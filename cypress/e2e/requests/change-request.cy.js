import uuid from 'uuid';
import testTypes from '../../support/dictionary/testTypes';
import devTeams from '../../support/dictionary/devTeams';
import permissions from '../../support/dictionary/permissions';
import { ITEM_STATUS_NAMES, REQUEST_TYPES } from '../../support/constants';
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
import SettingsMenu from '../../support/fragments/settingsMenu';
import TitleLevelRequests from '../../support/fragments/settings/circulation/titleLevelRequests';
import Requests from '../../support/fragments/requests/requests';
import RequestDetail from '../../support/fragments/requests/requestDetail';
import generateUniqueItemBarcodeWithShift from '../../support/utils/generateUniqueItemBarcodeWithShift';
import ItemRecordView from '../../support/fragments/inventory/item/itemRecordView';
import EditRequest from '../../support/fragments/requests/edit-request';
import CheckInActions from '../../support/fragments/check-in-actions/checkInActions';

describe('Title Level Request', () => {
  let addedCirculationRule;
  let originalCirculationRules;
  const instanceData = {
    title: `Instance title_${getRandomPostfix()}`,
    itemBarcode: `item${generateUniqueItemBarcodeWithShift()}`,
  };
  const testData = {
    userServicePoint: ServicePoints.getDefaultServicePointWithPickUpLocation(),
  };
  const requestPolicyBody = {
    requestTypes: [REQUEST_TYPES.PAGE],
    name: `requestPolicy${getRandomPostfix()}`,
    id: uuid(),
  };

  before('Preconditions:', () => {
    cy.loginAsAdmin({
      path: SettingsMenu.circulationTitleLevelRequestsPath,
      waiter: TitleLevelRequests.waitLoading,
    });
    TitleLevelRequests.changeTitleLevelRequestsStatus('allow');
    cy.logout();
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
          testData.loanType = loanType;
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
              barcode: instanceData.itemBarcode,
              status: { name: ITEM_STATUS_NAMES.AVAILABLE },
              permanentLoanType: { id: testData.loanType.id },
              materialType: { id: testData.materialTypeId },
            },
          ],
        }).then((specialInstanceIds) => {
          instanceData.instanceId = specialInstanceIds.instanceId;

          cy.getInstance({
            limit: 1,
            expandAll: true,
            query: `"id"=="${specialInstanceIds.instanceId}"`,
          }).then((instance) => {
            instanceData.instanceHRID = instance.hrid;
          });
        });
        RequestPolicy.createViaApi(requestPolicyBody);
        CirculationRules.getViaApi().then((circulationRule) => {
          originalCirculationRules = circulationRule.rulesAsText;
          const ruleProps = CirculationRules.getRuleProps(circulationRule.rulesAsText);
          ruleProps.r = requestPolicyBody.id;
          addedCirculationRule =
            't ' +
            testData.loanType.id +
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
            testData.loanType.id,
          );
        });
      });

    cy.createTempUser([permissions.requestsAll.gui, permissions.inventoryAll.gui])
      .then((userProperties) => {
        testData.user = userProperties;
      })
      .then(() => {
        UserEdit.addServicePointsViaApi(
          [testData.userServicePoint.id],
          testData.user.userId,
          testData.userServicePoint.id,
        );

        cy.login(testData.user.username, testData.user.password, {
          path: TopMenu.requestsPath,
          waiter: Requests.waitLoading,
        });
      });
  });

  after('delete test data', () => {
    CheckInActions.checkinItemViaApi({
      itemBarcode: instanceData.itemBarcode,
      servicePointId: testData.userServicePoint.id,
      checkInDate: new Date().toISOString(),
    });
    RequestPolicy.deleteViaApi(requestPolicyBody.id);
    Requests.deleteRequestViaApi(testData.requestId);
    UserEdit.changeServicePointPreferenceViaApi(testData.user.userId, [
      testData.userServicePoint.id,
    ]);
    ServicePoints.deleteViaApi(testData.userServicePoint.id);
    Users.deleteViaApi(testData.user.userId);
    InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(instanceData.itemBarcode);
    Location.deleteViaApiIncludingInstitutionCampusLibrary(
      testData.defaultLocation.institutionId,
      testData.defaultLocation.campusId,
      testData.defaultLocation.libraryId,
      testData.defaultLocation.id,
    );
    CirculationRules.deleteRuleViaApi(addedCirculationRule);
  });

  it(
    'C380544 Verify that the item information is not changed in "Item information" accordion after editing a request. (vega) (TaaS)',
    { tags: [testTypes.criticalPath, devTeams.vega] },
    () => {
      Requests.waitLoading();
      NewRequest.openNewRequestPane();
      NewRequest.waitLoadingNewRequestPage();
      NewRequest.enterHridInfo(instanceData.instanceHRID);
      NewRequest.verifyHridInformation([instanceData.title]);
      NewRequest.enterRequesterInfoWithRequestType(
        {
          requesterBarcode: testData.user.barcode,
          pickupServicePoint: testData.userServicePoint.name,
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
      RequestDetail.checkItemInformation({
        itemBarcode: instanceData.itemBarcode,
        title: instanceData.title,
        effectiveLocation: testData.defaultLocation.name,
        itemStatus: ITEM_STATUS_NAMES.PAGED,
        requestsOnItem: '1',
      });
      RequestDetail.openItemByBarcode();
      ItemRecordView.verifyLoanAndAvailabilitySection({
        permanentLoanType: testData.loanType.name,
        temporaryLoanType: '-',
        itemStatus: ITEM_STATUS_NAMES.PAGED,
        requestQuantity: '1',
        borrower: '-',
        loanDate: '-',
        dueDate: '-',
        staffOnly: '-',
        note: '-',
      });
      ItemRecordView.openRequest();
      Requests.waitLoading();
      Requests.selectFirstRequest(instanceData.title);
      EditRequest.openRequestEditForm();
      EditRequest.waitRequestEditFormLoad();
      EditRequest.changeServicePoint(EditRequest.servicePoint);
      EditRequest.saveAndClose();
      EditRequest.verifyRequestSuccessfullyEdited(testData.user.username);
      RequestDetail.checkItemInformation({
        itemBarcode: instanceData.itemBarcode,
        title: instanceData.title,
        effectiveLocation: testData.defaultLocation.name,
        itemStatus: ITEM_STATUS_NAMES.PAGED,
        requestsOnItem: '1',
      });
      RequestDetail.openItemByBarcode();
      ItemRecordView.verifyLoanAndAvailabilitySection({
        permanentLoanType: testData.loanType.name,
        temporaryLoanType: '-',
        itemStatus: ITEM_STATUS_NAMES.PAGED,
        requestQuantity: '1',
        borrower: '-',
        loanDate: '-',
        dueDate: '-',
        staffOnly: '-',
        note: '-',
      });
    },
  );
});
