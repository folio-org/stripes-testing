import permissions from '../../../../support/dictionary/permissions';
import BulkEditActions from '../../../../support/fragments/bulk-edit/bulk-edit-actions';
import BulkEditSearchPane from '../../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import BulkEditFiles from '../../../../support/fragments/bulk-edit/bulk-edit-files';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../../support/fragments/inventory/inventorySearchAndFilter';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InstanceRecordView from '../../../../support/fragments/inventory/instanceRecordView';
import TopMenu from '../../../../support/fragments/topMenu';
import TopMenuNavigation from '../../../../support/fragments/topMenuNavigation';
import Users from '../../../../support/fragments/users/users';
import FileManager from '../../../../support/utils/fileManager';
import getRandomPostfix from '../../../../support/utils/stringTools';
import DateTools from '../../../../support/utils/dateTools';
import QueryModal, {
  instanceFieldValues,
  QUERY_OPERATIONS,
} from '../../../../support/fragments/bulk-edit/query-modal';
import { APPLICATION_NAMES, BULK_EDIT_TABLE_COLUMN_HEADERS } from '../../../../support/constants';
import { getLongDelay } from '../../../../support/utils/cypressTools';

let user;
let previewQueryFileNameCsv;
let changedRecordsQueryFileNameCsv;
const folioInstance = {
  title: `AT_C663253_FolioInstance_${getRandomPostfix()}`,
};
const administrativeNoteText = 'Administrative note for bulk edit test';
const todayDate = DateTools.getFormattedDate({ date: new Date() }, 'YYYY-MM-DD');

