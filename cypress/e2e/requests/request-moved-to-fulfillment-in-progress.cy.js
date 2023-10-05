import { TestTypes, DevTeams, Permissions } from '../../support/dictionary';
import {
  ITEM_STATUS_NAMES,
  REQUEST_TYPES,
  FULFILMENT_PREFERENCES,
  REQUEST_LEVELS,
} from '../../support/constants';
import UserEdit from '../../support/fragments/users/userEdit';
import TopMenu from '../../support/fragments/topMenu';
import generateItemBarcode from '../../support/utils/generateItemBarcode';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import PatronGroups from '../../support/fragments/settings/users/patronGroups';
import Location from '../../support/fragments/settings/tenant/locations/newLocation';
import SwitchServicePoint from '../../support/fragments/settings/tenant/servicePoints/switchServicePoint';
import Users from '../../support/fragments/users/users';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import getRandomPostfix from '../../support/utils/stringTools';
import SettingsMenu from '../../support/fragments/settingsMenu';
import TitleLevelRequests from '../../support/fragments/settings/circulation/titleLevelRequests';
import Requests from '../../support/fragments/requests/requests';
import RequestDetail from '../../support/fragments/requests/requestDetail';
import CheckInActions from '../../support/fragments/check-in-actions/checkInActions';
import InTransit from '../../support/fragments/checkin/modals/inTransit';

describe('Title Level Request. Request queue. TLR', () => {
  let userData = {};
  let requestId;
  const testData = {
    servicePoint: ServicePoints.getDefaultServicePointWithPickUpLocation(),
    servicePoint2: ServicePoints.getDefaultServicePointWithPickUpLocation(),
    barcode: generateItemBarcode(),
    title: `Instance_C350425_${getRandomPostfix()}`,
  };
  const patronGroup = {
    name: 'groupTLR' + getRandomPostfix(),
  };

  before('Preconditions:', () => {
    cy.getAdminToken()
      .then(() => {
        ServicePoints.createViaApi(testData.servicePoint);
        ServicePoints.createViaApi(testData.servicePoint2);
        cy.loginAsAdmin({
          path: SettingsMenu.circulationTitleLevelRequestsPath,
          waiter: TitleLevelRequests.waitLoading,
        });
        TitleLevelRequests.changeTitleLevelRequestsStatus('allow');
        testData.defaultLocation = Location.getDefaultLocation(testData.servicePoint.id);
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
          testData.materialType = materialTypes.name;
        });
      })
      .then(() => {
        InventoryInstances.createFolioInstanceViaApi({
          instance: {
            instanceTypeId: testData.instanceTypeId,
            title: testData.title,
          },
          holdings: [
            {
              holdingsTypeId: testData.holdingTypeId,
              permanentLocationId: testData.defaultLocation.id,
            },
          ],
          items: [
            {
              barcode: testData.barcode,
              status: { name: ITEM_STATUS_NAMES.AVAILABLE },
              permanentLoanType: { id: testData.loanTypeId },
              materialType: { id: testData.materialTypeId },
            },
          ],
        }).then((specialInstanceIds) => {
          testData.instanceId = specialInstanceIds.instanceId;
          testData.holdingId = specialInstanceIds.holdingIds[0].id;
          testData.itemId = specialInstanceIds.holdingIds[0].itemIds;
        });
      });
    PatronGroups.createViaApi(patronGroup.name).then((patronGroupResponse) => {
      patronGroup.id = patronGroupResponse;
    });

    cy.createTempUser(
      [
        Permissions.uiRequestsCreate.gui,
        Permissions.uiRequestsView.gui,
        Permissions.uiRequestsEdit.gui,
        Permissions.requestsAll.gui,
        Permissions.checkinAll.gui,
      ],
      patronGroup.name,
    ).then((userProperties) => {
      userData = userProperties;
      UserEdit.addServicePointsViaApi(
        [testData.servicePoint.id, testData.servicePoint2.id],
        userData.userId,
        testData.servicePoint.id,
      );
      Requests.createNewRequestViaApi({
        fulfillmentPreference: FULFILMENT_PREFERENCES.HOLD_SHELF,
        instanceId: testData.instanceId,
        pickupServicePointId: testData.servicePoint.id,
        requestDate: new Date(),
        requestLevel: REQUEST_LEVELS.TITLE,
        requestType: REQUEST_TYPES.PAGE,
        requesterId: userData.userId,
      }).then((createdRequest) => {
        requestId = createdRequest.body.id;
      });
      cy.login(userData.username, userData.password);
    });
  });

  after('Deleting created entities', () => {
    Requests.deleteRequestViaApi(requestId);
    UserEdit.changeServicePointPreferenceViaApi(userData.userId, [
      testData.servicePoint.id,
      testData.servicePoint2.id,
    ]);
    ServicePoints.deleteViaApi(testData.servicePoint.id);
    ServicePoints.deleteViaApi(testData.servicePoint2.id);
    InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(testData.barcode);
    Users.deleteViaApi(userData.userId);
    PatronGroups.deleteViaApi(patronGroup.id);
    Location.deleteViaApiIncludingInstitutionCampusLibrary(
      testData.defaultLocation.institutionId,
      testData.defaultLocation.campusId,
      testData.defaultLocation.libraryId,
      testData.defaultLocation.id,
    );
  });

  it(
    'C350425 Check that request goes to "Fulfillment in progress" if the items status has changed to "In progress" (vega) (TaaS)',
    { tags: [TestTypes.criticalPath, DevTeams.vega] },
    () => {
      SwitchServicePoint.switchServicePoint(testData.servicePoint2.name);
      SwitchServicePoint.checkIsServicePointSwitched(testData.servicePoint2.name);
      cy.visit(TopMenu.checkInPath);
      CheckInActions.waitLoading();
      CheckInActions.checkInItem(testData.barcode);
      InTransit.verifyModalTitle();
      InTransit.unselectCheckboxPrintSlip();
      InTransit.closeModal();
      CheckInActions.endCheckInSessionAndCheckDetailsOfCheckInAreCleared();
      cy.visit(TopMenu.requestsPath);
      Requests.findCreatedRequest(testData.barcode);
      Requests.selectFirstRequest(testData.barcode);
      RequestDetail.checkItemInformation({
        itemBarcode: testData.barcode,
        title: testData.title,
        effectiveLocation: testData.defaultLocation.name,
        itemStatus: ITEM_STATUS_NAMES.IN_TRANSIT,
        requestsOnItem: '1',
      });
      RequestDetail.checkRequestInformation({
        type: REQUEST_TYPES.PAGE,
        status: 'Open - In transit',
        level: REQUEST_LEVELS.TITLE,
      });
      RequestDetail.requestQueueOnInstance(testData.title);
      RequestDetail.checkRequestMovedToFulfillmentInProgress(testData.barcode);
    },
  );
});
