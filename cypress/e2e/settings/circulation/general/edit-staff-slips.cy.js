import EditStaffClips from '../../../../support/fragments/circulation/editStaffClips';
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
    { tags: ['smoke', 'vega', 'system', 'shiftLeft'] },
    () => {
      EditStaffClips.editHold(editStaffClipsHold);
      EditStaffClips.fillAndPreviewTemplate(editStaffClipsHold);
      EditStaffClips.editPickslip(editStaffClipsHold);
      EditStaffClips.fillAndPreviewTemplate(editStaffClipsHold);
      EditStaffClips.editRequestDelivery(editStaffClipsHold);
      EditStaffClips.fillAndPreviewTemplate(editStaffClipsHold);
      EditStaffClips.editTransit(editStaffClipsHold);
      EditStaffClips.fillAndPreviewTemplate(editStaffClipsHold);
      EditStaffClips.editAndClearHold();
      EditStaffClips.editAndClearPickslip();
      EditStaffClips.editAndClearRequestDelivery();
      EditStaffClips.editAndClearTransit();
    },
  );
});
