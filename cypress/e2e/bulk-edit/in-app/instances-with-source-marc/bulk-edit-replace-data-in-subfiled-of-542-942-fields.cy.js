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
let marcInstance;
let marcInstanceFields;
let marcInstanceWithoutTargetFields;
let instanceUUIDsFileName;
let fileNames;
const copyrightNote542a = 'Martin, Henri Jean';
const copyrightNote542n = 'Copyright not renewed';
const copyrightNote542r = 'US';
const localNote942a = 'Goldie, James';
const localNote942n = 'Copyright not renewed';
const localNote942r = 'US';
const newCopyrightNoteN = 'Copyright renewed 2024';
const warningMessage = 'No change in MARC fields required';

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
          title: `AT_C543744_MarcInstance_${getRandomPostfix()}`,
        };
        marcInstanceFields = [
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
            tag: '542',
            content: `$a ${copyrightNote542a} $n ${copyrightNote542n} $n ${copyrightNote542n} $r ${copyrightNote542r}`,
            indicators: ['0', '\\'],
          },
          {
            tag: '942',
            content: `$a ${localNote942a} $n ${localNote942n} $n ${localNote942n} $r ${localNote942r}`,
            indicators: ['0', '\\'],
          },
        ];
        marcInstanceWithoutTargetFields = {
          title: `AT_C543744_MarcInstance_WithoutFields_${getRandomPostfix()}`,
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
          cy.createMarcBibliographicViaAPI(
            QuickMarcEditor.defaultValidLdr,
            marcInstanceFields,
          ).then((instanceId) => {
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
          BulkEditSearchPane.verifyPaneRecordsCount('2 instance');
          BulkEditSearchPane.verifyFileNameHeadLine(instanceUUIDsFileName);
        });
      });

      afterEach('delete test data', () => {
        cy.getAdminToken();
        Users.deleteViaApi(user.userId);
        InventoryInstance.deleteInstanceViaApi(marcInstance.uuid);
        InventoryInstance.deleteInstanceViaApi(marcInstanceWithoutTargetFields.uuid);
        FileManager.deleteFile(`cypress/fixtures/${instanceUUIDsFileName}`);
        BulkEditFiles.deleteAllDownloadedFiles(fileNames);
      });

      it(
        'C543744 Replace data in the subfield of MARC field (542, 942) - extended scenarios (MARC) (firebird)',
        { tags: ['criticalPath', 'firebird', 'C543744'] },
        () => {
          // Step 1: Show Source and Information related to Copyright Status columns
          BulkEditActions.openActions();
          BulkEditSearchPane.changeShowColumnCheckboxIfNotYet(
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.SOURCE,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INFORMATION_RELATED_COPYRIGHT_STATUS,
          );
          BulkEditSearchPane.verifyCheckboxesInActionsDropdownMenuChecked(
            true,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.SOURCE,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INFORMATION_RELATED_COPYRIGHT_STATUS,
          );
          BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInResultsAccordion(
            marcInstance.hrid,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INFORMATION_RELATED_COPYRIGHT_STATUS,
            `${copyrightNote542a} ${copyrightNote542n} ${copyrightNote542n} ${copyrightNote542r} (staff only)`,
          );
          BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInResultsAccordion(
            marcInstanceWithoutTargetFields.hrid,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INFORMATION_RELATED_COPYRIGHT_STATUS,
            '',
          );

          [marcInstance, marcInstanceWithoutTargetFields].forEach((instance) => {
            BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInResultsAccordion(
              instance.hrid,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.SOURCE,
              'MARC',
            );
          });

          // Step 2: Open MARC bulk edit form
          BulkEditActions.openStartBulkEditMarcInstanceForm();
          BulkEditActions.verifyInitialStateBulkEditsFormForMarcInstance();

          // Step 3-6: 542 0\ $n Find, Replace with
          BulkEditActions.fillInTagAndIndicatorsAndSubfield('542', '0', '\\', 'n');
          BulkEditActions.findAndReplaceWithActionForMarc(copyrightNote542n, newCopyrightNoteN);
          BulkEditActions.verifyConfirmButtonDisabled(false);

          // Step 7-8: 942 0\ $n Find, Replace with
          BulkEditActions.addNewBulkEditFilterStringForMarcInstance();
          BulkEditActions.fillInTagAndIndicatorsAndSubfield('942', '0', '\\', 'n', 1);
          BulkEditActions.findAndReplaceWithActionForMarc(localNote942n, newCopyrightNoteN, 1);
          BulkEditActions.verifyConfirmButtonDisabled(false);

          // Step 9: Confirm changes
          BulkEditActions.confirmChanges();
          BulkEditActions.verifyMessageBannerInAreYouSureForm(2);
          BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifier(
            marcInstance.hrid,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INFORMATION_RELATED_COPYRIGHT_STATUS,
            `${copyrightNote542a} ${newCopyrightNoteN} ${newCopyrightNoteN} ${copyrightNote542r} (staff only)`,
          );
          BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifier(
            marcInstanceWithoutTargetFields.hrid,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INFORMATION_RELATED_COPYRIGHT_STATUS,
            '',
          );
          BulkEditActions.verifyAreYouSureForm(2);
          BulkEditSearchPane.verifyPaginatorInAreYouSureForm(2);

          // Step 10: Download preview in MARC format
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
                  expect(record.get('542')[0].ind1).to.eq('0');
                  expect(record.get('542')[0].ind2).to.eq(' ');
                  expect(record.get('542')[0].subf[0][0]).to.eq('a');
                  expect(record.get('542')[0].subf[0][1]).to.eq(copyrightNote542a);
                  expect(record.get('542')[0].subf[1][0]).to.eq('n');
                  expect(record.get('542')[0].subf[1][1]).to.eq(newCopyrightNoteN);
                  expect(record.get('542')[0].subf[2][0]).to.eq('n');
                  expect(record.get('542')[0].subf[2][1]).to.eq(newCopyrightNoteN);
                  expect(record.get('542')[0].subf[3][0]).to.eq('r');
                  expect(record.get('542')[0].subf[3][1]).to.eq(copyrightNote542r);
                },
                (record) => {
                  expect(record.get('942')[0].ind1).to.eq('0');
                  expect(record.get('942')[0].ind2).to.eq(' ');
                  expect(record.get('942')[0].subf[0][0]).to.eq('a');
                  expect(record.get('942')[0].subf[0][1]).to.eq(localNote942a);
                  expect(record.get('942')[0].subf[1][0]).to.eq('n');
                  expect(record.get('942')[0].subf[1][1]).to.eq(newCopyrightNoteN);
                  expect(record.get('942')[0].subf[2][0]).to.eq('n');
                  expect(record.get('942')[0].subf[2][1]).to.eq(newCopyrightNoteN);
                  expect(record.get('942')[0].subf[3][0]).to.eq('r');
                  expect(record.get('942')[0].subf[3][1]).to.eq(localNote942r);
                },
                (record) => expect(record.get('999')[0].subf[0][0]).to.eq('i'),
                (record) => expect(record.get('999')[0].subf[0][1]).to.eq(marcInstance.uuid),
              ],
            },
          ];

          parseMrcFileContentAndVerify(
            fileNames.previewRecordsMarc,
            assertionsOnMarcFileContent,
            2,
          );

          // Step 11: Download preview in CSV format
          BulkEditActions.downloadPreview();
          BulkEditFiles.verifyValueInRowByUUID(
            fileNames.previewRecordsCSV,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_HRID,
            marcInstance.hrid,
            'Notes',
            `${BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INFORMATION_RELATED_COPYRIGHT_STATUS};${copyrightNote542a} ${newCopyrightNoteN} ${newCopyrightNoteN} ${copyrightNote542r};true`,
          );
          BulkEditFiles.verifyValueInRowByUUID(
            fileNames.previewRecordsCSV,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_HRID,
            marcInstanceWithoutTargetFields.hrid,
            'Notes',
            '',
          );

          // Step 12: Commit changes
          BulkEditActions.commitChanges();
          BulkEditActions.verifySuccessBanner(1);
          BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInChangesAccordion(
            marcInstance.hrid,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INFORMATION_RELATED_COPYRIGHT_STATUS,
            `${copyrightNote542a} ${newCopyrightNoteN} ${newCopyrightNoteN} ${copyrightNote542r} (staff only)`,
          );
          BulkEditSearchPane.verifyPaginatorInChangedRecords(1);
          BulkEditSearchPane.verifyErrorLabel(0, 1);

          // Step 13: Check warning message
          BulkEditSearchPane.verifyShowWarningsCheckbox(true, true);
          BulkEditSearchPane.verifyError(
            marcInstanceWithoutTargetFields.uuid,
            warningMessage,
            'Warning',
          );

          // Step 14: Download changed records in MARC format
          BulkEditActions.openActions();
          BulkEditActions.downloadChangedMarc();

          parseMrcFileContentAndVerify(
            fileNames.changedRecordsMarc,
            assertionsOnMarcFileContent,
            1,
          );

          // Step 15: Download changed records in CSV format
          BulkEditActions.downloadChangedCSV();
          BulkEditFiles.verifyValueInRowByUUID(
            fileNames.changedRecordsCSV,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_HRID,
            marcInstance.hrid,
            'Notes',
            `${BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INFORMATION_RELATED_COPYRIGHT_STATUS};${copyrightNote542a} ${newCopyrightNoteN} ${newCopyrightNoteN} ${copyrightNote542r};true`,
          );

          // Step 16: Download errors (CSV)
          BulkEditActions.downloadErrors();
          ExportFile.verifyFileIncludes(fileNames.errorsFromCommitting, [
            `WARNING,${marcInstanceWithoutTargetFields.uuid},${warningMessage}`,
          ]);

          // Step 17: Verify changes in Inventory app
          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
          InventorySearchAndFilter.searchInstanceByTitle(marcInstance.title);
          InventoryInstances.selectInstance();
          InventoryInstance.waitLoading();
          InstanceRecordView.checkMultipleItemNotesWithStaffOnly(
            0,
            'Yes',
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INFORMATION_RELATED_COPYRIGHT_STATUS,
            `${copyrightNote542a} ${newCopyrightNoteN} ${newCopyrightNoteN} ${copyrightNote542r}`,
          );
          InstanceRecordView.verifyRecentLastUpdatedDateAndTime();

          // Step 18: Verify changes in MARC source
          InstanceRecordView.viewSource();
          InventoryViewSource.verifyFieldInMARCBibSource(
            '542',
            `\t542\t0  \t$a ${copyrightNote542a} $n ${newCopyrightNoteN} $n ${newCopyrightNoteN} $r ${copyrightNote542r}`,
          );
          InventoryViewSource.verifyFieldInMARCBibSource(
            '942',
            `\t942\t0  \t$a ${localNote942a} $n ${newCopyrightNoteN} $n ${newCopyrightNoteN} $r ${localNote942r}`,
          );
          InventoryViewSource.verifyFieldContent(
            3,
            DateTools.getFormattedEndDateWithTimUTC(new Date()),
          );
          InventoryViewSource.close();
          InventorySearchAndFilter.resetAll();

          // Step 19: Verify that the instance without 542/942 fields was NOT edited
          InventorySearchAndFilter.searchInstanceByTitle(marcInstanceWithoutTargetFields.uuid);
          InventoryInstances.selectInstance();
          InventoryInstance.waitLoading();
          InstanceRecordView.viewSource();
          InventoryViewSource.notContains('542\t');
          InventoryViewSource.notContains('942\t');
        },
      );
    });
  },
);