describe('Bulk-edit', () => {
  describe('Instances with source MARC', () => {
    before('create test data', () => {
      cy.clearLocalStorage();
      cy.createTempUser([
        permissions.bulkEditEdit.gui,
        permissions.uiInventoryViewCreateEditInstances.gui,
        permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
        permissions.bulkEditQueryView.gui,
      ]).then((userProperties) => {
        user = userProperties;

        cy.getInstanceTypes({ limit: 1 }).then((instanceTypes) => {
          const instanceTypeId = instanceTypes[0].id;

          InventoryInstances.createFolioInstanceViaApi({
            instance: {
              instanceTypeId,
              title: folioInstance.title,
            },
          }).then((instanceData) => {
            folioInstance.instanceId = instanceData.instanceId;

            cy.getInstanceById(folioInstance.instanceId).then((instance) => {
              folioInstance.instanceHrid = instance.hrid;
            });
          });
        });

        cy.login(user.username, user.password, {
          path: TopMenu.bulkEditPath,
          waiter: BulkEditSearchPane.waitLoading,
        });
        BulkEditSearchPane.openQuerySearch();
        BulkEditSearchPane.checkInstanceRadio();
        BulkEditSearchPane.clickBuildQueryButton();
        QueryModal.verify();
        QueryModal.selectField(instanceFieldValues.instanceSource);
        QueryModal.selectOperator(QUERY_OPERATIONS.NOT_EQUAL);
        QueryModal.chooseValueSelect('MARC');
        QueryModal.addNewRow();
        QueryModal.selectField(instanceFieldValues.instanceResourceTitle, 1);
        QueryModal.selectOperator(QUERY_OPERATIONS.START_WITH, 1);
        QueryModal.fillInValueTextfield(folioInstance.title, 1);
        cy.intercept('GET', '**/preview?limit=100&offset=0&step=UPLOAD*').as('getPreview');
        cy.intercept('GET', '/query/**').as('waiterForQueryCompleted');
        QueryModal.clickTestQuery();
        QueryModal.waitForQueryCompleted('@waiterForQueryCompleted');
        QueryModal.clickRunQuery();
        QueryModal.verifyClosed();
        cy.wait('@getPreview', getLongDelay()).then((interception) => {
          const interceptedUuid = interception.request.url.match(
            /bulk-operations\/([a-f0-9-]+)\/preview/,
          )[1];
          previewQueryFileNameCsv = `${todayDate}-Updates-Preview-CSV-Query-${interceptedUuid}.csv`;
          changedRecordsQueryFileNameCsv = `${todayDate}-Changed-Records-CSV-Query-${interceptedUuid}.csv`;
        });

        BulkEditSearchPane.verifySpecificTabHighlighted('Query');
        BulkEditSearchPane.verifyPaneRecordsCount('1 instance');
      });
    });

    after('delete test data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(user.userId);
      InventoryInstance.deleteInstanceViaApi(folioInstance.instanceId);
      FileManager.deleteFileFromDownloadsByMask(
        previewQueryFileNameCsv,
        changedRecordsQueryFileNameCsv,
      );
    });

    it(
      'C663253 Bulk edit administrative data and marc fields is not supported for Instances with source other than MARC (firebird)',
      { tags: ['criticalPath', 'firebird', 'C663253'] },
      () => {
        // Step 1: Click "Actions" menu and verify options under "Start bulk edit"
        BulkEditActions.openActions();
        BulkEditActions.verifyStartBulkEditOptions();

        // Step 2: Select "Instances with source MARC" element under "Start bulk edit"
        BulkEditActions.openStartBulkEditMarcInstanceForm();
        BulkEditActions.verifyInitialStateBulkEditsFormForMarcInstance();

        // Step 3: Under "Bulk edits for administrative data" accordion select any option and action
        BulkEditActions.addItemNoteAndVerify('Administrative note', administrativeNoteText);
        BulkEditActions.verifyConfirmButtonDisabled(false);

        // Step 4: Click "Confirm changes" button
        BulkEditActions.clickConfirmChangesButton();

        // Verify "Are you sure?" form appears with correct message
        BulkEditActions.verifyAreYouSureFormWhenUsingMarcFieldsFlowForFolioInstance();

        // Step 5: Click "Keep editing" button and configure MARC bulk edits
        BulkEditActions.clickKeepEditingBtn();

        // Under "Bulk edits for instances with source MARC" accordion select any action
        BulkEditActions.fillInTagAndIndicatorsAndSubfield('500', '\\', '\\', 'a');
        BulkEditActions.selectActionForMarcInstance('Add');
        BulkEditActions.fillInDataTextAreaForMarcInstance('General note text');
        BulkEditActions.verifyConfirmButtonDisabled(false);

        // Step 6: Click "Confirm changes" button
        BulkEditActions.clickConfirmChangesButton();

        // Verify "Are you sure?" form appears again with same message
        BulkEditActions.verifyAreYouSureFormWhenUsingMarcFieldsFlowForFolioInstance();

        // Step 7: Click "X" button and modify administrative data only
        BulkEditActions.closeAreYouSureForm();

        // Under "Bulk edits for administrative data" accordion click "+" button and "Garbage can" button
        BulkEditActions.addNewBulkEditFilterString();
        BulkEditActions.deleteRow(0);
        BulkEditActions.verifyTagAndIndicatorsAndSubfieldValues('500', '\\', '\\', 'a');

        // Verify MARC fields options are still selected and confirm button enabled
        BulkEditActions.verifyConfirmButtonDisabled(false);

        // Step 8: Click "Confirm changes" button again
        BulkEditActions.clickConfirmChangesButton();

        // Verify "Are you sure?" form appears with same message
        BulkEditActions.verifyAreYouSureFormWhenUsingMarcFieldsFlowForFolioInstance();

        // Step 9: Click "Esc" button and "X" button on Combined bulk edit form
        BulkEditActions.clickEscButton();
        BulkEditActions.closeBulkEditForm();

        // Verify forms close and Preview of record matched is displayed
        BulkEditActions.verifyAreYouSureFormAbsents();
        BulkEditSearchPane.verifySpecificTabHighlighted('Query');
        BulkEditSearchPane.verifyPaneRecordsCount('1 instance');

        // Step 10: Click "Actions" menu and verify options under "Start bulk edit"
        BulkEditActions.openActions();
        BulkEditActions.verifyStartBulkEditOptions();

        // Step 11: Select "FOLIO Instances"
        BulkEditActions.openStartBulkEditFolioInstanceForm();
        BulkEditActions.verifyInitialStateBulkEditForm();

        // Step 12: Select any option and action to modify Instances records
        BulkEditActions.addItemNoteAndVerify('Administrative note', administrativeNoteText);
        BulkEditActions.verifyConfirmButtonDisabled(false);

        // Step 13: Click "Confirm changes" button
        BulkEditActions.confirmChanges();

        // Verify "Are you sure?" form loads with proper records count and preview
        BulkEditActions.verifyAreYouSureForm(1);
        BulkEditActions.verifyMessageBannerInAreYouSureForm(1);
        BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifier(
          folioInstance.instanceHrid,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.ADMINISTRATIVE_NOTE,
          administrativeNoteText,
        );
        BulkEditActions.verifyKeepEditingButtonDisabled(false);
        BulkEditActions.verifyDownloadPreviewButtonDisabled(false);

        // Step 14: Click the "Download preview in CSV format" button
        BulkEditActions.downloadPreview();

        // Verify .csv file is saved with correct name and contains records with changes
        BulkEditFiles.verifyValueInRowByUUID(
          previewQueryFileNameCsv,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_UUID,
          folioInstance.instanceId,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.ADMINISTRATIVE_NOTE,
          administrativeNoteText,
        );

        // Step 15: Click "Commit changes" button
        BulkEditActions.commitChanges();

        // Verify successful completion
        BulkEditActions.verifySuccessBanner(1);
        BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInChangesAccordion(
          folioInstance.instanceHrid,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.ADMINISTRATIVE_NOTE,
          administrativeNoteText,
        );
        BulkEditSearchPane.verifyPaginatorInChangedRecords(1);

        // Step 16: Click the "Actions" menu => Select "Download changed records (CSV)" element
        BulkEditActions.openActions();
        BulkEditActions.downloadChangedCSV();

        // Verify .csv file with changed records is saved
        BulkEditFiles.verifyValueInRowByUUID(
          changedRecordsQueryFileNameCsv,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_UUID,
          folioInstance.instanceId,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.ADMINISTRATIVE_NOTE,
          administrativeNoteText,
        );

        // Step 17: Navigate to "Inventory" app and verify changes
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
        InventorySearchAndFilter.waitLoading();
        InventorySearchAndFilter.searchInstanceByTitle(folioInstance.title);
        InventoryInstances.selectInstance();
        InventoryInstance.waitLoading();

        // Verify administrative note was added
        InstanceRecordView.verifyAdministrativeNote(administrativeNoteText);
        InstanceRecordView.verifyRecentLastUpdatedDateAndTime();
      },
    );
  });
});
