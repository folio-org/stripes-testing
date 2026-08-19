/* eslint-disable no-unused-expressions */
import permissions from '../../../../support/dictionary/permissions';
import BulkEditActions from '../../../../support/fragments/bulk-edit/bulk-edit-actions';
import BulkEditSearchPane, {
  ERROR_MESSAGES,
} from '../../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import BulkEditFiles from '../../../../support/fragments/bulk-edit/bulk-edit-files';
import ExportFile from '../../../../support/fragments/data-export/exportFile';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../../support/fragments/inventory/inventorySearchAndFilter';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InstanceRecordView from '../../../../support/fragments/inventory/instanceRecordView';
import InventoryViewSource from '../../../../support/fragments/inventory/inventoryViewSource';
import TopMenu from '../../../../support/fragments/topMenu';
import TopMenuNavigation from '../../../../support/fragments/topMenuNavigation';
import Users from '../../../../support/fragments/users/users';
import FileManager from '../../../../support/utils/fileManager';
import getRandomPostfix from '../../../../support/utils/stringTools';
import parseMrcFileContentAndVerify, {
  verifyMarcFieldsWithIdenticalTagsAndSubfieldValues,
} from '../../../../support/utils/parseMrcFileContent';
import DateTools from '../../../../support/utils/dateTools';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import {
  APPLICATION_NAMES,
  BULK_EDIT_TABLE_COLUMN_HEADERS,
  BULK_EDIT_ACTIONS,
} from '../../../../support/constants';

const note5610A = 'From the collection of L. McGarry, 1948-1957.';
const note5610Subfield3 = 'Family correspondence';
const note5610A2 =
  "Originally collected by Henry Fitzhugh, willed to his wife Sarah Jackson Fitzhugh and given by her to her grandson Jonathan Irving Jackson, who collected some further information about his grandmother and the papers of their relatives and Cellarsville neighbors, the Arnold Fitzhugh's, before donating the materials along with his own papers as mayor of Cellarsville to the Historical Society.";
const note5611A = 'Collated: 1845-1847.';
const note561BlankA = 'On permanent loan from the collection of Paul Mellon.';
const note9610A =
  "Originally collected by Paul Jones and maintained by his nephew, John Smith after Jones' death.";
const note9610Subfield3 = 'Journal';
const note9610A2 =
  'The journal was discovered in a cellar in Nantes in 1837 and was removed to the Abbey of St. Pierre, where it remained until 1887, when it was given to Gehan Tourel.';
const note9611A = 'Collated: 1845-1847.';
const note961BlankA =
  'A. Brolemann (with his bookplate), Mme. Etienne Mallet (see item 2 in the Society catalog of the Mallet sale, May 4-5, 1926), William Permain, W.R. Hearst.';
const warningMessage = ERROR_MESSAGES.NO_CHANGE_IN_MARC_FIELDS_REQUIRED;
// The Ownership and Custodial History note preview strips a single trailing period from each field's text
const stripTrailingPeriod = (text) => text.replace(/\.$/, '');
let user;
let marcInstanceWith561And961Fields;
let marcInstanceWithout561And961Fields;
let marcInstanceWithFieldsData;
let marcInstanceWithoutFieldsData;
let instanceUUIDsFileName;
let fileNames;

