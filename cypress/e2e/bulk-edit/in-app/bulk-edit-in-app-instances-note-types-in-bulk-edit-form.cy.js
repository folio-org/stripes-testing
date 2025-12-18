import permissions from '../../../support/dictionary/permissions';
import BulkEditActions from '../../../support/fragments/bulk-edit/bulk-edit-actions';
import BulkEditFiles from '../../../support/fragments/bulk-edit/bulk-edit-files';
import BulkEditSearchPane, {
  instanceIdentifiers,
  instanceNotesColumnNames,
} from '../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InstanceRecordView from '../../../support/fragments/inventory/instanceRecordView';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix from '../../../support/utils/stringTools';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import { APPLICATION_NAMES, BULK_EDIT_TABLE_COLUMN_HEADERS } from '../../../support/constants';

let user;
const instance = {
  title: `C468187 folio instance-${getRandomPostfix()}`,
};
const noteType = 'With note';
const noteText = 'test with note';
const actionToSelect = 'Add note';
const filterOtions = {
  note: 'note',
  instance: 'Instance',
  nonExisting: 'non-existing',
  with: 'with',
};
const instanceUUIDsFileName = `instanceUUIDs-${getRandomPostfix()}.csv`;
const matchedRecordsFileName = BulkEditFiles.getMatchedRecordsFileName(instanceUUIDsFileName, true);
const previewFileName = BulkEditFiles.getPreviewFileName(instanceUUIDsFileName, true);
const changedRecordsFileName = BulkEditFiles.getChangedRecordsFileName(instanceUUIDsFileName, true);

