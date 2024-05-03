import permissions from '../../../support/dictionary/permissions';
import BulkEditSearchPane from '../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';

let user;

describe('Bulk Edit - Query', () => {
  before('create test data', () => {
    cy.getAdminToken();
    cy.createTempUser([
      permissions.bulkEditCsvEdit.gui,
      permissions.bulkEditCsvView.gui,
      permissions.bulkEditUpdateRecords.gui,
      permissions.uiUserEdit.gui,
      permissions.bulkEditQueryView.gui,
    ]).then((userProperties) => {
      user = userProperties;
      cy.login(user.username, user.password, {
        path: TopMenu.bulkEditPath,
        waiter: BulkEditSearchPane.waitLoading,
      });
    });
  });

  after('delete test data', () => {
    cy.getAdminToken();
    Users.deleteViaApi(user.userId);
  });

  it(
    'C436871 Verify Bulk Edit Query tab (firebird)',
    { tags: ['criticalPath', 'firebird'] },
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
