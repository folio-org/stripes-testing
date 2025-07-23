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
    { tags: ['smoke', 'volaris', 'C387437'] },
    () => {
      StaffSlips.chooseStaffClip(STAFF_SLIP_NAMES.HOLD);
      StaffSlip.checkLastUpdateInfo();
      StaffSlip.collapseAll();
      StaffSlip.expandAll();
    },
  );
});
