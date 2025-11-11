import { DEFAULT_JOB_PROFILE_NAMES } from '../../../../support/constants';
import { Permissions } from '../../../../support/dictionary';
import DataImport from '../../../../support/fragments/data_import/dataImport';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../support/utils/stringTools';
import InventorySearchAndFilter from '../../../../support/fragments/inventory/inventorySearchAndFilter';

describe('MARC', () => {
  describe('MARC Bibliographic', () => {
    describe('Derive MARC bib', () => {
      const testData = {
        marcBibTitle: 'Pretty_Woman',
        marcBibFilePath: 'Pretty_Woman_movie.mrc',
        marcBibFileName: `testMarcFileC380646.${getRandomPostfix()}.mrc`,
        jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
        propertyName: 'instance',
        errorMessage: 'Field is non-repeatable.',
      };
      let createdRecordIDs;

      before('Creating data', () => {
        cy.getAdminToken();
        cy.createTempUser([
          Permissions.inventoryAll.gui,
          Permissions.dataImportUploadAll.gui,
          Permissions.moduleDataImportEnabled.gui,
          Permissions.uiQuickMarcQuickMarcBibliographicEditorView.gui,
          Permissions.uiQuickMarcQuickMarcEditorDuplicate.gui,
        ]).then((createdUserProperties) => {
          testData.userProperties = createdUserProperties;
          DataImport.uploadFileViaApi(
            testData.marcBibFilePath,
            testData.marcBibFileName,
            testData.jobProfileToRun,
          ).then((response) => {
            response.forEach((record) => {
              createdRecordIDs = record[testData.propertyName].id;
            });
          });
          cy.waitForAuthRefresh(() => {
            cy.login(testData.userProperties.username, testData.userProperties.password, {
              path: TopMenu.inventoryPath,
              waiter: InventoryInstances.waitContentLoading,
            });
          }, 20_000);
        });
      });

      after('Deleting created user and data', () => {
        cy.getAdminToken();
        Users.deleteViaApi(testData.userProperties.userId);
        InventoryInstance.deleteInstanceViaApi(createdRecordIDs);
      });

      it(
        'C380646 Derive "MARC Bibliographic" record with multiple "010" fields (spitfire) (TaaS)',
        { tags: ['extendedPath', 'spitfire', 'C380646'] },
        () => {
          InventoryInstances.searchByTitle(testData.marcBibTitle);
          cy.ifConsortia(true, () => {
            InventorySearchAndFilter.byShared('No');
          });
          InventoryInstance.selectTopRecord();
          InventoryInstance.deriveNewMarcBib();
          QuickMarcEditor.addNewField('010', '$a   766384', 6);
          QuickMarcEditor.addNewField('010', '$a   5689434', 7);
          QuickMarcEditor.pressSaveAndCloseButton();
          QuickMarcEditor.checkErrorMessage(8, testData.errorMessage);
          QuickMarcEditor.deleteTag(8);
          QuickMarcEditor.pressSaveAndClose();
          QuickMarcEditor.verifyDerivedMarcBibSave();
        },
      );
    });
  });
});
