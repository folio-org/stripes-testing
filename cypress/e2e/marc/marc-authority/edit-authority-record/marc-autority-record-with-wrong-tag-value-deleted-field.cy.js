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
          searchOption: 'Keyword',
          title: 'Beethoven, Ludwig van (no 010)',
        },
        field010: { tag: '010', subfield1: '$a n90635366', subfield2: '$a n90635377' },
      };
      const authorityPostfix = '?authRefType=Authorized';
      const jobProfileToRun = 'Default - Create SRS MARC Authority';
      const marcFiles = [
        {
          marc: 'marcAuthFileForC375166.mrc',
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
              response.forEach((record) => {
                createdAuthorityIDs.push(record.authority.id);
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
        'C375166 Save "MARC authority" record with wrong tag value and deleted field (spitfire) (TaaS)',
        { tags: ['extendedPath', 'spitfire'] },
        () => {
          MarcAuthorities.searchBy(testData.authority.searchOption, testData.authority.title);
          MarcAuthorities.select(`${createdAuthorityIDs[0]}${authorityPostfix}`);
          MarcAuthority.edit();
          MarcAuthority.changeTag(5, '0');
          QuickMarcEditor.verifyTagValue(5, '0');
          QuickMarcEditor.checkButtonSaveAndCloseEnable();

          MarcAuthority.deleteTag(7);
          QuickMarcEditor.pressSaveAndClose();
          QuickMarcEditor.verifyMarcTagThreeCharacterCallout();

          MarcAuthority.changeTag(5, '040');
          QuickMarcEditor.pressSaveAndClose();
          QuickMarcEditor.verifyConfirmModal();
        },
      );
    });
  });
});
