import devTeams from '../../support/dictionary/devTeams';
import permissions from '../../support/dictionary/permissions';
import { getTestEntityValue } from '../../support/utils/stringTools';
import {
  FULFILMENT_PREFERENCES,
  REQUEST_LEVELS,
  REQUEST_TYPES,
  ITEM_STATUS_NAMES,
} from '../../support/constants';
import generateItemBarcode from '../../support/utils/generateItemBarcode';
import TopMenu from '../../support/fragments/topMenu';
import SettingsMenu from '../../support/fragments/settingsMenu';
import TestTypes from '../../support/dictionary/testTypes';
import EditStaffClips from '../../support/fragments/circulation/editStaffClips';
import Users from '../../support/fragments/users/users';
import PatronGroups from '../../support/fragments/settings/users/patronGroups';
import Requests from '../../support/fragments/requests/requests';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import UserEdit from '../../support/fragments/users/userEdit';
import NewRequest from '../../support/fragments/requests/newRequest';
import Location from '../../support/fragments/settings/tenant/locations/newLocation';

describe('Staff slips', () => {
  let userData;
  const patronGroup = {
    name: getTestEntityValue('groupStaffSlips'),
  };
  const testData = {
    userServicePoint: ServicePoints.getDefaultServicePointWithPickUpLocation(),
    itemBarcode: generateItemBarcode(),
  };
  const instanceData = {
    title: getTestEntityValue('InstanceStaffSlips'),
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
        cy.getLoanTypes({ limit: 1 }).then((loanTypes) => {
          testData.loanTypeId = loanTypes[0].id;
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
              barcode: testData.itemBarcode,
              status: { name: ITEM_STATUS_NAMES.AVAILABLE },
              permanentLoanType: { id: testData.loanTypeId },
              materialType: { id: testData.materialTypeId },
            },
          ],
        }).then((specialInstanceIds) => {
          instanceData.instanceId = specialInstanceIds.instanceId;
          instanceData.holdingId = specialInstanceIds.holdingIds[0].id;
          instanceData.itemId = specialInstanceIds.holdingIds[0].itemIds[0];
        });
      })
      .then(() => {
        PatronGroups.createViaApi(patronGroup.name).then((patronGroupResponse) => {
          patronGroup.id = patronGroupResponse;
        });
        cy.createTempUser(
          [permissions.uiCirculationCreateEditRemoveStaffSlips.gui, permissions.requestsAll.gui],
          patronGroup.name,
        ).then((userProperties) => {
          userData = userProperties;
          UserEdit.addServicePointViaApi(
            testData.userServicePoint.id,
            userData.userId,
            testData.userServicePoint.id,
          );
        });
      })
      .then(() => {
        Requests.createNewRequestViaApi({
          fulfillmentPreference: FULFILMENT_PREFERENCES.HOLD_SHELF,
          holdingsRecordId: testData.holdingTypeId,
          instanceId: instanceData.instanceId,
          item: { barcode: testData.itemBarcode },
          itemId: instanceData.itemId,
          pickupServicePointId: testData.userServicePoint.id,
          requestDate: new Date(),
          requestExpirationDate: new Date(new Date().getTime() + 86400000),
          requestLevel: REQUEST_LEVELS.ITEM,
          requestType: REQUEST_TYPES.PAGE,
          requesterId: userData.userId,
        }).then((request) => {
          testData.requestsId = request.body.id;
          cy.login(userData.username, userData.password);
        });
      });
  });

  after('Deleting created entities', () => {
    Requests.deleteRequestViaApi(testData.requestsId);
    UserEdit.changeServicePointPreferenceViaApi(userData.userId, [testData.userServicePoint.id]);
    ServicePoints.deleteViaApi(testData.userServicePoint.id);
    Users.deleteViaApi(userData.userId);
    PatronGroups.deleteViaApi(patronGroup.id);
    InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(testData.itemBarcode);
    Location.deleteViaApiIncludingInstitutionCampusLibrary(
      testData.defaultLocation.institutionId,
      testData.defaultLocation.campusId,
      testData.defaultLocation.libraryId,
      testData.defaultLocation.id,
    );
  });

  it(
    'C375293 Add "requester.patronGroup" as staff slip token in Settings (volaris)',
    { tags: [TestTypes.criticalPath, devTeams.volaris] },
    () => {
      cy.visit(SettingsMenu.circulationStaffSlipsPath);
      EditStaffClips.editTransit();
      EditStaffClips.addToken(['requester.patronGroup']);
      EditStaffClips.saveAndClose();
      EditStaffClips.checkAfterUpdate('Transit');
      EditStaffClips.checkPreview('Transit', 'Undergraduate');
      EditStaffClips.editAndClearTransit();
    },
  );

  it(
    'C387442 Add "Departments" as staff slip token in Settings (volaris)',
    { tags: [TestTypes.criticalPath, devTeams.volaris] },
    () => {
      cy.visit(SettingsMenu.circulationStaffSlipsPath);
      EditStaffClips.editTransit();
      EditStaffClips.addToken(['requester.departments']);
      EditStaffClips.saveAndClose();
      EditStaffClips.checkAfterUpdate('Transit');
      EditStaffClips.checkPreview('Transit', 'Library Technical Services; IT Operations');
      EditStaffClips.editAndClearTransit();
    },
  );

  it(
    'C388508 Verify that token "currentDateTime" is populated in the pick slip (volaris)',
    { tags: [TestTypes.criticalPath, devTeams.volaris] },
    () => {
      cy.visit(SettingsMenu.circulationStaffSlipsPath);
      EditStaffClips.editPickslip();
      EditStaffClips.addToken(['staffSlip.currentDateTime']);
      EditStaffClips.saveAndClose();
      EditStaffClips.checkAfterUpdate('Pick slip');
      cy.visit(TopMenu.requestsPath);
      cy.wait(5000);
      NewRequest.printPickSlips();
      cy.visit(SettingsMenu.circulationStaffSlipsPath);
      EditStaffClips.editPickslip();
      EditStaffClips.clearStaffClips();
    },
  );
});
