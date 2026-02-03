import { DEFAULT_JOB_PROFILE_NAMES } from '../../../../support/constants';
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
        tag005: '005',
        tag005value: '20240804120000.0',
        marcFile: {
          marc: 'marcBibFileC496210.mrc',
          fileName: `testMarcFileC496210.${getRandomPostfix()}.mrc`,
          jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
          propertyName: 'instance',
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

          DataImport.uploadFileViaApi(
            testData.marcFile.marc,
            testData.marcFile.fileName,
            testData.marcFile.jobProfileToRun,
          ).then((response) => {
            response.forEach((record) => {
              createdRecordIDs.push(record[testData.marcFile.propertyName].id);
            });
          });
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
        'C496210 Add multiple 005s when deriving "MARC Bibliographic" record (spitfire)',
        { tags: ['extendedPath', 'spitfire', 'C496210'] },
        () => {
          // #1 Open the "Instance" record view and derive new MARC bib
          InventoryInstances.searchByTitle(createdRecordIDs[0]);
          InventoryInstances.selectInstance();
          InventoryInstance.deriveNewMarcBib();

          // #2 Click on the "+" (Add a new field) icon.
          QuickMarcEditor.addEmptyFields(5);
          QuickMarcEditor.checkEmptyFieldAdded(6);

          // #3 Fill in the new $a subfield with any values.
          QuickMarcEditor.updateExistingFieldContent(6, `$a ${testData.tag005value}`);

          // #4 Fill in the new input field with the "005" MARC tag.
          QuickMarcEditor.updateTagNameToLockedTag(6, '005');
          QuickMarcEditor.checkFourthBoxEditable(6, false);

          // #5 Click on the "Save & close" button.
          QuickMarcEditor.pressSaveAndClose();
          QuickMarcEditor.checkAfterSaveAndCloseDerive();
          cy.url().then((url) => createdRecordIDs.push(url.split('/')[5]));

          // #6 Click on the "Actions" button in the third pane → Select "Edit MARC bibliographic record" option.
          InventoryInstance.editMarcBibliographicRecord();
          QuickMarcEditor.checkReadOnlyTags();
          QuickMarcEditor.verifyNoFieldWithContent(testData.tag005value);
        },
      );
    });
  });
});
