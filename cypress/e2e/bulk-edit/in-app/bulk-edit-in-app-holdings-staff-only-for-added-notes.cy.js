import permissions from '../../../support/dictionary/permissions';
import BulkEditActions from '../../../support/fragments/bulk-edit/bulk-edit-actions';
import BulkEditFiles from '../../../support/fragments/bulk-edit/bulk-edit-files';
import BulkEditSearchPane from '../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import HoldingsRecordView from '../../../support/fragments/inventory/holdingsRecordView';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix from '../../../support/utils/stringTools';
import ExportFile from '../../../support/fragments/data-export/exportFile';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import {
  APPLICATION_NAMES,
  BULK_EDIT_TABLE_COLUMN_HEADERS,
  electronicAccessRelationshipId,
  ELECTRONIC_ACCESS_RELATIONSHIP_NAME,
  LOCATION_IDS,
  LOCATION_NAMES,
  HOLDING_NOTES,
} from '../../../support/constants';

let user;
let item;
let holdingUUIDsFileName;
let fileNames;
const electronicAccess = [
  {
    linkText: 'test-linkText',
    materialsSpecification: 'test-materialsSpecification',
    publicNote: 'test-publicNote',
    relationshipId: electronicAccessRelationshipId.RESOURCE,
    uri: 'testuri.com/uri',
  },
];
const electronicBookplateNote = 'electronicBookplateNote';
const electronicAccessTableHeadersInFile =
  'URL relationship;URI;Link text;Materials specified;URL public note\n';
const notes = {
  admin: 'adminNote',
  action: 'actionNote',
  binding: 'bindingNote',
  copy: 'copyNote',
  note: 'noteNote',
  provenance: 'provenanceNote',
  reproduction: 'reproductionNote',
};

