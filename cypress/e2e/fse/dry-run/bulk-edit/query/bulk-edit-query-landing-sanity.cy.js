import BulkEditSearchPane from '../../../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import TopMenu from '../../../../../support/fragments/topMenu';
import { parseSanityParameters } from '../../../../../support/utils/users';

const { user, memberTenant } = parseSanityParameters();

describe('Bulk-edit', () => {
  describe('Query', () => {
    before('setup', () => {
      cy.setTenant(memberTenant.id);
      cy.getUserToken(user.username, user.password);

      cy.allure().logCommandSteps(false);
      cy.login(user.username, user.password, {
        path: TopMenu.bulkEditPath,
        waiter: BulkEditSearchPane.waitLoading,
      });
      cy.allure().logCommandSteps(true);
    });

    it(
      'C436871 Verify Bulk Edit Query tab (firebird)',
      { tags: ['dryRun', 'firebird', 'C436871'] },
      () => {
        BulkEditSearchPane.openQuerySearch();
        BulkEditSearchPane.verifyInputLabel(
          'Select a record type and then click the Build query button.',
        );
        BulkEditSearchPane.isBuildQueryButtonDisabled();
        BulkEditSearchPane.isUsersRadioChecked(false);
        BulkEditSearchPane.checkUsersRadio();
        BulkEditSearchPane.isUsersRadioChecked();
        BulkEditSearchPane.verifyInputLabel('Click the Build query button to build the query.');
        BulkEditSearchPane.isBuildQueryButtonDisabled(false);
      },
    );
  });
});
