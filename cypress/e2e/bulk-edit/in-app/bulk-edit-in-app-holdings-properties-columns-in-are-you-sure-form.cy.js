import getRandomPostfix from '../../../support/utils/stringTools';
import permissions from '../../../support/dictionary/permissions';
import BulkEditActions from '../../../support/fragments/bulk-edit/bulk-edit-actions';
import BulkEditFiles from '../../../support/fragments/bulk-edit/bulk-edit-files';
import BulkEditSearchPane from '../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import TopMenu from '../../../support/fragments/topMenu';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import Users from '../../../support/fragments/users/users';
import FileManager from '../../../support/utils/fileManager';
import HoldingsRecordView from '../../../support/fragments/inventory/holdingsRecordView';
import ExportFile from '../../../support/fragments/data-export/exportFile';
import {
  APPLICATION_NAMES,
  BULK_EDIT_TABLE_COLUMN_HEADERS,
  HOLDING_NOTE_TYPES,
  LOCATION_NAMES,
} from '../../../support/constants';

let user;
let locationId;
const administrativeNoteText = 'C432296 Administrative note';
const electronicBookplateNoteText = 'C432296 Electronic bookplate note';
const newURI = 'https://test.com/study';
const electronicAccessValue =
  'URL relationship;URI;Link text;Materials specified;URL public note\n;https://test.com/study;;;';
const electronicAccessURI = 'https://www.emeraldinsight.com/journal/jepp';
const instance = {
  instanceName: `C432296 instance-${getRandomPostfix()}`,
  itemBarcode: getRandomPostfix(),
};
const actionsToSelect = {
  addNote: 'Add note',
  changeNoteType: 'Change note type',
  replaceWith: 'Replace with',
  clearField: 'Clear field',
  setTrue: 'Set true',
};
const columnNamesSet = [
  BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.ADMINISTRATIVE_NOTE,
  BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.ELECTRONIC_ACCESS,
  BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.HOLDINGS_PERMANENT_LOCATION,
  BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.HOLDINGS_TEMPORARY_LOCATION,
  BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.ACTION_NOTE,
  BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.ELECTRONIC_BOOKPLATE_NOTE,
  BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.SUPPRESS_FROM_DISCOVERY,
];
const editedValueSets = [
  [BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.ADMINISTRATIVE_NOTE, ''],
  [
    BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.HOLDINGS_PERMANENT_LOCATION,
    LOCATION_NAMES.ONLINE_UI,
  ],
  [BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.HOLDINGS_TEMPORARY_LOCATION, ''],
  [BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.ACTION_NOTE, administrativeNoteText],
  [
    BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.ELECTRONIC_BOOKPLATE_NOTE,
    electronicBookplateNoteText,
  ],
  [BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.SUPPRESS_FROM_DISCOVERY, 'true'],
];
const holdingUUIDsFileName = `validHoldingUUIDs_${getRandomPostfix()}.csv`;
const matchedRecordsFileName = BulkEditFiles.getMatchedRecordsFileName(holdingUUIDsFileName);
const previewFileName = BulkEditFiles.getPreviewFileName(holdingUUIDsFileName);
const changedRecordsFileName = BulkEditFiles.getChangedRecordsFileName(holdingUUIDsFileName);

