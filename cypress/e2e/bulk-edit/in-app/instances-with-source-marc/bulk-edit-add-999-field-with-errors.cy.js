/* eslint-disable no-unused-expressions */
import permissions from '../../../../support/dictionary/permissions';
import BulkEditActions from '../../../../support/fragments/bulk-edit/bulk-edit-actions';
import BulkEditSearchPane from '../../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import BulkEditFiles from '../../../../support/fragments/bulk-edit/bulk-edit-files';
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
import ExportFile from '../../../../support/fragments/data-export/exportFile';

let user;
const marcInstance = {
  title: `AT_C543783_MarcInstance_${getRandomPostfix()}`,
};
const folioInstance = {
  title: `AT_C543783_FolioInstance_${getRandomPostfix()}`,
};
const instanceUUIDsFileName = `instanceUUIdsFileName_${getRandomPostfix()}.csv`;
const fileNames = BulkEditFiles.getAllDownloadedFileNames(instanceUUIDsFileName, true);
const note999a = 'Local note';
const errorMessage =
  'Instance with source FOLIO is not supported by MARC records bulk edit and cannot be updated.';

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

        cy.createSimpleMarcBibViaAPI(marcInstance.title).then((instanceId) => {
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
                });
              });
            });
          });
        });
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
      'C543783 Add MARC field (999) with errors (MARC & FOLIO) (firebird)',
      { tags: ['criticalPath', 'firebird', 'C543783'] },
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

        // Step 2: Open bulk edit form
        BulkEditActions.openStartBulkEditMarcInstanceForm();
        BulkEditActions.verifyInitialStateBulkEditsFormForMarcInstance();

        // Step 3: 999 f f (protected field)
        BulkEditActions.fillInTagAndIndicatorsAndSubfield('999', 'f', 'f', '');
        BulkEditActions.verifyConfirmButtonDisabled(true);

        // Step 4: Click info icon
        BulkEditActions.clickInfoIconNextToSubfieldAndVerifyText();

        // Step 5-6: 999 \\ \\ $i Add
        BulkEditActions.fillInTagAndIndicatorsAndSubfield('999', 'f', 'f', 'i');
        BulkEditActions.selectActionForMarcInstance('Add');
        BulkEditActions.verifySelectSecondActionRequired(false);
        BulkEditActions.fillInDataTextAreaForMarcInstance('988a7720-003e-55e4-8b06-392856421073');
        BulkEditActions.verifyConfirmButtonDisabled(true);

        // Step 7: Add additional subfield $s
        BulkEditActions.selectSecondActionForMarcInstance('Additional subfield');
        BulkEditActions.fillInSubfieldInSubRow('s');
        BulkEditActions.fillInDataInSubRow('f32d531e-df79-46b3-8932-cdd35f7a2264');
        BulkEditActions.verifyConfirmButtonDisabled(true);

        // Step 8: Add new row
        BulkEditActions.addNewBulkEditFilterStringForMarcInstance();
        BulkEditActions.verifyConfirmButtonDisabled(true);

        // Step 9: 999 $a Add
        BulkEditActions.fillInTagAndIndicatorsAndSubfield('999', '\\', '\\', 'a', 1);
        BulkEditActions.selectActionForMarcInstance('Add', 1);
        BulkEditActions.fillInDataTextAreaForMarcInstance(note999a, 1);
        BulkEditActions.verifyConfirmButtonDisabled(true);

        // Step 10: Remove first and second rows
        BulkEditActions.deleteRowInBulkEditMarcInstancesAccordion();
        BulkEditActions.verifyConfirmButtonDisabled(false);

        // Step 11: Confirm changes
        BulkEditActions.confirmChanges();
        BulkEditActions.verifyMessageBannerInAreYouSureFormWhenSourceNotSupportedByMarc(1, 1);
        BulkEditSearchPane.verifyPaginatorInAreYouSureForm(1);
        BulkEditActions.verifyAreYouSureForm(1);
        BulkEditSearchPane.verifyCellWithContentAbsentsInAreYouSureForm(note999a);

        // Step 12: Download preview in MARC format
        BulkEditActions.verifyDownloadPreviewInMarcFormatButtonEnabled();
        BulkEditActions.downloadPreviewInMarcFormat();

        const currentTimestampUpToMinutes = DateTools.getCurrentISO8601TimestampUpToMinutesUTC();
        const currentTimestampUpToMinutesOneMinuteAfter =
          DateTools.getCurrentISO8601TimestampUpToMinutesUTC(1);
        let assertionsOnMarcFileContent = [
          {
            uuid: note999a,
            assertions: [
              (record) => {
                expect(
                  record.get('005')[0].value.startsWith(currentTimestampUpToMinutes) ||
                    record
                      .get('005')[0]
                      .value.startsWith(currentTimestampUpToMinutesOneMinuteAfter),
                ).to.be.true;
              },
              (record) => expect(record.get('999')[0].ind1).to.eq(' '),
              (record) => expect(record.get('999')[0].ind2).to.eq(' '),
              (record) => expect(record.get('999')[0].subf[0][0]).to.eq('a'),
              (record) => expect(record.get('999')[0].subf[0][1]).to.eq(note999a),

              (record) => expect(record.get('999')[1].subf[0][0]).to.eq('i'),
              (record) => expect(record.get('999')[1].subf[0][1]).to.eq(marcInstance.uuid),
            ],
          },
        ];
        parseMrcFileContentAndVerify(fileNames.previewRecordsMarc, assertionsOnMarcFileContent, 1);

        // Step 13: Download preview in CSV format
        BulkEditActions.downloadPreview();
        BulkEditFiles.verifyValueInRowByUUID(
          fileNames.previewRecordsCSV,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_HRID,
          marcInstance.hrid,
          'Notes',
          '',
        );

        // Step 14: Commit changes
        BulkEditActions.commitChanges();
        BulkEditActions.verifySuccessBanner(1);
        BulkEditSearchPane.verifyPaginatorInChangedRecords(1);
        BulkEditSearchPane.verifyCellWithContentAbsentsInChangesAccordion(note999a);
        BulkEditSearchPane.verifyError(folioInstance.uuid, errorMessage);

        // Step 15: Check errors table
        BulkEditSearchPane.verifyErrorLabel(1);
        BulkEditSearchPane.verifyShowWarningsCheckbox(true, false);
        BulkEditSearchPane.verifyPaginatorInErrorsAccordion(1);
        BulkEditSearchPane.verifyError(folioInstance.uuid, errorMessage);

        // Step 16: Download changed records (MARC)
        BulkEditActions.openActions();
        BulkEditActions.downloadChangedMarc();

        assertionsOnMarcFileContent = [
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
              (record) => expect(record.get('999')[1].ind1).to.eq(' '),
              (record) => expect(record.get('999')[1].ind2).to.eq(' '),
              (record) => expect(record.get('999')[1].subf[0][0]).to.eq('a'),
              (record) => expect(record.get('999')[1].subf[0][1]).to.eq(note999a),

              (record) => expect(record.get('999')[0].subf[0][0]).to.eq('i'),
              (record) => expect(record.get('999')[0].subf[0][1]).to.eq(marcInstance.uuid),
            ],
          },
        ];

        parseMrcFileContentAndVerify(fileNames.changedRecordsMarc, assertionsOnMarcFileContent, 1);

        // Step 17: Download changed records (CSV)
        BulkEditActions.downloadChangedCSV();
        BulkEditFiles.verifyValueInRowByUUID(
          fileNames.changedRecordsCSV,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_HRID,
          marcInstance.hrid,
          'Notes',
          '',
        );

        // Step 18: Download errors (CSV)
        BulkEditActions.downloadErrors();
        ExportFile.verifyFileIncludes(fileNames.errorsFromCommitting, [
          `ERROR,${folioInstance.uuid},${errorMessage}`,
        ]);

        // Step 19: Inventory app - verify changes
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
        InventorySearchAndFilter.searchInstanceByTitle(marcInstance.title);
        InventoryInstances.selectInstance();
        InventoryInstance.waitLoading();
        InstanceRecordView.verifyRecentLastUpdatedDateAndTime();
        InstanceRecordView.verifyNoteTextAbsentInInstanceAccordion(note999a);

        // Step 20: View source - verify MARC record
        InstanceRecordView.viewSource();
        InventoryViewSource.verifyFieldInMARCBibSource('999', `\t999\t   \t$a ${note999a}`);
        InventoryViewSource.verifyFieldContent(
          3,
          DateTools.getFormattedEndDateWithTimUTC(new Date()),
        );
        InventoryViewSource.close();
        InventorySearchAndFilter.resetAll();
        InventorySearchAndFilter.searchInstanceByTitle(folioInstance.title);
        InventoryInstances.selectInstance();
        InventoryInstance.waitLoading();
        InstanceRecordView.verifyNoteTextAbsentInInstanceAccordion(note999a);
      },
    );
  });
});
