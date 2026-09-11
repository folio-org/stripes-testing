import {
  INVENTORY_006_FIELD_TYPE_DROPDOWN,
  INVENTORY_006_FIELD_DROPDOWNS_BOXES_NAMES,
  INVENTORY_007_FIELD_TYPE_DROPDOWN,
  INVENTORY_007_FIELD_DROPDOWNS_BOXES_NAMES,
} from '../../../support/constants';
import Permissions from '../../../support/dictionary/permissions';
import HoldingsRecordView from '../../../support/fragments/inventory/holdingsRecordView';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventoryViewSource from '../../../support/fragments/inventory/inventoryViewSource';
import QuickMarcEditor from '../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('MARC', () => {
  describe('MARC Holdings', () => {
    const testData = {
      bibTitle: `AT_C407734_MarcBibInstance_${getRandomPostfix()}`,
      tags: {
        tagLDR: 'LDR',
        tag001: '001',
        tag002: '002',
        tag004: '004',
        tag005: '005',
        tag006: '006',
        tag007: '007',
        tag008: '008',
        tag009: '009',
        tag010: '010',
        tag020: '020',
        tag024: '024',
        tag337: '337',
        tag541: '541',
        tag845: '845',
        tag852: '852',
        tag856: '856',
        tag999: '999',
      },
      fieldValues: {
        tag002: 'Value002',
        tag009: 'Value009',
        tag010: '$a Value010',
        tag020: '$a Value020',
        tag024: '$a Value024',
        tag337: '$a Value337',
        tag541: '$a Value541',
        tag845: '$a Value845',
        tag856: '$a Value856',
      },
    };
    const initialFieldsOrder = [
      testData.tags.tagLDR,
      testData.tags.tag001,
      testData.tags.tag005,
      testData.tags.tag004,
      testData.tags.tag008,
      testData.tags.tag852,
      testData.tags.tag999,
    ];
    // Final order (top to bottom), including the system-pinned LDR/001/005/999
    const expectedOrder = [
      testData.tags.tagLDR,
      testData.tags.tag001,
      testData.tags.tag005,
      testData.tags.tag856,
      testData.tags.tag852,
      testData.tags.tag845,
      testData.tags.tag541,
      testData.tags.tag337,
      testData.tags.tag024,
      testData.tags.tag020,
      testData.tags.tag010,
      testData.tags.tag009,
      testData.tags.tag008,
      testData.tags.tag007,
      testData.tags.tag006,
      testData.tags.tag004,
      testData.tags.tag002,
      testData.tags.tag999,
    ];

    // The order in which the movable fields must end up, top to bottom (indices 3-16 above)
    const movableTargetOrder = expectedOrder.slice(3, -1);
    const firstMovableRow = 3;

    let user;
    let instanceId;
    let location;

    // Drags the field with the given tag from its current row down to targetRow, one swap at a
    // time - fixed fields (LDR/001/005/999) are never targeted directly, but get displaced (and
    // so end up in their final position automatically) as the movable fields are dragged past them
    const dragFieldDownToRow = (tag, targetRow) => {
      QuickMarcEditor.getRowIndexByTag(tag).then((currentRow) => {
        for (let row = currentRow; row < targetRow; row++) {
          QuickMarcEditor.moveFieldDown(row);
        }
      });
    };

    before('Create test data', () => {
      cy.getAdminToken();
      cy.createTempUser([
        Permissions.inventoryAll.gui,
        Permissions.uiQuickMarcQuickMarcHoldingsEditorCreate.gui,
        Permissions.uiQuickMarcQuickMarcHoldingsEditorAll.gui,
      ]).then((userProperties) => {
        user = userProperties;

        cy.getLocations({
          limit: 1,
          query: '(isActive=true and name<>"AT_*" and name<>"*auto*")',
        }).then((res) => {
          location = res;
        });

        cy.createSimpleMarcBibViaAPI(testData.bibTitle).then((id) => {
          instanceId = id;
        });

        cy.login(user.username, user.password, {
          path: TopMenu.inventoryPath,
          waiter: InventoryInstances.waitContentLoading,
        });
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(user.userId);
      if (instanceId) InventoryInstance.deleteInstanceViaApi(instanceId);
    });

    it(
      'C407734 Verify that all fields (except "LDR", "005", "999") can be moved and saved when creating a new "MARC holdings" record (promin)',
      { tags: ['extendedPath', 'promin', 'C407734'] },
      () => {
        InventoryInstances.searchByTitle(instanceId);
        InventoryInstances.selectInstanceById(instanceId);
        InventoryInstance.waitLoading();
        InventoryInstance.waitInstanceRecordViewOpened();

        // Step 1: Open "Create a new MARC Holdings record" pane, verify initial fields/icons
        InventoryInstance.goToMarcHoldingRecordAdding();
        QuickMarcEditor.waitLoading();
        QuickMarcEditor.verifyRowOrderByTags(initialFieldsOrder);
        QuickMarcEditor.verifyEditableFieldIcons(0, false, false, false, false); // LDR
        QuickMarcEditor.verifyEditableFieldIcons(1, false, false, false, false); // 001
        QuickMarcEditor.verifyEditableFieldIcons(2, false, false, false, false); // 005
        QuickMarcEditor.verifyEditableFieldIcons(6, false, false, false, false); // 999

        // Step 2: Select a valid permanent location
        QuickMarcEditor.updateExistingField(testData.tags.tag852, `$b ${location.code}`);
        QuickMarcEditor.checkContentByTag(testData.tags.tag852, `$b ${location.code}`);

        // Step 3: Add the new fields (inserted right before "999", currently row 6)
        let currentRow = 5;
        QuickMarcEditor.addNewField(
          testData.tags.tag002,
          testData.fieldValues.tag002,
          currentRow++,
        );
        QuickMarcEditor.checkContent(testData.fieldValues.tag002, currentRow);

        QuickMarcEditor.addNewField(testData.tags.tag006, '', currentRow++);
        QuickMarcEditor.verifyTagValue(currentRow, testData.tags.tag006);
        QuickMarcEditor.selectFieldsDropdownOption(
          testData.tags.tag006,
          INVENTORY_006_FIELD_DROPDOWNS_BOXES_NAMES.TYPE,
          INVENTORY_006_FIELD_TYPE_DROPDOWN.O,
        );

        QuickMarcEditor.addNewField(testData.tags.tag007, '', currentRow++);
        QuickMarcEditor.verifyTagValue(currentRow, testData.tags.tag007);
        QuickMarcEditor.selectFieldsDropdownOption(
          testData.tags.tag007,
          INVENTORY_007_FIELD_DROPDOWNS_BOXES_NAMES.TYPE,
          INVENTORY_007_FIELD_TYPE_DROPDOWN.T,
        );

        QuickMarcEditor.addNewField(
          testData.tags.tag009,
          testData.fieldValues.tag009,
          currentRow++,
        );
        QuickMarcEditor.checkContent(testData.fieldValues.tag009, currentRow);

        QuickMarcEditor.addNewField(
          testData.tags.tag010,
          testData.fieldValues.tag010,
          currentRow++,
        );
        QuickMarcEditor.checkContent(testData.fieldValues.tag010, currentRow);

        QuickMarcEditor.addNewField(
          testData.tags.tag020,
          testData.fieldValues.tag020,
          currentRow++,
        );
        QuickMarcEditor.checkContent(testData.fieldValues.tag020, currentRow);

        QuickMarcEditor.addNewField(
          testData.tags.tag024,
          testData.fieldValues.tag024,
          currentRow++,
        );
        QuickMarcEditor.checkContent(testData.fieldValues.tag024, currentRow);

        QuickMarcEditor.addNewField(
          testData.tags.tag337,
          testData.fieldValues.tag337,
          currentRow++,
        );
        QuickMarcEditor.checkContent(testData.fieldValues.tag337, currentRow);

        QuickMarcEditor.addNewField(
          testData.tags.tag541,
          testData.fieldValues.tag541,
          currentRow++,
        );
        QuickMarcEditor.checkContent(testData.fieldValues.tag541, currentRow);

        QuickMarcEditor.addNewField(
          testData.tags.tag845,
          testData.fieldValues.tag845,
          currentRow++,
        );
        QuickMarcEditor.checkContent(testData.fieldValues.tag845, currentRow);

        QuickMarcEditor.addNewField(
          testData.tags.tag856,
          testData.fieldValues.tag856,
          currentRow++,
        );
        QuickMarcEditor.checkContent(testData.fieldValues.tag856, currentRow);

        // "004" (first movable field, adjacent to fixed "005") has only the "move down" icon;
        // "856" (the last field added, right before "999") has only the "move up" icon
        QuickMarcEditor.verifyEditableFieldIcons(3, false, true);
        QuickMarcEditor.verifyEditableFieldIcons(currentRow, true, false);

        // Step 4: Arrange fields into the target order - process from the bottom-most target
        // upward so each drag never disturbs a slot already placed by an earlier iteration
        for (let i = movableTargetOrder.length - 1; i >= 0; i--) {
          dragFieldDownToRow(movableTargetOrder[i], firstMovableRow + i);
          cy.wait(100);
        }
        QuickMarcEditor.verifyRowOrderByTags(expectedOrder);

        // Step 5: Save & close
        QuickMarcEditor.pressSaveAndClose();
        QuickMarcEditor.checkAfterSaveHoldings();

        // Step 6: Re-open in quickMARC - verify the saved order (001/005/999 are system-generated)
        HoldingsRecordView.getHoldingsIDInDetailView().then((holdingsID) => {
          HoldingsRecordView.close();
          InventoryInstance.openHoldingViewByID(holdingsID);
          HoldingsRecordView.editInQuickMarc();
          QuickMarcEditor.waitLoading();
          QuickMarcEditor.verifyRowOrderByTags(expectedOrder);

          // Step 7: Close the editor, verify the same order in "View source"
          QuickMarcEditor.closeEditorPane();
          InventoryInstance.openHoldingViewByID(holdingsID);
          HoldingsRecordView.viewSource();
          InventoryViewSource.verifyFieldsOrder(expectedOrder);
        });
      },
    );
  });
});
