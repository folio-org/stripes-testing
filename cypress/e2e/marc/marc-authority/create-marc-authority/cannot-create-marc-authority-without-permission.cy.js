import Permissions from '../../../../support/dictionary/permissions';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import MarcAuthorities from '../../../../support/fragments/marcAuthority/marcAuthorities';

describe('MARC', () => {
  describe('MARC Authority', () => {
    describe('Create MARC Authority', () => {
      let userProperties;

      before('Create user and login', () => {
        cy.getAdminToken();
        cy.createTempUser([
          Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
          Permissions.uiMarcAuthoritiesAuthorityRecordEdit.gui,
          Permissions.uiQuickMarcQuickMarcAuthoritiesEditorAll.gui,
        ]).then((createdUser) => {
          userProperties = createdUser;
          cy.login(userProperties.username, userProperties.password, {
            path: TopMenu.marcAuthorities,
            waiter: MarcAuthorities.waitLoading,
          });
        });
      });

      after('Delete user and record', () => {
        cy.getAdminToken();
        Users.deleteViaApi(userProperties.userId);
      });

      it(
        'C397393 User cannot create new "MARC Authority" record without "quickMARC: Create a new MARC authority record" permission (spitfire)',
        { tags: ['extendedPath', 'spitfire', 'C397393'] },
        () => {
          MarcAuthorities.clickActionsButton();
          MarcAuthorities.verifyActionsMenu();
          MarcAuthorities.checkButtonNewExistsInActionDropdown(false);
        },
      );
    });
  });
});
