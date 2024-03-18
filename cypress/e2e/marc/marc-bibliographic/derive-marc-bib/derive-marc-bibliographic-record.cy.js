import { Permissions } from '../../../../support/dictionary';
import DataImport from '../../../../support/fragments/data_import/dataImport';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../support/utils/stringTools';

describe('MARC', () => {
  describe('MARC Bibliographic', () => {
    describe('Derive MARC bib', () => {
      const testData = {
        marcBibTitle: 'Pretty_Woman',
        marcBibFilePath: 'Pretty_Woman_movie.mrc',
        marcBibFileName: `testMarcFileC380646.${getRandomPostfix()}.mrc`,
        jobProfileToRun: 'Default - Create instance and SRS MARC Bib',
        propertyName: 'relatedInstanceInfo',
      };
      let createdRecordIDs;

      before('Creating data', () => {
        cy.createTempUser([
          Permissions.inventoryAll.gui,
          Permissions.dataImportUploadAll.gui,
          Permissions.moduleDataImportEnabled.gui,
          Permissions.uiQuickMarcQuickMarcBibliographicEditorView.gui,
          Permissions.uiQuickMarcQuickMarcEditorDuplicate.gui,
        ]).then((createdUserProperties) => {
          testData.userProperties = createdUserProperties;
          cy.login(testData.userProperties.username, testData.userProperties.password, {
            path: TopMenu.dataImportPath,
            waiter: DataImport.waitLoading,
          }).then(() => {
            DataImport.uploadFileViaApi(
              testData.marcBibFilePath,
              testData.marcBibFileName,
              testData.jobProfileToRun,
            ).then((response) => {
              response.entries.forEach((record) => {
                createdRecordIDs = record[testData.propertyName].idList[0];
              });
            });
          });
        });
      });

      after('Deleting created user and data', () => {
        cy.getAdminToken();
        Users.deleteViaApi(testData.userProperties.userId);
        InventoryInstance.deleteInstanceViaApi(createdRecordIDs);
      });

      it(
        'C380646 Derive "MARC Bibliographic" record with multiple "010" fields (spitfire) (TaaS)',
        { tags: ['extendedPath', 'spitfire'] },
        () => {
          cy.visit(TopMenu.inventoryPath);
          InventoryInstances.searchByTitle(testData.marcBibTitle);
          InventoryInstance.selectTopRecord();
          InventoryInstance.deriveNewMarcBib();
          QuickMarcEditor.addNewField('010', '$a   766384', 6);
          QuickMarcEditor.addNewField('010', '$a   5689434', 7);
          QuickMarcEditor.pressSaveAndClose();
          QuickMarcEditor.verifyMultipleTagCallout('010');
          QuickMarcEditor.deleteTag(8);
          QuickMarcEditor.pressSaveAndClose();
          QuickMarcEditor.verifyDerivedMarcBibSave();
        },
      );
    });
  });
});