describe('Bulk-edit', () => {
  describe('In-app approach', () => {
    before('create test data', () => {
      cy.clearLocalStorage();
      cy.createTempUser([
        permissions.bulkEditEdit.gui,
        permissions.uiInventoryViewCreateEditInstances.gui,
      ]).then((userProperties) => {
        user = userProperties;

        cy.getInstanceTypes({ limit: 1 })
          .then((instanceTypeData) => {
            instance.instanceTypeId = instanceTypeData[0].id;
            instance.instanceTypeName = instanceTypeData[0].name;
          })
          .then(() => {
            cy.createInstance({
              instance: {
                instanceTypeId: instance.instanceTypeId,
                title: instance.title,
              },
            }).then((instanceId) => {
              instance.id = instanceId;
            });
          })
          .then(() => {
            cy.getInstanceById(instance.id).then((instanceData) => {
              instance.hrid = instanceData.hrid;
            });
          })
          .then(() => {
            FileManager.createFile(`cypress/fixtures/${instanceUUIDsFileName}`, instance.id);
          });
        cy.login(user.username, user.password, {
          path: TopMenu.bulkEditPath,
          waiter: BulkEditSearchPane.waitLoading,
        });
      });
    });

    after('delete test data', () => {
      cy.getAdminToken();
      InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(instance.id);
      Users.deleteViaApi(user.userId);
      FileManager.deleteFile(`cypress/fixtures/${instanceUUIDsFileName}`);
      FileManager.deleteFileFromDownloadsByMask(
        matchedRecordsFileName,
        previewFileName,
        changedRecordsFileName,
      );
    });

    it(
      'C468187 Verify Instance note types in bulk edit form (firebird)',
      { tags: ['criticalPath', 'firebird', 'C468187'] },
      () => {
        BulkEditSearchPane.verifyDragNDropRecordTypeIdentifierArea('Instance', 'Instance UUIDs');
        BulkEditSearchPane.verifyRecordIdentifiers(instanceIdentifiers);
        BulkEditSearchPane.uploadFile(instanceUUIDsFileName);
        BulkEditSearchPane.waitFileUploading();
        BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInResultsAccordion(
          instance.hrid,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.RESOURCE_TITLE,
          instance.title,
        );
        BulkEditActions.openActions();
        BulkEditSearchPane.verifyInstanceNoteColumns(instanceNotesColumnNames);
        BulkEditActions.openActions();
        BulkEditActions.downloadMatchedResults();
        BulkEditFiles.verifyValueInRowByUUID(
          matchedRecordsFileName,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_UUID,
          instance.id,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.RESOURCE_TITLE,
          instance.title,
        );
        BulkEditActions.openStartBulkEditFolioInstanceForm();
        BulkEditActions.verifyBulkEditsAccordionExists();
        BulkEditActions.verifyOptionsDropdown();
        BulkEditActions.verifyRowIcons();
        BulkEditActions.verifySelectOptionsSortedAlphabetically(true);

        const optionsOutsideInstanceNoteGroup = [
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.ADMINISTRATIVE_NOTE,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.STAFF_SUPPRESS,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.SUPPRESS_FROM_DISCOVERY,
        ];

        instanceNotesColumnNames.forEach((instanceNoteColumnName) => {
          BulkEditActions.verifyOptionExistsInSelectOptionDropdown(instanceNoteColumnName);
        });
        optionsOutsideInstanceNoteGroup.forEach((option) => {
          BulkEditActions.verifyOptionExistsInSelectOptionDropdown(option);
        });

        BulkEditActions.verifyOptionsFilterInFocus();
        BulkEditActions.typeInFilterOptionsList(filterOtions.note);
        BulkEditActions.verifyValueInInputOfFilterOptionsList(filterOtions.note);
        BulkEditActions.verifyFilteredOptionsListIncludesOptionsWithText(filterOtions.note);
        BulkEditActions.typeInFilterOptionsList(filterOtions.instance);
        BulkEditActions.verifyValueInInputOfFilterOptionsList(filterOtions.instance);

        /* Verification was commented out because it makes the test flaky:
         * the returned list of options depends on whether the environment in "Settings > Inventory > Instance note types"
         * contains a note type with the word "instance" in it. If there is no such note type, the whole "Instance notes"
         * group with all options in it is returned; if present, only note type(s) with the word "instance" in them are returned.
         * Discussed with PO – for now, this is acceptable.
         */

        // instanceNotesColumnNames.forEach((instanceNoteColumnName) => {
        //   BulkEditActions.verifyOptionExistsInSelectOptionDropdown(instanceNoteColumnName);
        // });

        BulkEditActions.verifyLabelPresentInFilterOptionsList('Instance notes');
        BulkEditActions.typeInFilterOptionsList(filterOtions.nonExisting);
        BulkEditActions.verifyValueInInputOfFilterOptionsList(filterOtions.nonExisting);
        BulkEditActions.verifyNoMatchingOptionsInFilterOptionsList();
        BulkEditActions.clearFilterOptionsListByClickingBackspace();
        BulkEditActions.verifyValueInInputOfFilterOptionsList('');

        instanceNotesColumnNames.forEach((instanceNoteColumnName) => {
          BulkEditActions.verifyOptionExistsInSelectOptionDropdown(instanceNoteColumnName);
        });
        optionsOutsideInstanceNoteGroup.forEach((option) => {
          BulkEditActions.verifyOptionExistsInSelectOptionDropdown(option);
        });

        BulkEditActions.typeInFilterOptionsList(filterOtions.with);
        BulkEditActions.verifyOptionExistsInSelectOptionDropdown(noteType);
        BulkEditActions.clickFilteredOption(noteType);
        BulkEditActions.verifyOptionSelected(noteType);
        BulkEditActions.selectSecondAction(actionToSelect);
        BulkEditActions.fillInSecondTextArea(noteText);
        BulkEditActions.verifyValueInSecondTextArea(noteText);
        BulkEditActions.verifySecondActionSelected(actionToSelect);
        BulkEditActions.verifyConfirmButtonDisabled(false);
        BulkEditActions.confirmChanges();
        BulkEditActions.verifyMessageBannerInAreYouSureForm(1);
        BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifier(
          instance.hrid,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.WITH_NOTE,
          noteText,
        );
        BulkEditActions.downloadPreview();
        BulkEditFiles.verifyValueInRowByUUID(
          previewFileName,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_UUID,
          instance.id,
          'Notes',
          `${noteType};${noteText};false`,
        );
        BulkEditActions.commitChanges();
        BulkEditSearchPane.waitFileUploading();
        BulkEditActions.verifySuccessBanner(1);
        BulkEditSearchPane.verifyPaneRecordsChangedCount('1 instance');
        BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInChangesAccordion(
          instance.hrid,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.WITH_NOTE,
          noteText,
        );
        BulkEditActions.openActions();
        BulkEditActions.downloadChangedCSV();
        BulkEditFiles.verifyValueInRowByUUID(
          changedRecordsFileName,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_UUID,
          instance.id,
          'Notes',
          `${noteType};${noteText};false`,
        );

        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
        InventorySearchAndFilter.searchInstanceByHRID(instance.hrid);
        InventoryInstances.selectInstance();
        InventoryInstance.verifyInstanceTitle(instance.title);
        InstanceRecordView.checkNotesByType(0, noteType, noteText);
      },
    );
  });
});
