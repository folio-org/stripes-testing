import { Permissions } from '../../../../support/dictionary';
import DataImport from '../../../../support/fragments/data_import/dataImport';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import MarcAuthorities from '../../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthority from '../../../../support/fragments/marcAuthority/marcAuthority';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import getRandomPostfix from '../../../../support/utils/stringTools';

describe('MARC', () => {
  describe('MARC Authority', () => {
    describe('Edit Authority record', () => {
      const testData = {
        tag040: '040',
        tag040NewValue: '0',
        tag380: '380',
        tag380RowIndex: 7,
        ldr: {
          tag: 'LDR',
          ldrValue23Symbols: '01919cz\\\\a2200325n\\\\450',
          ldrValue24Symbols: '01919cz\\\\a2200325n\\\\4500',
        },
        searchInput:
          'C375167 Beethoveen, Ludwig van, 1770-1827. 14 variations sur un thème original',
        searchOption: 'Keyword',
        calloutLDRMessage:
          'Record cannot be saved. The Leader must contain 24 characters, including null spaces.',
        calloutMessage: 'Record cannot be saved. A MARC tag must contain three characters.',
      };

      const marcFiles = [
        {
          marc: 'marcAuthFileForC375167.mrc',
          fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
          jobProfileToRun: 'Default - Create SRS MARC Authority',
        },
      ];

      const createdAuthorityIDs = [];

      before('Create test data', () => {
        cy.getAdminToken();
        marcFiles.forEach((marcFile) => {
          DataImport.uploadFileViaApi(
            marcFile.marc,
            marcFile.fileName,
            marcFile.jobProfileToRun,
          ).then((response) => {
            response.entries.forEach((record) => {
              createdAuthorityIDs.push(record.relatedAuthorityInfo.idList[0]);
            });
          });
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
        Users.deleteViaApi(testData.userProperties.userId);
        MarcAuthority.deleteViaAPI(createdAuthorityIDs[0]);
      });

      it(
        'C375167 Save "MARC authority" record with wrong tag value, empty LDR and deleted field (spitfire) (TaaS)',
        { tags: ['extendedPath', 'spitfire'] },
        () => {
          MarcAuthorities.searchBy(testData.searchOption, testData.searchInput);

          MarcAuthority.edit();
          QuickMarcEditor.updateExistingTagName(testData.tag040, testData.tag040NewValue);
          QuickMarcEditor.checkButtonsEnabled();

          QuickMarcEditor.checkLDRValue(testData.ldr.ldrValue24Symbols);
          QuickMarcEditor.updateExistingField(testData.ldr.tag, testData.ldr.ldrValue23Symbols);
          QuickMarcEditor.checkLDRValue(testData.ldr.ldrValue23Symbols);

          QuickMarcEditor.deleteField(testData.tag380RowIndex);
          QuickMarcEditor.afterDeleteNotification(testData.tag380);
          QuickMarcEditor.pressSaveAndClose();
          QuickMarcEditor.checkCallout(testData.calloutLDRMessage);
          QuickMarcEditor.closeCallout();

          QuickMarcEditor.updateExistingField(testData.ldr.tag, testData.ldr.ldrValue24Symbols);
          QuickMarcEditor.checkLDRValue(testData.ldr.ldrValue24Symbols);

          QuickMarcEditor.pressSaveAndKeepEditing(testData.calloutMessage);
          QuickMarcEditor.verifyAndDismissWrongTagLengthCallout();

          QuickMarcEditor.updateExistingTagName(testData.tag040NewValue, testData.tag040);
          QuickMarcEditor.pressSaveAndClose();
          QuickMarcEditor.verifyConfirmModal();
        },
      );
    });
  });
});
