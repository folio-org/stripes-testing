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
        authority: {
          searchInput: 'DiCaprio, Leonardo',
          searchOption: 'Keyword',
        },
        editedField: {
          tag: '035',
          content: 'edited 035',
        },
        fields010: [
          { rowIndex: 4, tag: '010', content: '$a n  94000330' },
          { rowIndex: 5, tag: '010', content: '$a n  94000339' },
        ],
        errorMessage: 'Field is non-repeatable.',
      };
      const subfieldPrefix = '$a';
      const authorityPostfix = '?authRefType=Authorized&heading';
      const jobProfileToRun = DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY;
      const marcFiles = [
        {
          marc: 'marcAuthFileForC375127.mrc',
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
        'C375127 Unable to save imported "MARC authority" record with multiple "010" fields when editing (spitfire) (TaaS)',
        { tags: ['extendedPath', 'spitfire', 'C375127'] },
        () => {
          MarcAuthorities.searchBy(testData.authority.searchOption, testData.authority.searchInput);
          MarcAuthorities.select(`${createdAuthorityIDs[0]}${authorityPostfix}`);
          testData.fields010.forEach((field) => {
            MarcAuthority.checkTagInRow(field.rowIndex, field.tag);
          });
          MarcAuthority.edit();
          testData.fields010.forEach((field) => {
            QuickMarcEditor.verifyTagValue(field.rowIndex, field.tag);
            QuickMarcEditor.checkContent(field.content, field.rowIndex);
          });
          MarcAuthority.changeField(
            testData.editedField.tag,
            `${subfieldPrefix} ${testData.editedField.content}`,
          );
          QuickMarcEditor.checkContent(`${subfieldPrefix} ${testData.editedField.content}`, 6);
          QuickMarcEditor.checkButtonsEnabled();
          QuickMarcEditor.pressSaveAndCloseButton();
          QuickMarcEditor.checkErrorMessage(5, testData.errorMessage);
        },
      );
    });
  });
});
