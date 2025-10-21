import moment from 'moment';
import uuid from 'uuid';
import { APPLICATION_NAMES, ITEM_STATUS_NAMES, REQUEST_TYPES } from '../../support/constants';
import permissions from '../../support/dictionary/permissions';
import CheckInActions from '../../support/fragments/check-in-actions/checkInActions';
import AwaitingPickupForARequest from '../../support/fragments/checkin/modals/awaitingPickupForARequest';
import Checkout from '../../support/fragments/checkout/checkout';
import CirculationRules from '../../support/fragments/circulation/circulation-rules';
import RequestPolicy from '../../support/fragments/circulation/request-policy';
import InventoryInstance from '../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import NewRequest from '../../support/fragments/requests/newRequest';
import Requests from '../../support/fragments/requests/requests';
import OtherSettings from '../../support/fragments/settings/circulation/otherSettings';
import Location from '../../support/fragments/settings/tenant/locations/newLocation';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import PatronGroups from '../../support/fragments/settings/users/patronGroups';
import TopMenu from '../../support/fragments/topMenu';
import TopMenuNavigation from '../../support/fragments/topMenuNavigation';
import UserEdit from '../../support/fragments/users/userEdit';
import Users from '../../support/fragments/users/users';
import generateItemBarcode from '../../support/utils/generateItemBarcode';
import getRandomPostfix from '../../support/utils/stringTools';

describe('Staff slips', () => {
  const userData = {};
  const requestUserData = {};
  const patronGroup = {
    name: `groupChekIn ${getRandomPostfix()}`,
  };
  const testData = {
    userServicePoint: ServicePoints.getDefaultServicePointWithPickUpLocation(),
  };
  const itemData = {
    barcode: generateItemBarcode(),
    title: `Instance_${getRandomPostfix()}`,
    servicePoint: testData.userServicePoint.name,
  };
  const requestPolicyBody = {
    requestTypes: [REQUEST_TYPES.HOLD],
    name: `hold${getRandomPostfix()}`,
    id: uuid(),
  };

  before('Preconditions', () => {
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
          name: `type_C347898_${getRandomPostfix()}`,
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

    OtherSettings.setOtherSettingsViaApi({ prefPatronIdentifier: 'barcode,username' });
    PatronGroups.createViaApi(patronGroup.name).then((patronGroupResponse) => {
      patronGroup.id = patronGroupResponse;
    });
    cy.createTempUser(
      [permissions.checkinAll.gui, permissions.checkoutAll.gui, permissions.uiRequestsAll.gui],
      patronGroup.name,
    )
      .then((userProperties) => {
        userData.username = userProperties.username;
        userData.password = userProperties.password;
        userData.userId = userProperties.userId;
        userData.barcode = userProperties.barcode;
      })
      .then(() => {
        UserEdit.addServicePointViaApi(
          testData.userServicePoint.id,
          userData.userId,
          testData.userServicePoint.id,
        );

        cy.createTempUser([permissions.uiRequestsAll.gui], patronGroup.name).then(
          (userProperties) => {
            requestUserData.username = userProperties.username;
            requestUserData.userId = userProperties.userId;
            requestUserData.barcode = userProperties.barcode;
            UserEdit.addServicePointViaApi(
              testData.userServicePoint.id,
              requestUserData.userId,
              testData.userServicePoint.id,
            );
          },
        );

        Checkout.checkoutItemViaApi({
          id: uuid(),
          itemBarcode: itemData.barcode,
          loanDate: moment.utc().format(),
          servicePointId: testData.userServicePoint.id,
          userBarcode: userData.barcode,
        });
      });
  });

  after('Deleting created entities', () => {
    cy.getAdminToken();
    CheckInActions.checkinItemViaApi({
      itemBarcode: itemData.barcode,
      servicePointId: testData.userServicePoint.id,
      checkInDate: new Date().toISOString(),
    });
    RequestPolicy.deleteViaApi(requestPolicyBody.id);
    CirculationRules.deleteRuleViaApi(testData.addedRule);
    UserEdit.changeServicePointPreferenceViaApi(userData.userId, [testData.userServicePoint.id]);
    UserEdit.changeServicePointPreferenceViaApi(requestUserData.userId, [
      testData.userServicePoint.id,
    ]);
    ServicePoints.deleteViaApi(testData.userServicePoint.id);
    Requests.getRequestApi({ query: `(item.barcode=="${itemData.barcode}")` }).then(
      (requestResponse) => {
        Requests.deleteRequestViaApi(requestResponse[0].id);
      },
    );
    Users.deleteViaApi(userData.userId);
    Users.deleteViaApi(requestUserData.userId);
    PatronGroups.deleteViaApi(patronGroup.id);
    cy.deleteItemViaApi(itemData.itemId);
    cy.deleteHoldingRecordViaApi(itemData.holdingId);
    InventoryInstance.deleteInstanceViaApi(itemData.instanceId);
    Location.deleteInstitutionCampusLibraryLocationViaApi(
      testData.defaultLocation.institutionId,
      testData.defaultLocation.campusId,
      testData.defaultLocation.libraryId,
      testData.defaultLocation.id,
    );
    cy.deleteLoanType(testData.loanTypeId);
  });

  it('C347898 Hold slip (vega)', { tags: ['criticalPath', 'vega', 'C347898'] }, () => {
    cy.login(userData.username, userData.password, {
      path: TopMenu.requestsPath,
      waiter: Requests.waitLoading,
    });

    NewRequest.createNewRequest({
      requesterBarcode: requestUserData.barcode,
      itemBarcode: itemData.barcode,
      pickupServicePoint: testData.userServicePoint.name,
      requestType: REQUEST_TYPES.HOLD,
    });

    TopMenuNavigation.navigateToApp(APPLICATION_NAMES.CHECK_IN);
    CheckInActions.checkInItemGui(itemData.barcode);
    AwaitingPickupForARequest.verifyModalTitle();
    AwaitingPickupForARequest.unselectCheckboxPrintSlip();
    AwaitingPickupForARequest.checkModalMessage(itemData);
    AwaitingPickupForARequest.closeModal();
  });
});
