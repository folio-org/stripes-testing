import moment from 'moment';
import uuid from 'uuid';
import {
  FULFILMENT_PREFERENCES,
  ITEM_STATUS_NAMES,
  REQUEST_LEVELS,
  REQUEST_TYPES,
} from '../../support/constants';
import permissions from '../../support/dictionary/permissions';
import CheckInActions from '../../support/fragments/check-in-actions/checkInActions';
import Checkout from '../../support/fragments/checkout/checkout';
import CirculationRules from '../../support/fragments/circulation/circulation-rules';
import RequestPolicy from '../../support/fragments/circulation/request-policy';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import RequestDetail from '../../support/fragments/requests/requestDetail';
import Requests from '../../support/fragments/requests/requests';
import TitleLevelRequests from '../../support/fragments/settings/circulation/titleLevelRequests';
import Location from '../../support/fragments/settings/tenant/locations/newLocation';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import TopMenu from '../../support/fragments/topMenu';
import UserEdit from '../../support/fragments/users/userEdit';
import Users from '../../support/fragments/users/users';
import generateItemBarcode from '../../support/utils/generateItemBarcode';
import generateUniqueItemBarcodeWithShift from '../../support/utils/generateUniqueItemBarcodeWithShift';
import { getTestEntityValue } from '../../support/utils/stringTools';

