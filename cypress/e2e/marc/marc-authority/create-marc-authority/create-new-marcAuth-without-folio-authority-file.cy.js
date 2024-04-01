import Permissions from '../../../../support/dictionary/permissions';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import MarcAuthorities from '../../../../support/fragments/marcAuthority/marcAuthorities';

describe('MARC', () => {
  describe('MARC Authority', () => {
    describe('Create MARC Authority', () => {
      const user = {};
      const headerText = 'Create a new MARC authority record';
      const errorNotification = 'Record cannot be saved. An authority file is required';
      const newFields = {
        tag100: '100',
        field100Value: '$a Save without selected Authority file test',
        tag010: '010',
        field010Value: '$a n000232',
      };

      before('Create users, data', () => {
        cy.getAdminToken();
        cy.createTempUser([
          Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
          Permissions.uiQuickMarcQuickMarcAuthorityCreate.gui,
          Permissions.uiMarcAuthoritiesAuthorityRecordCreate.gui,
        ])
          .then((userProperties) => {
            user.userProperties = userProperties;
          })
          .then(() => {
            cy.login(user.userProperties.username, user.userProperties.password, {
              path: TopMenu.marcAuthorities,
              waiter: MarcAuthorities.waitLoading,
            });
          });
      });

      after('Delete users, data', () => {
        cy.getAdminToken();
        Users.deleteViaApi(user.userProperties.userId);
      });

      it(
        'C423527 Create a new MARC authority record without selecting an authority file (spitfire)',
        { tags: ['criticalPath', 'spitfire'] },
        () => {
          // 1 Click on "Actions" button in second pane >> Select "+ New" option
          MarcAuthorities.clickNewAuthorityButton();
          QuickMarcEditor.checkPaneheaderContains(headerText);

          // 2 Add 2 new fields by clicking on "+" icon and fill it as specified:
          // 010 \\ "$a <<enter a value in format <Prefix><Value> using any valid authority file>>", ex.: "n000232"
          // 100 \\ "$a Save without selected Authority file test"
          QuickMarcEditor.addNewField(newFields.tag010, newFields.field010Value, 4);
          QuickMarcEditor.addNewField(newFields.tag100, newFields.field100Value, 5);
          QuickMarcEditor.verifyTagValue(5, newFields.tag010);
          QuickMarcEditor.verifyTagValue(6, newFields.tag100);
          QuickMarcEditor.checkContent(newFields.field010Value, 5);
          QuickMarcEditor.checkContent(newFields.field100Value, 6);

          // 3 Click on the "Save & close" button
          QuickMarcEditor.pressSaveAndClose();
          QuickMarcEditor.checkCallout(errorNotification);
          QuickMarcEditor.checkPaneheaderContains(headerText);
        },
      );
    });
  });
});
