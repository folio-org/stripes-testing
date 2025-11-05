import { STAFF_SLIP_NAMES } from '../../support/constants';
import Permissions from '../../support/dictionary/permissions';
import EditStaffClips from '../../support/fragments/circulation/editStaffClips';
import StaffSlip from '../../support/fragments/settings/circulation/staffSlips/staffSlip';
import StaffSlips from '../../support/fragments/settings/circulation/staffSlips/staffSlips';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import PatronGroups from '../../support/fragments/settings/users/patronGroups';
import SettingsMenu from '../../support/fragments/settingsMenu';
import UserEdit from '../../support/fragments/users/userEdit';
import Users from '../../support/fragments/users/users';
import { getTestEntityValue } from '../../support/utils/stringTools';

describe('Staff slips', () => {
  let userData;
  let servicePointId;
  const patronGroup = {
    name: getTestEntityValue('groupUserChange'),
  };

  before('Preconditions', () => {
    cy.getAdminToken().then(() => {
      ServicePoints.getCircDesk1ServicePointViaApi().then((servicePoint) => {
        servicePointId = servicePoint.id;
      });
      PatronGroups.createViaApi(patronGroup.name).then((patronGroupResponse) => {
        patronGroup.id = patronGroupResponse;
      });
      cy.createTempUser(
        [Permissions.uiCirculationCreateEditRemoveStaffSlips.gui],
        patronGroup.name,
      ).then((userProperties) => {
        userData = userProperties;
        UserEdit.addServicePointViaApi(servicePointId, userData.userId, servicePointId);

        cy.login(userData.username, userData.password, {
          path: SettingsMenu.circulationStaffSlipsPath,
          waiter: EditStaffClips.waitLoading,
        });

        const staffSlips = [
          STAFF_SLIP_NAMES.DUE_DATE_RECEIPT,
          STAFF_SLIP_NAMES.HOLD,
          STAFF_SLIP_NAMES.PICK_SLIP,
          STAFF_SLIP_NAMES.REQUEST_DELIVERY,
          STAFF_SLIP_NAMES.SEARCH_SLIP_HOLD_REQUESTS,
          STAFF_SLIP_NAMES.TRANSIT,
        ];

        staffSlips.forEach((slipName) => {
          StaffSlips.chooseStaffClip(slipName);
          StaffSlip.edit(slipName);
          EditStaffClips.editDescription(getTestEntityValue('UpdatedDescription'));
          EditStaffClips.saveAndClose();
          StaffSlip.checkAfterUpdate(slipName);
        });

        cy.getAdminToken();
        Users.deleteViaApi(userData.userId);
        Users.waitForUserDeletion({ id: userData.userId });

        cy.createTempUser(
          [Permissions.uiCirculationCreateEditRemoveStaffSlips.gui, Permissions.uiUsersView.gui],
          patronGroup.name,
        ).then((testUserProperties) => {
          userData = testUserProperties;
          cy.login(userData.username, userData.password, {
            path: SettingsMenu.circulationStaffSlipsPath,
            waiter: EditStaffClips.waitLoading,
          });
        });
      });
    });
  });

  after('Deleting created entities', () => {
    cy.getAdminToken();
    Users.deleteViaApi(userData.userId);
    PatronGroups.deleteViaApi(patronGroup.id);
  });

  it(
    'C387438 Metadata accordion contains "Unknown user" when user last edited Staff Slip was deleted (volaris)',
    { tags: ['extendedPath', 'volaris', 'C387438'] },
    () => {
      StaffSlips.waitLoading();
      // Step 2: Click on first staff slip record (Due date receipt)
      StaffSlips.chooseStaffClip(STAFF_SLIP_NAMES.DUE_DATE_RECEIPT);

      // Step 3: Click on "Record last updated" accordion
      StaffSlip.checkUnknownUserInMetadata();

      // Step 4: Click on next slip (Hold) and repeat step #3
      StaffSlips.chooseStaffClip(STAFF_SLIP_NAMES.HOLD);
      StaffSlip.checkUnknownUserInMetadata();

      // Step 5: Click on next slip (Pick slip) and repeat step #3
      StaffSlips.chooseStaffClip(STAFF_SLIP_NAMES.PICK_SLIP);
      StaffSlip.checkUnknownUserInMetadata();

      // Step 6: Click on next slip (Request delivery) and repeat step #3
      StaffSlips.chooseStaffClip(STAFF_SLIP_NAMES.REQUEST_DELIVERY);
      StaffSlip.checkUnknownUserInMetadata();

      // Step 7: Click on next slip (Search slip (Hold requests)) and repeat step #3
      StaffSlips.chooseStaffClip(STAFF_SLIP_NAMES.SEARCH_SLIP_HOLD_REQUESTS);
      StaffSlip.checkUnknownUserInMetadata();

      // Step 8: Click on next slip (Transit) and repeat step #3
      StaffSlips.chooseStaffClip(STAFF_SLIP_NAMES.TRANSIT);
      StaffSlip.checkUnknownUserInMetadata();
    },
  );
});
