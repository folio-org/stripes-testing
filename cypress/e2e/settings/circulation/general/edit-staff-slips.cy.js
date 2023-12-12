import EditStaffClips from '../../../../support/fragments/circulation/editStaffClips';
import SettingsMenu from '../../../../support/fragments/settingsMenu';

describe('ui-circulation-settings: Edit Staff slip settings', () => {
  const editStaffClipsHold = { ...EditStaffClips.defaultUiEditStaffClips };
  beforeEach('login', () => {
    cy.login(Cypress.env('diku_login'), Cypress.env('diku_password'));
    cy.visit(`${SettingsMenu.circulationStaffSlipsPath}`);
  });

  it('C347901 Staff clips settings (vega)', { tags: ['smoke', 'vega', 'system'] }, () => {
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
  });
});
