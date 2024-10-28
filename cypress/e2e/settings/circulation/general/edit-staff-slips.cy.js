import { STAFF_SLIP_NAMES } from '../../../../support/constants';
import EditStaffClips from '../../../../support/fragments/circulation/editStaffClips';
import StaffSlip from '../../../../support/fragments/settings/circulation/staffSlips/staffSlip';
import StaffSlips from '../../../../support/fragments/settings/circulation/staffSlips/staffSlips';
import SettingsMenu from '../../../../support/fragments/settingsMenu';

describe('ui-circulation-settings: Edit Staff slip settings', () => {
  const editStaffClipsHold = { ...EditStaffClips.defaultUiEditStaffClips };
  beforeEach('login', () => {
    cy.intercept('POST', '/authn/refresh').as('/authn/refresh');
    cy.loginAsAdmin({
      path: SettingsMenu.circulationStaffSlipsPath,
      waiter: EditStaffClips.waitLoading,
    });
  });

  it(
    'C347901 Staff clips settings (vega)',
    { tags: ['smoke', 'vega', 'system', 'shiftLeft', 'C347901'] },
    () => {
      StaffSlips.chooseStaffClip(STAFF_SLIP_NAMES.HOLD);
      StaffSlip.edit(STAFF_SLIP_NAMES.HOLD);
      EditStaffClips.fillStaffClips(editStaffClipsHold);
      StaffSlip.previewStaffClips(STAFF_SLIP_NAMES.HOLD);

      StaffSlips.chooseStaffClip(STAFF_SLIP_NAMES.PICK_SLIP);
      StaffSlip.edit(STAFF_SLIP_NAMES.PICK_SLIP);
      EditStaffClips.fillStaffClips(editStaffClipsHold);
      StaffSlip.previewStaffClips(STAFF_SLIP_NAMES.PICK_SLIP);

      StaffSlips.chooseStaffClip(STAFF_SLIP_NAMES.REQUEST_DELIVERY);
      StaffSlip.edit(STAFF_SLIP_NAMES.REQUEST_DELIVERY);
      EditStaffClips.fillStaffClips(editStaffClipsHold);
      StaffSlip.previewStaffClips(STAFF_SLIP_NAMES.REQUEST_DELIVERY);

      StaffSlips.chooseStaffClip(STAFF_SLIP_NAMES.TRANSIT);
      StaffSlip.edit(STAFF_SLIP_NAMES.TRANSIT);
      EditStaffClips.fillStaffClips(editStaffClipsHold);
      StaffSlip.previewStaffClips(STAFF_SLIP_NAMES.TRANSIT);

      EditStaffClips.editAndClearHold();
      EditStaffClips.editAndClearPickslip();
      EditStaffClips.editAndClearRequestDelivery();
      EditStaffClips.editAndClearTransit();
    },
  );
});
