import Features from '../../../support/dictionary/features';
import UsersSettingsGeneral from '../../../support/fragments/settings/users/usersSettingsGeneral';
import WaiveReasons from '../../../support/fragments/settings/users/waiveReasons';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Management of waive reasons', () => {
  beforeEach(() => {
    cy.loginAsAdmin({ path: SettingsMenu.waiveReasons, waiter: WaiveReasons.waitLoading });
  });

  it(
    'C446 Verify that you can create/edit/delete waive reasons (volaris)',
    { tags: ['smoke', Features.waiveReasons, 'volaris'] },
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