describe('Bulk-edit', () => {
  describe('In-app approach', () => {
    before('create test data', () => {
      cy.createTempUser([permissions.bulkEditEdit.gui, permissions.inventoryAll.gui]).then(
        (userProperties) => {
          user = userProperties;

          instance.instanceId = InventoryInstances.createInstanceViaApi(
            instance.instanceName,
            instance.itemBarcode,
          );
          cy.getHoldings({
            limit: 1,
            query: `"instanceId"="${instance.instanceId}"`,
          }).then((holdings) => {
            instance.holdingHRID = holdings[0].hrid;
            instance.holdingsUUID = holdings[0].id;

            cy.getInstance({
              limit: 1,
              expandAll: true,
              query: `"id"=="${instance.instanceId}"`,
            }).then((instanceData) => {
              instance.instanceHRID = instanceData.hrid;

              FileManager.createFile(
                `cypress/fixtures/${holdingUUIDsFileName}`,
                `${instance.holdingsUUID}`,
              );
            });

            cy.getLocations({ query: 'name="Main Library"' })
              .then((res) => {
                locationId = res.id;
              })
              .then(() => {
                cy.updateHoldingRecord(holdings[0].id, {
                  ...holdings[0],
                  administrativeNotes: [administrativeNoteText],
                  electronicAccess: [
                    {
                      uri: electronicAccessURI,
                    },
                  ],
                  temporaryLocationId: locationId,
                  permanentLocationId: locationId,
                });
              });

            cy.login(user.username, user.password, {
              path: TopMenu.bulkEditPath,
              waiter: BulkEditSearchPane.waitLoading,
            });
          });
        },
      );
    });

    after('delete test data', () => {
      cy.getAdminToken();
      InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(instance.instanceId);
      Users.deleteViaApi(user.userId);
      FileManager.deleteFile(`cypress/fixtures/${holdingUUIDsFileName}`);
      FileManager.deleteFileFromDownloadsByMask(
        matchedRecordsFileName,
        previewFileName,
        changedRecordsFileName,
      );
    });

    it(
      'C432296 Verify updated properties columns appear on "Are you sure?" form and on Confirmation screen - holdings (firebird)',
      { tags: ['criticalPath', 'firebird', 'C432296'] },
      () => {
        BulkEditSearchPane.verifyDragNDropRecordTypeIdentifierArea('Holdings', 'Holdings UUIDs');
        BulkEditSearchPane.uploadFile(holdingUUIDsFileName);
        BulkEditSearchPane.waitFileUploading();
        BulkEditSearchPane.verifyResultsUnderColumns(
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.HOLDINGS_HRID,
          instance.holdingHRID,
        );
        BulkEditActions.openActions();
        BulkEditSearchPane.uncheckShowColumnCheckbox(...columnNamesSet);

        columnNamesSet.forEach((columnName) => {
          BulkEditSearchPane.verifyCheckboxInActionsDropdownMenuChecked(columnName, false);
        });

        BulkEditActions.openActions();
        BulkEditActions.downloadMatchedResults();
        ExportFile.verifyFileIncludes(matchedRecordsFileName, [columnNamesSet]);

        BulkEditActions.openStartBulkEditForm();
        BulkEditActions.verifyBulkEditsAccordionExists();
        BulkEditActions.verifyOptionsDropdown();
        BulkEditActions.verifyRowIcons();
        BulkEditActions.verifyActionsColumnIsNotPopulated();
        BulkEditActions.selectOption(HOLDING_NOTE_TYPES.ADMINISTRATIVE_NOTE, 0);
        BulkEditActions.selectSecondAction(actionsToSelect.changeNoteType);
        BulkEditActions.selectNoteTypeWhenChangingIt(HOLDING_NOTE_TYPES.ACTION_NOTE, 0);
        BulkEditActions.verifySecondActionSelected(actionsToSelect.changeNoteType);
        BulkEditActions.verifyConfirmButtonDisabled(false);
        BulkEditActions.addNewBulkEditFilterString();
        BulkEditActions.verifyNewBulkEditRow(1);
        BulkEditActions.selectOption('URI', 1);
        BulkEditActions.selectSecondAction(actionsToSelect.replaceWith, 1);
        BulkEditActions.fillInSecondTextArea(newURI, 1);
        BulkEditActions.verifySecondActionSelected(actionsToSelect.replaceWith, 1);
        BulkEditActions.verifyValueInSecondTextArea(newURI, 1);
        BulkEditActions.verifyConfirmButtonDisabled(false);
        BulkEditActions.addNewBulkEditFilterString();
        BulkEditActions.verifyNewBulkEditRow(2);
        BulkEditActions.replacePermanentLocation(LOCATION_NAMES.ONLINE_UI, 'holdings', 2);
        BulkEditActions.verifyActionsSelectDropdownDisabled(2);
        BulkEditActions.verifySecondActionSelected(actionsToSelect.replaceWith, 2);
        BulkEditActions.verifyConfirmButtonDisabled(false);
        BulkEditActions.addNewBulkEditFilterString();
        BulkEditActions.verifyNewBulkEditRow(3);
        BulkEditActions.selectOption('Temporary holdings location', 3);
        BulkEditActions.selectSecondAction(actionsToSelect.clearField, 3);
        BulkEditActions.verifySecondActionSelected(actionsToSelect.clearField, 3);
        BulkEditActions.verifyConfirmButtonDisabled(false);
        BulkEditActions.addNewBulkEditFilterString();
        BulkEditActions.verifyNewBulkEditRow(4);
        BulkEditActions.selectOption(HOLDING_NOTE_TYPES.ELECTRONIC_BOOKPLATE, 4);
        BulkEditActions.selectSecondAction(actionsToSelect.addNote, 4);
        BulkEditActions.fillInSecondTextArea(electronicBookplateNoteText, 4);
        BulkEditActions.verifySecondActionSelected(actionsToSelect.addNote, 4);
        BulkEditActions.verifyValueInSecondTextArea(electronicBookplateNoteText, 4);
        BulkEditActions.verifyConfirmButtonDisabled(false);
        BulkEditActions.addNewBulkEditFilterString();
        BulkEditActions.verifyNewBulkEditRow(5);
        BulkEditActions.selectOption('Suppress from discovery', 5);
        BulkEditActions.selectSecondAction(actionsToSelect.setTrue, 5);
        BulkEditActions.verifySecondActionSelected(actionsToSelect.setTrue, 5);
        BulkEditActions.verifyConfirmButtonDisabled(false);
        BulkEditActions.confirmChanges();
        BulkEditActions.verifyMessageBannerInAreYouSureForm(1);
        BulkEditActions.verifyChangesInAreYouSureForm(
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.HOLDINGS_HRID,
          [instance.holdingHRID],
        );

        editedValueSets.forEach((editedValueSet) => {
          BulkEditActions.verifyChangesInAreYouSureForm(editedValueSet[0], [editedValueSet[1]]);
        });

        BulkEditActions.verifyChangesInAreYouSureForm(
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.ELECTRONIC_ACCESS,
          [newURI],
        );
        BulkEditActions.downloadPreview();

        const holdingFieldHeaders = Object.values(
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS,
        ).slice(0, -2);

        ExportFile.verifyFileIncludes(previewFileName, [
          holdingFieldHeaders,
          electronicAccessValue,
          ...editedValueSets,
        ]);
        BulkEditActions.commitChanges();
        BulkEditSearchPane.waitFileUploading();
        BulkEditActions.verifySuccessBanner(1);
        BulkEditSearchPane.verifyExactChangesUnderColumns(
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.HOLDINGS_HRID,
          instance.holdingHRID,
        );

        editedValueSets.forEach((editedValueSet) => {
          BulkEditSearchPane.verifyExactChangesUnderColumns(...editedValueSet);
        });

        BulkEditSearchPane.verifyChangesUnderColumns(
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.ELECTRONIC_ACCESS,
          newURI,
        );
        BulkEditActions.openActions();
        BulkEditActions.downloadChangedCSV();
        ExportFile.verifyFileIncludes(changedRecordsFileName, [
          holdingFieldHeaders,
          electronicAccessValue,
          ...editedValueSets,
        ]);

        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
        InventorySearchAndFilter.switchToHoldings();
        InventorySearchAndFilter.searchHoldingsByHRID(instance.holdingHRID);
        InventorySearchAndFilter.selectViewHoldings();
        HoldingsRecordView.waitLoading();
        HoldingsRecordView.checkAdministrativeNote('-');
        HoldingsRecordView.checkNotesByType(
          0,
          HOLDING_NOTE_TYPES.ACTION_NOTE,
          administrativeNoteText,
        );
        HoldingsRecordView.checkNotesByType(
          1,
          HOLDING_NOTE_TYPES.ELECTRONIC_BOOKPLATE,
          electronicBookplateNoteText,
        );
        HoldingsRecordView.checkMarkAsSuppressedFromDiscovery();
        HoldingsRecordView.checkElectronicAccess('-', newURI);
        HoldingsRecordView.checkPermanentLocation(LOCATION_NAMES.ONLINE_UI);
        HoldingsRecordView.checkTemporaryLocation('-');
      },
    );
  });
});
