import QueryModal, {
  instanceFieldValues,
  QUERY_OPERATIONS,
} from '../../../../support/fragments/bulk-edit/query-modal';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import { Lists } from '../../../../support/fragments/lists/lists';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../../support/fragments/topMenu';
import TopMenuNavigation from '../../../../support/fragments/topMenuNavigation';
import { APPLICATION_NAMES } from '../../../../support/constants';
import getRandomPostfix from '../../../../support/utils/stringTools';

const listName = `AT_C869998_List_${getRandomPostfix()}`;
const testData = {
  instanceTitle: `AT_C869998_MarcInstance_${getRandomPostfix()}`,
  instanceId: null,
  instanceHrid: null,
};
const updated245FieldContent = 'UPDATED 245 FIELD CONTENT';
const updated035FieldContent = 'UPDATED 035 FIELD CONTENT';

describe('Lists', () => {
  describe('SRS', () => {
    before('Create test data', () => {
      cy.getAdminToken();
      cy.createMarcBibliographicViaAPI(QuickMarcEditor.defaultValidLdr, [
        { tag: '008', content: QuickMarcEditor.defaultValid008Values },
        { tag: '245', content: `$a ${testData.instanceTitle}`, indicators: ['\\', '\\'] },
        { tag: '035', content: '$a Test2', indicators: ['\\', '\\'] },
      ]).then((instanceId) => {
        testData.instanceId = instanceId;

        cy.getInstanceById(instanceId).then((instanceData) => {
          testData.instanceHrid = instanceData.hrid;

          cy.loginAsAdmin({
            path: TopMenu.listsPath,
            waiter: Lists.waitLoading,
          });
        });
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      Lists.deleteListByNameViaApi(listName);
      InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(testData.instanceId);
    });

    it(
      'C869998 Verify that each record should be able to get the most recent information right away (athena)',
      { tags: ['criticalPath', 'athena', 'C869998'] },
      () => {
        // Step 1: Open Lists, create new list, select record type, open query builder
        Lists.openNewListPane();
        Lists.setName(listName);
        Lists.selectRecordType(Lists.recordTypes.instancesWithMarcBibliographic);
        Lists.buildQuery();
        QueryModal.verify();

        // Step 2: Build a query filtering by Instance HRID from preconditions, test the query
        QueryModal.selectField(instanceFieldValues.instanceHrid);
        QueryModal.verifySelectedField(instanceFieldValues.instanceHrid);
        QueryModal.selectOperator(QUERY_OPERATIONS.EQUAL);
        QueryModal.verifySelectedOperator(QUERY_OPERATIONS.EQUAL);
        QueryModal.fillInValueTextfield(testData.instanceHrid);
        QueryModal.verifyTextFieldValue(testData.instanceHrid);
        QueryModal.testQuery();
        QueryModal.waitForQueryTestToFinish();
        QueryModal.verifyNumberOfRowsInPreviewTable(1);

        // Step 3: Enable MARC jsonb column, disable unused columns, run query and save
        QueryModal.clickShowColumnsButton();
        QueryModal.selectCheckboxInShowColumns(instanceFieldValues.marcBibliographicMarcJsonb);
        QueryModal.clickCheckboxInShowColumns(instanceFieldValues.instanceResourceTitle);
        QueryModal.clickCheckboxInShowColumns(instanceFieldValues.resourceType);
        QueryModal.clickCheckboxInShowColumns(instanceFieldValues.marcBibliographicState);
        QueryModal.clickRunQueryAndSave();
        Lists.verifySuccessCalloutMessage(`List ${listName} saved.`);
        QueryModal.verifyClosed();
        Lists.verifyRefreshCompleteCallout(1);
        Lists.waitForCompilingToComplete();

        // Step 4: Navigate to Inventory, find instance, edit MARC bib via quickMARC
        Lists.closeListDetailsPane();
        TopMenuNavigation.openAppFromDropdown(APPLICATION_NAMES.INVENTORY);
        InventoryInstances.searchByTitle(testData.instanceHrid);
        InventoryInstances.selectInstance();
        InventoryInstance.waitInventoryLoading();
        InventoryInstance.editMarcBibliographicRecord();
        QuickMarcEditor.updateLDR06And07Positions();
        QuickMarcEditor.updateExistingField('245', `$a ${updated245FieldContent} - 245`);
        QuickMarcEditor.updateExistingField('035', `$a ${updated035FieldContent} - 035`);
        QuickMarcEditor.pressSaveAndClose();
        QuickMarcEditor.checkAfterSaveAndClose();

        // Step 5: Return to Lists app and open the saved list
        TopMenuNavigation.openAppFromDropdown(APPLICATION_NAMES.LISTS);
        Lists.waitLoading();
        Lists.openList(listName);

        // Step 6: Verify updated MARC jsonb values appear without refreshing
        Lists.verifyResultCellContains(
          0,
          instanceFieldValues.marcBibliographicMarcJsonb,
          updated245FieldContent,
        );
        Lists.verifyResultCellContains(
          0,
          instanceFieldValues.marcBibliographicMarcJsonb,
          updated035FieldContent,
        );
      },
    );
  });
});
