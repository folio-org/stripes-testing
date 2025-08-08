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

let user;
let marcInstance;
let instanceUUIDsFileName;
let fileNames;
const localNote901 = 'Local note nine hundred one';
const localNote503 = 'Local note five hundred three';

describe(
  'Bulk-edit',
  {
    retries: {
      runMode: 1,
    },
  },
  () => {
    describe('Instances with source MARC', () => {
      beforeEach('create test data', () => {
        marcInstance = {
          title: `AT_C503084_MarcInstance_${getRandomPostfix()}`,
        };
        instanceUUIDsFileName = `instanceUUIdsFileName_${getRandomPostfix()}.csv`;
        fileNames = BulkEditFiles.getAllDownloadedFileNames(instanceUUIDsFileName, true);

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

              FileManager.createFile(
                `cypress/fixtures/${instanceUUIDsFileName}`,
                marcInstance.uuid,
              );
            });
          });

          cy.login(user.username, user.password, {
            path: TopMenu.bulkEditPath,
            waiter: BulkEditSearchPane.waitLoading,
          });
          BulkEditSearchPane.verifyDragNDropRecordTypeIdentifierArea('Instance', 'Instance UUIDs');
          BulkEditSearchPane.uploadFile(instanceUUIDsFileName);
          BulkEditSearchPane.checkForUploading(instanceUUIDsFileName);
          BulkEditSearchPane.waitFileUploading();
          BulkEditSearchPane.verifyPaneTitleFileName(instanceUUIDsFileName);
          BulkEditSearchPane.verifyPaneRecordsCount('1 instance');
          BulkEditSearchPane.verifyFileNameHeadLine(instanceUUIDsFileName);
        });
      });

      afterEach('delete test data', () => {
        cy.getAdminToken();
        Users.deleteViaApi(user.userId);
        InventoryInstance.deleteInstanceViaApi(marcInstance.uuid);
        FileManager.deleteFile(`cypress/fixtures/${instanceUUIDsFileName}`);
        BulkEditFiles.deleteAllDownloadedFiles(fileNames);
      });

      it(
        'C503084 Add MARC field (901, 503) not mapped to Inventory Instance (MARC) (firebird)',
        { tags: ['criticalPath', 'firebird', 'C503084'] },
        () => {
          // Step 1: Check columns for Source and General note
          BulkEditActions.openActions();
          BulkEditSearchPane.changeShowColumnCheckboxIfNotYet(
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.SOURCE,
          );
          BulkEditSearchPane.verifyResultColumnTitlesDoNotInclude(
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.GENERAL_NOTE,
          );
          BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInResultsAccordion(
            marcInstance.hrid,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.SOURCE,
            'MARC',
          );

          // Step 2: Open MARC bulk edit form
          BulkEditActions.openStartBulkEditMarcInstanceForm();
          BulkEditActions.verifyInitialStateBulkEditsFormForMarcInstance();

          // Step 3-4: Fill in field 901 with subfield a and Add action
          BulkEditActions.fillInTagAndIndicatorsAndSubfield('901', '\\', '\\', 'a');
          BulkEditActions.addSubfieldActionForMarc(localNote901);
          BulkEditActions.verifyConfirmButtonDisabled(false);

          // Step 5-6: Add new row for field 503
          BulkEditActions.addNewBulkEditFilterStringForMarcInstance();
          BulkEditActions.verifyConfirmButtonDisabled(true);
          BulkEditActions.fillInTagAndIndicatorsAndSubfield('503', '0', '0', 'b', 1);
          BulkEditActions.addSubfieldActionForMarc(localNote503, 1);
          BulkEditActions.verifyConfirmButtonDisabled(false);

          // Step 7: Confirm changes
          BulkEditActions.confirmChanges();
          BulkEditActions.verifyMessageBannerInAreYouSureForm(1);
          BulkEditSearchPane.verifyAreYouSureColumnTitlesDoNotInclude(
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.GENERAL_NOTE,
          );
          BulkEditSearchPane.verifyCellWithContentAbsentsInAreYouSureForm(
            localNote901,
            localNote503,
          );
          BulkEditActions.verifyAreYouSureForm(1);
          BulkEditSearchPane.verifyPaginatorInAreYouSureForm(1);

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

                (record) => {
                  expect(record.fields[5]).to.deep.eq(['901', '  ', 'a', localNote901]);
                },
                (record) => {
                  expect(record.fields[4]).to.deep.eq(['503', '00', 'b', localNote503]);
                },

                (record) => expect(record.get('999')[0].subf[0][0]).to.eq('i'),
                (record) => expect(record.get('999')[0].subf[0][1]).to.eq(marcInstance.uuid),
              ],
            },
          ];

          parseMrcFileContentAndVerify(
            fileNames.previewRecordsMarc,
            assertionsOnMarcFileContent,
            1,
          );

          // Step 9: Download preview in CSV format
          BulkEditActions.downloadPreview();
          BulkEditFiles.verifyValueInRowByUUID(
            fileNames.previewRecordsCSV,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_HRID,
            marcInstance.hrid,
            'Notes',
            '',
          );

          // Step 10: Commit changes
          BulkEditActions.commitChanges();
          BulkEditActions.verifySuccessBanner(1);
          BulkEditSearchPane.verifyCellWithContentAbsentsInChangesAccordion(
            localNote901,
            localNote503,
          );
          BulkEditSearchPane.verifyPaginatorInChangedRecords(1);

          // Step 11: Download changed records in MARC format
          BulkEditActions.openActions();
          BulkEditActions.downloadChangedMarc();

          parseMrcFileContentAndVerify(
            fileNames.changedRecordsMarc,
            assertionsOnMarcFileContent,
            1,
          );

          // Step 12: Download changed records in CSV format
          BulkEditActions.downloadChangedCSV();
          BulkEditFiles.verifyValueInRowByUUID(
            fileNames.changedRecordsCSV,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_HRID,
            marcInstance.hrid,
            'Notes',
            '',
          );

          // Step 13: Verify changes in Inventory app
          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
          InventorySearchAndFilter.searchInstanceByTitle(marcInstance.title);
          InventoryInstances.selectInstance();
          InventoryInstance.waitLoading();
          InstanceRecordView.verifyRecentLastUpdatedDateAndTime();

          const notes = [localNote901, localNote503];

          notes.forEach((note) => {
            InstanceRecordView.verifyNoteTextAbsentInInstanceAccordion(note);
          });

          // Step 14: Verify changes in MARC source
          InstanceRecordView.viewSource();
          InventoryViewSource.verifyFieldInMARCBibSource('901', `\t901\t   \t$a ${localNote901}`);
          InventoryViewSource.verifyFieldInMARCBibSource('503', `\t503\t0 0\t$b ${localNote503}`);
          InventoryViewSource.verifyFieldContent(
            3,
            DateTools.getFormattedEndDateWithTimUTC(new Date()),
          );
        },
      );
    });
  },
);
