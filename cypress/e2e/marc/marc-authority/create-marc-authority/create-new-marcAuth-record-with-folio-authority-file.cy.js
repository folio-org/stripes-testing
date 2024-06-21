import Permissions from '../../../../support/dictionary/permissions';
import MarcAuthority from '../../../../support/fragments/marcAuthority/marcAuthority';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import MarcAuthorities from '../../../../support/fragments/marcAuthority/marcAuthorities';
import ManageAuthorityFiles from '../../../../support/fragments/settings/marc-authority/manageAuthorityFiles';

describe('MARC', () => {
  describe('MARC Authority', () => {
    describe('Create MARC Authority', () => {
      const testData = {
        sourceName: 'LC Name Authority file (LCNAF)',
        searchOption: 'Keyword',
        marcValue: 'Create a new MARC authority record with FOLIO authority file test',
        tag001: '001',
        tag010: '010',
        tag100: '100',
        tag010Value: 'n00776432',
        tag001Value: 'n4332123',
        headerText: 'Create a new MARC authority record',
        AUTHORIZED: 'Authorized',
      };

      const users = {};

      const newFields = [
        { rowIndex: 4, tag: '010', content: '$a n4332123 $z n1234432333' },
        {
          rowIndex: 5,
          tag: '100',
          content: '$a Create a new MARC authority record with FOLIO authority file test',
        },
      ];

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
        MarcAuthority.deleteViaAPI(testData.authorityId);
        ManageAuthorityFiles.unsetAllDefaultFOLIOFilesAsActiveViaAPI();
      });

      it(
        'C423536 Create a new MARC authority record with "FOLIO" authority file selected (spitfire)',
        { tags: ['criticalPath', 'spitfire'] },
        () => {
          MarcAuthorities.clickActionsAndNewAuthorityButton();
          QuickMarcEditor.checkPaneheaderContains(testData.headerText);
          QuickMarcEditor.verifyAuthorityLookUpButton();
          QuickMarcEditor.clickAuthorityLookUpButton();
          QuickMarcEditor.selectAuthorityFile(testData.sourceName);
          QuickMarcEditor.verifyAuthorityFileSelected(testData.sourceName);
          QuickMarcEditor.clickSaveAndCloseInModal();
          QuickMarcEditor.checkContentByTag(testData.tag001, '');
          newFields.forEach((newField) => {
            MarcAuthority.addNewField(newField.rowIndex, newField.tag, newField.content);
          });
          QuickMarcEditor.checkContentByTag(testData.tag001, testData.tag001Value);
          QuickMarcEditor.checkContentByTag(testData.tag010, newFields[0].content);
          QuickMarcEditor.checkContentByTag(testData.tag100, newFields[1].content);
          QuickMarcEditor.pressSaveAndClose();
          MarcAuthority.verifyAfterSaveAndClose();
          QuickMarcEditor.verifyPaneheaderWithContentAbsent(testData.headerText);
          MarcAuthority.getId().then((id) => {
            testData.authorityId = id;
          });
          MarcAuthority.contains(testData.tag001);
          MarcAuthority.contains(testData.tag001Value);
          MarcAuthority.contains(testData.tag010);
          MarcAuthority.contains(newFields[0].content);
          MarcAuthorities.closeMarcViewPane();
          MarcAuthorities.verifyMarcViewPaneIsOpened(false);
          MarcAuthorities.checkRecordsResultListIsAbsent();
          MarcAuthorities.searchBy(testData.searchOption, testData.marcValue);
          MarcAuthorities.checkAfterSearch(testData.AUTHORIZED, testData.marcValue);
          MarcAuthorities.checkRecordDetailPageMarkedValue(testData.marcValue);
          MarcAuthorities.chooseAuthoritySourceOption(testData.sourceName);
          MarcAuthorities.checkSelectedAuthoritySource(testData.sourceName);
          MarcAuthorities.checkAfterSearch(testData.AUTHORIZED, testData.marcValue);
          MarcAuthorities.checkRecordDetailPageMarkedValue(testData.marcValue);
        },
      );
    });
  });
});
