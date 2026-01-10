import Permissions from '../../../../support/dictionary/permissions';
import MarcAuthority from '../../../../support/fragments/marcAuthority/marcAuthority';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import MarcAuthorities from '../../../../support/fragments/marcAuthority/marcAuthorities';
import ManageAuthorityFiles from '../../../../support/fragments/settings/marc-authority/manageAuthorityFiles';
import getRandomPostfix from '../../../../support/utils/stringTools';

describe('MARC', () => {
  describe('MARC Authority', () => {
    describe('Create MARC Authority', () => {
      const testData = {
        sourceName: 'LC Name Authority file (LCNAF)',
        searchOption: 'Keyword',
        marcValue: `Create a new MARC authority record with FOLIO authority file autotest ${getRandomPostfix()}`,
        tag001: '001',
        tag010: '010',
        tag100: '100',
        tag010Value: 'n00776432',
        tag001Value: 'n4332123',
        headerText: /Create a new .*MARC authority record/,
        AUTHORIZED: 'Authorized',
      };

      const users = {};

      const newFields = [
        { previousFieldTag: '008', tag: '010', content: '$a n4332123 $z n 1234432333' },
        {
          previousFieldTag: '010',
          tag: '100',
          content: `$a ${testData.marcValue}`,
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
              authRefresh: true,
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
        'C813610 Create a new MARC authority record with "FOLIO" authority file selected (spitfire)',
        { tags: ['criticalPath', 'spitfire', 'C813610'] },
        () => {
          MarcAuthorities.clickActionsAndNewAuthorityButton();
          QuickMarcEditor.checkPaneheaderContains(testData.headerText);
          MarcAuthority.checkSourceFileSelectShown();
          MarcAuthority.setValid008DropdownValues();
          MarcAuthority.selectSourceFile(testData.sourceName);
          QuickMarcEditor.checkContentByTag(testData.tag001, '');
          newFields.forEach((newField) => {
            MarcAuthority.addNewFieldAfterExistingByTag(
              newField.previousFieldTag,
              newField.tag,
              newField.content,
            );
          });
          QuickMarcEditor.checkContentByTag(testData.tag001, testData.tag001Value);
          QuickMarcEditor.checkContentByTag(testData.tag010, newFields[0].content);
          QuickMarcEditor.checkContentByTag(testData.tag100, newFields[1].content);
          QuickMarcEditor.pressSaveAndClose();
          cy.wait(1500);
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
          cy.reload();
          MarcAuthorities.waitLoading();
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
