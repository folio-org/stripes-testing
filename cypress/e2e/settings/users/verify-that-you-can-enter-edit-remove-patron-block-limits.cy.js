import SettingsMenu from '../../../support/fragments/settingsMenu';
import PatronGroups from '../../../support/fragments/settings/users/patronGroups';
import { getTestEntityValue } from '../../../support/utils/stringTools';
import Limits from '../../../support/fragments/settings/users/limits';

const patronGroup = {
  name: getTestEntityValue('GroupLimits'),
};
const randomLimitType = Limits.limitTypes[Math.floor(Math.random() * Limits.limitTypes.length)];

describe('Settings Users', () => {
  before('Preconditions', () => {
    cy.getAdminToken().then(() => {
      PatronGroups.createViaApi(patronGroup.name).then((group) => {
        patronGroup.id = group;
      });
      cy.loginAsAdmin({ path: SettingsMenu.limitsPath, waiter: Limits.waitLoading });
    });
  });

  after('Deleting created entities', () => {
    PatronGroups.deleteViaApi(patronGroup.id);
  });

  it(
    'C11079 Verify that you can enter/edit/remove patron block limits (vega) (TaaS)',
    { tags: ['criticalPath', 'vega'] },
    () => {
      Limits.selectGroup(patronGroup.name);
      Limits.verifyLimitTypes();
      Limits.verifySaveIsDisabled();
      Limits.setLimit(randomLimitType, '999999999999');
      Limits.verifyUpdateValidationError(randomLimitType);
      Limits.setLimit(randomLimitType, '0');
      Limits.verifySuccessfullyUpdated(patronGroup.name);
      Limits.setLimit(randomLimitType, '1');
      Limits.verifySuccessfullyUpdated(patronGroup.name);
      Limits.setLimit(randomLimitType, '999999');
      Limits.verifySuccessfullyUpdated(patronGroup.name);
      Limits.setLimit(randomLimitType, '');
      Limits.verifySuccessfullyUpdated(patronGroup.name);
    },
  );
});
