import {
  FULFILMENT_PREFERENCES,
  REQUEST_LEVELS,
  REQUEST_TYPES,
  STAFF_SLIP_NAMES,
} from '../../support/constants';
import permissions from '../../support/dictionary/permissions';
import EditStaffClips from '../../support/fragments/circulation/editStaffClips';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import NewRequest from '../../support/fragments/requests/newRequest';
import Requests from '../../support/fragments/requests/requests';
import Location from '../../support/fragments/settings/tenant/locations/newLocation';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import PatronGroups from '../../support/fragments/settings/users/patronGroups';
import SettingsMenu from '../../support/fragments/settingsMenu';
import TopMenu from '../../support/fragments/topMenu';
import UserEdit from '../../support/fragments/users/userEdit';
import Users from '../../support/fragments/users/users';
import { getTestEntityValue } from '../../support/utils/stringTools';

describe('Staff slips', () => {
  let userData;
  const patronGroup = {
    name: getTestEntityValue('groupStaffSlips'),
  };
  const testData = {
    servicePoint: ServicePoints.getDefaultServicePointWithPickUpLocation(),
    folioInstances: InventoryInstances.generateFolioInstances(),
  };

  before('Preconditions', () => {
    cy.getAdminToken()
      .then(() => {
        ServicePoints.createViaApi(testData.servicePoint);
        testData.defaultLocation = Location.getDefaultLocation(testData.servicePoint.id);
        Location.createViaApi(testData.defaultLocation).then((location) => {
          InventoryInstances.createFolioInstancesViaApi({
            folioInstances: testData.folioInstances,
            location,
          });
        });
      })
      .then(() => {
        PatronGroups.createViaApi(patronGroup.name).then((patronGroupResponse) => {
          patronGroup.id = patronGroupResponse;
        });
        cy.createTempUser(
          [permissions.uiCirculationCreateEditRemoveStaffSlips.gui, permissions.uiRequestsAll.gui],
          patronGroup.name,
        ).then((userProperties) => {
          userData = userProperties;
          UserEdit.addServicePointViaApi(
            testData.servicePoint.id,
            userData.userId,
            testData.servicePoint.id,
          );
        });
      })
      .then(() => {
        Requests.createNewRequestViaApi({
          fulfillmentPreference: FULFILMENT_PREFERENCES.HOLD_SHELF,
          holdingsRecordId: testData.folioInstances[0].holdings[0].id,
          instanceId: testData.folioInstances[0].instanceId,
          item: { barcode: testData.folioInstances[0].barcodes[0] },
          itemId: testData.folioInstances[0].itemIds[0],
          pickupServicePointId: testData.servicePoint.id,
          requestDate: new Date(),
          requestExpirationDate: new Date(new Date().getTime() + 86400000),
          requestLevel: REQUEST_LEVELS.ITEM,
          requestType: REQUEST_TYPES.PAGE,
          requesterId: userData.userId,
        }).then((request) => {
          testData.requestsId = request.body.id;
        });
      });
  });

  beforeEach('Login', () => {
    cy.login(userData.username, userData.password, {
      path: SettingsMenu.circulationStaffSlipsPath,
      waiter: EditStaffClips.waitLoading,
    });
  });

  after('Deleting created entities', () => {
    cy.getAdminToken();
    Requests.deleteRequestViaApi(testData.requestsId);
    UserEdit.changeServicePointPreferenceViaApi(userData.userId, [testData.servicePoint.id]);
    ServicePoints.deleteViaApi(testData.servicePoint.id);
    Users.deleteViaApi(userData.userId);
    PatronGroups.deleteViaApi(patronGroup.id);
    InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(
      testData.folioInstances[0].instanceId,
    );
    Location.deleteInstitutionCampusLibraryLocationViaApi(
      testData.defaultLocation.institutionId,
      testData.defaultLocation.campusId,
      testData.defaultLocation.libraryId,
      testData.defaultLocation.id,
    );
  });

  it(
    'C375293 Add "requester.patronGroup" as staff slip token in Settings (volaris)',
    { tags: ['criticalPath', 'volaris', 'C375293'] },
    () => {
      EditStaffClips.editTransit();
      EditStaffClips.addToken(['requester.patronGroup']);
      EditStaffClips.saveAndClose();
      EditStaffClips.checkAfterUpdate(STAFF_SLIP_NAMES.TRANSIT);
      EditStaffClips.checkPreview(STAFF_SLIP_NAMES.TRANSIT, 'Undergraduate');
      EditStaffClips.editAndClearTransit();
    },
  );

  it(
    'C387442 Add "Departments" as staff slip token in Settings (volaris)',
    { tags: ['criticalPath', 'volaris', 'C387442'] },
    () => {
      EditStaffClips.editTransit();
      EditStaffClips.addToken(['requester.departments']);
      EditStaffClips.saveAndClose();
      EditStaffClips.checkAfterUpdate(STAFF_SLIP_NAMES.TRANSIT);
      EditStaffClips.checkPreview(
        STAFF_SLIP_NAMES.TRANSIT,
        'Library Technical Services; IT Operations',
      );
      EditStaffClips.editAndClearTransit();
    },
  );

  it(
    'C388508 Verify that token "currentDateTime" is populated in the pick slip (volaris)',
    { tags: ['criticalPath', 'volaris', 'C388508'] },
    () => {
      EditStaffClips.editPickslip();
      EditStaffClips.addToken(['staffSlip.currentDateTime']);
      EditStaffClips.saveAndClose();
      EditStaffClips.checkAfterUpdate(STAFF_SLIP_NAMES.PICK_SLIP);
      cy.visit(TopMenu.requestsPath);
      cy.wait(5000);
      NewRequest.printPickSlips();
      cy.visit(SettingsMenu.circulationStaffSlipsPath);
      EditStaffClips.editPickslip();
      EditStaffClips.clearStaffClips();
    },
  );
});
