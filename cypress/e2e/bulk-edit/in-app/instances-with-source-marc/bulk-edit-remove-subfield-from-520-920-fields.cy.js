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
let marcInstanceFields;
let marcInstanceWithoutTargetFields;
let fileNames;
let marcInstance;
let instanceUUIDsFileName;
const summaryNote1 =
  'Papers "originally commissioned as course material for a series of continuing legal education seminars"-- Pref., v. 1.';
const summaryNote1OnUI =
  'Papers "originally commissioned as course material for a series of continuing legal education seminars"-- Pref., v. 1';
const summaryNote2 =
  '"Combines the most frequently asked questions regarding AIDS with the most prominent US physician, former Surgeon General C. Everett Koop, resulting in an informative 38-minute production"--Video rating guide for libraries, winter 1990.';
const summaryNote2OnUI =
  '"Combines the most frequently asked questions regarding AIDS with the most prominent US physician, former Surgeon General C. Everett Koop, resulting in an informative 38-minute production"--Video rating guide for libraries, winter 1990';
const summaryUrl = 'http://www.ojp.usdoj.gov/bjs/abstract/cchrie98.htm';
const localNote1 =
  'Letters, primarily to Angelica Schuyler Church (1756-1815), wife of John Barker Church and daughter of Philip John Schuyler, or to members of her family.';
const localNote2 =
  '"Happy Feet" may be too much for many kids younger than 7 and some younger than 8. (Know how well your child separates animated fantasy from reality.)';
