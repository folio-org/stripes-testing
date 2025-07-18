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
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import DateTools from '../../../../support/utils/dateTools';

let user;
let dateAndTimeOfMarcInstanceCreation;
let dateAndTimeOfMarcInstanceCreationIn005Field;
const marcInstance = {
  title: `AT_C543814_MarcInstance_${getRandomPostfix()}`,
};
const folioInstance = {
  title: `AT_C543814_FolioInstance_${getRandomPostfix()}`,
};
const instanceUUIDsFileName = `instanceUUIdsFileName_${getRandomPostfix()}.csv`;
const fileNames = BulkEditFiles.getAllDownloadedFileNames(instanceUUIDsFileName, true);
const field933a = 'Microfilm.';
const replacedNoteText = 'replaced note text';
const errorMessage =
  'Instance with source FOLIO is not supported by MARC records bulk edit and cannot be updated.';
const warningMessage = 'No change in MARC fields required';
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
  { tag: '933', content: `$a ${field933a}`, indicators: ['\\', '\\'] },
];

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
            dateAndTimeOfMarcInstanceCreation = DateTools.getFormattedEndDateWithTimUTC(
              new Date(),
              true,
            );
            dateAndTimeOfMarcInstanceCreationIn005Field =
              DateTools.getCurrentISO8601TimestampUpToMinutesUTC();

            marcInstance.uuid = instanceId;

            cy.getInstanceById(marcInstance.uuid).then((instanceData) => {
              marcInstance.hrid = instanceData.hrid;

              cy.getInstanceTypes({ limit: 1 }).then((instanceTypes) => {
                folioInstance.instanceTypeId = instanceTypes[0].id;
                InventoryInstances.createFolioInstanceViaApi({
                  instance: {
                    instanceTypeId: folioInstance.instanceTypeId,
                    title: folioInstance.title,
                  },
                }).then((instance) => {
                  folioInstance.uuid = instance.instanceId;

                  cy.getInstanceById(instance.instanceId).then((folioInstanceData) => {
                    folioInstance.hrid = folioInstanceData.hrid;

                    FileManager.createFile(
                      `cypress/fixtures/${instanceUUIDsFileName}`,
                      `${marcInstance.uuid}\n${folioInstance.uuid}`,
                    );
                    cy.login(user.username, user.password, {
                      path: TopMenu.bulkEditPath,
                      waiter: BulkEditSearchPane.waitLoading,
                    });
                    BulkEditSearchPane.verifyDragNDropRecordTypeIdentifierArea(
                      'Instance',
                      'Instance UUIDs',
                    );
                    BulkEditSearchPane.uploadFile(instanceUUIDsFileName);
                    BulkEditSearchPane.checkForUploading(instanceUUIDsFileName);
                    BulkEditSearchPane.waitFileUploading();
                    BulkEditSearchPane.verifyPaneTitleFileName(instanceUUIDsFileName);
                    BulkEditSearchPane.verifyPaneRecordsCount('2 instance');
                    BulkEditSearchPane.verifyFileNameHeadLine(instanceUUIDsFileName);

                    // For clear test results, it is necessary to wait for a minute to ensure that bulk edit actions do not affect
                    // the 'Record Last Updated' date and time.
                    cy.wait(60_000);
                  });
                });
              });
            });
          },
        );
      });
    });

    after('delete test data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(user.userId);

      [marcInstance.uuid, folioInstance.uuid].forEach((uuid) => {
        InventoryInstance.deleteInstanceViaApi(uuid);
      });

      FileManager.deleteFile(`cypress/fixtures/${instanceUUIDsFileName}`);
      BulkEditFiles.deleteAllDownloadedFiles(fileNames);
    });

    it(
      'C543814 Replace data in the subfield of MARC field (533, 933, 999) with errors (MARC & FOLIO) (firebird)',
      { tags: ['criticalPath', 'firebird', 'C543814'] },
      () => {
        // Step 1: Show Source column
        BulkEditActions.openActions();
        BulkEditSearchPane.changeShowColumnCheckboxIfNotYet(
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.SOURCE,
        );
        BulkEditSearchPane.verifyCheckboxesInActionsDropdownMenuChecked(
          true,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.SOURCE,
        );
        BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInResultsAccordion(
          marcInstance.hrid,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.SOURCE,
          'MARC',
        );
        BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInResultsAccordion(
          folioInstance.hrid,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.SOURCE,
          'FOLIO',
        );

        // Step 2: Open combined bulk edit form
        BulkEditActions.openStartBulkEditMarcInstanceForm();
        BulkEditActions.verifyInitialStateBulkEditsFormForMarcInstance();

        // Step 3: 533 $a Find, Replace with
        BulkEditActions.fillInTagAndIndicatorsAndSubfield('533', '\\', '\\', 'a');
        BulkEditActions.findAndReplaceWithActionForMarc('Microfilm.', replacedNoteText);
        BulkEditActions.verifyConfirmButtonDisabled(false);

        // Step 4: 933 $a Find, Replace with
        BulkEditActions.addNewBulkEditFilterStringForMarcInstance();
        BulkEditActions.fillInTagAndIndicatorsAndSubfield('933', '\\', '\\', 'a', 1);
        BulkEditActions.findAndReplaceWithActionForMarc('Film', replacedNoteText, 1);
        BulkEditActions.verifyConfirmButtonDisabled(false);

        // Step 5: 999 $f $f $b Find, Replace with
        BulkEditActions.addNewBulkEditFilterStringForMarcInstance(1);
        BulkEditActions.fillInTagAndIndicatorsAndSubfield('999', 'f', 'f', 'b', 2);
        BulkEditActions.findAndReplaceWithActionForMarc('Microfilm.', replacedNoteText, 2);
        BulkEditActions.verifyConfirmButtonDisabled(true);

        // Step 6: Info icon
        BulkEditActions.clickInfoIconNextToSubfieldAndVerifyText(2);

        // Step 7: Replace 999 with 933 and indicators with \
        BulkEditActions.fillInTagAndIndicatorsAndSubfield('933', '\\', '\\', 'b', 2);
        BulkEditActions.verifyConfirmButtonDisabled(false);

        // Step 8: Confirm changes
        BulkEditActions.confirmChanges();
        BulkEditActions.verifyMessageBannerInAreYouSureFormWhenSourceNotSupportedByMarc(1, 1);
        BulkEditSearchPane.verifyPaginatorInAreYouSureForm(1);
        BulkEditActions.verifyAreYouSureForm(1);
        BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifier(
          marcInstance.hrid,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.SOURCE,
          'MARC',
        );

        // Step 9: Download preview in MARC format
        BulkEditActions.verifyDownloadPreviewInMarcFormatButtonEnabled();
        BulkEditActions.downloadPreviewInMarcFormat();

        const assertionsOnMarcFileContent = [
          {
            uuid: marcInstance.uuid,
            assertions: [
              (record) => expect(record.get('933')[0].subf[0][0]).to.eq('a'),
              (record) => expect(record.get('933')[0].subf[0][1]).to.eq(field933a),
              (record) => expect(record.get('933')[0].subf.length).to.eq(1),

              (record) => expect(record.get('533')).to.be.empty,

              (record) => expect(record.get('999')[0].subf[0][0]).to.eq('i'),
              (record) => expect(record.get('999')[0].subf[0][1]).to.eq(marcInstance.uuid),
            ],
          },
        ];
        parseMrcFileContentAndVerify(fileNames.previewRecordsMarc, assertionsOnMarcFileContent, 1);

        // Step 10: Download preview in CSV format
        BulkEditActions.downloadPreview();
        BulkEditFiles.verifyValueInRowByUUID(
          fileNames.previewRecordsCSV,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_HRID,
          marcInstance.hrid,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.SOURCE,
          'MARC',
        );
        BulkEditFiles.verifyCSVFileRowsRecordsNumber(fileNames.previewRecordsCSV, 1);

        // Step 11: Commit changes
        BulkEditActions.commitChanges();
        BulkEditActions.verifySuccessBanner(0);
        BulkEditSearchPane.verifyErrorLabel(1, 1);
        BulkEditSearchPane.verifyShowWarningsCheckbox(false, false);
        BulkEditSearchPane.verifyPaginatorInErrorsAccordion(1);

        // Step 12: Check errors table (errors only)
        BulkEditSearchPane.verifyError(folioInstance.uuid, errorMessage);

        // Step 13: Show warnings
        BulkEditSearchPane.clickShowWarningsCheckbox();
        BulkEditSearchPane.verifyError(folioInstance.uuid, errorMessage);
        BulkEditSearchPane.verifyError(marcInstance.uuid, warningMessage, 'Warning');
        BulkEditSearchPane.verifyPaginatorInErrorsAccordion(2);

        // Step 14: Download errors (CSV)
        BulkEditActions.openActions();
        BulkEditActions.downloadErrors();
        ExportFile.verifyFileIncludes(fileNames.errorsFromCommitting, [
          `ERROR,${folioInstance.uuid},${errorMessage}`,
          `WARNING,${marcInstance.uuid},${warningMessage}`,
        ]);

        // Step 15: Inventory app - verify no changes
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
        InventorySearchAndFilter.searchInstanceByTitle(marcInstance.title);
        InventoryInstances.selectInstance();
        InventoryInstance.waitLoading();
        InstanceRecordView.verifyLastUpdatedDateAndTime(dateAndTimeOfMarcInstanceCreation);
        InstanceRecordView.verifyNoteTextAbsentInInstanceAccordion('Reproduction note');
        InstanceRecordView.verifyNoteTextAbsentInInstanceAccordion(field933a);

        // Step 16: View source - verify MARC record unchanged
        InstanceRecordView.viewSource();
        InventoryViewSource.verifyFieldInMARCBibSource('933', `\t933\t   \t$a ${field933a}`);
        InventoryViewSource.notContains('533\t');
        InventoryViewSource.verifyExistanceOfValueInRow(
          dateAndTimeOfMarcInstanceCreationIn005Field,
          2,
        );
      },
    );
  });
});
