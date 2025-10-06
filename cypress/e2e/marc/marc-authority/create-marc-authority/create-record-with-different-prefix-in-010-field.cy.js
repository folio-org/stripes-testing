import Permissions from '../../../../support/dictionary/permissions';
import MarcAuthority from '../../../../support/fragments/marcAuthority/marcAuthority';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import MarcAuthorities from '../../../../support/fragments/marcAuthority/marcAuthorities';
import ManageAuthorityFiles from '../../../../support/fragments/settings/marc-authority/manageAuthorityFiles';
import { DEFAULT_FOLIO_AUTHORITY_FILES } from '../../../../support/constants';

describe('MARC', () => {
  describe('MARC Authority', () => {
    describe('Create MARC Authority', () => {
      const headerText = 'Create a new MARC authority record';
      const newField010 = {
        previousFieldTag: '008',
        tag: '010',
        content: '$a sj43321',
      };
      const newField100 = {
        previousFieldTag: '010',
        tag: '100',
        content: '$a C688811 Create a new MARC authority record with not matched prefix on 010',
      };
      const errorToastNotification =
        'Record cannot be saved. Prefix in the 010 field does not match the selected authority file.';
      const users = {};

      before('Create users, data', () => {
        cy.getAdminToken();
        cy.createTempUser([
          Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
          Permissions.uiQuickMarcQuickMarcAuthorityCreate.gui,
          Permissions.uiMarcAuthoritiesAuthorityRecordCreate.gui,
        ])
          .then((userProperties) => {
            users.userProperties = userProperties;

            ManageAuthorityFiles.setAllDefaultFOLIOFilesToActiveViaAPI();
          })
          .then(() => {
            cy.waitForAuthRefresh(() => {
              cy.login(users.userProperties.username, users.userProperties.password, {
                path: TopMenu.marcAuthorities,
                waiter: MarcAuthorities.waitLoading,
              });
            });
          });
      });

      after('Delete users, data', () => {
        cy.getAdminToken();
        Users.deleteViaApi(users.userProperties.userId);
        ManageAuthorityFiles.unsetAllDefaultFOLIOFilesAsActiveViaAPI();
      });

      it(
        `C688811 Create a new MARC authority record with "FOLIO" authority file selected 
            and added "010" field with prefix of different "FOLIO" authority file (spitfire)`,
        { tags: ['criticalPath', 'spitfire', 'C688811'] },
        () => {
          // 1 Click on "Actions" button in second pane >> Select "+ New" option
          MarcAuthorities.clickActionsAndNewAuthorityButton();
          QuickMarcEditor.checkPaneheaderContains(headerText);
          QuickMarcEditor.verifyAuthorityLookUpButton();

          // 2 Click on "Authority file look-up" hyperlink
          QuickMarcEditor.clickAuthorityLookUpButton();

          // 3 Click on the "Select authority file" placeholder in "Authority file name" dropdown and select any default "FOLIO" option, ex.:
          // "LC Name Authority file (LCNAF)"
          QuickMarcEditor.selectAuthorityFile(DEFAULT_FOLIO_AUTHORITY_FILES.LC_NAME_AUTHORITY_FILE);
          QuickMarcEditor.verifyAuthorityFileSelected(
            DEFAULT_FOLIO_AUTHORITY_FILES.LC_NAME_AUTHORITY_FILE,
          );

          // 4 Click on the "Save & close" button
          QuickMarcEditor.clickSaveAndCloseInModal();
          QuickMarcEditor.checkContentByTag('001', '');
          QuickMarcEditor.checkFourthBoxEditable(1, false);

          // 5 Add 2 new fields by clicking on "+" icon and fill it as specified:
          // 010 \\ "$a <prefix value of default authority file which does NOT match the selected option><identifier value>"
          // ex.: "$a sj43321"
          // 100 \\ "$a Create a new MARC authority record with not matched prefix on 010"
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

          // 6 Click on the "Save & close" button
          QuickMarcEditor.pressSaveAndClose();
          QuickMarcEditor.checkErrorMessage(4, errorToastNotification);
          QuickMarcEditor.checkPaneheaderContains(headerText);
        },
      );
    });
  });
});
