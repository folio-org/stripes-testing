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
  electronicAccessRelationshipId,
  electronicAccessRelationshipName,
  LOCATION_IDS,
  LOCATION_NAMES,
  HOLDING_NOTES,
} from '../../../support/constants';

let user;
const item = {
  instanceName: `testBulkEdit_${getRandomPostfix()}`,
  itemBarcode: getRandomPostfix(),
};
const holdingUUIDsFileName = `holdingUUIDs_${getRandomPostfix()}.csv`;
const matchedRecordsFileName = BulkEditFiles.getMatchedRecordsFileName(holdingUUIDsFileName);
const previewFileName = BulkEditFiles.getPreviewFileName(holdingUUIDsFileName);
const changedRecordsFileName = BulkEditFiles.getChangedRecordsFileName(holdingUUIDsFileName);
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
const notes = {
  admin: 'adminNote',
  action: 'actionNote',
  binding: 'bindingNote',
  copy: 'copyNote',
  note: 'noteNote',
  provenance: 'provenanceNote',
  reproduction: 'reproductionNote',
};

describe('bulk-edit', () => {
  describe('in-app approach', () => {
    before('create test data', () => {
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

    after('delete test data', () => {
      cy.getAdminToken();
      InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(item.itemBarcode);
      FileManager.deleteFile(`cypress/fixtures/${holdingUUIDsFileName}`);
      FileManager.deleteFileFromDownloadsByMask(
        matchedRecordsFileName,
        changedRecordsFileName,
        previewFileName,
      );
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
        let contentToVerify = `"URL relationship;URI;Link text;Materials specified;URL public note\n${electronicAccessRelationshipName.RESOURCE};${electronicAccess[0].uri};${electronicAccess[0].linkText};${electronicAccess[0].materialsSpecification};${electronicAccess[0].publicNote}",`;
        ExportFile.verifyFileIncludes(matchedRecordsFileName, [contentToVerify]);
        BulkEditSearchPane.changeShowColumnCheckboxIfNotYet('Electronic access');
        BulkEditSearchPane.verifyMatchedResults(item.holdingsHRID);
        BulkEditSearchPane.verifyElectronicAccessElementByIndex(
          0,
          electronicAccessRelationshipName.RESOURCE,
        );
        BulkEditSearchPane.verifyElectronicAccessElementByIndex(1, electronicAccess[0].uri);
        BulkEditSearchPane.verifyElectronicAccessElementByIndex(2, electronicAccess[0].linkText);
        BulkEditSearchPane.verifyElectronicAccessElementByIndex(
          3,
          electronicAccess[0].materialsSpecification,
        );
        BulkEditSearchPane.verifyElectronicAccessElementByIndex(4, electronicAccess[0].publicNote);
        BulkEditActions.openInAppStartBulkEditFrom();
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
        const suppressFromDiscovery = 'true';
        BulkEditActions.editSuppressFromDiscovery(suppressFromDiscovery, 10);
        BulkEditActions.checkApplyToItemsRecordsCheckbox();
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
          electronicAccessRelationshipName.RESOURCE,
        );
        BulkEditSearchPane.verifyElectronicAccessElementByIndex(1, electronicAccess[0].uri);
        BulkEditSearchPane.verifyElectronicAccessElementByIndex(2, '');
        BulkEditSearchPane.verifyElectronicAccessElementByIndex(
          3,
          electronicAccess[0].materialsSpecification,
        );
        BulkEditSearchPane.verifyElectronicAccessElementByIndex(4, electronicAccess[0].publicNote);
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
          suppressFromDiscovery,
        );

        BulkEditActions.clickKeepEditingBtn();
        BulkEditActions.uncheckStaffOnlyCheckbox(7);
        BulkEditActions.confirmChanges();
        BulkEditActions.verifyAreYouSureForm(1, item.holdingsHRID);
        BulkEditSearchPane.verifyExactChangesUnderColumns('Administrative note', notes.admin);
        BulkEditSearchPane.verifyElectronicAccessElementByIndex(
          0,
          electronicAccessRelationshipName.RESOURCE,
        );
        BulkEditSearchPane.verifyElectronicAccessElementByIndex(1, electronicAccess[0].uri);
        BulkEditSearchPane.verifyElectronicAccessElementByIndex(2, '');
        BulkEditSearchPane.verifyElectronicAccessElementByIndex(
          3,
          electronicAccess[0].materialsSpecification,
        );
        BulkEditSearchPane.verifyElectronicAccessElementByIndex(4, electronicAccess[0].publicNote);
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
        BulkEditActions.downloadPreview();
        contentToVerify = `${item.holdingsHRID},FOLIO,,,,${notes.admin},${LOCATION_NAMES.MAIN_LIBRARY_UI},${LOCATION_NAMES.MAIN_LIBRARY_UI},,,,,1,,,,,,,,,${notes.action},${notes.binding} (staff only),${notes.copy} (staff only),,${notes.note} (staff only),${notes.provenance},${notes.reproduction} (staff only),"URL relationship;URI;Link text;Materials specified;URL public note\n${electronicAccessRelationshipName.RESOURCE};${electronicAccess[0].uri};;${electronicAccess[0].materialsSpecification};${electronicAccess[0].publicNote}",`;
        ExportFile.verifyFileIncludes(previewFileName, [contentToVerify]);
        BulkEditActions.commitChanges();
        BulkEditSearchPane.waitFileUploading();
        BulkEditActions.openActions();
        BulkEditActions.downloadChangedCSV();
        contentToVerify = `${item.holdingsHRID},FOLIO,,,,${notes.admin},${LOCATION_NAMES.MAIN_LIBRARY_UI},${LOCATION_NAMES.MAIN_LIBRARY_UI},,,,,1,,,,,,,,,${notes.action},${notes.binding} (staff only),${notes.copy} (staff only),,${notes.note} (staff only),${notes.provenance},${notes.reproduction} (staff only),"URL relationship;URI;Link text;Materials specified;URL public note\n${electronicAccessRelationshipName.RESOURCE};${electronicAccess[0].uri};;${electronicAccess[0].materialsSpecification};${electronicAccess[0].publicNote}",`;
        ExportFile.verifyFileIncludes(changedRecordsFileName, [contentToVerify]);
        BulkEditSearchPane.verifyExactChangesUnderColumns('Administrative note', notes.admin);
        BulkEditSearchPane.verifyElectronicAccessElementByIndex(
          0,
          electronicAccessRelationshipName.RESOURCE,
        );
        BulkEditSearchPane.verifyElectronicAccessElementByIndex(1, electronicAccess[0].uri);
        BulkEditSearchPane.verifyElectronicAccessElementByIndex(2, '');
        BulkEditSearchPane.verifyElectronicAccessElementByIndex(
          3,
          electronicAccess[0].materialsSpecification,
        );
        BulkEditSearchPane.verifyElectronicAccessElementByIndex(4, electronicAccess[0].publicNote);
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
          electronicAccessRelationshipName.RESOURCE,
        );
        HoldingsRecordView.verifyElectronicAccessByElementIndex(1, electronicAccess[0].uri);
        HoldingsRecordView.verifyElectronicAccessByElementIndex(2, '-');
        HoldingsRecordView.verifyElectronicAccessByElementIndex(
          3,
          electronicAccess[0].materialsSpecification,
        );
        HoldingsRecordView.verifyElectronicAccessByElementIndex(4, electronicAccess[0].publicNote);
        HoldingsRecordView.checkHoldingsNoteByRowForDifferentNoteTypes([notes.action, 'No']);
        HoldingsRecordView.checkHoldingsNoteByRowForDifferentNoteTypes([notes.binding, 'Yes'], 1);
        HoldingsRecordView.checkHoldingsNoteByRowForDifferentNoteTypes([notes.copy, 'Yes'], 2);
        HoldingsRecordView.checkHoldingsNoteByRowForDifferentNoteTypes([notes.note, 'Yes'], 3);
        HoldingsRecordView.checkHoldingsNoteByRowForDifferentNoteTypes([notes.provenance, 'No'], 4);
        HoldingsRecordView.checkHoldingsNoteByRowForDifferentNoteTypes(
          [notes.reproduction, 'Yes'],
          5,
        );
      },
    );
  });
});
