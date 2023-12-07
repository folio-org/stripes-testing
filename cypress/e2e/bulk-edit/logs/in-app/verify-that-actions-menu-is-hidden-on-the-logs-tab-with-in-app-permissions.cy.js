import BulkEditSearchPane from '../../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import permissions from '../../../../support/dictionary/permissions';
import UserEdit from '../../../../support/fragments/users/userEdit';
import UsersSearchPane from '../../../../support/fragments/users/usersSearchPane';

let user;
const barcodesFileName = 'fileForC367996.csv';

describe('bulk-edit', () => {
  before('create user', () => {
    cy.createTempUser([
      permissions.bulkEditView.gui,
      permissions.bulkEditEdit.gui,
      permissions.bulkEditLogsView.gui,
      permissions.inventoryAll.gui,
      permissions.uiUserEdit.gui,
      permissions.uiUsersPermissions.gui,
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
    'C367996 Verify that "Actions" menu is hidden on the "Logs" tab with In-app permissions (firebird) (TaaS)',
    { tags: ['extendedPath', 'firebird'] },
    () => {
      BulkEditSearchPane.verifySetCriteriaPaneSpecificTabs('Identifier', 'Logs');
      BulkEditSearchPane.verifySpecificTabHighlighted('Identifier');
      BulkEditSearchPane.isHoldingsRadioChecked(false);
      BulkEditSearchPane.isItemsRadioChecked(false);
      BulkEditSearchPane.actionsIsAbsent();

      BulkEditSearchPane.checkItemsRadio();
      BulkEditSearchPane.selectRecordIdentifier('Item barcode');
      BulkEditSearchPane.uploadFile(barcodesFileName);
      BulkEditSearchPane.waitFileUploading();

      BulkEditSearchPane.verifyPopulatedPreviewPage();
      BulkEditSearchPane.verifyActionsAfterConductedInAppUploading(false);

      cy.visit(TopMenu.usersPath);
      UsersSearchPane.searchByUsername(user.username);
      UsersSearchPane.openUser(user.username);
      UserEdit.addPermissions([
        permissions.inventoryAll.gui,
        permissions.uiUserEdit.gui,
        permissions.uiUsersPermissions.gui,
      ]);
    },
  );
});
