/* eslint-disable no-unused-expressions */
import permissions from '../../../../support/dictionary/permissions';
import BulkEditActions from '../../../../support/fragments/bulk-edit/bulk-edit-actions';
import BulkEditSearchPane, {
  ERROR_MESSAGES,
} from '../../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import BulkEditFiles from '../../../../support/fragments/bulk-edit/bulk-edit-files';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import FileManager from '../../../../support/utils/fileManager';
import getRandomPostfix from '../../../../support/utils/stringTools';
import InventorySearchAndFilter from '../../../../support/fragments/inventory/inventorySearchAndFilter';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import { APPLICATION_NAMES, BULK_EDIT_TABLE_COLUMN_HEADERS } from '../../../../support/constants';
import TopMenuNavigation from '../../../../support/fragments/topMenuNavigation';
import InstanceRecordView from '../../../../support/fragments/inventory/instanceRecordView';
import parseMrcFileContentAndVerify from '../../../../support/utils/parseMrcFileContent';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import DateTools from '../../../../support/utils/dateTools';
import QueryModal, {
  QUERY_OPERATIONS,
  instanceFieldValues,
} from '../../../../support/fragments/bulk-edit/query-modal';
import { getLongDelay } from '../../../../support/utils/cypressTools';
import InventoryViewSource from '../../../../support/fragments/inventory/inventoryViewSource';
import ExportFile from '../../../../support/fragments/data-export/exportFile';

let user;
let statisticalCode;
let identifiersQueryFilename;
let matchedRecordsQueryFileName;
let previewQueryFileNameCsv;
let previewQueryFileNameMrc;
let changedRecordsQueryFileNameCsv;
let changedRecordsQueryFileNameMrc;
let errorsFromCommittingFileName;
const postfix = getRandomPostfix();
const administrativeNoteText = 'Edited language codes';
const marcInstance = {
  title: `AT_C651499_${postfix}_MarcInstance`,
};
const folioInstance = {
  title: `AT_C651499_${postfix}_FolioInstance`,
};
const marcInstanceFields = [
  {
    tag: '008',
    content: {
      Type: '\\',
      BLvl: '\\',
      DtSt: '\\',
      Date1: '\\\\\\\\',
      Date2: '\\\\\\\\',
      Ctry: '\\\\\\',
      Lang: 'eng',
      MRec: '\\',
      Srce: '\\',
      Ills: ['\\', '\\', '\\', '\\'],
      Audn: '\\',
      Form: '\\',
      Cont: ['\\', '\\', '\\', '\\'],
      GPub: '\\',
      Conf: '\\',
      Fest: '\\',
      Indx: '\\',
      LitF: '\\',
      Biog: '\\',
    },
  },
  {
    tag: '245',
    content: `$a ${marcInstance.title}`,
    indicators: ['1', '0'],
  },
  {
    tag: '041',
    content: '$a eng $a fre $a ger',
    indicators: ['0', '\\'],
  },
  {
    tag: '041',
    content: '$a ger',
    indicators: ['1', '\\'],
  },
];
const todayDate = DateTools.getFormattedDate({ date: new Date() }, 'YYYY-MM-DD');