describe(
  'Bulk-edit',
  {
    retries: {
      runMode: 1,
    },
  },
  () => {
    describe('Instances with source MARC', () => {
      beforeEach('create test data (fresh per retry)', () => {
        cy.clearLocalStorage();
        marcInstanceWith561And961Fields = {
          title: `AT_C1373185_MarcInstanceWithFields_${getRandomPostfix()}`,
        };
        marcInstanceWithout561And961Fields = {
          title: `AT_C1373185_MarcInstanceWithoutFields_${getRandomPostfix()}`,
        };

        marcInstanceWithFieldsData = [
          { tag: '008', content: QuickMarcEditor.defaultValid008Values },
          {
            tag: '245',
            content: `$a ${marcInstanceWith561And961Fields.title}`,
            indicators: ['1', '0'],
          },
          { tag: '561', content: `$a ${note5610A}`, indicators: ['0', '\\'] },
          {
            tag: '561',
            content: `$3 ${note5610Subfield3} $a ${note5610A2}`,
            indicators: ['0', '\\'],
          },
          { tag: '561', content: `$a ${note5611A}`, indicators: ['1', '\\'] },
          { tag: '561', content: `$a ${note561BlankA}`, indicators: ['\\', '\\'] },
          { tag: '961', content: `$a ${note9610A}`, indicators: ['0', '\\'] },
          {
            tag: '961',
            content: `$3 ${note9610Subfield3} $a ${note9610A2}`,
            indicators: ['0', '\\'],
          },
          { tag: '961', content: `$a ${note9611A}`, indicators: ['1', '\\'] },
          { tag: '961', content: `$a ${note961BlankA}`, indicators: ['\\', '\\'] },
        ];
        marcInstanceWithoutFieldsData = [
          { tag: '008', content: QuickMarcEditor.defaultValid008Values },
          {
            tag: '245',
            content: `$a ${marcInstanceWithout561And961Fields.title}`,
            indicators: ['1', '0'],
          },
        ];

        instanceUUIDsFileName = `instanceUUIdsFileName_${getRandomPostfix()}.csv`;
        fileNames = BulkEditFiles.getAllDownloadedFileNames(instanceUUIDsFileName, true);

        cy.createTempUser([
          permissions.bulkEditEdit.gui,
          permissions.uiInventoryViewCreateEditInstances.gui,
          permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
        ]).then((userProperties) => {
          user = userProperties;

          // Create MARC instance WITH 561 and 961 fields
          cy.createMarcBibliographicViaAPI(
            QuickMarcEditor.defaultValidLdr,
            marcInstanceWithFieldsData,
          ).then((instanceId) => {
            marcInstanceWith561And961Fields.uuid = instanceId;
            cy.getInstanceById(instanceId).then((instanceData) => {
              marcInstanceWith561And961Fields.hrid = instanceData.hrid;
            });
          });

          // Create MARC instance WITHOUT 561 and 961 fields
          cy.createMarcBibliographicViaAPI(
            QuickMarcEditor.defaultValidLdr,
            marcInstanceWithoutFieldsData,
          ).then((instanceId) => {
            marcInstanceWithout561And961Fields.uuid = instanceId;
            cy.getInstanceById(instanceId).then((instanceData) => {
              marcInstanceWithout561And961Fields.hrid = instanceData.hrid;
            });

            const instanceUUIDs = [
              marcInstanceWith561And961Fields.uuid,
              marcInstanceWithout561And961Fields.uuid,
            ];
            FileManager.createFile(
              `cypress/fixtures/${instanceUUIDsFileName}`,
              instanceUUIDs.join('\n'),
            );
          });

          cy.login(user.username, user.password, {
            path: TopMenu.bulkEditPath,
            waiter: BulkEditSearchPane.waitLoading,
          });
          BulkEditSearchPane.verifyDragNDropRecordTypeIdentifierArea('Instances', 'Instance UUIDs');
          BulkEditSearchPane.uploadFile(instanceUUIDsFileName);
          BulkEditSearchPane.waitFileUploading();
          BulkEditSearchPane.verifyPaneRecordsCount('2 instance');
        });
      });

      afterEach('delete test data (fresh cleanup per retry)', () => {
        cy.getAdminToken();
        Users.deleteViaApi(user.userId);
        InventoryInstance.deleteInstanceViaApi(marcInstanceWith561And961Fields.uuid);
        InventoryInstance.deleteInstanceViaApi(marcInstanceWithout561And961Fields.uuid);
        FileManager.deleteFile(`cypress/fixtures/${instanceUUIDsFileName}`);
        BulkEditFiles.deleteAllDownloadedFiles(fileNames);
      });

      it(
        'C1373185 Remove MARC field (561, 961) - extended scenarios (MARC) (athena)',
        { tags: ['criticalPath', 'athena', 'C1373185'] },
        () => {
          // Step 1: Check columns for Source and Ownership and Custodial History note
          BulkEditActions.openActions();
          BulkEditSearchPane.changeShowColumnCheckboxIfNotYet(
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.SOURCE,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.OWNERSHIP_CUSTODIAL_HISTORY_NOTE,
          );
          BulkEditSearchPane.verifyCheckboxesInActionsDropdownMenuChecked(
            true,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.SOURCE,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.OWNERSHIP_CUSTODIAL_HISTORY_NOTE,
          );

          const expectedNoteWithFields = `${stripTrailingPeriod(note5610A)} (staff only) | ${note5610Subfield3} ${stripTrailingPeriod(note5610A2)} (staff only) | ${stripTrailingPeriod(note5611A)} | ${stripTrailingPeriod(note561BlankA)}`;

          BulkEditSearchPane.verifyExactChangesInMultipleColumnsByIdentifierInResultsAccordion(
            marcInstanceWith561And961Fields.hrid,
            [
              { header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.SOURCE, value: 'MARC' },
              {
                header:
                  BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES
                    .OWNERSHIP_CUSTODIAL_HISTORY_NOTE,
                value: expectedNoteWithFields,
              },
            ],
          );
          BulkEditSearchPane.verifyExactChangesInMultipleColumnsByIdentifierInResultsAccordion(
            marcInstanceWithout561And961Fields.hrid,
            [
              { header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.SOURCE, value: 'MARC' },
              {
                header:
                  BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES
                    .OWNERSHIP_CUSTODIAL_HISTORY_NOTE,
                value: '',
              },
            ],
          );

          // Step 2: Open Instances with source MARC bulk edit form
          BulkEditActions.openStartBulkEditMarcInstanceForm();
          BulkEditActions.verifyInitialStateBulkEditsFormForMarcInstance();
          BulkEditActions.verifyInitialStateBulkEditMarcFieldsForm(
            instanceUUIDsFileName,
            '2 instance',
          );

          // Step 3: Fill in field 561 0\ and select "Remove field" action without a subfield
          BulkEditActions.fillInTagAndIndicatorsAndSubfield('561', '0', '\\', '');
          BulkEditActions.selectActionForMarcInstance(BULK_EDIT_ACTIONS.REMOVE_FIELD);
          BulkEditActions.verifySubfieldDisabled();
          BulkEditActions.verifyConfirmButtonDisabled(false);

          // Step 4: Add second row
          BulkEditActions.addNewBulkEditFilterStringForMarcInstance();
          BulkEditActions.verifyConfirmButtonDisabled(true);

          // Step 5: Fill in field 561 0\ $a, Find "collect", select "Remove field" as second action
          BulkEditActions.fillInTagAndIndicatorsAndSubfield('561', '0', '\\', 'a', 1);
          BulkEditActions.findAndRemoveFieldActionForMarc('collect', 1);
          BulkEditActions.verifySubfieldRequired(1);
          BulkEditActions.verifyConfirmButtonDisabled(false);

          // Step 6: Add third row for 561 1\
          BulkEditActions.addNewBulkEditFilterStringForMarcInstance(1);
          BulkEditActions.fillInTagAndIndicatorsAndSubfield('561', '1', '\\', '', 2);
          BulkEditActions.selectActionForMarcInstance(BULK_EDIT_ACTIONS.REMOVE_FIELD, 2);
          BulkEditActions.verifySubfieldDisabled(2);
          BulkEditActions.verifyConfirmButtonDisabled(false);

          // Step 7: Add fourth row for 961 0\
          BulkEditActions.addNewBulkEditFilterStringForMarcInstance(2);
          BulkEditActions.fillInTagAndIndicatorsAndSubfield('961', '0', '\\', '', 3);
          BulkEditActions.selectActionForMarcInstance(BULK_EDIT_ACTIONS.REMOVE_FIELD, 3);
          BulkEditActions.verifySubfieldDisabled(3);
          BulkEditActions.verifyConfirmButtonDisabled(false);

          // Step 8: Add fifth row for 961 1\
          BulkEditActions.addNewBulkEditFilterStringForMarcInstance(3);
          BulkEditActions.fillInTagAndIndicatorsAndSubfield('961', '1', '\\', '', 4);
          BulkEditActions.selectActionForMarcInstance(BULK_EDIT_ACTIONS.REMOVE_FIELD, 4);
          BulkEditActions.verifySubfieldDisabled(4);
          BulkEditActions.verifyConfirmButtonDisabled(false);

          // Step 9: Confirm changes
          BulkEditActions.confirmChanges();
          BulkEditActions.verifyMessageBannerInAreYouSureForm(2);

          // Unlike the initial matched-results preview, the areYouSure/changes accordions and CSV
          // show a single remaining note verbatim (no trailing-period trim, no join formatting)
          const expectedNoteAfterRemoval = note561BlankA;

          BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifier(
            marcInstanceWith561And961Fields.hrid,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.OWNERSHIP_CUSTODIAL_HISTORY_NOTE,
            expectedNoteAfterRemoval,
          );
          BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifier(
            marcInstanceWithout561And961Fields.hrid,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.OWNERSHIP_CUSTODIAL_HISTORY_NOTE,
            '',
          );
          BulkEditActions.verifyAreYouSureForm(2);
          BulkEditSearchPane.verifyPaginatorInAreYouSureForm(2);
          BulkEditActions.verifyDownloadPreviewInMarcFormatButtonEnabled();

          // Step 10: Download preview in MARC format
          BulkEditActions.downloadPreviewInMarcFormat();

          const currentTimestampUpToMinutes = DateTools.getCurrentISO8601TimestampUpToMinutesUTC();
          const currentTimestampUpToMinutesOneMinuteAfter =
            DateTools.getCurrentISO8601TimestampUpToMinutesUTC(1);
          const assertionsOnMarcFileContent = [
            {
              uuid: marcInstanceWith561And961Fields.uuid,
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
                  verifyMarcFieldsWithIdenticalTagsAndSubfieldValues(record, '561', {
                    ind1: ' ',
                    ind2: ' ',
                    expectedCount: 1,
                    subfields: [['a', note561BlankA]],
                  });
                },
                (record) => {
                  verifyMarcFieldsWithIdenticalTagsAndSubfieldValues(record, '961', {
                    ind1: ' ',
                    ind2: ' ',
                    expectedCount: 1,
                    subfields: [['a', note961BlankA]],
                  });
                },
                (record) => expect(record.get('999')[0].subf[0][0]).to.eq('i'),
                (record) => expect(record.get('999')[0].subf[0][1]).to.eq(
                  marcInstanceWith561And961Fields.uuid,
                ),
              ],
            },
            {
              uuid: marcInstanceWithout561And961Fields.uuid,
              assertions: [
                (record) => expect(record.get('561')).to.be.empty,
                (record) => expect(record.get('961')).to.be.empty,
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
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_UUID,
            marcInstanceWith561And961Fields.uuid,
            'Notes',
            `Ownership and Custodial History note;${note561BlankA};false`,
          );
          BulkEditFiles.verifyValueInRowByUUID(
            fileNames.previewRecordsCSV,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_UUID,
            marcInstanceWithout561And961Fields.uuid,
            'Notes',
            '',
          );
          BulkEditFiles.verifyCSVFileRowsRecordsNumber(fileNames.previewRecordsCSV, 2);

          // Step 12: Commit changes
          BulkEditActions.commitChanges();
          BulkEditActions.verifySuccessBanner(1);
          BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInChangesAccordion(
            marcInstanceWith561And961Fields.hrid,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.OWNERSHIP_CUSTODIAL_HISTORY_NOTE,
            expectedNoteAfterRemoval,
          );
          BulkEditSearchPane.verifyPaginatorInChangedRecords(1);
          BulkEditSearchPane.verifyErrorLabel(0, 1);

          // Step 13: Check warning message
          BulkEditSearchPane.verifyShowWarningsCheckbox(true, true);
          BulkEditSearchPane.verifyError(
            marcInstanceWithout561And961Fields.uuid,
            warningMessage,
            'Warning',
          );

          // Step 14: Download changed records in MARC format
          BulkEditActions.openActions();
          BulkEditActions.downloadChangedMarc();

          const assertionsOnMarcFileContentInChangedRecordsFile = assertionsOnMarcFileContent.slice(
            0,
            1,
          );

          parseMrcFileContentAndVerify(
            fileNames.changedRecordsMarc,
            assertionsOnMarcFileContentInChangedRecordsFile,
            1,
          );

          // Step 15: Download changed records in CSV format
          BulkEditActions.downloadChangedCSV();
          BulkEditFiles.verifyCSVFileRowsRecordsNumber(fileNames.changedRecordsCSV, 1);

          // Step 16: Download errors (CSV)
          BulkEditActions.downloadErrors();
          ExportFile.verifyFileIncludes(fileNames.errorsFromCommitting, [
            `WARNING,${marcInstanceWithout561And961Fields.uuid},${warningMessage}`,
          ]);

          // Step 17: Verify changes in Inventory app
          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
          InventorySearchAndFilter.waitLoading();
          InventorySearchAndFilter.searchInstanceByTitle(marcInstanceWith561And961Fields.title);
          InventoryInstances.selectInstance();
          InventoryInstance.waitLoading();

          InstanceRecordView.checkMultipleItemNotesWithStaffOnly(
            0,
            'No',
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.OWNERSHIP_CUSTODIAL_HISTORY_NOTE,
            stripTrailingPeriod(note561BlankA),
          );
          InstanceRecordView.verifyNoteTextAbsentInInstanceAccordion(note5610A);
          InstanceRecordView.verifyNoteTextAbsentInInstanceAccordion(note5610Subfield3);
          InstanceRecordView.verifyNoteTextAbsentInInstanceAccordion(note5610A2);
          InstanceRecordView.verifyNoteTextAbsentInInstanceAccordion(note5611A);
          InstanceRecordView.verifyRecentLastUpdatedDateAndTime();

          // Step 18: View source and verify MARC fields
          InstanceRecordView.viewSource();
          InventoryViewSource.verifyFieldInMARCBibSource('561', `\t561\t   \t$a ${note561BlankA}`);
          InventoryViewSource.verifyFieldInMARCBibSource('961', `\t961\t   \t$a ${note961BlankA}`);

          InventoryViewSource.notContains(note5610A);
          InventoryViewSource.notContains(note5610Subfield3);
          InventoryViewSource.notContains(note5610A2);
          InventoryViewSource.notContains(note5611A);
          InventoryViewSource.notContains(note9610A);
          InventoryViewSource.notContains(note9610Subfield3);
          InventoryViewSource.notContains(note9610A2);
          InventoryViewSource.notContains(note9611A);

          InventoryViewSource.verifyFieldContent(
            3,
            DateTools.getFormattedEndDateWithTimUTC(new Date()),
          );
          InventoryViewSource.close();

          // Step 19: Verify that the instance without 561/961 fields was NOT edited
          InventorySearchAndFilter.resetAll();
          InventorySearchAndFilter.searchInstanceByTitle(marcInstanceWithout561And961Fields.title);
          InventoryInstances.selectInstance();
          InventoryInstance.waitLoading();
          InstanceRecordView.viewSource();
          InventoryViewSource.notContains('561\t');
          InventoryViewSource.notContains('961\t');
        },
      );
    });
  },
);
