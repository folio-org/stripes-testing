import TestType from '../../../support/dictionary/testTypes';
import DevTeams from '../../../support/dictionary/devTeams';
import Features from '../../../support/dictionary/features';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import WaiveReasons from '../../../support/fragments/settings/users/waiveReasons';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Management of waive reasons', () => {
  beforeEach(() => {
    cy.loginAsAdmin({ path: SettingsMenu.waiveReasons, waiter: WaiveReasons.waitLoading });
  });

  it('C446 Verify that you can create/edit/delete waive reasons (prokopovych)',
    { tags: [TestType.smoke, Features.waiveReasons, DevTeams.prokopovych] }, () => {
      WaiveReasons.startAdding();
      WaiveReasons.checkSaveButtonState({ isDisabled: true });
      let testReason = { reason:'', description: 'test description' };
      WaiveReasons.fillReasonParameters(testReason);
      WaiveReasons.checkSaveButtonState({ isDisabled: true });
      WaiveReasons.checkReasonValidatorMessage();
      // create
      testReason = { reason:`testReason${getRandomPostfix()}`, description: '' };
      WaiveReasons.fillReasonParameters(testReason);
      WaiveReasons.checkSaveButtonState({ isDisabled: false });
      WaiveReasons.trySave();
      WaiveReasons.checkReason(testReason);
      // update
      testReason.description = 'test description';
      WaiveReasons.startEdit(testReason.reason);
      WaiveReasons.fillReasonParameters(testReason);
      WaiveReasons.checkSaveButtonState({ isDisabled: false });
      WaiveReasons.trySave();
      WaiveReasons.checkReason(testReason);
      // delete
      WaiveReasons.delete(testReason.reason);
    });
});
