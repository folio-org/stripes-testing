import devTeams from '../../support/dictionary/devTeams';
import permissions from '../../support/dictionary/permissions';
import { getTestEntityValue } from '../../support/utils/stringTools';
import SettingsMenu from '../../support/fragments/settingsMenu';
import TestTypes from '../../support/dictionary/testTypes';
import EditStaffClips from '../../support/fragments/circulation/editStaffClips';
import Users from '../../support/fragments/users/users';
import PatronGroups from '../../support/fragments/settings/users/patronGroups';

describe('Staff slips', () => {
  let userData;
  const patronGroup = {
    name: getTestEntityValue('groupStaffSlips'),
  };
  before('Preconditions', () => {
    cy.getAdminToken().then(() => {
      PatronGroups.createViaApi(patronGroup.name).then((patronGroupResponse) => {
        patronGroup.id = patronGroupResponse;
      });
      cy.createTempUser([permissions.uiCirculationCreateEditRemoveStaffSlips.gui], patronGroup.name).then(
        (userProperties) => {
          userData = userProperties;
          cy.login(userData.username, userData.password);
        }
      );
    });
  });

  after('Deleting created entities', () => {
    EditStaffClips.editAndClearTransit();
    Users.deleteViaApi(userData.userId);
    PatronGroups.deleteViaApi(patronGroup.id);
  });

  it(
    'C375293 Add "requester.patronGroup" as staff slip token in Settings',
    { tags: [TestTypes.criticalPath, devTeams.volaris] },
    () => {
      cy.visit(SettingsMenu.circulationStaffSlipsPath);
      EditStaffClips.editTransit();
      EditStaffClips.addToken(['requester.patronGroup']);
      EditStaffClips.saveAndClose();
      EditStaffClips.checkAfterUpdate('Transit');
      EditStaffClips.checkPreview('Transit', 'Undergraduate');
    }
  );
});
