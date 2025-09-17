import { DEFAULT_JOB_PROFILE_NAMES } from '../../../../support/constants';
import Permissions from '../../../../support/dictionary/permissions';
import DataImport from '../../../../support/fragments/data_import/dataImport';
import MarcAuthorities from '../../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthority from '../../../../support/fragments/marcAuthority/marcAuthority';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../support/utils/stringTools';

describe('MARC', () => {
  describe('MARC Authority', () => {
    describe('Edit Authority record', () => {
      const testData = {
        title: 'C451558 A$AP Rocky (Rapper), 1988-',
        searchOption: 'Keyword',
        searchText: 'C451558 A$AP rocky',
        tag100: '100',
        tag370: '370',
        field100Content: '$a C451558 A{dollar}AP Rocky $c (Rapper), $d 1988-',
        newContentFor370Field: '$a Harlem, New York, N.Y. $c U.S. A{dollar}AP Rocky',
        updated100FieldValue: '$a C451558 A$AP Rocky $c (Rapper), $d 1988-',
        updated370FieldValue: '$a Harlem, New York, N.Y. $c U.S. A$AP Rocky ',
        editMarcHeader: /Edit .*MARC authority record/,
      };
      const jobProfileToRun = DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY;
      const fileName = `testMarcFile.${getRandomPostfix()}.mrc`;
      const propertyName = 'authority';
      let createdAuthorityID;

      before('Creating data', () => {
        cy.getAdminToken();
        cy.createTempUser([
          Permissions.uiMarcAuthoritiesAuthorityRecordEdit.gui,
          Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
          Permissions.uiQuickMarcQuickMarcAuthoritiesEditorAll.gui,
        ]).then((createdUserProperties) => {
          testData.userProperties = createdUserProperties;

          DataImport.uploadFileViaApi('marcAuthFileForC451558.mrc', fileName, jobProfileToRun).then(
            (response) => {
              response.forEach((record) => {
                createdAuthorityID = record[propertyName].id;
              });
            },
          );

          cy.login(testData.userProperties.username, testData.userProperties.password, {
            path: TopMenu.marcAuthorities,
            waiter: MarcAuthorities.waitLoading,
          });
        });
      });

      after('Deleting data', () => {
        cy.getAdminToken();
        if (createdAuthorityID) MarcAuthority.deleteViaAPI(createdAuthorityID);
        Users.deleteViaApi(testData.userProperties.userId);
      });

      it(
        'C850009 Edit "MARC authority" record which has "$" sign ("{dollar}" code) (spitfire)',
        { tags: ['criticalPath', 'spitfire', 'shiftLeftBroken', 'C850009'] },
        () => {
          MarcAuthorities.searchBy(testData.searchOption, testData.searchText);
          MarcAuthorities.selectItem(testData.title, false);
          MarcAuthority.edit();
          QuickMarcEditor.checkPaneheaderContains(testData.editMarcHeader);
          // wait for the whole content to be loaded.
          cy.wait(2000);
          QuickMarcEditor.checkContent(testData.field100Content, 7);
          QuickMarcEditor.updateExistingFieldContent(8, testData.newContentFor370Field);
          QuickMarcEditor.checkContent(testData.newContentFor370Field, 8);
          QuickMarcEditor.verifySaveAndCloseButtonEnabled();
          QuickMarcEditor.verifySaveAndKeepEditingButtonEnabled();
          MarcAuthority.clickSaveAndCloseButton();
          QuickMarcEditor.checkAfterSaveAndCloseAuthority();

          MarcAuthority.contains(testData.tag100);
          MarcAuthority.contains(testData.updated100FieldValue);
          MarcAuthority.contains(testData.tag370);
          MarcAuthority.contains(testData.updated370FieldValue);
        },
      );
    });
  });
});
