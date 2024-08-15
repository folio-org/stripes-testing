import { DEFAULT_JOB_PROFILE_NAMES } from '../../../../support/constants';
import Permissions from '../../../../support/dictionary/permissions';
import DataImport from '../../../../support/fragments/data_import/dataImport';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
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
        tag010: '010',
        tag100: '100',
        tag240: '240',
        authority100FieldValue: 'C375100 Beethoven, Ludwig van',
        searchOption: 'Keyword',
        searchValue: 'Beethoven, Ludwig van, 1770-1827. 14 variations sur un thème original',
        fieldForAdding: { tag: '010', content: '$a n 94000339' },
        errorMultiple010MarcTags: 'Field is non-repeatable.',
      };

      const createdRecordIDs = [];

      const marcFiles = [
        {
          marc: 'marcBibFileForC375100.mrc',
          fileName: `testMarcFileC375100.${getRandomPostfix()}.mrc`,
          jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
          numOfRecords: 1,
          propertyName: 'instance',
        },
        {
          marc: 'marcAuthFileForC375100.mrc',
          fileName: `testMarcFileC375100.${getRandomPostfix()}.mrc`,
          jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
          authorityHeading: 'Variations / Ludwig Van Beethoven.',
          numOfRecords: 1,
          propertyName: 'authority',
        },
      ];

      before('Create test data', () => {
        cy.getAdminToken();
        marcFiles.forEach((marcFile) => {
          DataImport.uploadFileViaApi(
            marcFile.marc,
            marcFile.fileName,
            marcFile.jobProfileToRun,
          ).then((response) => {
            response.forEach((record) => {
              createdRecordIDs.push(record[marcFile.propertyName].id);
            });
          });
        });

        cy.loginAsAdmin({
          path: TopMenu.dataImportPath,
          waiter: DataImport.waitLoading,
        });

        cy.visit(TopMenu.inventoryPath).then(() => {
          InventoryInstances.searchByTitle(createdRecordIDs[0]);
          InventoryInstances.selectInstance();
          InventoryInstance.editMarcBibliographicRecord();
          InventoryInstance.verifyAndClickLinkIcon(testData.tag240);
          MarcAuthorities.switchToSearch();
          InventoryInstance.verifySelectMarcAuthorityModal();
          InventoryInstance.verifySearchOptions();
          InventoryInstance.searchResults(testData.authority100FieldValue);
          MarcAuthorities.checkFieldAndContentExistence(
            testData.tag100,
            `$a ${testData.authority100FieldValue}`,
          );
          InventoryInstance.clickLinkButton();
          QuickMarcEditor.verifyAfterLinkingAuthority(testData.tag240);
          QuickMarcEditor.pressSaveAndClose();
          cy.wait(1500);
          QuickMarcEditor.pressSaveAndClose();

          cy.createTempUser([
            Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
            Permissions.uiMarcAuthoritiesAuthorityRecordEdit.gui,
            Permissions.uiQuickMarcQuickMarcAuthoritiesEditorAll.gui,
          ]).then((createdUserProperties) => {
            testData.userProperties = createdUserProperties;
            cy.login(testData.userProperties.username, testData.userProperties.password, {
              path: TopMenu.marcAuthorities,
              waiter: MarcAuthorities.waitLoading,
            });
          });
        });
      });

      after('Delete test data', () => {
        cy.getAdminToken();
        Users.deleteViaApi(testData.userProperties.userId);
        InventoryInstance.deleteInstanceViaApi(createdRecordIDs[0]);
        MarcAuthority.deleteViaAPI(createdRecordIDs[1]);
      });

      it(
        'C375100 Unable to add multiple "010" fields to linked "MARC authority" record (spitfire)(TaaS)',
        { tags: ['extendedPath', 'spitfire'] },
        () => {
          MarcAuthorities.searchBy(testData.searchOption, testData.searchValue);
          MarcAuthorities.selectFirstRecord();
          MarcAuthority.edit();
          QuickMarcEditor.checkFieldsExist([testData.tag010]);
          MarcAuthority.addNewField(
            4,
            testData.fieldForAdding.tag,
            testData.fieldForAdding.content,
          );
          QuickMarcEditor.pressSaveAndClose();
          QuickMarcEditor.checkErrorMessage(5, testData.errorMultiple010MarcTags);
          QuickMarcEditor.clickSaveAndKeepEditingButton();
          QuickMarcEditor.checkErrorMessage(5, testData.errorMultiple010MarcTags);
        },
      );
    });
  });
});
