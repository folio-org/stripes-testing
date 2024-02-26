import Permissions from '../../../../support/dictionary/permissions';
import DataImport from '../../../../support/fragments/data_import/dataImport';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import InventoryViewSource from '../../../../support/fragments/inventory/inventoryViewSource';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import InteractorsTools from '../../../../support/utils/interactorsTools';
import getRandomPostfix from '../../../../support/utils/stringTools';

describe('MARC', () => {
  describe('MARC Bibliographic', () => {
    describe('Edit MARC bib', () => {
      const testData = {
        tag010: '010',
        tag011: '011',
        tag010Values: ['58020553', '766384'],
      };
      const marcFile = {
        marc: 'marcBibFileForC380643.mrc',
        fileName: `testMarcFileC380643.${getRandomPostfix()}.mrc`,
        jobProfileToRun: 'Default - Create instance and SRS MARC Bib',
        propertyName: 'relatedInstanceInfo',
      };
      let instanceId;
      const calloutMessage = 'Record cannot be saved with more than one 010 field';

      before('Create test data', () => {
        cy.createTempUser([
          Permissions.inventoryAll.gui,
          Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
        ]).then((createdUserProperties) => {
          testData.userProperties = createdUserProperties;

          cy.getAdminToken();
          DataImport.uploadFileViaApi(
            marcFile.marc,
            marcFile.fileName,
            marcFile.jobProfileToRun,
          ).then((response) => {
            response.entries.forEach((record) => {
              instanceId = record[marcFile.propertyName].idList[0];
            });
          });
        });
      });

      after('Delete test data', () => {
        cy.getAdminToken();
        Users.deleteViaApi(testData.userProperties.userId);
        InventoryInstance.deleteInstanceViaApi(instanceId);
      });

      it(
        'C380643 Editing imported "MARC Bibliographic" record with multiple "010" fields (spitfire) (TaaS)',
        { tags: ['extendedPath', 'spitfire'] },
        () => {
          cy.login(testData.userProperties.username, testData.userProperties.password, {
            path: TopMenu.inventoryPath,
            waiter: InventoryInstances.waitContentLoading,
          });

          InventoryInstances.searchByTitle('C380643 The Journal of ecclesiastical history.');
          InventoryInstances.selectInstance();

          // #5 Click on the "Actions" button placed on the third pane >> Select "Edit MARC bibliographic record" option.
          InventoryInstance.editMarcBibliographicRecord();
          // * Two fields "010" are shown.
          InventoryInstance.verifyNumOfFieldsWithTag(testData.tag010, 2);

          // #6 Edit any field of "MARC Bibliographic" record (except "010").
          QuickMarcEditor.updateExistingField('245', `$a ${getRandomPostfix()}`);

          // #7 Click "Save & close" button
          QuickMarcEditor.pressSaveAndClose();
          InteractorsTools.checkCalloutMessage(calloutMessage, 'error');

          // #8 Change tag value of second "010" field to "011".
          QuickMarcEditor.updateExistingTagValue(6, testData.tag011);
          // Only one field "010" is shown. For example:
          InventoryInstance.verifyNumOfFieldsWithTag(testData.tag010, 1);

          // #9 Click "Save & close" button
          QuickMarcEditor.pressSaveAndClose();
          QuickMarcEditor.checkAfterSaveAndClose();
          // #10 Click on the "Actions" >> "View source".
          InventoryInstance.viewSource();
          // * Only one "010" field is displayed, according to changes made by user at step 8.
          InventoryViewSource.verifyRecordNotContainsDuplicatedContent(testData.tag010);
        },
      );
    });
  });
});
