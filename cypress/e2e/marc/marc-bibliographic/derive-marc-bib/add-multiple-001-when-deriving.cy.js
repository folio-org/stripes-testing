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
        tag001: '001',
        tag001value: '1234',
        marcFile: {
          marc: 'marcBibFileC387459.mrc',
          fileName: `testMarcFileC387459.${getRandomPostfix()}.mrc`,
          jobProfileToRun: 'Default - Create instance and SRS MARC Bib',
          propertyName: 'relatedInstanceInfo',
        },
      };

      const createdRecordIDs = [];

      before('Creating data', () => {
        cy.createTempUser([
          Permissions.inventoryAll.gui,
          Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
          Permissions.uiQuickMarcQuickMarcEditorDuplicate.gui,
        ]).then((createdUserProperties) => {
          testData.userProperties = createdUserProperties;
          cy.loginAsAdmin({ path: TopMenu.dataImportPath, waiter: DataImport.waitLoading }).then(
            () => {
              DataImport.uploadFileViaApi(
                testData.marcFile.marc,
                testData.marcFile.fileName,
                testData.marcFile.jobProfileToRun,
              ).then((response) => {
                response.entries.forEach((record) => {
                  createdRecordIDs.push(record[testData.marcFile.propertyName].idList[0]);
                });
              });
            },
          );
        });
      });

      beforeEach('Login', () => {
        cy.login(testData.userProperties.username, testData.userProperties.password, {
          path: TopMenu.inventoryPath,
          waiter: InventoryInstances.waitContentLoading,
        });
      });

      after('Deleting created user and data', () => {
        cy.getAdminToken();
        Users.deleteViaApi(testData.userProperties.userId);
        createdRecordIDs.forEach((instanceID) => {
          InventoryInstance.deleteInstanceViaApi(instanceID);
        });
      });

      it(
        'C387459 Add multiple 001s when deriving "MARC Bibliographic" record (spitfire) (TaaS)',
        { tags: ['extendedPath', 'spitfire'] },
        () => {
          // #1 - #3 Open the "Instance" record view
          InventoryInstances.searchByTitle(createdRecordIDs[0]);
          InventoryInstances.selectInstance();
          // #4 Click on the "Actions" dropdown button and choose "Derive new MARC bibliographic record" option from the dropdown list.
          InventoryInstance.deriveNewMarcBib();

          // #5 Click on the "+" (Add a new field) icon.
          QuickMarcEditor.addEmptyFields(5);
          QuickMarcEditor.checkEmptyFieldAdded(6);

          // #6 Fill in the new $a subfield with any values.
          QuickMarcEditor.updateExistingFieldContent(6, `$a ${testData.tag001value}`);

          // #7 Fill in the new input field with the "001" MARC tag.
          QuickMarcEditor.updateTagNameToLockedTag(6, '001');
          QuickMarcEditor.checkFourthBoxDisabled(6);

          // #8 Click on the "Save & close" button.
          QuickMarcEditor.pressSaveAndClose();
          QuickMarcEditor.checkAfterSaveAndCloseDerive();
          cy.url().then((url) => createdRecordIDs.push(url.split('/')[5]));

          // #9 Click on the "Actions" button in the third pane → Select "Edit MARC bibliographic record" option.
          InventoryInstance.editMarcBibliographicRecord();
          QuickMarcEditor.checkReadOnlyTags();
          QuickMarcEditor.verifyNoFieldWithContent(testData.tag001value);
        },
      );
    });
  });
});
