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
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import DateTools from '../../../../support/utils/dateTools';
import QueryModal, {
  QUERY_OPERATIONS,
  instanceFieldValues,
} from '../../../../support/fragments/bulk-edit/query-modal';
import { getLongDelay } from '../../../../support/utils/cypressTools';
import parseMrcFileContentAndVerify from '../../../../support/utils/parseMrcFileContent';
import BulkEditLogs from '../../../../support/fragments/bulk-edit/bulk-edit-logs';

let user;
let previewQueryFileNameCsv;
let previewQueryFileNameMrc;
let changedRecordsQueryFileNameCsv;
let changedRecordsQueryFileNameMrc;
let errorsFromCommittingFileName;
let matchedRecordsQueryFileName;
let identifiersQueryFilename;
let postfix;
let commonMarcFields;
let marcInstance;
let marcInstanceWithoutFields;
const dateToPick = DateTools.getFormattedDate({ date: new Date() }, 'MM/DD/YYYY');
const todayDate = DateTools.getFormattedDate({ date: new Date() }, 'YYYY-MM-DD');
const todayDateInBulkEditForms = DateTools.getFormattedDate({ date: new Date() }, 'M/D/YYYY');
const warningMessage = 'No change in MARC fields required';

function createAndUpdateMarcInstance(instance) {
  cy.createMarcBibliographicViaAPI(QuickMarcEditor.defaultValidLdr, instance.fields).then(
    (instanceId) => {
      instance.uuid = instanceId;

      cy.getInstanceById(instanceId).then((instanceData) => {
        instance.hrid = instanceData.hrid;
        instanceData.administrativeNotes = ['admin note text'];
        instanceData.catalogedDate = todayDate;
        cy.updateInstance(instanceData);
      });
    },
  );
}

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
        postfix = getRandomPostfix();
        commonMarcFields = [
          {
            tag: '008',
            content: {
              Type: 'a',
              BLvl: 's',
              DtSt: '|',
              Date1: '\\\\\\\\',
              Date2: '\\\\\\\\',
              Ctry: '\\\\\\',
              Audn: '\\',
              Form: '\\',
              Cont: ['\\', '\\', '\\'],
              GPub: '\\',
              Conf: '|',
              Fest: '\\',
              Indx: '\\',
              LitF: '\\',
              Biog: '\\',
              Lang: 'eng',
              MRec: '\\',
              Srce: '\\',
              Freq: '\\',
              Orig: '\\',
              'S/L': '|',
              Regl: '|',
              SrTp: '\\',
              EntW: '\\',
              Alph: '\\',
            },
          },
          {
            tag: '041',
            content: '$a eng',
            indicators: ['\\', '\\'],
          },
          {
            tag: '100',
            content: '$a Contributor',
            indicators: ['1', '\\'],
          },
          {
            tag: '336',
            content: '$a text $b txt',
            indicators: ['\\', '\\'],
          },
          {
            tag: '337',
            content: '$a unmediated $b n $2 rdamedia',
            indicators: ['\\', '\\'],
          },
          {
            tag: '338',
            content: '$a volume $b nc $2 rdacarrier',
            indicators: ['\\', '\\'],
          },
        ];
        marcInstance = {
          title: `AT_C523610_MarcInstance_${postfix}`,
          fields: [
            ...commonMarcFields,
            {
              tag: '245',
              content: `$a AT_C523610_MarcInstance_${postfix}`,
              indicators: ['1', '0'],
            },
            {
              tag: '505',
              content:
                '$a pt. 1. Carbon -- pt. 2. Nitrogen -- pt. 3. Sulphur -- pt. 4. Metals. $g (1:57) --',
              indicators: ['0', '\\'],
            },
            {
              tag: '505',
              content: '$a "Table of statutes and regulations": p. xvii-xxv. $t Quatrain II',
              indicators: ['0', '0'],
            },
            {
              tag: '905',
              content: '$a Numeric (Summary statistics). $g 1948',
              indicators: ['0', '\\'],
            },
            {
              tag: '905',
              content: '$a Computer programs. $8 4\\c',
              indicators: ['0', '0'],
            },
          ],
        };
        marcInstanceWithoutFields = {
          title: `AT_C523610_MarcInstance_${postfix}_wothoutFields`,
          fields: [
            ...commonMarcFields,
            {
              tag: '245',
              content: `$a AT_C523610_MarcInstance_${postfix}_wothoutFields`,
              indicators: ['1', '0'],
            },
          ],
        };

        cy.clearLocalStorage();
        cy.getAdminToken();
        cy.createTempUser([
          permissions.bulkEditEdit.gui,
          permissions.bulkEditLogsView.gui,
          permissions.bulkEditQueryView.gui,
          permissions.uiInventoryViewCreateEditInstances.gui,
          permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
        ]).then((userProperties) => {
          user = userProperties;

          [marcInstance, marcInstanceWithoutFields].forEach((instance) => {
            createAndUpdateMarcInstance(instance);
          });

          cy.login(user.username, user.password, {
            path: TopMenu.bulkEditPath,
            waiter: BulkEditSearchPane.waitLoading,
          });
          BulkEditSearchPane.openQuerySearch();
          BulkEditSearchPane.checkInstanceRadio();
          BulkEditSearchPane.clickBuildQueryButton();
          QueryModal.verify();
          QueryModal.selectField(instanceFieldValues.catalogedDate);
          QueryModal.selectOperator(QUERY_OPERATIONS.EQUAL);
          QueryModal.fillInValueTextfield(dateToPick);
          QueryModal.addNewRow();
          QueryModal.selectField(instanceFieldValues.instanceSource, 1);
          QueryModal.selectOperator(QUERY_OPERATIONS.EQUAL, 1);
          QueryModal.chooseValueSelect('MARC', 1);
          QueryModal.addNewRow();
          QueryModal.selectField(instanceFieldValues.instanceResourceTitle, 2);
          QueryModal.selectOperator(QUERY_OPERATIONS.START_WITH, 2);
          QueryModal.fillInValueTextfield(marcInstance.title, 2);
          cy.intercept('GET', '**/preview?limit=100&offset=0&step=UPLOAD*').as('getPreview');
          cy.intercept('GET', '/query/**').as('waiterForQueryCompleted');
          QueryModal.clickTestQuery();
          QueryModal.waitForQueryCompleted('@waiterForQueryCompleted');
          QueryModal.clickRunQuery();
          QueryModal.verifyClosed();
          cy.wait('@getPreview', getLongDelay()).then((interception) => {
            const interceptedUuid = interception.request.url.match(
              /bulk-operations\/([a-f0-9-]+)\/preview/,
            )[1];
            identifiersQueryFilename = `Query-${interceptedUuid}.csv`;
            matchedRecordsQueryFileName = `${todayDate}-Matched-Records-Query-${interceptedUuid}.csv`;
            previewQueryFileNameCsv = `${todayDate}-Updates-Preview-CSV-Query-${interceptedUuid}.csv`;
            previewQueryFileNameMrc = `${todayDate}-Updates-Preview-MARC-Query-${interceptedUuid}.mrc`;
            changedRecordsQueryFileNameCsv = `${todayDate}-Changed-Records-CSV-Query-${interceptedUuid}.csv`;
            changedRecordsQueryFileNameMrc = `${todayDate}-Changed-Records-MARC-Query-${interceptedUuid}.mrc`;
            errorsFromCommittingFileName = `${todayDate}-Committing-changes-Errors-Query-${interceptedUuid}.csv`;
          });
        });
      });

      afterEach('delete test data', () => {
        cy.getAdminToken();
        Users.deleteViaApi(user.userId);
        InventoryInstance.deleteInstanceViaApi(marcInstance.uuid);
        InventoryInstance.deleteInstanceViaApi(marcInstanceWithoutFields.uuid);
        FileManager.deleteFileFromDownloadsByMask(
          identifiersQueryFilename,
          matchedRecordsQueryFileName,
          previewQueryFileNameCsv,
          previewQueryFileNameMrc,
          changedRecordsQueryFileNameCsv,
          changedRecordsQueryFileNameMrc,
          errorsFromCommittingFileName,
        );
      });

      it(
        'C523610 Append subfield to MARC field (505, 905) - extended scenarios (MARC, Query, Logs) (firebird)',
        { tags: ['criticalPath', 'firebird', 'C523610'] },
        () => {
          // Step 1: Show Source and Formatted Contents Note columns
          BulkEditActions.openActions();
          BulkEditSearchPane.changeShowColumnCheckboxIfNotYet(
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.SOURCE,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.FORMATTED_CONTENTS_NOTE,
          );
          BulkEditSearchPane.verifyCheckboxesInActionsDropdownMenuChecked(
            true,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.SOURCE,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.FORMATTED_CONTENTS_NOTE,
          );
          BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInResultsAccordion(
            marcInstance.hrid,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.FORMATTED_CONTENTS_NOTE,
            'pt. 1. Carbon -- pt. 2. Nitrogen -- pt. 3. Sulphur -- pt. 4. Metals. (1:57) -- | "Table of statutes and regulations": p. xvii-xxv. Quatrain II',
          );
          BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInResultsAccordion(
            marcInstanceWithoutFields.hrid,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.FORMATTED_CONTENTS_NOTE,
            '',
          );
          BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInResultsAccordion(
            marcInstance.hrid,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.SOURCE,
            'MARC',
          );

          // Step 2: Show additional administrative and instance data columns
          const expectedColumnHeaderValues = [
            {
              header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.SUPPRESS_FROM_DISCOVERY,
              value: 'false',
            },
            {
              header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.STAFF_SUPPRESS,
              value: 'false',
            },
            {
              header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.PREVIOUSLY_HELD,
              value: 'false',
            },
            {
              header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.ADMINISTRATIVE_NOTE,
              value: 'admin note text',
            },
            {
              header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.CATALOGED_DATE,
              value: todayDateInBulkEditForms,
            },
            {
              header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_STATUS_TERM,
              value: '',
            },
            {
              header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.NATURE_OF_CONTENT,
              value: '',
            },
            {
              header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.FORMATS,
              value: 'unmediated -- volume',
            },
            {
              header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.CONTRIBUTORS,
              value: 'Contributor',
            },
            {
              header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.RESOURCE_TYPE,
              value: 'text',
            },
            {
              header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.LANGUAGES,
              value: 'eng',
            },
          ];
          const instances = [marcInstance, marcInstanceWithoutFields];

          BulkEditSearchPane.changeShowColumnCheckboxIfNotYet(
            ...expectedColumnHeaderValues.map((item) => item.header),
          );

          instances.forEach((instance) => {
            BulkEditSearchPane.verifyExactChangesInMultipleColumnsByIdentifierInResultsAccordion(
              instance.hrid,
              expectedColumnHeaderValues,
            );
          });

          // Step 3: Open MARC bulk edit form
          BulkEditActions.openStartBulkEditMarcInstanceForm();
          BulkEditActions.verifyInitialStateBulkEditsFormForMarcInstance();

          // Step 4: 505 0\ $a Find, Append $g
          BulkEditActions.fillInTagAndIndicatorsAndSubfield('505', '0', '\\', 'a');
          BulkEditActions.findAndAppendActionForMarc(
            'pt. 1. Carbon -- pt. 2. Nitrogen -- pt. 3. Sulphur -- pt. 4. Metals.',
            'g',
            '(10:49).',
          );
          BulkEditActions.verifyConfirmButtonDisabled(false);

          // Step 5: 505 00 $t Find, Append $g
          BulkEditActions.addNewBulkEditFilterStringForMarcInstance();
          BulkEditActions.fillInTagAndIndicatorsAndSubfield('505', '0', '0', 't', 1);
          BulkEditActions.findAndAppendActionForMarc('Quatrain II', 'g', 'Nr. 3.', 1);
          BulkEditActions.verifyConfirmButtonDisabled(false);

          // Step 6: 905 0\ $g Find, Append $g
          BulkEditActions.addNewBulkEditFilterStringForMarcInstance(1);
          BulkEditActions.fillInTagAndIndicatorsAndSubfield('905', '0', '\\', 'g', 2);
          BulkEditActions.findAndAppendActionForMarc('1948', 'g', '1950', 2);
          BulkEditActions.verifyConfirmButtonDisabled(false);

          // Step 7: 905 00 $8 Find, Append $6
          BulkEditActions.addNewBulkEditFilterStringForMarcInstance(2);
          BulkEditActions.fillInTagAndIndicatorsAndSubfield('905', '0', '0', '8', 3);
          BulkEditActions.findAndAppendActionForMarc('4\\c', '6', '100-01/(N', 3);
          BulkEditActions.verifyConfirmButtonDisabled(false);

          // Step 8: Confirm changes
          BulkEditActions.confirmChanges();
          BulkEditActions.verifyMessageBannerInAreYouSureForm(2);
          BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifier(
            marcInstance.hrid,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.FORMATTED_CONTENTS_NOTE,
            'pt. 1. Carbon -- pt. 2. Nitrogen -- pt. 3. Sulphur -- pt. 4. Metals. (10:49). (1:57) -- | "Table of statutes and regulations": p. xvii-xxv. Nr. 3. Quatrain II',
          );
          BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifier(
            marcInstanceWithoutFields.hrid,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.FORMATTED_CONTENTS_NOTE,
            '',
          );
          BulkEditActions.verifyAreYouSureForm(2);
          BulkEditSearchPane.verifyPaginatorInAreYouSureForm(2);

          // Step 9: Check administrative and instance data columns
          instances.forEach((instance) => {
            BulkEditSearchPane.verifyExactChangesInMultipleColumnsByIdentifierInAreYouSureForm(
              instance.hrid,
              expectedColumnHeaderValues,
            );
          });

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
                // 505 0\
                (record) => expect(record.get('505')[0].ind1).to.eq('0'),
                (record) => expect(record.get('505')[0].ind2).to.eq(' '),
                (record) => expect(record.get('505')[0].subf[0][0]).to.eq('a'),
                (record) => {
                  expect(record.get('505')[0].subf[0][1]).to.eq(
                    'pt. 1. Carbon -- pt. 2. Nitrogen -- pt. 3. Sulphur -- pt. 4. Metals.',
                  );
                },
                (record) => expect(record.get('505')[0].subf[1][0]).to.eq('g'),
                (record) => expect(record.get('505')[0].subf[1][1]).to.eq('(10:49).'),
                (record) => expect(record.get('505')[0].subf[2][0]).to.eq('g'),
                (record) => expect(record.get('505')[0].subf[2][1]).to.eq('(1:57) --'),
                // 505 00
                (record) => expect(record.get('505')[1].ind1).to.eq('0'),
                (record) => expect(record.get('505')[1].ind2).to.eq('0'),
                (record) => expect(record.get('505')[1].subf[0][0]).to.eq('a'),
                (record) => {
                  expect(record.get('505')[1].subf[0][1]).to.eq(
                    '"Table of statutes and regulations": p. xvii-xxv.',
                  );
                },
                (record) => expect(record.get('505')[1].subf[1][0]).to.eq('g'),
                (record) => expect(record.get('505')[1].subf[1][1]).to.eq('Nr. 3.'),
                (record) => expect(record.get('505')[1].subf[2][0]).to.eq('t'),
                (record) => expect(record.get('505')[1].subf[2][1]).to.eq('Quatrain II'),
                // 905 0\
                (record) => expect(record.get('905')[0].ind1).to.eq('0'),
                (record) => expect(record.get('905')[0].ind2).to.eq(' '),
                (record) => expect(record.get('905')[0].subf[0][0]).to.eq('a'),
                (record) => {
                  expect(record.get('905')[0].subf[0][1]).to.eq('Numeric (Summary statistics).');
                },
                (record) => expect(record.get('905')[0].subf[1][0]).to.eq('g'),
                (record) => expect(record.get('905')[0].subf[1][1]).to.eq('1948'),
                (record) => expect(record.get('905')[0].subf[2][0]).to.eq('g'),
                (record) => expect(record.get('905')[0].subf[2][1]).to.eq('1950'),
                // 905 00
                (record) => expect(record.get('905')[1].ind1).to.eq('0'),
                (record) => expect(record.get('905')[1].ind2).to.eq('0'),
                (record) => expect(record.get('905')[1].subf[0][0]).to.eq('a'),
                (record) => expect(record.get('905')[1].subf[0][1]).to.eq('Computer programs.'),
                (record) => expect(record.get('905')[1].subf[1][0]).to.eq('6'),
                (record) => expect(record.get('905')[1].subf[1][1]).to.eq('100-01/(N'),
                (record) => expect(record.get('905')[1].subf[2][0]).to.eq('8'),
                (record) => expect(record.get('905')[1].subf[2][1]).to.eq('4\\c'),
                (record) => expect(record.get('999')[0].subf[0][0]).to.eq('i'),
                (record) => expect(record.get('999')[0].subf[0][1]).to.eq(marcInstance.uuid),
              ],
            },
          ];

          parseMrcFileContentAndVerify(previewQueryFileNameMrc, assertionsOnMarcFileContent, 2);

          // Step 11: Download preview in CSV format
          BulkEditActions.downloadPreview();
          BulkEditFiles.verifyValueInRowByUUID(
            previewQueryFileNameCsv,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_HRID,
            marcInstance.hrid,
            'Notes',
            `${BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.FORMATTED_CONTENTS_NOTE};pt. 1. Carbon -- pt. 2. Nitrogen -- pt. 3. Sulphur -- pt. 4. Metals. (10:49). (1:57) --;false | ${BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.FORMATTED_CONTENTS_NOTE};"Table of statutes and regulations": p. xvii-xxv. Nr. 3. Quatrain II;false`,
          );

          // Step 12: Commit changes
          BulkEditActions.commitChanges();
          BulkEditActions.verifySuccessBanner(1);
          BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInChangesAccordion(
            marcInstance.hrid,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.FORMATTED_CONTENTS_NOTE,
            'pt. 1. Carbon -- pt. 2. Nitrogen -- pt. 3. Sulphur -- pt. 4. Metals. (10:49). (1:57) -- | "Table of statutes and regulations": p. xvii-xxv. Nr. 3. Quatrain II',
          );
          BulkEditSearchPane.verifyPaginatorInChangedRecords(1);

          // Step 13: Verify changes in administrative and instance data columns
          BulkEditSearchPane.verifyExactChangesInMultipleColumnsByIdentifierInChangesAccordion(
            marcInstance.hrid,
            expectedColumnHeaderValues,
          );

          // Step 14: Check warning message
          BulkEditSearchPane.verifyShowWarningsCheckbox(true, true);
          BulkEditSearchPane.verifyError(marcInstanceWithoutFields.uuid, warningMessage, 'Warning');

          // Step 15: Download changed records in MARC format
          BulkEditActions.openActions();
          BulkEditActions.downloadChangedMarc();

          parseMrcFileContentAndVerify(
            changedRecordsQueryFileNameMrc,
            assertionsOnMarcFileContent,
            1,
          );

          // Step 16: Download changed records in CSV format
          BulkEditActions.downloadChangedCSV();
          BulkEditFiles.verifyValueInRowByUUID(
            changedRecordsQueryFileNameCsv,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_HRID,
            marcInstance.hrid,
            'Notes',
            `${BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.FORMATTED_CONTENTS_NOTE};pt. 1. Carbon -- pt. 2. Nitrogen -- pt. 3. Sulphur -- pt. 4. Metals. (10:49). (1:57) --;false | ${BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.FORMATTED_CONTENTS_NOTE};"Table of statutes and regulations": p. xvii-xxv. Nr. 3. Quatrain II;false`,
          );

          // Step 17: Download errors (CSV)
          BulkEditActions.downloadErrors();
          ExportFile.verifyFileIncludes(errorsFromCommittingFileName, [
            `WARNING,${marcInstanceWithoutFields.uuid},${warningMessage}`,
          ]);

          // remove earlier downloaded files
          FileManager.deleteFileFromDownloadsByMask(
            matchedRecordsQueryFileName,
            previewQueryFileNameCsv,
            previewQueryFileNameMrc,
            changedRecordsQueryFileNameCsv,
            changedRecordsQueryFileNameMrc,
            errorsFromCommittingFileName,
          );

          // Step 18-20: Navigate to Logs tab and check job result list
          BulkEditSearchPane.openLogsSearch();
          BulkEditLogs.checkInstancesCheckbox();
          BulkEditLogs.verifyLogStatus(user.username, 'Inventory - instances (MARC)');
          BulkEditLogs.verifyLogStatus(user.username, 'In app');
          BulkEditLogs.clickActionsRunBy(user.username);
          BulkEditLogs.verifyLogsRowActionWhenCompletedWithQuery(true);

          // Step 21: Download and verify file with identifiers
          BulkEditLogs.downloadQueryIdentifiers();
          ExportFile.verifyFileIncludes(identifiersQueryFilename, [
            marcInstance.uuid,
            marcInstanceWithoutFields.uuid,
          ]);
          BulkEditFiles.verifyCSVFileRecordsNumber(identifiersQueryFilename, 2);

          // Step 22: Download and verify file with matching records
          BulkEditLogs.downloadFileWithMatchingRecords();
          BulkEditFiles.verifyValueInRowByUUID(
            matchedRecordsQueryFileName,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_HRID,
            marcInstance.hrid,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.RESOURCE_TITLE,
            marcInstance.title,
          );
          BulkEditFiles.verifyValueInRowByUUID(
            matchedRecordsQueryFileName,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_HRID,
            marcInstanceWithoutFields.hrid,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.RESOURCE_TITLE,
            marcInstanceWithoutFields.title,
          );

          // Step 23: Download and verify file with proposed changes (MARC)
          BulkEditLogs.downloadFileWithProposedChangesMarc();

          parseMrcFileContentAndVerify(previewQueryFileNameMrc, assertionsOnMarcFileContent, 2);

          // Step 24: Download and verify file with proposed changes (CSV)
          BulkEditLogs.downloadFileWithProposedChanges();
          BulkEditFiles.verifyValueInRowByUUID(
            previewQueryFileNameCsv,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_HRID,
            marcInstance.hrid,
            'Notes',
            `${BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.FORMATTED_CONTENTS_NOTE};pt. 1. Carbon -- pt. 2. Nitrogen -- pt. 3. Sulphur -- pt. 4. Metals. (10:49). (1:57) --;false | ${BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.FORMATTED_CONTENTS_NOTE};"Table of statutes and regulations": p. xvii-xxv. Nr. 3. Quatrain II;false`,
          );

          // Step 25: Download and verify file with updated records (MARC)
          BulkEditLogs.downloadFileWithUpdatedRecordsMarc();
          parseMrcFileContentAndVerify(
            changedRecordsQueryFileNameMrc,
            assertionsOnMarcFileContent,
            1,
          );

          // Step 26: Download and verify file with updated records (CSV)
          BulkEditLogs.downloadFileWithUpdatedRecords();
          BulkEditFiles.verifyValueInRowByUUID(
            changedRecordsQueryFileNameCsv,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_HRID,
            marcInstance.hrid,
            'Notes',
            `${BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.FORMATTED_CONTENTS_NOTE};pt. 1. Carbon -- pt. 2. Nitrogen -- pt. 3. Sulphur -- pt. 4. Metals. (10:49). (1:57) --;false | ${BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.FORMATTED_CONTENTS_NOTE};"Table of statutes and regulations": p. xvii-xxv. Nr. 3. Quatrain II;false`,
          );

          // Step 27: Download and verify file with errors (CSV)
          BulkEditLogs.downloadFileWithCommitErrors();
          ExportFile.verifyFileIncludes(errorsFromCommittingFileName, [
            `WARNING,${marcInstanceWithoutFields.uuid},${warningMessage}`,
          ]);

          // Step 28: Verify changes in Inventory app
          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
          InventorySearchAndFilter.searchInstanceByTitle(marcInstance.uuid);
          InventoryInstances.selectInstance();
          InventoryInstance.waitLoading();
          InstanceRecordView.checkMultipleItemNotesWithStaffOnly(
            0,
            'No',
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.FORMATTED_CONTENTS_NOTE,
            'pt. 1. Carbon -- pt. 2. Nitrogen -- pt. 3. Sulphur -- pt. 4. Metals. (10:49). (1:57) --',
          );
          InstanceRecordView.checkMultipleItemNotesWithStaffOnly(
            0,
            'No',
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.FORMATTED_CONTENTS_NOTE,
            '"Table of statutes and regulations": p. xvii-xxv. Nr. 3. Quatrain II',
            1,
          );
          InstanceRecordView.verifyRecentLastUpdatedDateAndTime();

          // Step 29: Verify changes in MARC source
          InstanceRecordView.viewSource();
          InventoryViewSource.verifyFieldInMARCBibSource(
            '505',
            '\t505\t0  \t$a pt. 1. Carbon -- pt. 2. Nitrogen -- pt. 3. Sulphur -- pt. 4. Metals. $g (10:49). $g (1:57) --',
          );
          InventoryViewSource.verifyFieldInMARCBibSource(
            '505',
            '\t505\t0 0\t$a "Table of statutes and regulations": p. xvii-xxv. $g Nr. 3. $t Quatrain II',
          );
          InventoryViewSource.verifyFieldInMARCBibSource(
            '905',
            '\t905\t0  \t$a Numeric (Summary statistics). $g 1948 $g 1950',
          );
          InventoryViewSource.verifyFieldInMARCBibSource(
            '905',
            '\t905\t0 0\t$a Computer programs. $6 100-01/(N $8 4\\c',
          );
          InventoryViewSource.verifyFieldContent(
            3,
            DateTools.getFormattedEndDateWithTimUTC(new Date()),
          );
          InventoryViewSource.close();
          InventorySearchAndFilter.resetAll();

          // Step 30: Verify that the instance without 505/905 fields was NOT edited
          InventorySearchAndFilter.searchInstanceByTitle(marcInstanceWithoutFields.uuid);
          InventoryInstances.selectInstance();
          InventoryInstance.waitLoading();
          InstanceRecordView.viewSource();
          InventoryViewSource.notContains('505\t');
          InventoryViewSource.notContains('905\t');
        },
      );
    });
  },
);
