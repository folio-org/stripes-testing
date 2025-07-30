import permissions from '../../support/dictionary/permissions';
import EditStaffClips from '../../support/fragments/circulation/editStaffClips';
import StaffSlip from '../../support/fragments/settings/circulation/staffSlips/staffSlip';
import StaffSlips from '../../support/fragments/settings/circulation/staffSlips/staffSlips';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import PatronGroups from '../../support/fragments/settings/users/patronGroups';
import SettingsMenu from '../../support/fragments/settingsMenu';
import UserEdit from '../../support/fragments/users/userEdit';
import Users from '../../support/fragments/users/users';
import dateTools from '../../support/utils/dateTools';
import { getTestEntityValue } from '../../support/utils/stringTools';

describe('INN-Reach Integration', () => {
  describe('INN-Reach tokens', () => {
    let userData;
    let servicePointId;
    const staffSlip = 'Hold';
    const patronGroup = {
      name: getTestEntityValue('groupToken'),
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
          [permissions.uiCirculationCreateEditRemoveStaffSlips.gui],
          patronGroup.name,
        ).then((userProperties) => {
          userData = userProperties;
          UserEdit.addServicePointViaApi(servicePointId, userData.userId, servicePointId);
          cy.login(userData.username, userData.password, {
            path: SettingsMenu.circulationStaffSlipsPath,
            waiter: EditStaffClips.waitLoading,
          });
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
      { tags: ['extendedPathFlaky', 'volaris', 'C411863'] },
      () => {
        StaffSlips.chooseStaffClip(staffSlip);
        StaffSlip.edit(staffSlip);
        EditStaffClips.checkLastUpdateInfo();
        EditStaffClips.editDescription(getTestEntityValue('NewDescription'));
        EditStaffClips.collapseAll();
        EditStaffClips.expandAll();
        EditStaffClips.editTemplateContent(getTestEntityValue('NewTemplateContent'));
        EditStaffClips.saveAndClose();
        StaffSlip.checkLastUpdateInfo(
          undefined,
          'Unknown user',
          dateTools.getCurrentUTCTime().replace(',', ''),
        );
      },
    );
  });
});
