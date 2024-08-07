import Permissions from '../../../support/dictionary/permissions';
import EditStaffClips from '../../../support/fragments/circulation/editStaffClips';
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
    { tags: ['extendedPath', 'vega'] },
    () => {
      EditStaffClips.editHold();
      EditStaffClips.editDescription(description);
      EditStaffClips.saveAndClose();
      EditStaffClips.checkAfterUpdate('Hold');
      EditStaffClips.verifyKeyValue('Description', description);
    },
  );
});
