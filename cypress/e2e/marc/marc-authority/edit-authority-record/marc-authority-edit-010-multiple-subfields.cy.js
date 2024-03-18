import { Permissions } from '../../../../support/dictionary';
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
        authority: {
          searchInput: 'Robinson, Peter',
          searchOption: 'Keyword',
        },
        field010: { tag: '010', subfield1: '$a n90635366', subfield2: '$a n90635377' },
      };
      const authorityPostfix = '?authRefType=Authorized&heading';
      const jobProfileToRun = 'Default - Create SRS MARC Authority';
      const marcFiles = [
        {
          marc: 'marcAuthFileForC376592.mrc',
          fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
          numOfRecords: 1,
        },
      ];
      const createdAuthorityIDs = [];

      before('Upload files', () => {
        cy.getAdminToken();
        marcFiles.forEach((marcFile) => {
          DataImport.uploadFileViaApi(marcFile.marc, marcFile.fileName, jobProfileToRun).then(
            (response) => {
              response.entries.forEach((record) => {
                createdAuthorityIDs.push(record.relatedAuthorityInfo.idList[0]);
              });
            },
          );
        });

        cy.createTempUser([
          Permissions.uiMarcAuthoritiesAuthorityRecordEdit.gui,
          Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
          Permissions.uiQuickMarcQuickMarcAuthoritiesEditorAll.gui,
        ]).then((createdUserProperties) => {
          testData.userProperties = createdUserProperties;

          cy.login(testData.userProperties.username, testData.userProperties.password, {
            path: TopMenu.marcAuthorities,
            waiter: MarcAuthorities.waitLoading,
          });
        });
      });

      after('Delete test data', () => {
        cy.getAdminToken();
        createdAuthorityIDs.forEach((id) => {
          MarcAuthority.deleteViaAPI(id);
        });
        Users.deleteViaApi(testData.userProperties.userId);
      });

      it(
        'C376592 Add multiple "$a" to "010" field in "MARC Authority" record (spitfire) (TaaS)',
        { tags: ['extendedPath', 'spitfire'] },
        () => {
          MarcAuthorities.searchBy(testData.authority.searchOption, testData.authority.searchInput);
          MarcAuthorities.select(`${createdAuthorityIDs[0]}${authorityPostfix}`);
          MarcAuthority.edit();
          QuickMarcEditor.addNewField(
            testData.field010.tag,
            `${testData.field010.subfield1} ${testData.field010.subfield2}`,
            4,
          );
          QuickMarcEditor.verifyTagValue(5, testData.field010.tag);
          QuickMarcEditor.checkContent(
            `${testData.field010.subfield1} ${testData.field010.subfield2}`,
            5,
          );
          QuickMarcEditor.checkButtonsEnabled();
          QuickMarcEditor.clickSaveAndKeepEditingButton();
          QuickMarcEditor.verifyAndDismissMultiple010SubfieldsCallout();
          MarcAuthority.changeField(testData.field010.tag, testData.field010.subfield1);
          QuickMarcEditor.checkContent(testData.field010.subfield1, 5);
          QuickMarcEditor.checkButtonsEnabled();
          QuickMarcEditor.clickSaveAndKeepEditing();
          MarcAuthority.changeField(
            testData.field010.tag,
            `${testData.field010.subfield1} ${testData.field010.subfield2}`,
          );
          QuickMarcEditor.checkContent(
            `${testData.field010.subfield1} ${testData.field010.subfield2}`,
            5,
          );
          QuickMarcEditor.checkButtonsEnabled();
          QuickMarcEditor.clickSaveAndKeepEditingButton();
          QuickMarcEditor.verifyAndDismissMultiple010SubfieldsCallout();

          QuickMarcEditor.pressSaveAndClose();
          QuickMarcEditor.verifyAndDismissMultiple010SubfieldsCallout();
        },
      );
    });
  });
});
