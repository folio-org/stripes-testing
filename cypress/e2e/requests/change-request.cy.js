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
import getRandomPostfix, { getTestEntityValue } from '../../support/utils/stringTools';
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
  let user;
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
    cy.getAdminToken()
      .then(() => {
        ServicePoints.createViaApi(testData.userServicePoint);
        testData.defaultLocation = Location.getDefaultLocation(testData.userServicePoint.id);
        Location.createViaApi(testData.defaultLocation);
        cy.getInstanceTypes({ limit: 1 }).then((instanceTypes) => {
          instanceData.instanceTypeId = instanceTypes[0].id;
        });
        cy.getHoldingTypes({ limit: 1 }).then((holdingTypes) => {
          instanceData.holdingTypeId = holdingTypes[0].id;
        });
        cy.createLoanType({
          name: getTestEntityValue('loanType'),
        }).then((loanType) => {
          instanceData.loanType = loanType;
        });
        cy.getMaterialTypes({ limit: 1 }).then((materialTypes) => {
          instanceData.materialTypeId = materialTypes.id;
        });
      })
      .then(() => {
        InventoryInstances.createFolioInstanceViaApi({
          instance: {
            instanceTypeId: instanceData.instanceTypeId,
            title: instanceData.title,
          },
          holdings: [
            {
              holdingsTypeId: instanceData.holdingTypeId,
              permanentLocationId: testData.defaultLocation.id,
            },
          ],
          items: [
            {
              barcode: instanceData.itemBarcode,
              status: { name: ITEM_STATUS_NAMES.AVAILABLE },
              permanentLoanType: { id: instanceData.loanType.id },
              materialType: { id: instanceData.materialTypeId },
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
    cy.createTempUser([permissions.requestsAll.gui, permissions.inventoryAll.gui]).then(
      (userProperties) => {
        user = userProperties;

        UserEdit.addServicePointViaApi(
          testData.userServicePoint.id,
          userProperties.userId,
          testData.userServicePoint.id,
        );
        cy.login(user.username, user.password, {
          path: TopMenu.requestsPath,
          waiter: Requests.waitLoading,
        });
      },
    );
  });

  after('Deleting created entities', () => {
    console.log(user);
    // UserEdit.changeServicePointPreferenceViaApi(user.userId, [testData.userServicePoint.id]);
    CheckInActions.checkinItemViaApi({
      itemBarcode: instanceData.itemBarcode,
      servicePointId: testData.userServicePoint.id,
      checkInDate: new Date().toISOString(),
    });
    RequestPolicy.deleteViaApi(requestPolicyBody.id);

    cy.pause();

    ServicePoints.deleteViaApi(testData.userServicePoint.id);
    Requests.getRequestApi({ query: `(item.barcode=="${instanceData.itemBarcode}")` }).then(
      (requestResponse) => {
        Requests.deleteRequestViaApi(requestResponse[0].id);
      },
    );
    Users.deleteViaApi(user.userId);
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
      // Requests.waitLoading();
      // NewRequest.openNewRequestPane();
      // NewRequest.waitLoadingNewRequestPage();
      // NewRequest.enterHridInfo(instanceData.instanceHRID);
      // NewRequest.verifyHridInformation([instanceData.title]);
      // NewRequest.enterRequesterInfoWithRequestType(
      //   {
      //     requesterBarcode: user.barcode,
      //     pickupServicePoint: testData.userServicePoint.name,
      //   },
      //   testData.requestType,
      // );
      // NewRequest.verifyRequestInformation(testData.requestType);
      // NewRequest.saveRequestAndClose();
      // NewRequest.verifyRequestSuccessfullyCreated(user.username);
      // RequestDetail.checkItemInformation({
      //   itemBarcode: instanceData.itemBarcode,
      //   title: instanceData.title,
      //   effectiveLocation: testData.defaultLocation.name,
      //   itemStatus: ITEM_STATUS_NAMES.PAGED,
      //   requestsOnItem: '1',
      // });
      // cy.pause();
      // RequestDetail.openItemByBarcode();
      // ItemRecordView.verifyLoanAndAvailabilitySection({
      //   permanentLoanType: instanceData.loanType.name,
      //   temporaryLoanType: '-',
      //   itemStatus: ITEM_STATUS_NAMES.PAGED,
      //   requestQuantity:  '1',
      //   borrower: '-',
      //   loanDate: '-',
      //   dueDate: '-',
      //   staffOnly: '-',
      //   note: '-',
      // });
      // ItemRecordView.openRequest();
      // Requests.waitLoading();
      // //
      // Requests.selectFirstRequest(instanceData.title);
      // EditRequest.openRequestEditForm();
      // EditRequest.waitRequestEditFormLoad();
      // EditRequest.changeServicePoint(EditRequest.servicePoint);
      // EditRequest.saveAndClose();
      // EditRequest.verifyRequestSuccessfullyEdited(user.username);
      // RequestDetail.checkItemInformation({
      //   itemBarcode: instanceData.itemBarcode,
      //   title: instanceData.title,
      //   effectiveLocation: testData.defaultLocation.name,
      //   itemStatus: ITEM_STATUS_NAMES.PAGED,
      //   requestsOnItem: '1',
      // });
      // cy.pause();
      // RequestDetail.openItemByBarcode();
      // ItemRecordView.verifyLoanAndAvailabilitySection({
      //   permanentLoanType: instanceData.loanType.name,
      //   temporaryLoanType: '-',
      //   itemStatus: ITEM_STATUS_NAMES.PAGED,
      //   requestQuantity:  '1',
      //   borrower: '-',
      //   loanDate: '-',
      //   dueDate: '-',
      //   staffOnly: '-',
      //   note: '-',
      // });
    },
  );
});
