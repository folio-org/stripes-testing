import permissions from '../../../support/dictionary/permissions';
import BulkEditActions from '../../../support/fragments/bulk-edit/bulk-edit-actions';
import BulkEditFiles from '../../../support/fragments/bulk-edit/bulk-edit-files';
import BulkEditSearchPane, {
  instanceIdentifiers,
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
const instanceNoteColumnNames = [
  BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.ACCESSIBILITY_NOTE,
  BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.ACCUMULATION_FREQUENCY_USE_NOTE,
  BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.ACTION_NOTE,
  BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.ADDITIONAL_PHYSICAL_FORM_AVAILABLE_NOTE,
  BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.AWARDS_NOTE,
  BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.BIBLIOGRAPHY_NOTE,
  BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.BINDING_INFORMATION_NOTE,
  BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.BIOGRAPHICAL_HISTORICAL_DATA,
  BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.CARTOGRAPHIC_MATHEMATICAL_DATA,
  BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.CASE_FILE_CHARACTERISTICS_NOTE,
  BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.CITATION_REFERENCES_NOTE,
  BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.COPY_VERSION_IDENTIFICATION_NOTE,
  BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.CREATION_PRODUCTION_CREDITS_NOTE,
  BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.CUMULATIVE_INDEX_FINDING_AIDES_NOTES,
  BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.DATA_QUALITY_NOTE,
  BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.DATE_TIME_PLACE_EVENT_NOTE,
  BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.DISSERTATION_NOTE,
  BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.ENTITY_ATTRIBUTE_INFORMATION_NOTE,
  BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.EXHIBITIONS_NOTE,
  BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.FORMATTED_CONTENTS_NOTE,
  BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.FORMER_TITLE_COMPLEXITY_NOTE,
  BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.FUNDING_INFORMATION_NOTE,
  BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.GENERAL_NOTE,
  BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.GEOGRAPHIC_COVERAGE_NOTE,
  BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.IMMEDIATE_SOURCE_ACQUISITION_NOTE,
  BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INFORMATION_ABOUT_DOCUMENTATION_NOTE,
  BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INFORMATION_RELATED_COPYRIGHT_STATUS,
  BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.ISSUING_BODY_NOTE,
  BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.LANGUAGE_NOTE,
  BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.LINKING_ENTRY_COMPLEXITY_NOTE,
  BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.LOCAL_NOTES,
  BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.LOCATION_ORIGINALS_DUPLICATES_NOTE,
  BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.LOCATION_OTHER_ARCHIVAL_MATERIALS_NOTE,
  BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.METHODOLOGY_NOTE,
  BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.NUMBERING_PECULIARITIES_NOTE,
  BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.ORIGINAL_VERSION_NOTE,
  BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.OWNERSHIP_CUSTODIAL_HISTORY_NOTE,
  BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.PARTICIPANT_PERFORMER_NOTE,
  BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.PREFERRED_CITATION_DESCRIBED_MATERIALS_NOTE,
  BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.PUBLICATIONS_ABOUT_DESCRIBED_MATERIALS_NOTE,
  BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.REPRODUCTION_NOTE,
  BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.RESTRICTIONS_ACCESS_NOTE,
  BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.SCALE_NOTE_GRAPHIC_MATERIAL,
  BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.SOURCE_DESCRIPTION_NOTE,
  BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.STUDY_PROGRAM_INFORMATION_NOTE,
  BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.SUMMARY,
  BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.SUPPLEMENT_NOTE,
  BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.SYSTEM_DETAILS_NOTE,
  BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.TARGET_AUDIENCE_NOTE,
  BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.TERMS_GOVERNING_USE_REPRODUCTION_NOTE,
  BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.TYPE_COMPUTER_FILE_DATA_NOTE,
  BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.TYPE_REPORT_PERIOD_COVERED_NOTE,
  BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.WITH_NOTE,
];
const instanceUUIDsFileName = `instanceUUIDs-${getRandomPostfix()}.csv`;
const matchedRecordsFileName = BulkEditFiles.getMatchedRecordsFileName(instanceUUIDsFileName, true);
const previewFileName = BulkEditFiles.getPreviewFileName(instanceUUIDsFileName, true);
const changedRecordsFileName = BulkEditFiles.getChangedRecordsFileName(instanceUUIDsFileName, true);

describe('bulk-edit', () => {
  describe('in-app approach', () => {
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
        BulkEditSearchPane.verifyInstanceNoteColumns(instanceNoteColumnNames);
        BulkEditActions.openActions();
        BulkEditActions.downloadMatchedResults();
        BulkEditFiles.verifyValueInRowByUUID(
          matchedRecordsFileName,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_UUID,
          instance.id,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.RESOURCE_TITLE,
          instance.title,
        );
        BulkEditActions.openStartBulkEditInstanceForm();
        BulkEditActions.verifyBulkEditsAccordionExists();
        BulkEditActions.verifyOptionsDropdown();
        BulkEditActions.verifyRowIcons();
        BulkEditActions.verifySelectOptionsInstanceSortedAlphabetically();

        const optionsOutsideInstanceNoteGroup = [
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.ADMINISTRATIVE_NOTE,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.STAFF_SUPPRESS,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.SUPPRESS_FROM_DISCOVERY,
        ];

        instanceNoteColumnNames.forEach((instanceNoteColumnName) => {
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

        instanceNoteColumnNames.forEach((instanceNoteColumnName) => {
          BulkEditActions.verifyOptionExistsInSelectOptionDropdown(instanceNoteColumnName);
        });

        BulkEditActions.typeInFilterOptionsList(filterOtions.nonExisting);
        BulkEditActions.verifyValueInInputOfFilterOptionsList(filterOtions.nonExisting);
        BulkEditActions.verifyNoMatchingOptionsInFilterOptionsList();
        BulkEditActions.clearFilterOptionsListByClickingBackspace();
        BulkEditActions.verifyValueInInputOfFilterOptionsList('');

        instanceNoteColumnNames.forEach((instanceNoteColumnName) => {
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
