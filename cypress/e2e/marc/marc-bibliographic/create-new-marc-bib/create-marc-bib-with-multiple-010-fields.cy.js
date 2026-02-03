import { Permissions } from '../../../../support/dictionary';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import InventoryViewSource from '../../../../support/fragments/inventory/inventoryViewSource';
import MarcAuthority from '../../../../support/fragments/marcAuthority/marcAuthority';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../support/utils/stringTools';

describe('MARC', () => {
  describe('MARC Bibliographic', () => {
    describe('Create new MARC bib', () => {
      const testData = {
        tag010: '010',
        tagLDR: 'LDR',
        tag008: '008',
        tag245: '245',
        tag010Values: ['58020553', '766384'],
      };
      const calloutMessage = 'Field is non-repeatable.';

      let instanceId;
      before('Create test data', () => {
        cy.createTempUser([
          Permissions.inventoryAll.gui,
          Permissions.uiQuickMarcQuickMarcBibliographicEditorCreate.gui,
          Permissions.uiQuickMarcQuickMarcBibliographicEditorView.gui,
        ]).then((createdUserProperties) => {
          testData.userProperties = createdUserProperties;
          cy.login(testData.userProperties.username, testData.userProperties.password, {
            path: TopMenu.inventoryPath,
            waiter: InventoryInstances.waitContentLoading,
            authRefresh: true,
          });
        });
      });

      after('Delete test data', () => {
        cy.getAdminToken();
        Users.deleteViaApi(testData.userProperties.userId);
        InventoryInstance.deleteInstanceViaApi(instanceId);
      });

      it(
        'C380644 Create "MARC Bibliographic" record with multiple "010" fields (spitfire) (TaaS)',
        { tags: ['criticalPath', 'spitfire', 'C380644'] },
        () => {
          // #1 Click on the "Actions" button placed on the second pane >> Select "+New MARC Bib Record" option.
          InventoryInstance.newMarcBibRecord();

          // #2 Replace blank values in LDR positions 06, 07 with valid values
          QuickMarcEditor.updateLDR06And07Positions();
          // #3 Fill in the required fields with valid data:
          QuickMarcEditor.updateExistingField(testData.tag245, `$a ${getRandomPostfix()}`);
          QuickMarcEditor.updateIndicatorValue(testData.tag245, '1', 0);
          QuickMarcEditor.updateIndicatorValue(testData.tag245, '1', 1);
          // #4 Add two new "010" fields and fill in them as specified:
          MarcAuthority.addNewField(4, testData.tag010, `$a ${testData.tag010Values[0]}`);
          MarcAuthority.addNewField(5, testData.tag010, `$a ${testData.tag010Values[1]}`);

          // #5 Click "Save & close" button
          QuickMarcEditor.pressSaveAndCloseButton();
          QuickMarcEditor.checkErrorMessage(6, calloutMessage);

          // #6 Delete one of the created "010" fields.
          QuickMarcEditor.deleteField(6);
          // Only one field "010" is shown.
          QuickMarcEditor.verifyNoDuplicatedFieldsWithTag(testData.tag010);

          // #7 Click "Save & close" buttoc
          QuickMarcEditor.pressSaveAndClose();
          QuickMarcEditor.checkAfterSaveAndClose();
          InventoryInstance.getId().then((id) => {
            instanceId = id;
          });

          // #8 Click on the "Actions" >> "View source".
          InventoryInstance.viewSource();
          // * Only one "010" field is displayed, according to changes made by user at step 6.
          InventoryViewSource.verifyFieldInMARCBibSource(testData.tag010, testData.tag010Values[0]);
          InventoryViewSource.verifyRecordNotContainsDuplicatedContent(testData.tag010);
        },
      );
    });
  });
});
