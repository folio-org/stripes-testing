/* eslint-disable no-unused-expressions */
import permissions from '../../../../support/dictionary/permissions';
import BulkEditActions from '../../../../support/fragments/bulk-edit/bulk-edit-actions';
import BulkEditSearchPane from '../../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import BulkEditFiles from '../../../../support/fragments/bulk-edit/bulk-edit-files';
import ExportFile from '../../../../support/fragments/data-export/exportFile';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import FileManager from '../../../../support/utils/fileManager';
import getRandomPostfix from '../../../../support/utils/stringTools';
import InventorySearchAndFilter from '../../../../support/fragments/inventory/inventorySearchAndFilter';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryViewSource from '../../../../support/fragments/inventory/inventoryViewSource';
import { APPLICATION_NAMES, BULK_EDIT_TABLE_COLUMN_HEADERS } from '../../../../support/constants';
import TopMenuNavigation from '../../../../support/fragments/topMenuNavigation';
import InstanceRecordView from '../../../../support/fragments/inventory/instanceRecordView';
import parseMrcFileContentAndVerify from '../../../../support/utils/parseMrcFileContent';
import DateTools from '../../../../support/utils/dateTools';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';

let user;
const accessibilityNote1 = 'Subtitles for the deaf and hard of hearing (SDH) in English';
const accessibilityNote2 = 'Blu-Ray';
const localNote1 = 'Inaccessible';
const localNote2 = 'Images of text';
const marcInstance = {
  title: `AT_C523659_MarcInstance_${getRandomPostfix()}`,
};
const marcInstanceFields = [
  {
    tag: '008',
    content: QuickMarcEditor.defaultValid008Values,
  },
  {
    tag: '245',
    content: `$a ${marcInstance.title}`,
    indicators: ['1', '0'],
  },
  {
    tag: '532',
    content: `$a ${accessibilityNote1} $3 ${accessibilityNote2}`,
    indicators: ['1', '\\'],
  },
  {
    tag: '532',
    content: `$a ${accessibilityNote1}`,
    indicators: ['1', '\\'],
  },
  {
    tag: '932',
    content: `$a ${localNote1} $3 ${localNote2}`,
    indicators: ['1', '\\'],
  },
  {
    tag: '932',
    content: `$a ${localNote1}`,
    indicators: ['1', '\\'],
  },
];
const marcInstanceWithoutTargetFields = {
  title: `AT_C523659_MarcInstance_WithoutFields_${getRandomPostfix()}`,
};
const instanceUUIDsFileName = `instanceUUIdsFileName_${getRandomPostfix()}.csv`;
const fileNames = BulkEditFiles.getAllDownloadedFileNames(instanceUUIDsFileName, true);
const warningMessage = 'No change in MARC fields required';

