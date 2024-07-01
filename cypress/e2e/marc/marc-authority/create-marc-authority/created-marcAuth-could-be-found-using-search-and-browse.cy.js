import Permissions from '../../../../support/dictionary/permissions';
import MarcAuthority from '../../../../support/fragments/marcAuthority/marcAuthority';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import MarcAuthorities from '../../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthorityBrowse from '../../../../support/fragments/marcAuthority/MarcAuthorityBrowse';
import ManageAuthorityFiles from '../../../../support/fragments/settings/marc-authority/manageAuthorityFiles';

describe('MARC', () => {
  describe('MARC Authority', () => {
    describe('Create MARC Authority', () => {
      const testData = {
        sourceName: 'LC Name Authority file (LCNAF)',
        searchOption: 'Keyword',
        browseOption: 'Personal name',
        marcValue: 'John Doe Sir, 1909-1965',
        tag010Value: 'n00776432',
        tag400Value: 'Huan Doe Senior, 1909-1965',
        tag500Value: 'La familia',
        headerText: 'Create a new MARC authority record',
        AUTHORIZED: 'Authorized',
        REFERENCE: 'Reference',
        AUTHREF: 'Auth/Ref',
      };

      const users = {};

      const newFields = [
        { previousFieldTag: '008', tag: '010', content: '$a n00776432' },
        { previousFieldTag: '010', tag: '100', content: '$a John Doe $c Sir, $d 1909-1965 $l eng' },
        {
          previousFieldTag: '100',
          tag: '400',
          content: '$a Huan Doe $c Senior, $d 1909-1965 $l eng',
        },
        { previousFieldTag: '400', tag: '500', content: '$a La familia' },
      ];

      before('Create users, data', () => {
        cy.getAdminToken();

        cy.createTempUser([
          Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
          Permissions.uiMarcAuthoritiesAuthorityRecordCreate.gui,
          Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
          Permissions.uiQuickMarcQuickMarcAuthorityCreate.gui,
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
        MarcAuthority.deleteViaAPI(testData.authorityId, true);
        ManageAuthorityFiles.unsetAllDefaultFOLIOFilesAsActiveViaAPI();
      });

      it(
        'C423561 Created MARC authority record could be found using search and browse by 010, 1XX, 4XX, 5XX fields (spitfire)',
        { tags: ['criticalPath', 'spitfire'] },
        () => {
          MarcAuthorities.clickActionsAndNewAuthorityButton();
          QuickMarcEditor.checkPaneheaderContains(testData.headerText);
          QuickMarcEditor.verifyAuthorityLookUpButton();
          QuickMarcEditor.clickAuthorityLookUpButton();
          QuickMarcEditor.selectAuthorityFile(testData.sourceName);
          QuickMarcEditor.verifyAuthorityFileSelected(testData.sourceName);
          QuickMarcEditor.clickSaveAndCloseInModal();
          newFields.forEach((newField) => {
            MarcAuthority.addNewFieldAfterExistingByTag(
              newField.previousFieldTag,
              newField.tag,
              newField.content,
            );
          });
          QuickMarcEditor.pressSaveAndClose();
          MarcAuthority.verifyAfterSaveAndClose();
          QuickMarcEditor.verifyPaneheaderWithContentAbsent(testData.headerText);
          MarcAuthority.getId().then((id) => {
            testData.authorityId = id;
          });
          MarcAuthority.contains(newFields[1].content);
          MarcAuthorities.searchBy(testData.searchOption, testData.tag010Value);
          MarcAuthorities.checkAfterSearch(testData.AUTHORIZED, testData.marcValue);
          MarcAuthorities.searchBy(testData.searchOption, testData.marcValue);
          MarcAuthorities.checkAfterSearch(testData.AUTHORIZED, testData.marcValue);
          MarcAuthorities.searchBy(testData.searchOption, testData.tag400Value);
          MarcAuthorities.checkAfterSearch(testData.REFERENCE, testData.tag400Value);
          MarcAuthorities.searchBy(testData.searchOption, testData.tag500Value);
          MarcAuthorities.checkAfterSearch(testData.AUTHREF, testData.tag500Value);

          MarcAuthorities.switchToBrowse();
          MarcAuthorities.checkDefaultBrowseOptions();
          MarcAuthorities.checkSearchInput('');
          MarcAuthorities.verifySearchResultTabletIsAbsent();
          MarcAuthorityBrowse.searchBy(testData.browseOption, testData.marcValue);
          MarcAuthorities.checkRow(testData.marcValue);

          MarcAuthorityBrowse.searchBy(testData.browseOption, testData.tag400Value);
          MarcAuthorities.checkRow(testData.tag400Value);
        },
      );
    });
  });
});