describe('Bulk-edit', () => {
  describe('Instances with source MARC', () => {
    before('create test data', () => {
      cy.clearLocalStorage();
      cy.getAdminToken();
      cy.createTempUser([
        permissions.bulkEditEdit.gui,
        permissions.uiInventoryViewCreateEditInstances.gui,
        permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
        permissions.bulkEditQueryView.gui,
      ]).then((userProperties) => {
        user = userProperties;

        cy.getStatisticalCodes({ limit: 1 }).then((code) => {
          statisticalCode = code[0];
          cy.getStatisticalCodeTypes({ limit: 200 }).then((codeTypes) => {
            statisticalCode.typeName = codeTypes.filter(
              (item) => item.id === statisticalCode.statisticalCodeTypeId,
            )[0].name;
            statisticalCode.fullName = `${statisticalCode.typeName}: ${statisticalCode.code} - ${statisticalCode.name}`;
          });

          cy.createMarcBibliographicViaAPI(
            QuickMarcEditor.defaultValidLdr,
            marcInstanceFields,
          ).then((instanceId) => {
            marcInstance.uuid = instanceId;

            cy.getInstanceById(marcInstance.uuid).then((instanceData) => {
              marcInstance.hrid = instanceData.hrid;
              instanceData.statisticalCodeIds = [statisticalCode.id];

              cy.updateInstance(instanceData);
            });
          });

          cy.getInstanceTypes({ limit: 1 }).then((instanceTypes) => {
            folioInstance.instanceTypeId = instanceTypes[0].id;

            InventoryInstances.createFolioInstanceViaApi({
              instance: {
                instanceTypeId: folioInstance.instanceTypeId,
                title: folioInstance.title,
                languages: ['ger'],
                statisticalCodeIds: [statisticalCode.id],
              },
            }).then((instance) => {
              folioInstance.uuid = instance.instanceId;

              cy.getInstanceById(instance.instanceId).then((folioInstanceData) => {
                folioInstance.hrid = folioInstanceData.hrid;
              });
            });
          });

          cy.login(user.username, user.password, {
            path: TopMenu.bulkEditPath,
            waiter: BulkEditSearchPane.waitLoading,
          });
          BulkEditSearchPane.openQuerySearch();
          BulkEditSearchPane.checkInstanceRadio();
          BulkEditSearchPane.clickBuildQueryButton();
          QueryModal.verify();
          QueryModal.selectField(instanceFieldValues.languages);
          QueryModal.selectOperator(QUERY_OPERATIONS.IN);
          QueryModal.chooseFromValueMultiselect('German');
          QueryModal.addNewRow();
          QueryModal.selectField(instanceFieldValues.statisticalCodeNames, 1);
          QueryModal.selectOperator(QUERY_OPERATIONS.IN, 1);
          QueryModal.chooseFromValueMultiselect(statisticalCode.name, 1);
          QueryModal.addNewRow();
          QueryModal.selectField(instanceFieldValues.instanceResourceTitle, 2);
          QueryModal.selectOperator(QUERY_OPERATIONS.START_WITH, 2);
          QueryModal.fillInValueTextfield(`AT_C651499_${postfix}`, 2);
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
    });

    after('delete test data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(user.userId);
      InventoryInstance.deleteInstanceViaApi(marcInstance.uuid);
      InventoryInstance.deleteInstanceViaApi(folioInstance.uuid);
      FileManager.deleteFileFromDownloadsByMask(
        previewQueryFileNameCsv,
        previewQueryFileNameMrc,
        identifiersQueryFilename,
        matchedRecordsQueryFileName,
        changedRecordsQueryFileNameCsv,
        changedRecordsQueryFileNameMrc,
        errorsFromCommittingFileName,
      );
    });

    it(
      'C651499 Bulk edit administrative data and marc fields (041) for all records (MARC & FOLIO, Query) (firebird)',
      { tags: ['criticalPath', 'firebird', 'C651499'] },
      () => {
        // Step 1: Hide Languages and Statistical code columns
        BulkEditActions.openActions();
        BulkEditSearchPane.changeShowColumnCheckboxIfNotYet(
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.LANGUAGES,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.STATISTICAL_CODE,
        );
        BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInResultsAccordion(
          marcInstance.hrid,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.LANGUAGES,
          'eng | fre | ger',
        );
        BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInResultsAccordion(
          folioInstance.hrid,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.LANGUAGES,
          'ger',
        );

        // Step 2: Show columns for Languages and Statistical code
        BulkEditSearchPane.changeShowColumnCheckbox(
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.LANGUAGES,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.STATISTICAL_CODE,
        );
        BulkEditSearchPane.verifyResultColumnTitlesDoNotIncludeTitles(
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.LANGUAGES,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.STATISTICAL_CODE,
        );

        // Step 3: Open combined bulk edit form
        BulkEditActions.openStartBulkEditMarcInstanceForm();
        BulkEditActions.verifyInitialStateBulkEditsFormForMarcInstance();

        // Step 4: Add administrative note
        BulkEditActions.addItemNoteAndVerify('Administrative note', administrativeNoteText);
        BulkEditActions.verifyConfirmButtonDisabled(false);

        // Step 5: Remove statistical code
        BulkEditActions.addNewBulkEditFilterString();
        BulkEditActions.selectOption('Statistical code', 1);
        BulkEditSearchPane.verifyInputLabel('Statistical code', 1);
        BulkEditActions.selectAction('Remove', 1);
        BulkEditActions.selectStatisticalCodeValue(statisticalCode.fullName, 1);
        BulkEditActions.verifyConfirmButtonDisabled(false);

        // Step 6: Remove all 041 0\ $a fields
        BulkEditActions.fillInTagAndIndicatorsAndSubfield('041', '0', '\\', 'a');
        BulkEditActions.selectActionForMarcInstance('Remove all');
        BulkEditActions.verifyConfirmButtonDisabled(false);

        // Step 7: Find and append 041 1\ $a field
        BulkEditActions.addNewBulkEditFilterStringForMarcInstance();
        BulkEditActions.fillInTagAndIndicatorsAndSubfield('041', '1', '\\', 'a', 1);
        BulkEditActions.findAndAppendActionForMarc('ger', 'a', 'eng', 1);
        BulkEditActions.verifyConfirmButtonDisabled(false);

        // Step 8: Confirm changes and verify Are You Sure form
        BulkEditActions.confirmChanges();
        BulkEditActions.verifyAreYouSureForm(1);
        BulkEditActions.verifyMessageBannerInAreYouSureFormWhenSourceNotSupportedByMarc(1, 1);

        const editedHeaderValues = [
          {
            header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.ADMINISTRATIVE_NOTE,
            value: administrativeNoteText,
          },
          {
            header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.STATISTICAL_CODE,
            value: '',
          },
          {
            header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.LANGUAGES,
            value: 'eng | ger',
          },
        ];

        BulkEditSearchPane.verifyExactChangesInMultipleColumnsByIdentifierInAreYouSureForm(
          marcInstance.hrid,
          editedHeaderValues,
        );
        BulkEditSearchPane.verifyPaginatorInAreYouSureForm(1);
        BulkEditActions.verifyDownloadPreviewInMarcFormatButtonEnabled();

        // Step 9: Download preview in MARC format and verify content
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
                expect(record.fields[4]).to.deep.eq(['041', '1 ', 'a', 'eng', 'a', 'ger']);
              },
              (record) => expect(record.get('999')[0].subf[0][0]).to.eq('i'),
              (record) => expect(record.get('999')[0].subf[0][1]).to.eq(marcInstance.uuid),
            ],
          },
        ];

        parseMrcFileContentAndVerify(previewQueryFileNameMrc, assertionsOnMarcFileContent, 1);

        // Step 10: Download preview in CSV format and verify content
        BulkEditActions.downloadPreview();
        BulkEditFiles.verifyHeaderValueInRowByIdentifier(
          previewQueryFileNameCsv,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_UUID,
          marcInstance.uuid,
          editedHeaderValues,
        );

        // Step 11: Commit changes and verify changed records
        BulkEditActions.commitChanges();
        BulkEditActions.verifySuccessBanner(1);
        BulkEditSearchPane.verifyPaginatorInChangedRecords(1);
        BulkEditSearchPane.verifyExactChangesInMultipleColumnsByIdentifierInChangesAccordion(
          marcInstance.hrid,
          editedHeaderValues,
        );
        BulkEditSearchPane.verifyErrorLabel(1);
        BulkEditSearchPane.verifyErrorByIdentifier(
          folioInstance.uuid,
          ERROR_MESSAGES.FOLIO_SOURCE_NOT_SUPPORTED_BY_MARC_BULK_EDIT,
        );

        // Step 12: Download changed records in MARC format and verify content
        BulkEditActions.openActions();
        BulkEditActions.downloadChangedMarc();

        const assertionsOnMarcFileContentInChangedFile = [
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
                expect(record.fields[3]).to.deep.eq(['041', '1 ', 'a', 'eng', 'a', 'ger']);
              },
              (record) => expect(record.get('999')[0].subf[0][0]).to.eq('i'),
              (record) => expect(record.get('999')[0].subf[0][1]).to.eq(marcInstance.uuid),
            ],
          },
        ];

        parseMrcFileContentAndVerify(
          changedRecordsQueryFileNameMrc,
          assertionsOnMarcFileContentInChangedFile,
          1,
        );

        // Step 13: Download changed records in CSV format and verify content
        BulkEditActions.downloadChangedCSV();
        BulkEditFiles.verifyHeaderValueInRowByIdentifier(
          changedRecordsQueryFileNameCsv,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_UUID,
          marcInstance.uuid,
          editedHeaderValues,
        );

        // Step 15: Download errors (CSV)
        BulkEditActions.downloadErrors();
        ExportFile.verifyFileIncludes(errorsFromCommittingFileName, [
          `ERROR,${folioInstance.uuid},${ERROR_MESSAGES.FOLIO_SOURCE_NOT_SUPPORTED_BY_MARC_BULK_EDIT}`,
        ]);

        // Step 15: Inventory app verification for MARC instance
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
        InventorySearchAndFilter.searchInstanceByTitle(marcInstance.title);
        InventoryInstances.selectInstance();
        InventoryInstance.waitLoading();
        InstanceRecordView.verifyRecentLastUpdatedDateAndTime();
        InstanceRecordView.verifyAdministrativeNote(administrativeNoteText);
        InstanceRecordView.verifyStatisticalCodeTypeAndName('No value set-', 'No value set-');
        InventoryInstance.verifyInstanceLanguage('English, German');
        InstanceRecordView.viewSource();
        InventoryViewSource.verifyFieldInMARCBibSource('041', '\t041\t1  \t$a eng $a ger');
        InventoryViewSource.verifyAbsenceOfValue('\t041\t0');
        InventoryViewSource.close();
        InventorySearchAndFilter.resetAll();

        // Step 17: Inventory app verification for FOLIO instance (should not be changed)
        InventorySearchAndFilter.searchInstanceByTitle(folioInstance.title);
        InventoryInstances.selectInstance();
        InventoryInstance.waitLoading();
        InstanceRecordView.verifyRecentLastUpdatedDateAndTime();
        InstanceRecordView.verifyStatisticalCodeTypeAndName(
          statisticalCode.typeName,
          statisticalCode.name,
        );
        InventoryInstance.verifyInstanceLanguage('German');
        InstanceRecordView.verifyAdministrativeNote('No value set-');
      },
    );
  });
});
