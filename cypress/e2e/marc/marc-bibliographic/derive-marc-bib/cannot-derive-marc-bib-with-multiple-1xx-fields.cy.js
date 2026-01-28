import { Permissions } from '../../../../support/dictionary';
import { DEFAULT_JOB_PROFILE_NAMES } from '../../../../support/constants';
import DataImport from '../../../../support/fragments/data_import/dataImport';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import getRandomPostfix from '../../../../support/utils/stringTools';

describe('MARC', () => {
  describe('MARC Bibliographic', () => {
    describe('Derive MARC bib', () => {
      const testData = {
        field1XXOne: '$a C515004 1XX field one',
        field1XXTwo: '$a C515004 1XX field two',
        expected1XXNonRepeatableError: 'Field 1XX is non-repeatable.',
        expectedNonRepeatableError: 'Field is non-repeatable.',
        tag1: ['100', '140', '140', '110', '101', '101', '100', '140'],
        tag2: ['110', '140', '150', '150', '101', '109', '109', '109'],
        marcFile: {
          marc: 'marcBibFileC515004.mrc',
          fileName: `testMarcFileC515004.${getRandomPostfix()}.mrc`,
          jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
          propertyName: 'instance',
        },
      };

      const createdRecordIDs = [];
      let instanceId;

      before('Create user and data', () => {
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
        if (instanceId) {
          InventoryInstance.deleteInstanceViaApi(instanceId);
        }
        createdRecordIDs.forEach((recordId) => {
          InventoryInstance.deleteInstanceViaApi(recordId);
        });
        Users.deleteViaApi(testData.userProperties.userId);
      });

      it(
        'C515004 Cannot derive MARC bib record with multiple 1XX fields (spitfire)',
        { tags: ['extendedPath', 'spitfire', 'C515004'] },
        () => {
          InventoryInstances.searchByTitle(createdRecordIDs[0]);
          InventoryInstances.selectInstance();
          InventoryInstance.deriveNewMarcBib();

          QuickMarcEditor.addEmptyFields(4);
          QuickMarcEditor.addEmptyFields(5);
          QuickMarcEditor.updateExistingTagValue(5, '100');
          QuickMarcEditor.updateExistingFieldContent(5, testData.field1XXOne);
          QuickMarcEditor.updateExistingTagValue(6, '100');
          QuickMarcEditor.updateExistingFieldContent(6, testData.field1XXTwo);

          QuickMarcEditor.pressSaveAndCloseButton();
          QuickMarcEditor.checkErrorMessage(5, testData.expected1XXNonRepeatableError);
          QuickMarcEditor.checkErrorMessage(6, testData.expected1XXNonRepeatableError);
          QuickMarcEditor.checkErrorMessage(6, testData.expectedNonRepeatableError);
          QuickMarcEditor.verifyValidationCallout(0, 3);
          QuickMarcEditor.closeAllCallouts();

          testData.tag1.forEach((tag1Value, index) => {
            QuickMarcEditor.updateExistingTagValue(5, testData.tag1[index]);
            QuickMarcEditor.updateExistingTagValue(6, testData.tag2[index]);
            QuickMarcEditor.pressSaveAndCloseButton();

            QuickMarcEditor.checkErrorMessage(5, testData.expected1XXNonRepeatableError);
            QuickMarcEditor.checkErrorMessage(6, testData.expected1XXNonRepeatableError);

            QuickMarcEditor.verifyValidationCallout(0, 2);
            QuickMarcEditor.closeAllCallouts();
          });
          QuickMarcEditor.deleteField(6);

          QuickMarcEditor.pressSaveAndCloseButton();
          QuickMarcEditor.checkAfterSaveAndCloseDerive();
        },
      );
    });
  });
});
