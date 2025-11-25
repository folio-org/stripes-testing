import uuid from 'uuid';
import moment from 'moment';
import {
  FULFILMENT_PREFERENCES,
  ITEM_STATUS_NAMES,
  REQUEST_LEVELS,
  REQUEST_TYPES,
  LOCATION_IDS,
} from '../../support/constants';
import TopMenu from '../../support/fragments/topMenu';
import generateItemBarcode from '../../support/utils/generateItemBarcode';
import getRandomPostfix from '../../support/utils/stringTools';
import CheckInActions from '../../support/fragments/check-in-actions/checkInActions';
import CheckInPane from '../../support/fragments/check-in-actions/checkInPane';
import SwitchServicePoint from '../../support/fragments/settings/tenant/servicePoints/switchServicePoint';
import InTransit from '../../support/fragments/checkin/modals/inTransit';
import AwaitingPickupForARequest from '../../support/fragments/checkin/modals/awaitingPickupForARequest';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import InventoryInstance from '../../support/fragments/inventory/inventoryInstance';
import RequestPolicy from '../../support/fragments/circulation/request-policy';
import CirculationRules from '../../support/fragments/circulation/circulation-rules';
import PatronGroups from '../../support/fragments/settings/users/patronGroups';
import permissions from '../../support/dictionary/permissions';
import UserEdit from '../../support/fragments/users/userEdit';
import Checkout from '../../support/fragments/checkout/checkout';
import Requests from '../../support/fragments/requests/requests';
import Users from '../../support/fragments/users/users';

