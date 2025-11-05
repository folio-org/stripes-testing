import { STAFF_SLIP_NAMES } from '../../support/constants';
import Permissions from '../../support/dictionary/permissions';
import EditStaffClips from '../../support/fragments/circulation/editStaffClips';
import BaseCirculationPane from '../../support/fragments/settings/circulation/baseCirculationPane';
import StaffSlip from '../../support/fragments/settings/circulation/staffSlips/staffSlip';
import StaffSlips from '../../support/fragments/settings/circulation/staffSlips/staffSlips';
import SettingsPane from '../../support/fragments/settings/settingsPane';
import SettingsMenu from '../../support/fragments/settingsMenu';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';

describe('Staff slips', () => {
  const testData = {
    token: 'staffSlip.staffUsername',
  };

  before('Login', () => {
    cy.createTempUser([Permissions.uiCirculationCreateEditRemoveStaffSlips.gui]).then(
      (userProperties) => {
        testData.user = userProperties;

        cy.login(testData.user.username, testData.user.password, {
          path: TopMenu.settingsPath,
          waiter: SettingsPane.waitLoading,
        });
      },
    );
  });

  after('Delete test data', () => {
    cy.loginAsAdmin();
    cy.visit(SettingsMenu.circulationStaffSlipsPath);
    EditStaffClips.editAndClearHold();
    Users.deleteViaApi(testData.user.userId);
  });

  it(
    'C515006 "staffUsername" token can be added to Hold staff slip (volaris)',
    { tags: ['criticalPathFlaky', 'volaris', 'C515006'] },
    () => {
      SettingsPane.selectSettingsTab('Circulation');
      BaseCirculationPane.goToSettingsCirculation('Staff slips');
      StaffSlips.waitLoading();
      StaffSlips.chooseStaffClip(STAFF_SLIP_NAMES.HOLD);
      StaffSlip.edit(STAFF_SLIP_NAMES.HOLD);
      EditStaffClips.addTokenAndVerify('Staff slip', testData.token);
      EditStaffClips.uncheckTokenAndVerify(testData.token);
      EditStaffClips.checkTokenCheckbox([testData.token]);
      EditStaffClips.clickAddTokenButton();
      EditStaffClips.verifyTemplateContent(testData.token);
      EditStaffClips.fillTemplateContent(
        'Hold request for item:\n{{item.barcodeImage}}\nPick slip printed by:\n{{staffSlip.staffUsername}}',
      );
      EditStaffClips.previewStaffClips('johndoe');
      EditStaffClips.saveAndClose();
      StaffSlip.checkAfterUpdate(STAFF_SLIP_NAMES.HOLD);
      StaffSlip.waitLoading(STAFF_SLIP_NAMES.HOLD);
      StaffSlip.previewStaffClipsAndPrint(
        STAFF_SLIP_NAMES.HOLD,
        `Preview of staff slip - ${STAFF_SLIP_NAMES.HOLD}`,
      );
      // steps 14-15 cannot be checked using cypress
    },
  );
});
