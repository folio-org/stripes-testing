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
        tag245: '245',
        tag650: '650',
        errorMessage: 'Field 245 is required.',
        updatedValue: '$a C375125 Test value',
        calloutMsg: 'Record cannot be saved with a fail error.',
        nonRepeatableError: 'Field is non-repeatable.',
        marcFile: {
          marc: 'marcBibFileC375125.mrc',
          fileName: `testMarcFileC375125.${getRandomPostfix()}.mrc`,
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
        'C375125 Cannot save derived "MARC bibliographic" record without or with multiple "245" fields (spitfire)',
        { tags: ['extendedPath', 'spitfire', 'C375125'] },
        () => {
          InventoryInstances.searchByTitle(createdRecordIDs[0]);
          InventoryInstances.selectInstance();

          InventoryInstance.deriveNewMarcBib();

          QuickMarcEditor.updateExistingTagName(testData.tag245, testData.tag650);

          QuickMarcEditor.pressSaveAndCloseButton();
          QuickMarcEditor.checkCallout(testData.errorMessage);
          QuickMarcEditor.closeAllCallouts();

          QuickMarcEditor.updateExistingTagValue(14, testData.tag245);

          QuickMarcEditor.addEmptyFields(14);
          QuickMarcEditor.updateExistingTagValue(15, testData.tag245);
          QuickMarcEditor.updateExistingFieldContent(15, testData.updatedValue);

          QuickMarcEditor.pressSaveAndCloseButton();
          QuickMarcEditor.checkErrorMessage(15, testData.nonRepeatableError);
          QuickMarcEditor.verifyValidationCallout(0, 1);
        },
      );
    });
  });
});
