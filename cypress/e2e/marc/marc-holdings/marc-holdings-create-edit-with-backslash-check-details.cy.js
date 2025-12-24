import QuickMarcEditor from '../../../support/fragments/quickMarcEditor';
import Permissions from '../../../support/dictionary/permissions';
import HoldingsRecordView from '../../../support/fragments/inventory/holdingsRecordView';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('MARC', () => {
  describe('MARC Holdings', () => {
    const testData = {
      instanceTitle: `AT_C877078_MarcBibInstance_${getRandomPostfix()}`,
      tag852: '852',
      tag866: '866',
      tag866Content:
        '$a Test back\\slash in middle. Test slash at the \\start and end\\. Test \\ lonely. Te\\\\st multiple\\\\. Test \\\\ multiple',
      tag852CallNumberContent: '$h test backsl\\ashes',
      holdingsStatement:
        'Test back\\slash in middle. Test slash at the \\start and end\\. Test \\ lonely. Te\\\\st multiple\\\\. Test \\\\ multiple',
      holdingsCallNumber: 'test backsl\\ashes',
    };
    const locationCode = QuickMarcEditor.getExistingLocation();

    let createdInstanceId;

    before('Creating user, data', () => {
      cy.getAdminToken();

      cy.createTempUser([
        Permissions.inventoryAll.gui,
        Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
        Permissions.uiQuickMarcQuickMarcHoldingsEditorCreate.gui,
        Permissions.uiQuickMarcQuickMarcHoldingsEditorAll.gui,
      ]).then((createdUserProperties) => {
        testData.createdUserProperties = createdUserProperties;

        cy.createSimpleMarcBibViaAPI(testData.instanceTitle).then((instanceId) => {
          createdInstanceId = instanceId;
        });

        cy.login(createdUserProperties.username, createdUserProperties.password, {
          path: TopMenu.inventoryPath,
          waiter: InventoryInstances.waitContentLoading,
        });
      });
    });

    after('Deleting created user, data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(testData.createdUserProperties.userId);
      cy.getInstance({ limit: 1, expandAll: true, query: `"id"=="${createdInstanceId}"` }).then(
        (instance) => {
          cy.deleteHoldingRecordViaApi(instance.holdings[0].id);
          InventoryInstance.deleteInstanceViaApi(instance.id);
        },
      );
    });

    it(
      'C877078 Create/Edit MARC holdings record with backslash ("\\") character in some fields and check detail view pane (spitfire)',
      { tags: ['extendedPath', 'spitfire', 'C877078'] },
      () => {
        // Step 0. User is on the detail view pane of "MARC bibliographic" record opened via "Inventory" app
        InventoryInstances.searchByTitle(createdInstanceId);
        InventoryInstances.selectInstanceById(createdInstanceId);
        InventoryInstance.waitLoading();

        // Step 1. Click "Actions" button in third pane >> select "Add MARC holdings record" option
        InventoryInstance.goToMarcHoldingRecordAdding();
        QuickMarcEditor.waitLoading();

        // Step 2. Select any location in 852 field
        QuickMarcEditor.updateExistingField(testData.tag852, locationCode);

        // Step 3. Add "866" field with data which contains backslashes
        QuickMarcEditor.addNewField(testData.tag866, testData.tag866Content, 5);
        QuickMarcEditor.verifyTagField(6, testData.tag866, '\\', '\\', testData.tag866Content, '');

        // Step 4. Click "Save & close" button
        QuickMarcEditor.pressSaveAndClose();
        QuickMarcEditor.checkAfterSaveHoldings();
        HoldingsRecordView.waitLoading();
        HoldingsRecordView.checkHoldingsStatement(testData.holdingsStatement);

        // Step 5. Click on the "Actions" >> "Edit in quickMARC"
        HoldingsRecordView.editInQuickMarc();
        QuickMarcEditor.waitLoading();

        // Step 6. Add "$h" subfield with data which contains backslashes
        QuickMarcEditor.updateExistingField(
          '852',
          `${locationCode} ${testData.tag852CallNumberContent}`,
        );
        QuickMarcEditor.verifyTagField(
          5,
          testData.tag852,
          '\\',
          '\\',
          `${locationCode} ${testData.tag852CallNumberContent}`,
          '',
        );

        // Step 7. Click "Save & close" button
        QuickMarcEditor.pressSaveAndClose();
        QuickMarcEditor.checkAfterSaveHoldings();
        HoldingsRecordView.waitLoading();
        HoldingsRecordView.checkHoldingsStatement(testData.holdingsStatement);
        HoldingsRecordView.checkCallNumber(testData.holdingsCallNumber);
      },
    );
  });
});
