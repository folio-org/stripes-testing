import Permissions from '../../../../support/dictionary/permissions';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import MarcAuthorities from '../../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthority from '../../../../support/fragments/marcAuthority/marcAuthority';

describe('MARC', () => {
  describe('MARC Authority', () => {
    describe('Create MARC Authority', () => {
      const user = {};
      const headerText = /Create a new .*MARC authority record/;
      const errorNotification = 'Record cannot be saved. An authority file is required';

      const newField010 = {
        previousFieldTag: '008',
        tag: '010',
        content: '$a n000232',
      };
      const newField100 = {
        previousFieldTag: '010',
        tag: '100',
        content: '$a Save without selected Authority file test',
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
              authRefresh: true,
            });
          });
      });

      after('Delete users, data', () => {
        cy.getAdminToken();
        Users.deleteViaApi(user.userProperties.userId);
      });

      it(
        'C813600 Create a new MARC authority record without selecting an authority file (spitfire)',
        { tags: ['criticalPath', 'spitfire', 'C813600'] },
        () => {
          // 1 Click on "Actions" button in second pane >> Select "+ New" option
          MarcAuthorities.clickActionsAndNewAuthorityButton();
          QuickMarcEditor.checkPaneheaderContains(headerText);

          // 2 Add 2 new fields by clicking on "+" icon and fill it as specified:
          // 010 \\ "$a <<enter a value in format <Prefix><Value> using any valid authority file>>", ex.: "n000232"
          // 100 \\ "$a Save without selected Authority file test"
          MarcAuthority.addNewFieldAfterExistingByTag(
            newField010.previousFieldTag,
            newField010.tag,
            newField010.content,
          );
          MarcAuthority.addNewFieldAfterExistingByTag(
            newField100.previousFieldTag,
            newField100.tag,
            newField100.content,
          );
          QuickMarcEditor.checkContentByTag(newField010.tag, newField010.content);
          QuickMarcEditor.checkContentByTag(newField100.tag, newField100.content);
          MarcAuthority.setValid008DropdownValues();

          // 3 Click on the "Save & close" button
          QuickMarcEditor.pressSaveAndCloseButton();
          QuickMarcEditor.checkCallout(errorNotification);
          QuickMarcEditor.checkPaneheaderContains(headerText);
        },
      );
    });
  });
});
