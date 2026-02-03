import Permissions from '../../../../support/dictionary/permissions';
import MarcAuthorities from '../../../../support/fragments/marcAuthority/marcAuthorities';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';

describe('MARC', () => {
  describe('MARC Authority', () => {
    describe('Edit Authority record', () => {
      const testData = {
        headerText: /Create a new .*MARC authority record/,
        authorityFileValue: 'n000232',
        tag010: '010',
        tag100Content: '$a C423523 Close window test ESC',
        tag100: '100',
      };
      let user;

      before('Create users, data', () => {
        cy.getAdminToken();
        cy.createTempUser([
          Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
          Permissions.uiQuickMarcQuickMarcAuthorityCreate.gui,
          Permissions.uiMarcAuthoritiesAuthorityRecordCreate.gui,
        ])
          .then((userProperties) => {
            user = userProperties;
          })
          .then(() => {
            cy.waitForAuthRefresh(() => {
              cy.login(user.username, user.password, {
                path: TopMenu.marcAuthorities,
                waiter: MarcAuthorities.waitLoading,
              });
            });
          });
      });

      after('Delete user', () => {
        cy.getAdminToken();
        Users.deleteViaApi(user.userId);
      });

      it(
        'C423523 Close "Create a new MARC authority record" window without save using "ESC" keyboard button (spitfire)',
        { tags: ['extendedPath', 'spitfire', 'C423523'] },
        () => {
          MarcAuthorities.clickActionsAndNewAuthorityButton();
          QuickMarcEditor.checkPaneheaderContains(testData.headerText);
          QuickMarcEditor.discardChangesWithEscapeKey(3);
          MarcAuthorities.waitLoading();
          MarcAuthorities.clickActionsAndNewAuthorityButton();
          QuickMarcEditor.checkPaneheaderContains(testData.headerText);

          QuickMarcEditor.addNewField(testData.tag010, testData.authorityFileValue, 3);
          QuickMarcEditor.checkContent(testData.authorityFileValue, 4);
          QuickMarcEditor.addNewField(testData.tag100, testData.tag100Content, 4);
          QuickMarcEditor.checkContent(testData.tag100Content, 5);

          QuickMarcEditor.discardChangesWithEscapeKey(4);
          QuickMarcEditor.cancelEditConfirmationPresented();
          QuickMarcEditor.closeModalWithEscapeKey();
          MarcAuthorities.waitLoading();
        },
      );
    });
  });
});
