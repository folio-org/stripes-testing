import permissions from '../../support/dictionary/permissions';
import EditStaffClips from '../../support/fragments/circulation/editStaffClips';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import PatronGroups from '../../support/fragments/settings/users/patronGroups';
import SettingsMenu from '../../support/fragments/settingsMenu';
import UserEdit from '../../support/fragments/users/userEdit';
import Users from '../../support/fragments/users/users';
import dateTools from '../../support/utils/dateTools';
import { getTestEntityValue } from '../../support/utils/stringTools';

describe('adding new tokens', () => {
  let userData;
  let servicePointId;
  const patronGroup = {
    name: getTestEntityValue('groupToken'),
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
    EditStaffClips.editAndClearHold();
    Users.deleteViaApi(userData.userId);
    PatronGroups.deleteViaApi(patronGroup.id);
  });

  it(
    'C411863 Verify that record meta data is present on staff slips (volaris)',
    { tags: ['extendedPath', 'volaris'] },
    () => {
      cy.visit(SettingsMenu.circulationStaffSlipsPath);
      EditStaffClips.editHold();
      EditStaffClips.checkLastUpdateInfo();
      EditStaffClips.editDescription(getTestEntityValue('NewDescription'));
      EditStaffClips.collapseAll();
      EditStaffClips.expandAll();
      EditStaffClips.editTemplateContent(getTestEntityValue('NewTemplateContent'));
      EditStaffClips.saveAndClose();
      EditStaffClips.checkLastUpdateInfo(
        undefined,
        'Unknown user',
        dateTools.getCurrentUTCTime().replace(',', ''),
      );
    },
  );
});
