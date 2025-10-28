import uuid from 'uuid';
import { ITEM_STATUS_NAMES, REQUEST_TYPES } from '../../support/constants';
import permissions from '../../support/dictionary/permissions';
import CheckInActions from '../../support/fragments/check-in-actions/checkInActions';
import CirculationRules from '../../support/fragments/circulation/circulation-rules';
import RequestPolicy from '../../support/fragments/circulation/request-policy';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import ItemRecordView from '../../support/fragments/inventory/item/itemRecordView';
import EditRequest from '../../support/fragments/requests/edit-request';
import NewRequest from '../../support/fragments/requests/newRequest';
import RequestDetail from '../../support/fragments/requests/requestDetail';
import Requests from '../../support/fragments/requests/requests';
import TitleLevelRequests from '../../support/fragments/settings/circulation/titleLevelRequests';
import Location from '../../support/fragments/settings/tenant/locations/newLocation';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import TopMenu from '../../support/fragments/topMenu';
import UserEdit from '../../support/fragments/users/userEdit';
import Users from '../../support/fragments/users/users';
import generateUniqueItemBarcodeWithShift from '../../support/utils/generateUniqueItemBarcodeWithShift';
import getRandomPostfix from '../../support/utils/stringTools';

describe('Title Level Request', () => {
  const instanceData = {
    title: `Instance title_${getRandomPostfix()}`,
    itemBarcode: `item${generateUniqueItemBarcodeWithShift()}`,
  };
  const testData = {
    userServicePoint: ServicePoints.getDefaultServicePointWithPickUpLocation(),
  };
  const requestPolicyBody = {
    requestTypes: [REQUEST_TYPES.PAGE, REQUEST_TYPES.HOLD],
    name: `requestPolicy${getRandomPostfix()}`,
    id: uuid(),
  };

  before('Preconditions:', () => {
    cy.getAdminToken()
      .then(() => {
        TitleLevelRequests.enableTLRViaApi();
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
          name: `type_C380544_${getRandomPostfix()}`,
        }).then((loanType) => {
          testData.loanType = loanType;
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
              barcode: instanceData.itemBarcode,
              status: { name: ITEM_STATUS_NAMES.AVAILABLE },
              permanentLoanType: { id: testData.loanType.id },
              materialType: { id: testData.materialTypeId },
            },
          ],
        }).then((specialInstanceIds) => {
          instanceData.instanceId = specialInstanceIds.instanceId;
          cy.wait(3000);
          cy.getInstance({
            limit: 1,
            expandAll: true,
            query: `"id"=="${specialInstanceIds.instanceId}"`,
          }).then((instance) => {
            instanceData.instanceHRID = instance.hrid;

            if (instance.hrid === undefined) {
              cy.log('Instance HRID is generated successfully').then(() => {
                throw new Error('Instance HRID is not generated');
              });
            }
          });
        });
        RequestPolicy.createViaApi(requestPolicyBody);
        CirculationRules.addRuleViaApi(
          { t: testData.loanType.id },
          { r: requestPolicyBody.id },
        ).then((newRule) => {
          testData.addedRule = newRule;
        });
      });

    cy.createTempUser([permissions.uiRequestsAll.gui, permissions.inventoryAll.gui])
      .then((userProperties) => {
        testData.user = userProperties;
      })
      .then(() => {
        UserEdit.addServicePointsViaApi(
          [testData.userServicePoint.id],
          testData.user.userId,
          testData.userServicePoint.id,
        );
        cy.waitForAuthRefresh(() => {
          cy.login(testData.user.username, testData.user.password, {
            path: TopMenu.requestsPath,
            waiter: Requests.waitLoading,
          });
        });
      });
  });

  after('delete test data', () => {
    cy.getAdminToken();
    CirculationRules.deleteRuleViaApi(testData.addedRule);
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
    Location.deleteInstitutionCampusLibraryLocationViaApi(
      testData.defaultLocation.institutionId,
      testData.defaultLocation.campusId,
      testData.defaultLocation.libraryId,
      testData.defaultLocation.id,
    );
  });

  it(
    'C380544 Verify that the item information is not changed in "Item information" accordion after editing a request. (vega) (TaaS)',
    { tags: ['criticalPath', 'vega', 'C380544'] },
    () => {
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
      cy.wait(3000);
      RequestDetail.openItemByBarcode(instanceData.itemBarcode);
      cy.wait(1000);
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
      cy.wait(3000);
      RequestDetail.openItemByBarcode(instanceData.itemBarcode);
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