describe('Check in', () => {
  const userData = {};
  const requestUserData = {};
  const patronGroup = {
    name: `groupCheckIn ${getRandomPostfix()}`,
  };
  const testData = {};
  let servicePointS;
  let servicePointS1;
  let checkInResultsData;
  const itemData = {
    barcode: generateItemBarcode(),
    title: `Instance_${getRandomPostfix()}`,
  };
  const requestPolicyBody = {
    requestTypes: [REQUEST_TYPES.HOLD],
    name: `hold${getRandomPostfix()}`,
    id: uuid(),
  };

  before('Preconditions', () => {
    cy.getAdminToken()
      .then(() => {
        ServicePoints.getCircDesk1ServicePointViaApi().then((sp1) => {
          servicePointS = sp1;
        });
        ServicePoints.getCircDesk2ServicePointViaApi().then((sp2) => {
          servicePointS1 = sp2;
          checkInResultsData = {
            statusForS: [`In transit - ${servicePointS1.name}`],
            statusForS1: ['Awaiting pickup'],
          };
        });
        cy.getInstanceTypes({ limit: 1 }).then((instanceTypes) => {
          testData.instanceTypeId = instanceTypes[0].id;
        });
        cy.getHoldingTypes({ limit: 1 }).then((holdingTypes) => {
          testData.holdingTypeId = holdingTypes[0].id;
        });
        cy.createLoanType({
          name: `type_C7148_${getRandomPostfix()}`,
        }).then((loanType) => {
          testData.loanTypeId = loanType.id;
        });
        cy.getDefaultMaterialType().then((materialTypes) => {
          testData.materialTypeId = materialTypes.id;
          itemData.materialType = materialTypes.name[0].toUpperCase() + materialTypes.name.slice(1);
        });
      })
      .then(() => {
        InventoryInstances.createFolioInstanceViaApi({
          instance: {
            instanceTypeId: testData.instanceTypeId,
            title: itemData.title,
          },
          holdings: [
            {
              holdingsTypeId: testData.holdingTypeId,
              permanentLocationId: LOCATION_IDS.MAIN_LIBRARY,
            },
          ],
          items: [
            {
              barcode: itemData.barcode,
              status: { name: ITEM_STATUS_NAMES.AVAILABLE },
              permanentLoanType: { id: testData.loanTypeId },
              materialType: { id: testData.materialTypeId },
            },
          ],
        }).then((specialInstanceIds) => {
          itemData.instanceId = specialInstanceIds.instanceId;
          itemData.holdingId = specialInstanceIds.holdings[0].id;
          itemData.itemId = specialInstanceIds.items[0].id;
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
      [permissions.checkinAll.gui, permissions.uiRequestsView.gui],
      patronGroup.name,
    )
      .then((userProperties) => {
        userData.username = userProperties.username;
        userData.password = userProperties.password;
        userData.userId = userProperties.userId;
        userData.barcode = userProperties.barcode;
      })
      .then(() => {
        UserEdit.addServicePointsViaApi(
          [servicePointS.id, servicePointS1.id],
          userData.userId,
          servicePointS.id,
        );

        cy.createTempUser([permissions.uiRequestsAll.gui], patronGroup.name).then(
          (userProperties) => {
            requestUserData.username = userProperties.username;
            requestUserData.userId = userProperties.userId;
            requestUserData.barcode = userProperties.barcode;
            UserEdit.addServicePointViaApi(
              servicePointS1.id,
              requestUserData.userId,
              servicePointS1.id,
            );
          },
        );

        Checkout.checkoutItemViaApi({
          id: uuid(),
          itemBarcode: itemData.barcode,
          loanDate: moment.utc().format(),
          servicePointId: servicePointS.id,
          userBarcode: userData.barcode,
        }).then((checkoutResponse) => {
          Requests.createNewRequestViaApi({
            fulfillmentPreference: FULFILMENT_PREFERENCES.HOLD_SHELF,
            holdingsRecordId: testData.holdingTypeId,
            instanceId: itemData.instanceId,
            item: { barcode: itemData.barcode },
            itemId: checkoutResponse.itemId,
            pickupServicePointId: servicePointS1.id,
            requestDate: new Date(),
            requestExpirationDate: new Date(new Date().getTime() + 86400000),
            requestLevel: REQUEST_LEVELS.ITEM,
            requestType: REQUEST_TYPES.HOLD,
            requesterId: requestUserData.userId,
          }).then((request) => {
            testData.requestsId = request.body.id;
            itemData.servicePoint = request.body.pickupServicePoint.name;
          });
        });
      });
  });

  after('Deleting created entities', () => {
    cy.getAdminToken();
    CirculationRules.deleteRuleViaApi(testData.addedRule);
    CheckInActions.checkinItemViaApi({
      itemBarcode: itemData.barcode,
      servicePointId: servicePointS.id,
      checkInDate: new Date().toISOString(),
    });
    RequestPolicy.deleteViaApi(requestPolicyBody.id);
    Requests.deleteRequestViaApi(testData.requestsId);
    Users.deleteViaApi(userData.userId);
    Users.deleteViaApi(requestUserData.userId);
    PatronGroups.deleteViaApi(patronGroup.id);
    cy.deleteItemViaApi(itemData.itemId);
    cy.deleteHoldingRecordViaApi(itemData.holdingId);
    InventoryInstance.deleteInstanceViaApi(itemData.instanceId);
    cy.deleteLoanType(testData.loanTypeId);
  });

  it(
    'C7148 Check In: item with at least one open request (vega)',
    { tags: ['criticalPath', 'vega', 'C7148'] },
    () => {
      cy.login(userData.username, userData.password, {
        path: TopMenu.checkInPath,
        waiter: CheckInActions.waitLoading,
      });
      SwitchServicePoint.switchServicePoint(servicePointS.name);
      SwitchServicePoint.checkIsServicePointSwitched(servicePointS.name);

      CheckInActions.checkInItemGui(itemData.barcode);
      InTransit.verifyModalTitle();
      InTransit.checkModalMessage(itemData);
      InTransit.unselectCheckboxPrintSlip();
      InTransit.closeModal();
      CheckInPane.checkResultsInTheRow(checkInResultsData.statusForS);

      CheckInActions.checkActionsMenuOptions(['printTransitSlip', 'requestDetails']);
      CheckInActions.openRequestDetails(itemData.barcode);
      CheckInActions.openCheckInPane();

      SwitchServicePoint.switchServicePoint(servicePointS1.name);
      CheckInActions.checkInItemGui(itemData.barcode);
      AwaitingPickupForARequest.verifyModalTitle();
      AwaitingPickupForARequest.unselectCheckboxPrintSlip();
      AwaitingPickupForARequest.checkModalMessage(itemData);
      AwaitingPickupForARequest.closeModal();
      CheckInPane.checkResultsInTheRow(checkInResultsData.statusForS1);

      CheckInActions.checkActionsMenuOptions(['printHoldSlip', 'requestDetails']);
      CheckInActions.openRequestDetails(itemData.barcode);
    },
  );
});
