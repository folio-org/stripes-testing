import permissions from '../../../support/dictionary/permissions';
import PermissionSets from '../../../support/fragments/settings/users/permissionSets';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import { getTestEntityValue } from '../../../support/utils/stringTools';

describe('Permission Sets', () => {
  const newPermissionSet = {
    name: getTestEntityValue('NewPermissionSet'),
    description: getTestEntityValue('NewPermissionSetDescription'),
    permissions: [permissions.uiUsersCustomField.gui],
  };

  before('Preconditions', () => {
    cy.getAdminToken();
    cy.loginAsAdmin({ path: SettingsMenu.permissionSets, waiter: PermissionSets.waitLoading });
  });

  after('Deleting created entities', () => {
    cy.get('@permSetId').then((permSetId) => {
      PermissionSets.deletePermissionSetViaApi(permSetId);
    });
  });

  it('C2234 Create new permission set (volaris)', { tags: ['criticalPath', 'volaris'] }, () => {
    cy.intercept('POST', '/perms/permissions').as('permissionSet');
    PermissionSets.createNewPermissionSet(newPermissionSet);
    cy.wait('@permissionSet').then((intercept) => {
      cy.wrap(intercept.response.body.id).as('permSetId');
    });
    PermissionSets.checkAfterSaving(newPermissionSet);
  });
});
