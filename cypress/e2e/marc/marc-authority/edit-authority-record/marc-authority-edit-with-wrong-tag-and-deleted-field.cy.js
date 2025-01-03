import { DEFAULT_JOB_PROFILE_NAMES } from '../../../../support/constants';
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
        tag040: '040',
        tag040NewValue: '0',
        tag380: '380',
        tag380RowIndex: 7,
        searchInput:
          'C375167 Beethoveen, Ludwig van, 1770-1827. 14 variations sur un thème original',
        searchOption: 'Keyword',
        calloutMessage: 'Record cannot be saved. A MARC tag must contain three characters.',
      };

      const marcFiles = [
        {
          marc: 'marcAuthFileForC375167.mrc',
          fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
          jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
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
            response.forEach((record) => {
              createdAuthorityIDs.push(record.authority.id);
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
        'C375167 Save "MARC authority" record with wrong tag value and deleted field (spitfire) (TaaS)',
        { tags: ['extendedPath', 'spitfire', 'C375167'] },
        () => {
          MarcAuthorities.searchBy(testData.searchOption, testData.searchInput);

          MarcAuthority.edit();
          QuickMarcEditor.updateExistingTagName(testData.tag040, testData.tag040NewValue);
          QuickMarcEditor.checkButtonsEnabled();

          QuickMarcEditor.deleteField(testData.tag380RowIndex);
          QuickMarcEditor.afterDeleteNotification(testData.tag380);

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