describe('Request Detail. TLR', () => {
  const users = {
    mainUser: {},
    holdUser: {},
    recallUser: {},
  };
  const testData = {
    userServicePoint: ServicePoints.getDefaultServicePointWithPickUpLocation(),
    itemBarcode: generateItemBarcode(),
  };
  const requestIds = [];
  const requestPolicyBody = {
    requestTypes: [REQUEST_TYPES.HOLD, REQUEST_TYPES.RECALL],
    name: getTestEntityValue('requestPolicy'),
    id: uuid(),
  };
  const itemsData = {
    itemsWithSeparateInstance: [
      { instanceTitle: getTestEntityValue('InstanceForTLRHold') },
      { instanceTitle: getTestEntityValue('InstanceForTLRRecall') },
    ],
  };

  before('Preconditions', () => {
    itemsData.itemsWithSeparateInstance.forEach((item, index) => {
      item.barcode = generateUniqueItemBarcodeWithShift(index);
    });
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
          name: getTestEntityValue('loanType'),
        }).then((loanType) => {
          testData.loanTypeId = loanType.id;
        });
        cy.getDefaultMaterialType().then((materialTypes) => {
          testData.materialTypeId = materialTypes.id;
        });
      })
      .then(() => {
        itemsData.itemsWithSeparateInstance.forEach((item, index) => {
          InventoryInstances.createFolioInstanceViaApi({
            instance: {
              instanceTypeId: testData.instanceTypeId,
              title: item.instanceTitle,
            },
            holdings: [
              {
                holdingsTypeId: testData.holdingTypeId,
                permanentLocationId: testData.defaultLocation.id,
              },
            ],
            items: [
              {
                barcode: item.barcode,
                status: { name: ITEM_STATUS_NAMES.AVAILABLE },
                permanentLoanType: { id: testData.loanTypeId },
                materialType: { id: testData.materialTypeId },
              },
            ],
          }).then((specialInstanceIds) => {
            itemsData.itemsWithSeparateInstance[index].instanceId = specialInstanceIds.instanceId;
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
      })
      .then(() => {
        cy.wrap(itemsData.itemsWithSeparateInstance).as('items');
        cy.createTempUser([permissions.uiRequestsAll.gui]).then((userProperties) => {
          users.holdUser = userProperties;
          UserEdit.addServicePointViaApi(
            testData.userServicePoint.id,
            users.holdUser.userId,
            testData.userServicePoint.id,
          );
        });
        cy.createTempUser([permissions.uiRequestsAll.gui]).then((userProperties) => {
          users.recallUser = userProperties;
          UserEdit.addServicePointViaApi(
            testData.userServicePoint.id,
            users.recallUser.userId,
            testData.userServicePoint.id,
          );
        });
        cy.createTempUser([
          permissions.uiRequestsCreate.gui,
          permissions.uiRequestsView.gui,
          permissions.uiRequestsEdit.gui,
          permissions.uiRequestsAll.gui,
          permissions.uiNotesItemView.gui,
        ]).then((userProperties) => {
          users.mainUser = userProperties;
          UserEdit.addServicePointViaApi(
            testData.userServicePoint.id,
            users.mainUser.userId,
            testData.userServicePoint.id,
          );
        });
        TitleLevelRequests.enableTLRViaApi();
      })
      .then(() => {
        cy.get('@items').each((item) => {
          Checkout.checkoutItemViaApi({
            id: uuid(),
            itemBarcode: item.barcode,
            loanDate: moment.utc().format(),
            servicePointId: testData.userServicePoint.id,
            userBarcode: users.mainUser.barcode,
          });
        });
        Requests.createNewRequestViaApi({
          fulfillmentPreference: FULFILMENT_PREFERENCES.HOLD_SHELF,
          instanceId: itemsData.itemsWithSeparateInstance[0].instanceId,
          pickupServicePointId: testData.userServicePoint.id,
          requestDate: new Date(),
          requestLevel: REQUEST_LEVELS.TITLE,
          requestType: REQUEST_TYPES.HOLD,
          requesterId: users.holdUser.userId,
        }).then((request) => {
          requestIds.push(request.body.id);
        });
        Requests.createNewRequestViaApi({
          fulfillmentPreference: FULFILMENT_PREFERENCES.HOLD_SHELF,
          instanceId: itemsData.itemsWithSeparateInstance[1].instanceId,
          pickupServicePointId: testData.userServicePoint.id,
          requestDate: new Date(),
          requestLevel: REQUEST_LEVELS.TITLE,
          requestType: REQUEST_TYPES.RECALL,
          requesterId: users.recallUser.userId,
        }).then((request) => {
          requestIds.push(request.body.id);
        });
      })
      .then(() => {
        cy.waitForAuthRefresh(() => {
          cy.login(users.mainUser.username, users.mainUser.password, {
            path: TopMenu.requestsPath,
            waiter: Requests.waitLoading,
          });
        });
      });
  });

  after('Deleting created entities', () => {
    cy.getAdminToken();
    cy.wrap(requestIds).each((id) => {
      Requests.deleteRequestViaApi(id);
    });
    cy.get('@items').each((item) => {
      CheckInActions.checkinItemViaApi({
        itemBarcode: item.barcode,
        servicePointId: testData.userServicePoint.id,
        checkInDate: new Date().toISOString(),
      });
      InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(item.barcode);
    });
    RequestPolicy.deleteViaApi(requestPolicyBody.id);
    CirculationRules.deleteRuleViaApi(testData.addedRule);
    cy.deleteLoanType(testData.loanTypeId);
    UserEdit.changeServicePointPreferenceViaApi(users.mainUser.userId, [
      testData.userServicePoint.id,
    ]);
    UserEdit.changeServicePointPreferenceViaApi(users.holdUser.userId, [
      testData.userServicePoint.id,
    ]);
    UserEdit.changeServicePointPreferenceViaApi(users.recallUser.userId, [
      testData.userServicePoint.id,
    ]);
    ServicePoints.deleteViaApi(testData.userServicePoint.id);
    Users.deleteViaApi(users.mainUser.userId);
    Users.deleteViaApi(users.holdUser.userId);
    Users.deleteViaApi(users.recallUser.userId);
    Location.deleteInstitutionCampusLibraryLocationViaApi(
      testData.defaultLocation.institutionId,
      testData.defaultLocation.campusId,
      testData.defaultLocation.libraryId,
      testData.defaultLocation.id,
    );
  });

  it(
    'C350516 Check that the user can see "Request Detail" for Title request (Hold or Recall) (vega) (TaaS)',
    { tags: ['criticalPath', 'vega', 'C350516'] },
    () => {
      Requests.selectTitleRequestLevel();
      Requests.findCreatedRequest(itemsData.itemsWithSeparateInstance[0].instanceTitle);
      Requests.selectFirstRequest(itemsData.itemsWithSeparateInstance[0].instanceTitle);
      RequestDetail.waitLoading();
      RequestDetail.checkTitleInformation({
        TLRs: '1',
        title: itemsData.itemsWithSeparateInstance[0].instanceTitle,
      });
      RequestDetail.checkItemInformation();
      RequestDetail.checkRequestInformation({
        type: REQUEST_TYPES.HOLD,
        status: 'Open - Not yet filled',
        level: REQUEST_LEVELS.TITLE,
      });
      RequestDetail.checkRequesterInformation({
        lastName: users.holdUser.lastName,
        barcode: users.holdUser.barcode,
        preference: FULFILMENT_PREFERENCES.HOLD_SHELF,
        pickupSP: testData.userServicePoint.name,
      });

      cy.reload();
      Requests.selectTitleRequestLevel();
      Requests.findCreatedRequest(itemsData.itemsWithSeparateInstance[1].instanceTitle);
      Requests.selectFirstRequest(itemsData.itemsWithSeparateInstance[1].instanceTitle);
      RequestDetail.waitLoading();
      RequestDetail.checkItemInformation({
        itemBarcode: itemsData.itemsWithSeparateInstance[1].barcode,
        title: itemsData.itemsWithSeparateInstance[1].instanceTitle,
        status: 'Checked out',
      });
      RequestDetail.checkRequestInformation({
        type: REQUEST_TYPES.RECALL,
        status: 'Open - Not yet filled',
        level: REQUEST_LEVELS.TITLE,
      });
      RequestDetail.checkRequesterInformation({
        lastName: users.recallUser.lastName,
        barcode: users.recallUser.barcode,
        preference: FULFILMENT_PREFERENCES.HOLD_SHELF,
        pickupSP: testData.userServicePoint.name,
      });
    },
  );
});
