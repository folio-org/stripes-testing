import { STAFF_SLIP_NAMES } from '../../../support/constants';
import Permissions from '../../../support/dictionary/permissions';
import EditStaffClips from '../../../support/fragments/circulation/editStaffClips';
import StaffSlip from '../../../support/fragments/settings/circulation/staffSlips/staffSlip';
import StaffSlips from '../../../support/fragments/settings/circulation/staffSlips/staffSlips';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import Users from '../../../support/fragments/users/users';
import { getTestEntityValue } from '../../../support/utils/stringTools';

describe('Permissions -> Circulation', () => {
  const userData = {};
  const description = getTestEntityValue('NewDescription');

  before('Prepare test data', () => {
    cy.getAdminToken().then(() => {
      cy.createTempUser([Permissions.uiCirculationCreateEditRemoveStaffSlips.gui])
        .then((userProperties) => {
          userData.username = userProperties.username;
          userData.password = userProperties.password;
          userData.userId = userProperties.userId;
        })
        .then(() => {
          cy.login(userData.username, userData.password, {
            path: SettingsMenu.circulationStaffSlipsPath,
            waiter: EditStaffClips.waitLoading,
          });
        });
    });
  });

  after('Delete test data', () => {
    cy.getAdminToken();
    Users.deleteViaApi(userData.userId);
  });

  it(
    'C1219 Settings (Circ): Can create, edit and remove staff slips (vega)',
    { tags: ['extendedPath', 'vega', 'C1219'] },
    () => {
      StaffSlips.chooseStaffClip(STAFF_SLIP_NAMES.HOLD);
      StaffSlip.edit(STAFF_SLIP_NAMES.HOLD);
      EditStaffClips.editDescription(description);
      EditStaffClips.saveAndClose();
      StaffSlip.checkAfterUpdate(STAFF_SLIP_NAMES.HOLD);
      StaffSlip.verifyKeyValue('Description', description);
    },
  );
});
