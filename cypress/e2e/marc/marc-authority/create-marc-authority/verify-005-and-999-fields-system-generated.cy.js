import moment from 'moment';
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
      const todayDate = moment(new Date()).format('YYYYMMDD');
      const headerText = 'Create a new MARC authority record';
      const tag999 = '999';
      const newField010 = {
        rowIndex: 4,
        tag: '010',
        content: '$a n000232',
      };
      const newField100 = {
        rowIndex: 5,
        tag: '100',
        content: '$a 005 and 999 auto-generated test',
      };
      const users = {};
      let createdAuthorityId;

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
            cy.login(users.userProperties.username, users.userProperties.password, {
              path: TopMenu.marcAuthorities,
              waiter: MarcAuthorities.waitLoading,
            });
          });
      });

      after('Delete users, data', () => {
        cy.getAdminToken();
        Users.deleteViaApi(users.userProperties.userId);
        MarcAuthority.deleteViaAPI(createdAuthorityId);
        ManageAuthorityFiles.unsetAllDefaultFOLIOFilesAsActiveViaAPI();
      });

      it(
        'C423500 Verify that 005 and 999 fields are system generated after saving (spitfire)',
        { tags: ['criticalPath', 'spitfire'] },
        () => {
          // 1 Click on "Actions" button in second pane >> Select "+ New" option
          MarcAuthorities.clickNewAuthorityButton();
          QuickMarcEditor.checkPaneheaderContains(headerText);
          QuickMarcEditor.verifyAuthorityLookUpButton();

          // 2 Click on "Authority file look-up" hyperlink
          // Click on the "Select authority file" placeholder in "Authority file name" dropdown
          // Select any option
          // Click on the "Save & close" button in "Select authority file" modal
          QuickMarcEditor.clickAuthorityLookUpButton();
          QuickMarcEditor.selectAuthorityFile(DEFAULT_FOLIO_AUTHORITY_FILES.LC_NAME_AUTHORITY_FILE);
          QuickMarcEditor.clickSaveAndCloseInModal();
          QuickMarcEditor.checkPaneheaderContains(headerText);

          // 3 Add 2 new fields by clicking on "+" icon and fill them as specified:
          // 010 \\ "$a <<enter a value in format <Prefix><Value> in accordance to selected authority file>>", ex.: "n000232"
          // 100 \\ "$a 005 and 999 auto-generated test"
          MarcAuthority.addNewField(newField010.rowIndex, newField010.tag, newField010.content);
          MarcAuthority.addNewField(newField100.rowIndex, newField100.tag, newField100.content);
          QuickMarcEditor.checkContentByTag(newField010.tag, newField010.content);
          QuickMarcEditor.checkContentByTag(newField100.tag, newField100.content);

          // 4 Click on the "Save & close" button
          QuickMarcEditor.pressSaveAndClose();
          MarcAuthority.verifyAfterSaveAndClose();
          QuickMarcEditor.verifyPaneheaderWithContentAbsent(headerText);
          MarcAuthorities.verifyViewPaneContentExists();
          MarcAuthority.getId().then((id) => {
            createdAuthorityId = id;

            MarcAuthorities.checkFieldAndContentExistence('005', todayDate);
            MarcAuthorities.checkFieldAndContentExistence(tag999, 'f f');
            MarcAuthorities.checkFieldAndContentExistence(tag999, '$s');
            MarcAuthorities.checkFieldAndContentExistence(tag999, `$i ${createdAuthorityId}`);
          });
        },
      );
    });
  });
});
