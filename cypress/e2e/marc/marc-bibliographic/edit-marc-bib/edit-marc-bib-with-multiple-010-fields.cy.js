import { DEFAULT_JOB_PROFILE_NAMES } from '../../../../support/constants';
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
        tag010: '010',
        tag011: '011',
        tag010Values: ['58020553', '766384'],
      };
      const marcFiles = [
        {
          marc: 'marcBibFileForC380643.mrc',
          fileName: `testMarcFileC380643.${getRandomPostfix()}.mrc`,
          jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
          propertyName: 'instance',
        },
        {
          marc: 'marcBibFileForC380645.mrc',
          fileName: `testMarcFileC380645.${getRandomPostfix()}.mrc`,
          jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
          propertyName: 'instance',
        },
      ];
      const instanceIds = [];
      const calloutMessage = 'Field is non-repeatable.';

      before('Create test data', () => {
        cy.createTempUser([
          Permissions.inventoryAll.gui,
          Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
        ]).then((createdUserProperties) => {
          testData.userProperties = createdUserProperties;

          cy.getAdminToken();
          marcFiles.forEach((marcFile) => {
            DataImport.uploadFileViaApi(
              marcFile.marc,
              marcFile.fileName,
              marcFile.jobProfileToRun,
            ).then((response) => {
              response.forEach((record) => {
                instanceIds.push(record[marcFile.propertyName].id);
              });
            });
          });
        });
      });

      beforeEach('Login with User', () => {
        cy.login(testData.userProperties.username, testData.userProperties.password, {
          path: TopMenu.inventoryPath,
          waiter: InventoryInstances.waitContentLoading,
        });
      });

      after('Delete test data', () => {
        cy.getAdminToken();
        Users.deleteViaApi(testData.userProperties.userId);
        instanceIds.forEach((id) => {
          InventoryInstance.deleteInstanceViaApi(id);
        });
      });

      it(
        'C380643 Editing imported "MARC Bibliographic" record with multiple "010" fields (spitfire) (TaaS)',
        { tags: ['extendedPath', 'spitfire', 'C380643'] },
        () => {
          InventoryInstances.searchByTitle(instanceIds[0]);
          InventoryInstances.selectInstance();

          // #5 Click on the "Actions" button placed on the third pane >> Select "Edit MARC bibliographic record" option.
          InventoryInstance.editMarcBibliographicRecord();
          // * Two fields "010" are shown.
          QuickMarcEditor.verifyNumOfFieldsWithTag(testData.tag010, 2);

          // #6 Edit any field of "MARC Bibliographic" record (except "010").
          QuickMarcEditor.updateExistingField('245', `$a ${getRandomPostfix()}`);

          // #7 Click "Save & close" button
          QuickMarcEditor.pressSaveAndCloseButton();
          QuickMarcEditor.checkErrorMessage(5, calloutMessage);

          // #8 Change tag value of second "010" field to "011".
          QuickMarcEditor.updateExistingTagValue(5, testData.tag011);
          // Only one field "010" is shown. For example:
          QuickMarcEditor.verifyNumOfFieldsWithTag(testData.tag010, 1);

          // #9 Click "Save & close" button
          QuickMarcEditor.pressSaveAndClose();
          cy.wait(1500);
          QuickMarcEditor.pressSaveAndClose();
          QuickMarcEditor.checkAfterSaveAndClose();
          // #10 Click on the "Actions" >> "View source".
          InventoryInstance.viewSource();
          // * Only one "010" field is displayed, according to changes made by user at step 8.
          InventoryViewSource.verifyRecordNotContainsDuplicatedContent(testData.tag010);
        },
      );

      it(
        'C380645 Edit "MARC Bibliographic" record with multiple "010" fields (spitfire) (TaaS)',
        { tags: ['extendedPath', 'spitfire', 'C380645'] },
        () => {
          InventoryInstances.searchByTitle(instanceIds[1]);
          InventoryInstances.selectInstance();

          // # 1 Click on the "Actions" button placed on the third pane >> Select "Edit MARC bibliographic record" option.
          InventoryInstance.editMarcBibliographicRecord();
          QuickMarcEditor.verifyNumOfFieldsWithTag(testData.tag010, 1);

          // # 2 Edit any field of "MARC Bibliographic" record (except "010").
          QuickMarcEditor.updateExistingField('245', `$a ${getRandomPostfix()}`);
          QuickMarcEditor.checkButtonsEnabled();

          // # 3 Add new "010" field and fill in it as specified: 010  \\$a   766384
          QuickMarcEditor.addNewField('010', '766384', 4);
          QuickMarcEditor.checkContent('766384', 5);

          // # 4 Click "Save & close" button
          QuickMarcEditor.pressSaveAndCloseButton();
          QuickMarcEditor.checkErrorMessage(5, calloutMessage);

          // # 5 Click "Save & keep editng" button
          cy.wait(1000);
          QuickMarcEditor.clickSaveAndKeepEditingButton();
          QuickMarcEditor.checkErrorMessage(5, calloutMessage);

          // # 6 Delete one of the "010" fields.
          QuickMarcEditor.deleteField(5);
          QuickMarcEditor.verifyNumOfFieldsWithTag(testData.tag010, 1);

          // # 7 Click "Save & keep editing" button
          QuickMarcEditor.pressSaveAndClose();
          cy.wait(1500);
          QuickMarcEditor.clickSaveAndKeepEditing();
          QuickMarcEditor.verifyNumOfFieldsWithTag(testData.tag010, 1);
        },
      );
    });
  });
});
