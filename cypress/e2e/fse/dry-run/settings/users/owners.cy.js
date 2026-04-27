import UsersOwners from '../../../../../support/fragments/settings/users/usersOwners';
import SettingsMenu from '../../../../../support/fragments/settingsMenu';
import getRandomPostfix from '../../../../../support/utils/stringTools';
import { parseSanityParameters } from '../../../../../support/utils/users';

// TO DO: remove ignoring errors. Now when you click on one of the buttons, some promise in the application returns false
Cypress.on('uncaught:exception', () => false);

describe('Fees&Fines', () => {
  describe('Management of fee/fine owners', () => {
    const { user, memberTenant } = parseSanityParameters();
    before(() => {
      cy.setTenant(memberTenant.id);
      cy.login(user.username, user.password, {
        path: SettingsMenu.usersOwnersPath,
        waiter: UsersOwners.waitLoading,
      });
    });

    it(
      'C440 Verify that you can create/edit/delete fee/fine owners (vega) (TaaS)',
      { tags: ['dryRun', 'vega', 'C440'] },
      () => {
        UsersOwners.startNewLineAdding();
        UsersOwners.trySave();

        UsersOwners.checkValidatorError({ error: 'Please fill this in to continue' });
        UsersOwners.cancelAdding();

        const name = `Automation owner $${getRandomPostfix()}`;
        const description = `Automation owner description $${getRandomPostfix()}`;

        UsersOwners.startNewLineAdding();
        UsersOwners.fillOwner({ name, description });
        UsersOwners.saveOwner(name);

        UsersOwners.startNewLineAdding();
        UsersOwners.fillOwner({ name, description });
        UsersOwners.trySave();

        UsersOwners.checkValidatorError({ error: 'Fee/fine owner already exists' });
        UsersOwners.cancelAdding();

        UsersOwners.editOwner(name, {
          name: `${name} to be deleted`,
          description: `${description} to be deleted`,
        });
        UsersOwners.deleteOwner(`${name} to be deleted`);
      },
    );
  });
});
