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
          title: 'C375090DiCaprio, Leonardo',
          type: 'Authorized',
          searchInput: 'C375090Di Caprio',
          searchOption: 'Keyword',
        },
        authority2: {
          searchInput: 'Canady, Robert Lynn',
          searchOption: 'Keyword',
        },
        editedTags: ['110', '111', '130', '150', '151', '155'],
        valuesFor010: ['n 94000330', 'n 94000331', 'n 94000339'],
        errorMessage: 'Field is non-repeatable.',
      };

      const subfieldPrefix = '$a ';
      const authorityPostfix = '?authRefType=Authorized';
      const rowIndex1XX = 8;
      const jobProfileToRun = DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY;
      const marcFiles = [
        {
          marc: 'marcAuthFileForC375090.mrc',
          fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
          numOfRecords: 1,
        },
        {
          marc: 'marcAuthFileForC375099.mrc',
          fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
          numOfRecords: 1,
        },
      ];
      const createdAuthorityIDs = [];

      before('Create test data', () => {
        cy.getAdminToken();
        MarcAuthorities.deleteMarcAuthorityByTitleViaAPI(testData.authority.searchInput);
        MarcAuthorities.deleteMarcAuthorityByTitleViaAPI(testData.authority2.searchInput);
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
          Permissions.dataImportUploadAll.gui,
          Permissions.uiMarcAuthoritiesAuthorityRecordEdit.gui,
          Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
          Permissions.uiQuickMarcQuickMarcAuthoritiesEditorAll.gui,
        ]).then((createdUserProperties) => {
          testData.userProperties = createdUserProperties;

          cy.login(testData.userProperties.username, testData.userProperties.password, {
            path: TopMenu.marcAuthorities,
            waiter: MarcAuthorities.waitLoading,
            authRefresh: true,
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
        'C375090 No additional records appear after user edits "1XX" MARC tag in MARC authority record (spitfire) (TaaS)',
        { tags: ['extendedPath', 'spitfire', 'C375090'] },
        () => {
          MarcAuthorities.searchByParameter(
            testData.authority.searchOption,
            testData.authority.searchInput,
          );
          MarcAuthorities.verifyOnlyOneAuthorityRecordInResultsList();
          testData.editedTags.forEach((tag) => {
            MarcAuthorities.select(`${createdAuthorityIDs[0]}${authorityPostfix}`);
            MarcAuthority.edit();
            MarcAuthority.changeTag(rowIndex1XX, tag);
            QuickMarcEditor.verifyTagValue(rowIndex1XX, tag);
            MarcAuthority.clickSaveAndCloseButton();
            QuickMarcEditor.checkAfterSaveAndCloseAuthority();
            MarcAuthorities.checkAfterSearch(testData.authority.type, testData.authority.title);
            MarcAuthorities.verifyOnlyOneAuthorityRecordInResultsList();
          });
        },
      );

      it(
        'C375099 Unable to add multiple "010" fields to "MARC authority" record which is NOT linked to "MARC Bib" record (spitfire) (TaaS)',
        { tags: ['extendedPath', 'spitfire', 'C375099'] },
        () => {
          MarcAuthorities.searchByParameter(
            testData.authority2.searchOption,
            testData.authority2.searchInput,
          );
          MarcAuthorities.select(`${createdAuthorityIDs[1]}${authorityPostfix}`);
          MarcAuthority.edit();
          QuickMarcEditor.checkTagAbsent('010');
          QuickMarcEditor.addNewField('010', `${subfieldPrefix}${testData.valuesFor010[0]}`, 5);
          QuickMarcEditor.checkContent(`${subfieldPrefix}${testData.valuesFor010[0]}`, 6);
          QuickMarcEditor.addNewField('010', `${subfieldPrefix}${testData.valuesFor010[1]}`, 5);
          QuickMarcEditor.checkContent(`${subfieldPrefix}${testData.valuesFor010[1]}`, 6);
          QuickMarcEditor.clickSaveAndKeepEditingButton();
          QuickMarcEditor.checkErrorMessage(7, testData.errorMessage);
          QuickMarcEditor.deleteField(6);
          QuickMarcEditor.verifyNoFieldWithContent(`${subfieldPrefix}${testData.valuesFor010[1]}`);
          QuickMarcEditor.clickSaveAndKeepEditing();
          QuickMarcEditor.verifyAndDismissRecordUpdatedCallout();
          cy.wait(1000);
          QuickMarcEditor.addNewField('010', `${subfieldPrefix}${testData.valuesFor010[2]}`, 5);
          QuickMarcEditor.checkContent(`${subfieldPrefix}${testData.valuesFor010[2]}`, 6);
          QuickMarcEditor.clickSaveAndKeepEditingButton();
          QuickMarcEditor.checkErrorMessage(7, testData.errorMessage);
        },
      );
    });
  });
});
