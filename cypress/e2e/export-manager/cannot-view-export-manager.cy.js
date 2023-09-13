import devTeams from '../../support/dictionary/devTeams';
import testTypes from '../../support/dictionary/testTypes';
import TopMenu from '../../support/fragments/topMenu';
import ExportManagerSearchPane from '../../support/fragments/exportManager/exportManagerSearchPane';
import Users from '../../support/fragments/users/users';
import TopMenuNavigation from '../../support/fragments/topMenuNavigation';

let user;

describe('export manager', () => {
  before('create user', () => {
    cy.createTempUser([]).then((userProperties) => {
      user = userProperties;
      cy.login(user.username, user.password);
    });
  });

  after('delete user', () => {
    Users.deleteViaApi(user.userId);
  });

  it(
    'C350764 Verify that user without Export Manager permissions: cannot view Export Manager (firebird)',
    { tags: [testTypes.criticalPath, devTeams.firebird] },
    () => {
      TopMenuNavigation.isAbsent();
      cy.visit(TopMenu.exportManagerPath);
      ExportManagerSearchPane.verifyNoPermissionWarning();
    },
  );
});
