import permissions from '../../support/dictionary/permissions';
import EditStaffClips from '../../support/fragments/circulation/editStaffClips';
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
      ServicePoints.getViaApi({ limit: 1, query: 'name=="Circ Desk 1"' }).then((servicePoints) => {
        servicePointId = servicePoints[0].id;
      });
      PatronGroups.createViaApi(patronGroup.name).then((patronGroupResponse) => {
        patronGroup.id = patronGroupResponse;
      });
      cy.createTempUser(
        [permissions.uiCirculationCreateEditRemoveStaffSlips.gui],
        patronGroup.name,
      ).then((userProperties) => {
        userData = userProperties;
        UserEdit.addServicePointViaApi(servicePointId, userData.userId, servicePointId);
        cy.login(userData.username, userData.password);
      });
    });
  });

  after('Deleting created entities', () => {
    cy.getAdminToken();
    Users.deleteViaApi(userData.userId);
    PatronGroups.deleteViaApi(patronGroup.id);
  });

  it(
    'C387437 Add metadata information to view of Staff Slips scenario 1,4,5 (volaris)',
    { tags: ['extendedPath', 'volaris'] },
    () => {
      cy.visit(SettingsMenu.circulationStaffSlipsPath);
      EditStaffClips.chooseStaffClip('Hold');
      EditStaffClips.checkLastUpdateInfo();
      EditStaffClips.collapseAll();
      EditStaffClips.expandAll();
    },
  );
});