describe(
  'Bulk-edit',
  {
    retries: {
      runMode: 1,
    },
  },
  () => {
    describe('In-app approach', () => {
      beforeEach('create test data', () => {
        holdingUUIDsFileName = `holdingUUIDs_${getRandomPostfix()}.csv`;
        fileNames = BulkEditFiles.getAllDownloadedFileNames(holdingUUIDsFileName, true);
        item = {
          instanceName: `testBulkEdit_${getRandomPostfix()}`,
          itemBarcode: getRandomPostfix(),
        };
        holdingUUIDsFileName = `holdingUUIDs_${getRandomPostfix()}.csv`;
        fileNames = BulkEditFiles.getAllDownloadedFileNames(holdingUUIDsFileName, true);

        cy.createTempUser([
          permissions.bulkEditLogsView.gui,
          permissions.bulkEditEdit.gui,
          permissions.inventoryCRUDHoldings.gui,
        ]).then((userProperties) => {
          user = userProperties;

          item.instanceId = InventoryInstances.createInstanceViaApi(
            item.instanceName,
            item.itemBarcode,
          );
          cy.getHoldings({ limit: 1, query: `"instanceId"="${item.instanceId}"` }).then(
            (holdings) => {
              item.holdingsUUID = holdings[0].id;
              item.holdingsHRID = holdings[0].hrid;
              FileManager.createFile(`cypress/fixtures/${holdingUUIDsFileName}`, holdings[0].id);
              cy.updateHoldingRecord(holdings[0].id, {
                ...holdings[0],
                notes: [
                  {
                    holdingsNoteTypeId: HOLDING_NOTES.ELECTRONIC_BOOKPLATE_NOTE,
                    note: electronicBookplateNote,
                    staffOnly: false,
                  },
                ],
                permanentLocationId: LOCATION_IDS.MAIN_LIBRARY,
                temporaryLocationId: LOCATION_IDS.MAIN_LIBRARY,
                electronicAccess,
              });
            },
          );
          cy.login(user.username, user.password, {
            path: TopMenu.bulkEditPath,
            waiter: BulkEditSearchPane.waitLoading,
          });
        });
      });

      afterEach('delete test data', () => {
        cy.getAdminToken();
        InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(item.itemBarcode);
        FileManager.deleteFile(`cypress/fixtures/${holdingUUIDsFileName}`);
        BulkEditFiles.deleteAllDownloadedFiles(fileNames);
        Users.deleteViaApi(user.userId);
      });

      it(
        'C466271 Verify Staff only checkbox for Added notes - holdings (firebird)',
        { tags: ['smoke', 'firebird', 'C466271'] },
        () => {
          BulkEditSearchPane.checkHoldingsRadio();
          BulkEditSearchPane.selectRecordIdentifier('Holdings UUIDs');
          BulkEditSearchPane.uploadFile(holdingUUIDsFileName);
          BulkEditSearchPane.waitFileUploading();
          BulkEditActions.downloadMatchedResults();

          const contentToVerify = `"URL relationship;URI;Link text;Materials specified;URL public note\n${ELECTRONIC_ACCESS_RELATIONSHIP_NAME.RESOURCE};${electronicAccess[0].uri};${electronicAccess[0].linkText};${electronicAccess[0].materialsSpecification};${electronicAccess[0].publicNote}",`;

          ExportFile.verifyFileIncludes(fileNames.matchedRecordsCSV, [contentToVerify]);
          BulkEditSearchPane.changeShowColumnCheckboxIfNotYet('Electronic access');
          BulkEditSearchPane.verifyMatchedResults(item.holdingsHRID);
          BulkEditSearchPane.verifyElectronicAccessElementByIndex(
            0,
            ELECTRONIC_ACCESS_RELATIONSHIP_NAME.RESOURCE,
          );
          BulkEditSearchPane.verifyElectronicAccessElementByIndex(1, electronicAccess[0].uri);
          BulkEditSearchPane.verifyElectronicAccessElementByIndex(2, electronicAccess[0].linkText);
          BulkEditSearchPane.verifyElectronicAccessElementByIndex(
            3,
            electronicAccess[0].materialsSpecification,
          );
          BulkEditSearchPane.verifyElectronicAccessElementByIndex(
            4,
            electronicAccess[0].publicNote,
          );
          BulkEditActions.openStartBulkEditForm();
          BulkEditActions.addItemNote('Administrative note', notes.admin);
          BulkEditActions.verifyCheckboxAbsent();
          BulkEditActions.verifyConfirmButtonDisabled(false);
          BulkEditActions.addNewBulkEditFilterString();
          BulkEditActions.noteRemove('Link text', electronicAccess[0].linkText, 1);
          BulkEditActions.addNewBulkEditFilterString();
          BulkEditActions.replacePermanentLocation(LOCATION_NAMES.MAIN_LIBRARY_UI, 'holdings', 2);
          BulkEditActions.addNewBulkEditFilterString();
          BulkEditActions.selectOption('Action note', 3);
          BulkEditActions.selectSecondAction('Add note', 3);
          BulkEditActions.verifyStaffOnlyCheckbox(false, 3);
          BulkEditActions.fillInSecondTextArea(notes.action, 3);
          BulkEditActions.addNewBulkEditFilterString();
          BulkEditActions.findValue('Binding', 4);

          const possibleActions = ['Remove', 'Replace with'];

          BulkEditActions.verifyPossibleActions(possibleActions, 4);
          BulkEditActions.verifyCheckboxAbsentByRow(4);
          BulkEditActions.selectAction('Add note', 4);
          BulkEditActions.fillInSecondTextArea(notes.binding, 4);
          BulkEditActions.checkStaffOnlyCheckbox(4);
          BulkEditActions.verifyConfirmButtonDisabled(false);
          BulkEditActions.addNewBulkEditFilterString();
          BulkEditActions.addItemNote('Copy note', notes.copy, 5);
          BulkEditActions.checkStaffOnlyCheckbox(5);
          BulkEditActions.verifyConfirmButtonDisabled(false);
          BulkEditActions.addNewBulkEditFilterString();
          BulkEditActions.noteRemoveAll('Electronic bookplate', 6);
          BulkEditActions.addNewBulkEditFilterString();
          BulkEditActions.addItemNote('Note', notes.note, 7);
          BulkEditActions.checkStaffOnlyCheckbox(7);
          BulkEditActions.verifyConfirmButtonDisabled(false);
          BulkEditActions.addNewBulkEditFilterString();
          BulkEditActions.addItemNote('Provenance', notes.provenance, 8);
          BulkEditActions.checkStaffOnlyCheckbox(8);
          BulkEditActions.verifyConfirmButtonDisabled(false);
          BulkEditActions.addNewBulkEditFilterString();
          BulkEditActions.addItemNote('Reproduction', notes.reproduction, 9);
          BulkEditActions.checkStaffOnlyCheckbox(9);
          BulkEditActions.verifyConfirmButtonDisabled(false);
          BulkEditActions.addNewBulkEditFilterString();

          const suppressFromDiscovery = true;

          BulkEditActions.editSuppressFromDiscovery(suppressFromDiscovery, 10, true);
          BulkEditActions.deleteRow(2);
          BulkEditActions.verifyStaffOnlyCheckbox(false, 2);
          BulkEditActions.verifyStaffOnlyCheckbox(true, 3);
          BulkEditActions.verifyStaffOnlyCheckbox(true, 4);
          BulkEditActions.verifyStaffOnlyCheckbox(true, 6);
          BulkEditActions.verifyStaffOnlyCheckbox(true, 7);
          BulkEditActions.verifyStaffOnlyCheckbox(true, 8);
          BulkEditActions.applyToItemsRecordsCheckboxExists(true);
          BulkEditActions.confirmChanges();
          BulkEditActions.verifyAreYouSureForm(1, item.holdingsHRID);
          BulkEditSearchPane.verifyExactChangesUnderColumns('Administrative note', notes.admin);
          BulkEditSearchPane.verifyElectronicAccessElementByIndex(
            0,
            ELECTRONIC_ACCESS_RELATIONSHIP_NAME.RESOURCE,
          );
          BulkEditSearchPane.verifyElectronicAccessElementByIndex(1, electronicAccess[0].uri);
          BulkEditSearchPane.verifyElectronicAccessElementByIndex(2, '');
          BulkEditSearchPane.verifyElectronicAccessElementByIndex(
            3,
            electronicAccess[0].materialsSpecification,
          );
          BulkEditSearchPane.verifyElectronicAccessElementByIndex(
            4,
            electronicAccess[0].publicNote,
          );
          BulkEditSearchPane.verifyExactChangesUnderColumns('Action note', notes.action);
          BulkEditSearchPane.verifyExactChangesUnderColumns(
            'Binding note',
            `${notes.binding} (staff only)`,
          );
          BulkEditSearchPane.verifyExactChangesUnderColumns(
            'Copy note',
            `${notes.copy} (staff only)`,
          );
          BulkEditSearchPane.verifyExactChangesUnderColumns('Electronic bookplate note', '');
          BulkEditSearchPane.verifyExactChangesUnderColumns('Note', `${notes.note} (staff only)`);
          BulkEditSearchPane.verifyExactChangesUnderColumns(
            'Provenance note',
            `${notes.provenance} (staff only)`,
          );
          BulkEditSearchPane.verifyExactChangesUnderColumns(
            'Reproduction note',
            `${notes.reproduction} (staff only)`,
          );
          BulkEditSearchPane.verifyExactChangesUnderColumns(
            'Suppress from discovery',
            `${suppressFromDiscovery}`,
          );
          BulkEditActions.clickKeepEditingBtn();
          BulkEditActions.uncheckStaffOnlyCheckbox(7);
          BulkEditActions.confirmChanges();
          BulkEditActions.verifyAreYouSureForm(1, item.holdingsHRID);
          BulkEditSearchPane.verifyExactChangesUnderColumns('Administrative note', notes.admin);
          BulkEditSearchPane.verifyElectronicAccessElementByIndex(
            0,
            ELECTRONIC_ACCESS_RELATIONSHIP_NAME.RESOURCE,
          );
          BulkEditSearchPane.verifyElectronicAccessElementByIndex(1, electronicAccess[0].uri);
          BulkEditSearchPane.verifyElectronicAccessElementByIndex(2, '');
          BulkEditSearchPane.verifyElectronicAccessElementByIndex(
            3,
            electronicAccess[0].materialsSpecification,
          );
          BulkEditSearchPane.verifyElectronicAccessElementByIndex(
            4,
            electronicAccess[0].publicNote,
          );
          BulkEditSearchPane.verifyExactChangesUnderColumns('Action note', notes.action);
          BulkEditSearchPane.verifyExactChangesUnderColumns(
            'Binding note',
            `${notes.binding} (staff only)`,
          );
          BulkEditSearchPane.verifyExactChangesUnderColumns(
            'Copy note',
            `${notes.copy} (staff only)`,
          );
          BulkEditSearchPane.verifyExactChangesUnderColumns('Electronic bookplate note', '');
          BulkEditSearchPane.verifyExactChangesUnderColumns('Note', `${notes.note} (staff only)`);
          BulkEditSearchPane.verifyExactChangesUnderColumns('Provenance note', notes.provenance);
          BulkEditSearchPane.verifyExactChangesUnderColumns(
            'Reproduction note',
            `${notes.reproduction} (staff only)`,
          );

          const editedHeaderValues = [
            {
              [BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.ADMINISTRATIVE_NOTE]: notes.admin,
            },
            {
              [BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.ACTION_NOTE]: notes.action,
            },
            {
              [BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.BINDING_NOTE]:
                `${notes.binding} (staff only)`,
            },
            {
              [BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.COPY_NOTE]:
                `${notes.copy} (staff only)`,
            },
            {
              [BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.ELECTRONIC_BOOKPLATE_NOTE]: '',
            },
            {
              [BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.HOLDINGS_HRID]: item.holdingsHRID,
            },
            {
              [BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.HOLDINGS_TEMPORARY_LOCATION]:
                LOCATION_NAMES.MAIN_LIBRARY_UI,
            },
            {
              [BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.HOLDINGS_PERMANENT_LOCATION]:
                LOCATION_NAMES.MAIN_LIBRARY_UI,
            },
            {
              [BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.SUPPRESS_FROM_DISCOVERY]: true,
            },
            {
              [BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.NOTE]:
                `${notes.note} (staff only)`,
            },
            {
              [BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.PROVENANCE_NOTE]: notes.provenance,
            },
            {
              [BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.REPRODUCTION]:
                `${notes.reproduction} (staff only)`,
            },
            {
              [BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.ELECTRONIC_ACCESS]:
                `${electronicAccessTableHeadersInFile}${ELECTRONIC_ACCESS_RELATIONSHIP_NAME.RESOURCE};${electronicAccess[0].uri};;${electronicAccess[0].materialsSpecification};${electronicAccess[0].publicNote}`,
            },
          ];

          BulkEditActions.downloadPreview();
          FileManager.convertCsvToJson(fileNames.previewRecordsCSV).then((csvFileData) => {
            editedHeaderValues.forEach((headerValue) => {
              expect(csvFileData[0]).to.include(headerValue);
            });
          });
          BulkEditActions.commitChanges();
          BulkEditSearchPane.waitFileUploading();
          BulkEditActions.openActions();
          BulkEditActions.downloadChangedCSV();
          FileManager.convertCsvToJson(fileNames.changedRecordsCSV).then((csvFileData) => {
            editedHeaderValues.forEach((headerValue) => {
              cy.expect(csvFileData[0]).to.include(headerValue);
            });
          });
          BulkEditSearchPane.verifyExactChangesUnderColumns('Administrative note', notes.admin);
          BulkEditSearchPane.verifyElectronicAccessElementByIndex(
            0,
            ELECTRONIC_ACCESS_RELATIONSHIP_NAME.RESOURCE,
          );
          BulkEditSearchPane.verifyElectronicAccessElementByIndex(1, electronicAccess[0].uri);
          BulkEditSearchPane.verifyElectronicAccessElementByIndex(2, '');
          BulkEditSearchPane.verifyElectronicAccessElementByIndex(
            3,
            electronicAccess[0].materialsSpecification,
          );
          BulkEditSearchPane.verifyElectronicAccessElementByIndex(
            4,
            electronicAccess[0].publicNote,
          );
          BulkEditSearchPane.verifyExactChangesUnderColumns('Action note', notes.action);
          BulkEditSearchPane.verifyExactChangesUnderColumns(
            'Binding note',
            `${notes.binding} (staff only)`,
          );
          BulkEditSearchPane.verifyExactChangesUnderColumns(
            'Copy note',
            `${notes.copy} (staff only)`,
          );
          BulkEditSearchPane.verifyExactChangesUnderColumns('Electronic bookplate note', '');
          BulkEditSearchPane.verifyExactChangesUnderColumns('Note', `${notes.note} (staff only)`);
          BulkEditSearchPane.verifyExactChangesUnderColumns('Provenance note', notes.provenance);
          BulkEditSearchPane.verifyExactChangesUnderColumns(
            'Reproduction note',
            `${notes.reproduction} (staff only)`,
          );

          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
          InventorySearchAndFilter.switchToHoldings();
          InventorySearchAndFilter.searchByParameter('Holdings HRID', item.holdingsHRID);
          InventorySearchAndFilter.selectSearchResultItem();
          InventorySearchAndFilter.selectViewHoldings();
          HoldingsRecordView.checkMarkAsSuppressedFromDiscovery();
          HoldingsRecordView.checkAdministrativeNote(notes.admin);
          HoldingsRecordView.verifyElectronicAccessByElementIndex(
            0,
            ELECTRONIC_ACCESS_RELATIONSHIP_NAME.RESOURCE,
          );
          HoldingsRecordView.verifyElectronicAccessByElementIndex(1, electronicAccess[0].uri);
          HoldingsRecordView.verifyElectronicAccessByElementIndex(2, '-');
          HoldingsRecordView.verifyElectronicAccessByElementIndex(
            3,
            electronicAccess[0].materialsSpecification,
          );
          HoldingsRecordView.verifyElectronicAccessByElementIndex(
            4,
            electronicAccess[0].publicNote,
          );
          HoldingsRecordView.checkHoldingsNoteByRowForDifferentNoteTypes([notes.action, 'No']);
          HoldingsRecordView.checkHoldingsNoteByRowForDifferentNoteTypes([notes.binding, 'Yes'], 1);
          HoldingsRecordView.checkHoldingsNoteByRowForDifferentNoteTypes([notes.copy, 'Yes'], 2);
          HoldingsRecordView.checkHoldingsNoteByRowForDifferentNoteTypes([notes.note, 'Yes'], 3);
          HoldingsRecordView.checkHoldingsNoteByRowForDifferentNoteTypes(
            [notes.provenance, 'No'],
            4,
          );
          HoldingsRecordView.checkHoldingsNoteByRowForDifferentNoteTypes(
            [notes.reproduction, 'Yes'],
            5,
          );
        },
      );
    });
  },
);
