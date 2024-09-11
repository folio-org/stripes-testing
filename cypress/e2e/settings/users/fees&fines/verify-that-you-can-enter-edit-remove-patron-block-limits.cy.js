import Limits from '../../../../support/fragments/settings/users/limits';
import PatronGroups from '../../../../support/fragments/settings/users/patronGroups';
import SettingsMenu from '../../../../support/fragments/settingsMenu';
import { getTestEntityValue } from '../../../../support/utils/stringTools';

const patronGroup = {
  name: getTestEntityValue('GroupLimits'),
};
const randomLimitType = Limits.limitTypes[Math.floor(Math.random() * Limits.limitTypes.length)];

describe('Fees&Fines', () => {
  describe('Settings Users (Fee/fine)', () => {
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
      { tags: ['extendedPath', 'vega'] },
      () => {
        Limits.selectGroup(patronGroup.name);
        Limits.verifyLimitTypes();
        Limits.verifySaveIsDisabled();
        Limits.setLimit(randomLimitType, '1000000');
        cy.log(randomLimitType);
        if (randomLimitType === 'Maximum outstanding fee/fine balance') {
          Limits.verifyUpdateValidationErrorForBalance(randomLimitType);
        } else {
          Limits.verifyUpdateValidationError(randomLimitType);
        }
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
});