describe('Bulk-edit', () => {
  describe('In-app approach', () => {
    before('create test data', () => {
      cy.clearLocalStorage();
      cy.getAdminToken();
      cy.createTempUser([
        permissions.bulkEditEdit.gui,
        permissions.uiInventoryViewCreateEditInstances.gui,
        permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
      ]).then((userProperties) => {
        user = userProperties;

        cy.createMarcBibliographicViaAPI(QuickMarcEditor.defaultValidLdr, marcInstanceFields).then(
          (instanceId) => {
            marcInstance.uuid = instanceId;

            cy.getInstanceById(marcInstance.uuid).then((instanceData) => {
              marcInstance.hrid = instanceData.hrid;
            });
            cy.createSimpleMarcBibViaAPI(marcInstanceWithoutTargetFields.title).then((id) => {
              marcInstanceWithoutTargetFields.uuid = id;

              cy.getInstanceById(id).then((instanceData) => {
                marcInstanceWithoutTargetFields.hrid = instanceData.hrid;
              });
              FileManager.createFile(
                `cypress/fixtures/${instanceUUIDsFileName}`,
                `${marcInstance.uuid}\n${marcInstanceWithoutTargetFields.uuid}`,
              );
            });
          },
        );
        cy.login(user.username, user.password, {
          path: TopMenu.bulkEditPath,
          waiter: BulkEditSearchPane.waitLoading,
        });
        BulkEditSearchPane.verifyDragNDropRecordTypeIdentifierArea('Instance', 'Instance UUIDs');
        BulkEditSearchPane.uploadFile(instanceUUIDsFileName);
        BulkEditSearchPane.checkForUploading(instanceUUIDsFileName);
        BulkEditSearchPane.waitFileUploading();
        BulkEditSearchPane.verifyPaneTitleFileName(instanceUUIDsFileName);
        BulkEditSearchPane.verifyPaneRecordsCount('2 instance');
        BulkEditSearchPane.verifyFileNameHeadLine(instanceUUIDsFileName);
      });
    });

    after('delete test data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(user.userId);
      InventoryInstance.deleteInstanceViaApi(marcInstance.uuid);
      InventoryInstance.deleteInstanceViaApi(marcInstanceWithoutTargetFields.uuid);
      FileManager.deleteFile(`cypress/fixtures/${instanceUUIDsFileName}`);
      BulkEditFiles.deleteAllDownloadedFiles(fileNames);
    });

    it(
      'C523659 Find and remove MARC field (532, 932) - extended scenarios (MARC) (firebird)',
      { tags: ['criticalPath', 'firebird', 'C523659'] },
      () => {
        // Step 1: Show Source and Accessibility note columns
        BulkEditActions.openActions();
        BulkEditSearchPane.changeShowColumnCheckboxIfNotYet(
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.SOURCE,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.ACCESSIBILITY_NOTE,
        );
        BulkEditSearchPane.verifyCheckboxesInActionsDropdownMenuChecked(
          true,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.SOURCE,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.ACCESSIBILITY_NOTE,
        );
        BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInResultsAccordion(
          marcInstance.hrid,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.ACCESSIBILITY_NOTE,
          `${accessibilityNote1} | ${accessibilityNote1}`,
        );
        BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInResultsAccordion(
          marcInstanceWithoutTargetFields.hrid,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.ACCESSIBILITY_NOTE,
          '',
        );

        const instances = [marcInstance, marcInstanceWithoutTargetFields];

        instances.forEach((instance) => {
          BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInResultsAccordion(
            instance.hrid,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.SOURCE,
            'MARC',
          );
        });

        // Step 2: Open MARC bulk edit form
        BulkEditActions.openStartBulkEditMarcInstanceForm();
        BulkEditActions.verifyInitialStateBulkEditsFormForMarcInstance();

        // Step 3: 532 1\ $a Find, Remove field
        BulkEditActions.fillInTagAndIndicatorsAndSubfield('532', '1', '\\', 'a');
        BulkEditActions.findAndRemoveFieldActionForMarc(accessibilityNote1);
        BulkEditActions.verifyConfirmButtonDisabled(false);

        // Step 4: 532 1\ $3 Find, Remove field
        BulkEditActions.addNewBulkEditFilterStringForMarcInstance();
        BulkEditActions.fillInTagAndIndicatorsAndSubfield('532', '1', '\\', '3', 1);
        BulkEditActions.findAndRemoveFieldActionForMarc(accessibilityNote2, 1);
        BulkEditActions.verifyConfirmButtonDisabled(false);

        // Step 5: 932 1\ $a Find, Remove field
        BulkEditActions.addNewBulkEditFilterStringForMarcInstance(1);
        BulkEditActions.fillInTagAndIndicatorsAndSubfield('932', '1', '\\', 'a', 2);
        BulkEditActions.findAndRemoveFieldActionForMarc(localNote1, 2);
        BulkEditActions.verifyConfirmButtonDisabled(false);

        // Step 6: 932 1\ $3 Find, Remove field
        BulkEditActions.addNewBulkEditFilterStringForMarcInstance(2);
        BulkEditActions.fillInTagAndIndicatorsAndSubfield('932', '1', '\\', '3', 3);
        BulkEditActions.findAndRemoveFieldActionForMarc(localNote2, 3);
        BulkEditActions.verifyConfirmButtonDisabled(false);

        // Step 7: Confirm changes
        BulkEditActions.confirmChanges();
        BulkEditActions.verifyMessageBannerInAreYouSureForm(2);

        instances.forEach((instance) => {
          BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifier(
            instance.hrid,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.ACCESSIBILITY_NOTE,
            '',
          );
        });

        BulkEditActions.verifyAreYouSureForm(2);
        BulkEditSearchPane.verifyPaginatorInAreYouSureForm(2);

        // Step 8: Download preview in MARC format
        BulkEditActions.verifyDownloadPreviewInMarcFormatButtonEnabled();
        BulkEditActions.downloadPreviewInMarcFormat();

        const currentTimestampUpToMinutes = DateTools.getCurrentISO8601TimestampUpToMinutesUTC();
        const currentTimestampUpToMinutesOneMinuteAfter =
          DateTools.getCurrentISO8601TimestampUpToMinutesUTC(1);
        const assertionsOnMarcFileContent = [
          {
            uuid: marcInstance.uuid,
            assertions: [
              (record) => {
                expect(
                  record.get('005')[0].value.startsWith(currentTimestampUpToMinutes) ||
                    record
                      .get('005')[0]
                      .value.startsWith(currentTimestampUpToMinutesOneMinuteAfter),
                ).to.be.true;
              },
              (record) => expect(record.get('532')).to.be.empty,
              (record) => expect(record.get('932')).to.be.empty,
              (record) => expect(record.get('999')[0].subf[0][0]).to.eq('i'),
              (record) => expect(record.get('999')[0].subf[0][1]).to.eq(marcInstance.uuid),
            ],
          },
        ];
        parseMrcFileContentAndVerify(fileNames.previewRecordsMarc, assertionsOnMarcFileContent, 2);

        // Step 9: Download preview in CSV format
        BulkEditActions.downloadPreview();

        instances.forEach((instance) => {
          BulkEditFiles.verifyValueInRowByUUID(
            fileNames.previewRecordsCSV,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_HRID,
            instance.hrid,
            'Notes',
            '',
          );
        });

        // Step 10: Commit changes
        BulkEditActions.commitChanges();
        BulkEditActions.verifySuccessBanner(1);
        BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInChangesAccordion(
          marcInstance.hrid,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.ACCESSIBILITY_NOTE,
          '',
        );
        BulkEditSearchPane.verifyPaginatorInChangedRecords(1);
        BulkEditSearchPane.verifyErrorLabel(0, 1);

        // Step 11: Check warning message
        BulkEditSearchPane.verifyShowWarningsCheckbox(true, true);
        BulkEditSearchPane.verifyError(
          marcInstanceWithoutTargetFields.uuid,
          warningMessage,
          'Warning',
        );

        // Step 12: Download changed records in MARC format
        BulkEditActions.openActions();
        BulkEditActions.downloadChangedMarc();

        parseMrcFileContentAndVerify(fileNames.changedRecordsMarc, assertionsOnMarcFileContent, 1);

        // Step 13: Download changed records in CSV format
        BulkEditActions.downloadChangedCSV();
        BulkEditFiles.verifyValueInRowByUUID(
          fileNames.changedRecordsCSV,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_HRID,
          marcInstance.hrid,
          'Notes',
          '',
        );

        // Step 14: Download errors (CSV)
        BulkEditActions.downloadErrors();
        ExportFile.verifyFileIncludes(fileNames.errorsFromCommitting, [
          `WARNING,${marcInstanceWithoutTargetFields.uuid},${warningMessage}`,
        ]);

        // Step 15: Verify changes in Inventory app
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
        InventorySearchAndFilter.searchInstanceByTitle(marcInstance.title);
        InventoryInstances.selectInstance();
        InventoryInstance.waitLoading();
        InstanceRecordView.verifyNoteTextAbsentInInstanceAccordion(accessibilityNote1);
        InstanceRecordView.verifyNoteTextAbsentInInstanceAccordion(accessibilityNote2);
        InstanceRecordView.verifyRecentLastUpdatedDateAndTime();

        // Step 16: Verify changes in MARC source
        InstanceRecordView.viewSource();
        InventoryViewSource.notContains('532\t');
        InventoryViewSource.notContains('932\t');

        [accessibilityNote1, accessibilityNote2, localNote1, localNote2].forEach((note) => {
          InventoryViewSource.notContains(note);
        });

        InventoryViewSource.verifyFieldContent(
          3,
          DateTools.getFormattedEndDateWithTimUTC(new Date()),
        );
        InventoryViewSource.close();
        InventorySearchAndFilter.resetAll();

        // Step 17: Verify that the instance without 532/932 fields was NOT edited
        InventorySearchAndFilter.searchInstanceByTitle(marcInstanceWithoutTargetFields.uuid);
        InventoryInstances.selectInstance();
        InventoryInstance.waitLoading();
        InstanceRecordView.viewSource();
        InventoryViewSource.notContains('532\t');
        InventoryViewSource.notContains('932\t');
      },
    );
  });
});