const localUrl =
  'http://www.washingtonpost.com/wp-dyn/content/article/2006/11/16/AR2006111600269.html';
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
          title: `AT_C523628_MarcInstance_${getRandomPostfix()}`,
        };
        instanceUUIDsFileName = `instanceUUIdsFileName_${getRandomPostfix()}.csv`;
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
            tag: '520',
            content: `$a ${summaryNote1}`,
            indicators: ['\\', '\\'],
          },
          {
            tag: '520',
            content: `$a ${summaryNote2} $u ${summaryUrl} $u ${summaryUrl}`,
            indicators: ['0', '\\'],
          },
          {
            tag: '920',
            content: `$a ${localNote1}`,
            indicators: ['\\', '\\'],
          },
          {
            tag: '920',
            content: `$a ${localNote2} $u ${localUrl} $u ${localUrl}`,
            indicators: ['0', '\\'],
          },
        ];
        marcInstanceWithoutTargetFields = {
          title: `AT_C523628_MarcInstance_WithoutFields_${getRandomPostfix()}`,
        };
        fileNames = BulkEditFiles.getAllDownloadedFileNames(instanceUUIDsFileName, true);

        cy.clearLocalStorage();
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
        'C523628 Find and remove subfield from MARC field (520, 920) - extended scenarios (MARC) (firebird)',
        { tags: ['criticalPath', 'firebird', 'C523628'] },
        () => {
          // Step 1: Show Source and Summary columns
          BulkEditActions.openActions();
          BulkEditSearchPane.changeShowColumnCheckboxIfNotYet(
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.SOURCE,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.SUMMARY,
          );
          BulkEditSearchPane.verifyCheckboxesInActionsDropdownMenuChecked(
            true,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.SOURCE,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.SUMMARY,
          );
          BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInResultsAccordion(
            marcInstance.hrid,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.SUMMARY,
            `${summaryNote1OnUI} | ${summaryNote2} ${summaryUrl} ${summaryUrl}`,
          );
          BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInResultsAccordion(
            marcInstanceWithoutTargetFields.hrid,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.SUMMARY,
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

          // Step 3: 520 0\ $u Find, Remove subfield
          BulkEditActions.fillInTagAndIndicatorsAndSubfield('520', '0', '\\', 'u');
          BulkEditActions.findAndRemoveSubfieldActionForMarc(summaryUrl);
          BulkEditActions.verifyConfirmButtonDisabled(false);

          // Step 4: 920 0\ $u Find, Remove subfield
          BulkEditActions.addNewBulkEditFilterStringForMarcInstance();
          BulkEditActions.fillInTagAndIndicatorsAndSubfield('920', '0', '\\', 'u', 1);
          BulkEditActions.findAndRemoveSubfieldActionForMarc(localUrl, 1);
          BulkEditActions.verifyConfirmButtonDisabled(false);

          // Step 5: Confirm changes
          BulkEditActions.confirmChanges();
          BulkEditActions.verifyMessageBannerInAreYouSureForm(2);
          BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifier(
            marcInstance.hrid,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.SUMMARY,
            `${summaryNote1} | ${summaryNote2}`,
          );
          BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifier(
            marcInstanceWithoutTargetFields.hrid,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.SUMMARY,
            '',
          );
          BulkEditActions.verifyAreYouSureForm(2);
          BulkEditSearchPane.verifyPaginatorInAreYouSureForm(2);

          // Step 6: Download preview in MARC format
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

                (record) => expect(record.get('520')[0].ind1).to.eq(' '),
                (record) => expect(record.get('520')[0].ind2).to.eq(' '),
                (record) => expect(record.get('520')[0].subf[0][0]).to.eq('a'),
                (record) => expect(record.get('520')[0].subf[0][1]).to.eq(summaryNote1),

                (record) => expect(record.get('520')[1].ind1).to.eq('0'),
                (record) => expect(record.get('520')[1].ind2).to.eq(' '),
                (record) => expect(record.get('520')[1].subf[0][0]).to.eq('a'),
                (record) => expect(record.get('520')[1].subf[0][1]).to.eq(summaryNote2),

                (record) => expect(record.get('920')[0].ind1).to.eq(' '),
                (record) => expect(record.get('920')[0].ind2).to.eq(' '),
                (record) => expect(record.get('920')[0].subf[0][0]).to.eq('a'),
                (record) => expect(record.get('920')[0].subf[0][1]).to.eq(localNote1),

                (record) => expect(record.get('920')[1].ind1).to.eq('0'),
                (record) => expect(record.get('920')[1].ind2).to.eq(' '),
                (record) => expect(record.get('920')[1].subf[0][0]).to.eq('a'),
                (record) => expect(record.get('920')[1].subf[0][1]).to.eq(localNote2),
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

          // Step 7: Download preview in CSV format
          BulkEditActions.downloadPreview();
          BulkEditFiles.verifyValueInRowByUUID(
            fileNames.previewRecordsCSV,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_HRID,
            marcInstance.hrid,
            'Notes',
            `${BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.SUMMARY};${summaryNote1};false | ${BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.SUMMARY};${summaryNote2};false`,
          );
          BulkEditFiles.verifyValueInRowByUUID(
            fileNames.previewRecordsCSV,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_HRID,
            marcInstanceWithoutTargetFields.hrid,
            'Notes',
            '',
          );

          // Step 8: Commit changes
          BulkEditActions.commitChanges();
          BulkEditActions.verifySuccessBanner(1);
          BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInChangesAccordion(
            marcInstance.hrid,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.SUMMARY,
            `${summaryNote1} | ${summaryNote2}`,
          );
          BulkEditSearchPane.verifyPaginatorInChangedRecords(1);
          BulkEditSearchPane.verifyErrorLabel(0, 1);

          // Step 9: Check warning message
          BulkEditSearchPane.verifyShowWarningsCheckbox(true, true);
          BulkEditSearchPane.verifyError(
            marcInstanceWithoutTargetFields.uuid,
            warningMessage,
            'Warning',
          );

          // Step 10: Download changed records in MARC format
          BulkEditActions.openActions();
          BulkEditActions.downloadChangedMarc();

          parseMrcFileContentAndVerify(
            fileNames.changedRecordsMarc,
            assertionsOnMarcFileContent,
            1,
          );

          // Step 11: Download changed records in CSV format
          BulkEditActions.downloadChangedCSV();
          BulkEditFiles.verifyValueInRowByUUID(
            fileNames.changedRecordsCSV,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_HRID,
            marcInstance.hrid,
            'Notes',
            `${BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.SUMMARY};${summaryNote1};false | ${BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.SUMMARY};${summaryNote2};false`,
          );

          // Step 12: Download errors (CSV)
          BulkEditActions.downloadErrors();
          ExportFile.verifyFileIncludes(fileNames.errorsFromCommitting, [
            `WARNING,${marcInstanceWithoutTargetFields.uuid},${warningMessage}`,
          ]);

          // Step 13: Verify changes in Inventory app
          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
          InventorySearchAndFilter.searchInstanceByTitle(marcInstance.title);
          InventoryInstances.selectInstance();
          InventoryInstance.waitLoading();
          InstanceRecordView.checkMultipleItemNotesWithStaffOnly(
            0,
            'No',
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.SUMMARY,
            summaryNote1OnUI,
          );
          InstanceRecordView.checkMultipleItemNotesWithStaffOnly(
            0,
            'No',
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.SUMMARY,
            summaryNote2OnUI,
            1,
          );
          InstanceRecordView.verifyRecentLastUpdatedDateAndTime();

          // Step 14: Verify changes in MARC source
          InstanceRecordView.viewSource();
          InventoryViewSource.verifyFieldInMARCBibSource('520', `\t520\t0  \t$a ${summaryNote2}`);
          InventoryViewSource.verifyFieldInMARCBibSource('520', `\t520\t   \t$a ${summaryNote1}`);
          InventoryViewSource.verifyFieldInMARCBibSource('920', `\t920\t0  \t$a ${localNote2}`);
          InventoryViewSource.verifyFieldInMARCBibSource('920', `\t920\t   \t$a ${localNote1}`);
          InventoryViewSource.verifyAbsenceOfValue(summaryUrl);
          InventoryViewSource.verifyAbsenceOfValue(localUrl);
          InventoryViewSource.verifyFieldContent(
            3,
            DateTools.getFormattedEndDateWithTimUTC(new Date()),
          );
          InventoryViewSource.close();
          InventorySearchAndFilter.resetAll();

          // Step 15: Verify that the instance without 520/920 fields was NOT edited
          InventorySearchAndFilter.searchInstanceByTitle(marcInstanceWithoutTargetFields.uuid);
          InventoryInstances.selectInstance();
          InventoryInstance.waitLoading();
          InstanceRecordView.viewSource();
          InventoryViewSource.notContains('520\t');
          InventoryViewSource.notContains('920\t');
        },
      );
    });
  },
);
