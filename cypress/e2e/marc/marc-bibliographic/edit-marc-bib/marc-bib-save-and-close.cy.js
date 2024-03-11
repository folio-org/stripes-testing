import Permissions from '../../../../support/dictionary/permissions';
import DataImport from '../../../../support/fragments/data_import/dataImport';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import InventoryViewSource from '../../../../support/fragments/inventory/inventoryViewSource';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../support/utils/stringTools';

describe('MARC', () => {
  describe('MARC Bibliographic', () => {
    describe('Edit MARC bib', () => {
      const testData = {
        tag245rowIndex: 14,
        tag245value1: '$a Edited $h [Sound Recording] / $c Cypress Automation',
        instanceTitle1: 'Instance • Edited [Sound Recording] / Cypress Automation',
        tag245value2: '$a Edited Twice $h [Sound Recording] / $c Cypress Automation',
        instanceTitle2: 'Instance • Edited Twice [Sound Recording] / Cypress Automation',
        expectedInSourceRow: '245\t1 0\t$a Edited $h [Sound Recording] / $c Cypress Automation',
        successMsg:
          'This record has successfully saved and is in process. Changes may not appear immediately.',
      };
      const marcFile = {
        marc: 'marcBibFileC360097.mrc',
        fileName: `testMarcFileC360097.${getRandomPostfix()}.mrc`,
        jobProfileToRun: 'Default - Create instance and SRS MARC Bib',
        propertyName: 'relatedInstanceInfo',
      };
      const instanceIDs = [];

      before('Creating test user and an inventory instance', () => {
        cy.createTempUser([
          Permissions.inventoryAll.gui,
          Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
        ]).then((createdUserProperties) => {
          testData.userProperties = createdUserProperties;
          cy.loginAsAdmin({ path: TopMenu.dataImportPath, waiter: DataImport.waitLoading }).then(
            () => {
              DataImport.uploadFileViaApi(
                marcFile.marc,
                marcFile.fileName,
                marcFile.jobProfileToRun,
              ).then((response) => {
                response.entries.forEach((record) => {
                  instanceIDs.push(record[marcFile.propertyName].idList[0]);
                });
              });
            },
          );
          cy.login(testData.userProperties.username, testData.userProperties.password, {
            path: TopMenu.inventoryPath,
            waiter: InventoryInstances.waitContentLoading,
          }).then(() => {
            InventoryInstances.waitContentLoading();
            InventoryInstances.searchByTitle(instanceIDs[0]);
            InventoryInstances.selectInstance();
            InventoryInstance.editMarcBibliographicRecord();
          });
        });
      });

      after('Deleting test user and an inventory instance', () => {
        cy.getAdminToken();
        Users.deleteViaApi(testData.userProperties.userId);
        InventoryInstance.deleteInstanceViaApi(instanceIDs[0]);
      });

      it(
        'C360097 Verify updates are saved after clicking "Save & keep editing" button in "MARC Bibliographic" edit mode (Spitfire) (TaaS)',
        { tags: ['criticalPath', 'spitfire'] },
        () => {
          QuickMarcEditor.updateExistingFieldContent(
            testData.tag245rowIndex,
            testData.tag245value1,
          );
          QuickMarcEditor.checkButtonsEnabled();
          QuickMarcEditor.pressSaveAndKeepEditing(testData.successMsg);
          QuickMarcEditor.checkContent(testData.tag245value1, testData.tag245rowIndex);
          QuickMarcEditor.closeUsingCrossButton();
          InventoryInstance.waitLoading();
          InventoryInstance.verifyInstanceTitle(testData.instanceTitle1);
          InventoryInstance.viewSource();
          InventoryViewSource.contains(testData.expectedInSourceRow);
          InventoryViewSource.close();
          InventoryInstance.waitLoading();
          InventoryInstance.editMarcBibliographicRecord();
          QuickMarcEditor.updateExistingFieldContent(
            testData.tag245rowIndex,
            testData.tag245value2,
          );
          QuickMarcEditor.pressSaveAndKeepEditing(testData.successMsg);
          QuickMarcEditor.checkContent(testData.tag245value2, testData.tag245rowIndex);
          cy.go('back');
          InventoryInstance.waitLoading();
          InventoryInstance.verifyInstanceTitle(testData.instanceTitle2);
        },
      );
    });
  });
});
