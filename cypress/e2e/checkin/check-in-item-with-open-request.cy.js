import uuid from 'uuid';
import moment from 'moment';
import {
  FULFILMENT_PREFERENCES,
  ITEM_STATUS_NAMES,
  REQUEST_LEVELS,
  REQUEST_TYPES,
} from '../../support/constants';
import TestTypes from '../../support/dictionary/testTypes';
import devTeams from '../../support/dictionary/devTeams';
import TopMenu from '../../support/fragments/topMenu';
import generateItemBarcode from '../../support/utils/generateItemBarcode';
import getRandomPostfix from '../../support/utils/stringTools';
import CheckInActions from '../../support/fragments/check-in-actions/checkInActions';
import CheckInPane from '../../support/fragments/check-in-actions/checkInPane';
import SwitchServicePoint from '../../support/fragments/settings/tenant/servicePoints/switchServicePoint';
import InTransit from '../../support/fragments/checkin/modals/inTransit';
import AwaitingPickupForARequest from '../../support/fragments/checkin/modals/awaitingPickupForARequest';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import Location from '../../support/fragments/settings/tenant/locations/newLocation';
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

describe('Check In - Actions', () => {
  let addedCirculationRule;
  let originalCirculationRules;
  const userData = {};
  const requestUserData = {};
  const patronGroup = {
    name: `groupCheckIn ${getRandomPostfix()}`,
  };
  const testData = {
    servicePointS: ServicePoints.getDefaultServicePointWithPickUpLocation(),
    servicePointS1: ServicePoints.getDefaultServicePointWithPickUpLocation(),
  };
  const checkInResultsData = {
    statusForS: [`In transit - ${testData.servicePointS1.name}`],
    statusForS1: ['Awaiting pickup'],
  };
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
        ServicePoints.createViaApi(testData.servicePointS);
        ServicePoints.createViaApi(testData.servicePointS1);
        testData.defaultLocation = Location.getDefaultLocation(testData.servicePointS.id);
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
              permanentLocationId: testData.defaultLocation.id,
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
          itemData.holdingId = specialInstanceIds.holdingIds[0].id;
          itemData.itemId = specialInstanceIds.holdingIds[0].itemIds;
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
          [testData.servicePointS.id, testData.servicePointS1.id],
          userData.userId,
          testData.servicePointS.id,
        );

        cy.createTempUser([permissions.requestsAll.gui], patronGroup.name).then(
          (userProperties) => {
            requestUserData.username = userProperties.username;
            requestUserData.userId = userProperties.userId;
            requestUserData.barcode = userProperties.barcode;
            UserEdit.addServicePointViaApi(
              testData.servicePointS1.id,
              requestUserData.userId,
              testData.servicePointS1.id,
            );
          },
        );

        Checkout.checkoutItemViaApi({
          id: uuid(),
          itemBarcode: itemData.barcode,
          loanDate: moment.utc().format(),
          servicePointId: testData.servicePointS.id,
          userBarcode: userData.barcode,
        }).then((checkoutResponse) => {
          Requests.createNewRequestViaApi({
            fulfillmentPreference: FULFILMENT_PREFERENCES.HOLD_SHELF,
            holdingsRecordId: testData.holdingTypeId,
            instanceId: itemData.instanceId,
            item: { barcode: itemData.barcode },
            itemId: checkoutResponse.itemId,
            pickupServicePointId: testData.servicePointS1.id,
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
        cy.login(userData.username, userData.password);
      });
  });

  after('Deleting created entities', () => {
    CheckInActions.checkinItemViaApi({
      itemBarcode: itemData.barcode,
      servicePointId: testData.servicePointS.id,
      checkInDate: new Date().toISOString(),
    });
    RequestPolicy.deleteViaApi(requestPolicyBody.id);
    UserEdit.changeServicePointPreferenceViaApi(userData.userId, [
      testData.servicePointS.id,
      testData.servicePointS1.id,
    ]);
    UserEdit.changeServicePointPreferenceViaApi(requestUserData.userId, [
      testData.servicePointS1.id,
    ]);
    ServicePoints.deleteViaApi(testData.servicePointS.id);
    ServicePoints.deleteViaApi(testData.servicePointS1.id);
    Requests.deleteRequestViaApi(testData.requestsId);
    Users.deleteViaApi(userData.userId);
    Users.deleteViaApi(requestUserData.userId);
    PatronGroups.deleteViaApi(patronGroup.id);
    cy.deleteItemViaApi(itemData.itemId);
    cy.deleteHoldingRecordViaApi(itemData.holdingId);
    InventoryInstance.deleteInstanceViaApi(itemData.instanceId);
    Location.deleteViaApiIncludingInstitutionCampusLibrary(
      testData.defaultLocation.institutionId,
      testData.defaultLocation.campusId,
      testData.defaultLocation.libraryId,
      testData.defaultLocation.id,
    );
    CirculationRules.deleteRuleViaApi(addedCirculationRule);
    cy.deleteLoanType(testData.loanTypeId);
  });
  it(
    'C7148 Check In: item with at least one open request (vega)',
    { tags: [TestTypes.criticalPath, devTeams.vega] },
    () => {
      cy.visit(TopMenu.checkInPath);
      CheckInActions.waitLoading();
      SwitchServicePoint.switchServicePoint(testData.servicePointS.name);
      SwitchServicePoint.checkIsServicePointSwitched(testData.servicePointS.name);

      CheckInActions.checkInItemGui(itemData.barcode);
      InTransit.verifyModalTitle();
      InTransit.checkModalMessage(itemData);
      InTransit.unselectCheckboxPrintSlip();
      InTransit.closeModal();
      CheckInPane.checkResultsInTheRow(checkInResultsData.statusForS);

      CheckInActions.checkActionsMenuOptions(['printTransitSlip', 'requestDetails']);
      CheckInActions.openRequestDetails(itemData.barcode);
      CheckInActions.openCheckInPane();

      SwitchServicePoint.switchServicePoint(testData.servicePointS1.name);
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
