import TestType from '../../../../support/dictionary/testTypes';
import EditStaffClips from '../../../../support/fragments/circulation/editStaffClips';
import SettingsMenu from '../../../../support/fragments/settingsMenu';
// TO DO: update test with duplicate and edit methods, after PO will review test case.
describe('ui-circulation-settings: Edit Staff slip settings', () => {
  const editStaffClipsHold = { ...EditStaffClips.defaultUiEditStaffClips };
  beforeEach('login', () => {
    cy.login(Cypress.env('diku_login'), Cypress.env('diku_password'));
    cy.visit(`${SettingsMenu.circulationStaffSlipsPath}`);
  });

  it('C347901 Staff slip settings', { tags: [TestType.smoke] }, () => {
    EditStaffClips.editHold(editStaffClipsHold);
    EditStaffClips.fillStaffClips();
    EditStaffClips.saveStaffClips();
    EditStaffClips.previewStaffClips();
    EditStaffClips.checkStaffClips();
    EditStaffClips.editPickslip(editStaffClipsHold);
    EditStaffClips.fillStaffClips();
    EditStaffClips.saveStaffClips();
    EditStaffClips.previewStaffClips();
    EditStaffClips.checkStaffClips();
    EditStaffClips.editRequestDelivery(editStaffClipsHold);
    EditStaffClips.fillStaffClips();
    EditStaffClips.saveStaffClips();
    EditStaffClips.previewStaffClips();
    EditStaffClips.checkStaffClips();
    EditStaffClips.editTransit(editStaffClipsHold);
    EditStaffClips.fillStaffClips();
    EditStaffClips.saveStaffClips();
    EditStaffClips.previewStaffClips();
    EditStaffClips.checkStaffClips();
    EditStaffClips.editHold(editStaffClipsHold);
    EditStaffClips.clearStaffClips();
    EditStaffClips.saveStaffClips();
    EditStaffClips.previewStaffClips();
    EditStaffClips.editPickslip(editStaffClipsHold);
    EditStaffClips.clearStaffClips();
    EditStaffClips.saveStaffClips();
    EditStaffClips.previewStaffClips();
    EditStaffClips.editRequestDelivery(editStaffClipsHold);
    EditStaffClips.clearStaffClips();
    EditStaffClips.saveStaffClips();
    EditStaffClips.previewStaffClips();
    EditStaffClips.editTransit(editStaffClipsHold);
    EditStaffClips.clearStaffClips();
    EditStaffClips.saveStaffClips();
    EditStaffClips.previewStaffClips();
  });
});
