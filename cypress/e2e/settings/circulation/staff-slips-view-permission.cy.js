import StaffSlips from '../../../support/fragments/settings/circulation/staffSlips/staffSlips';
import StaffSlip from '../../../support/fragments/settings/circulation/staffSlips/staffSlip';
import Users from '../../../support/fragments/users/users';
import Permissions from '../../../support/dictionary/permissions';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import EditStaffClips from '../../../support/fragments/circulation/editStaffClips';
import { STAFF_SLIP_NAMES } from '../../../support/constants';

describe('Permissions -> Circulation', () => {
  let tempUser;
  const staffSlipNamesWithoutTransitMediatedRequests = [
    STAFF_SLIP_NAMES.DUE_DATE_RECEIPT,
    STAFF_SLIP_NAMES.HOLD,
    STAFF_SLIP_NAMES.PICK_SLIP,
    STAFF_SLIP_NAMES.REQUEST_DELIVERY,
    STAFF_SLIP_NAMES.SEARCH_SLIP_HOLD_REQUESTS,
    STAFF_SLIP_NAMES.TRANSIT,
  ];

  before('Create user with view staff slips permission', () => {
    cy.getAdminToken().then(() => {
      cy.createTempUser([Permissions.uiCirculationViewStaffSlips.gui])
        .then((userProperties) => {
          tempUser = userProperties;
        })
        .then(() => {
          cy.login(tempUser.username, tempUser.password, {
            path: SettingsMenu.circulationStaffSlipsPath,
            waiter: EditStaffClips.waitLoading,
          });
        });
    });
  });

  after('Delete temp user', () => {
    cy.getAdminToken();
    Users.deleteViaApi(tempUser.userId);
  });

  it(
    'C449393 Check permission "Settings (Circulation): Can view staff slips" (vega)',
    { tags: ['extendedPath', 'vega', 'C449393'] },
    () => {
      staffSlipNamesWithoutTransitMediatedRequests.forEach((slipName) => {
        cy.contains('nav', slipName).should('be.visible');
        StaffSlips.chooseStaffClip(slipName);
        StaffSlip.checkViewOnly(slipName);
      });

      StaffSlips.chooseStaffClip(STAFF_SLIP_NAMES.TRANSIT);
      StaffSlip.openPreviewModal();
      StaffSlip.closePreviewModal();

      StaffSlips.closeStaffSlipView(STAFF_SLIP_NAMES.TRANSIT);
    },
  );
});
