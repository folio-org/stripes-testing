import ExportManagerSearchPane from '../../support/fragments/exportManager/exportManagerSearchPane';
import TopMenu from '../../support/fragments/topMenu';
import TopMenuNavigation from '../../support/fragments/topMenuNavigation';
import Users from '../../support/fragments/users/users';

let user;

describe('export manager', () => {
  before('create user', () => {
    cy.createTempUser([]).then((userProperties) => {
      user = userProperties;
      cy.login(user.username, user.password);
    });
  });

  after('delete user', () => {
    cy.getAdminToken();
    Users.deleteViaApi(user.userId);
  });

  it(
    'C350764 Verify that user without Export Manager permissions: cannot view Export Manager (firebird)',
    { tags: ['criticalPath', 'firebird'] },
    () => {
      TopMenuNavigation.isAbsent();
      cy.visit(TopMenu.exportManagerPath);
      ExportManagerSearchPane.verifyNoPermissionWarning();
    },
  );
});
