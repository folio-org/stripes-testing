import TestType from '../../../support/dictionary/testTypes';
import DevTeams from '../../../support/dictionary/devTeams';
import Features from '../../../support/dictionary/features';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import WaiveReasons from '../../../support/fragments/settings/users/waiveReasons';
import getRandomPostfix from '../../../support/utils/stringTools';
import UsersSettingsGeneral from '../../../support/fragments/settings/users/usersSettingsGeneral';

describe('Management of waive reasons', () => {
  beforeEach(() => {
    cy.loginAsAdmin({ path: SettingsMenu.waiveReasons, waiter: WaiveReasons.waitLoading });
  });

  it(
    'C446 Verify that you can create/edit/delete waive reasons (volaris)',
    { tags: [TestType.smoke, Features.waiveReasons, DevTeams.volaris] },
    () => {
      WaiveReasons.startAdding();
      WaiveReasons.checkSaveButtonState({ isDisabled: true });
      let testReason = { name: '', description: 'test description' };
      WaiveReasons.fillReasonParameters(testReason);
      WaiveReasons.checkSaveButtonState({ isDisabled: true });
      WaiveReasons.checkReasonValidatorMessage();
      // create
      testReason = { name: `testReason${getRandomPostfix()}`, description: '' };
      WaiveReasons.fillReasonParameters(testReason);
      WaiveReasons.checkSaveButtonState({ isDisabled: false });
      WaiveReasons.trySave();
      UsersSettingsGeneral.checkEntityInTable(testReason);
      // update
      testReason.description = 'test description';
      WaiveReasons.startEdit(testReason.name);
      WaiveReasons.fillReasonParameters(testReason);
      WaiveReasons.checkSaveButtonState({ isDisabled: false });
      WaiveReasons.trySave();
      UsersSettingsGeneral.checkEntityInTable(testReason);
      // delete
      WaiveReasons.delete(testReason.name);
    },
  );
});
