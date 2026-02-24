/* eslint-disable no-unused-expressions */
import { BULK_EDIT_TABLE_COLUMN_HEADERS } from '../../../../../../support/constants';
import BulkEditActions from '../../../../../../support/fragments/bulk-edit/bulk-edit-actions';
import BulkEditFiles from '../../../../../../support/fragments/bulk-edit/bulk-edit-files';
import BulkEditLogs from '../../../../../../support/fragments/bulk-edit/bulk-edit-logs';
import BulkEditSearchPane from '../../../../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import InstanceRecordView from '../../../../../../support/fragments/inventory/instanceRecordView';
import InventoryInstance from '../../../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../../../../support/fragments/inventory/inventorySearchAndFilter';
import InventoryViewSource from '../../../../../../support/fragments/inventory/inventoryViewSource';
import QuickMarcEditor from '../../../../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../../../../support/fragments/topMenu';
import DateTools from '../../../../../../support/utils/dateTools';
import FileManager from '../../../../../../support/utils/fileManager';
import parseMrcFileContentAndVerify from '../../../../../../support/utils/parseMrcFileContent';
import getRandomPostfix from '../../../../../../support/utils/stringTools';
import { parseSanityParameters } from '../../../../../../support/utils/users';

const { user, memberTenant } = parseSanityParameters();
const marcInstance = {
  title: `AT_C648518_MarcInstance_${getRandomPostfix()}`,
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
    tag: '700',
    content: '$a Beethoven, Ludwig van, $d 1770-1827. $t Sonatas, $m piano. $k Selections.',
    indicators: ['1', '\\'],
  },
  {
    tag: '700',
    content: '$a Ludwig van Beethoven $d 1770-1827.',
    indicators: ['1', '\\'],
  },
  {
    tag: '700',
    content: '$a Beethoven',
    indicators: ['1', '\\'],
  },
];
const contributorsFieldValue =
  'Beethoven, Ludwig van, 1770-1827. Sonatas, Selections; Ludwig van Beethoven 1770-1827; Beethoven';
const newValueOfContributorsField = {
  subfieldA: 'Hallmark Collection (Library of Congress)',
  subfield5: 'DLC',
};
const instanceUUIDsFileName = `instanceUUidsFileName_${getRandomPostfix()}.csv`;
const fileNames = BulkEditFiles.getAllDownloadedFileNames(instanceUUIDsFileName, true);
let instanceJobHrid;

describe('Bulk-edit', () => {
  describe('Instances with source MARC', () => {
    before('create test data', () => {
      cy.clearLocalStorage();
      cy.setTenant(memberTenant.id);
      cy.getUserToken(user.username, user.password, { log: false }).then(() => {
        cy.createMarcBibliographicViaAPI(QuickMarcEditor.defaultValidLdr, marcInstanceFields).then(
          (instanceId) => {
            marcInstance.uuid = instanceId;

            cy.getInstanceById(marcInstance.uuid).then((instanceData) => {
              marcInstance.hrid = instanceData.hrid;

              FileManager.createFile(
                `cypress/fixtures/${instanceUUIDsFileName}`,
                marcInstance.uuid,
              );
            });
          },
        );
      });

      cy.wait(5000);
      cy.allure().logCommandSteps(false);
      cy.login(user.username, user.password, {
        path: TopMenu.bulkEditPath,
        waiter: BulkEditSearchPane.waitLoading,
      });
      cy.allure().logCommandSteps(true);

      cy.intercept('POST', '/bulk-operations/*/start').as('instanceBulkOperations');
      BulkEditSearchPane.verifyDragNDropRecordTypeIdentifierArea('Instance', 'Instance UUIDs');
      BulkEditSearchPane.uploadFile(instanceUUIDsFileName);
      BulkEditSearchPane.checkForUploading(instanceUUIDsFileName);
      BulkEditSearchPane.waitFileUploading();
      cy.wait('@instanceBulkOperations').then(({ response }) => {
        instanceJobHrid = String(response.body.hrId);

        BulkEditSearchPane.verifyPaneTitleFileName(instanceUUIDsFileName);
        BulkEditSearchPane.verifyPaneRecordsCount('1 instance');
        BulkEditSearchPane.verifyFileNameHeadLine(instanceUUIDsFileName);
      });
    });

    after('delete test data', () => {
      cy.getUserToken(user.username, user.password, { log: false });
      cy.setTenant(memberTenant.id);
      InventoryInstance.deleteInstanceViaApi(marcInstance.uuid, true);
      FileManager.deleteFile(`cypress/fixtures/${instanceUUIDsFileName}`);
      FileManager.deleteFileFromDownloadsByMask(instanceUUIDsFileName);
      BulkEditFiles.deleteAllDownloadedFiles(fileNames);
    });

    it(
      'C648518 Bulk edit marc fields (700, 710) for all records (MARC, Logs) (firebird)',
      { tags: ['dryRun', 'firebird', 'C648518'] },
      () => {
        BulkEditActions.openActions();
        BulkEditSearchPane.changeShowColumnCheckboxIfNotYet(
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.CONTRIBUTORS,
        );
        BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInResultsAccordion(
          marcInstance.hrid,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.CONTRIBUTORS,
          contributorsFieldValue,
        );
        BulkEditSearchPane.uncheckShowColumnCheckbox(
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.CONTRIBUTORS,
        );
        BulkEditActions.openStartBulkEditMarcInstanceForm();
        BulkEditActions.verifyInitialStateBulkEditsFormForMarcInstance();
        BulkEditActions.fillInTagAndIndicatorsAndSubfield('700', '1', '\\', 'a');
        BulkEditActions.findAndRemoveFieldActionForMarc('Beethoven');
        BulkEditActions.verifyConfirmButtonDisabled(false);
        BulkEditActions.addNewBulkEditFilterStringForMarcInstance();
        BulkEditActions.fillInTagAndIndicatorsAndSubfield('710', '2', '\\', 'a', 1);
        BulkEditActions.selectActionForMarcInstance('Add', 1);
        BulkEditActions.fillInDataTextAreaForMarcInstance(newValueOfContributorsField.subfieldA, 1);
        BulkEditActions.verifyConfirmButtonDisabled(false);
        BulkEditActions.selectSecondActionForMarcInstance('Additional subfield', 1);
        BulkEditActions.verifyAdditionalSubfieldRowInitialState(1);
        BulkEditActions.fillInSubfieldInSubRow('5', 1);
        BulkEditActions.fillInDataInSubRow(newValueOfContributorsField.subfield5, 1);
        BulkEditActions.verifyConfirmButtonDisabled(false);
        BulkEditActions.confirmChanges();
        BulkEditActions.verifyMessageBannerInAreYouSureForm(1);
        BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifier(
          marcInstance.hrid,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.CONTRIBUTORS,
          newValueOfContributorsField.subfieldA,
        );
        BulkEditActions.verifyAreYouSureForm(1);
        BulkEditSearchPane.verifyPaginatorInAreYouSureForm(1);
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

              (record) => expect(record.get('700')).to.be.empty,

              (record) => expect(record.get('710')[0].ind1).to.eq('2'),
              (record) => expect(record.get('710')[0].ind2).to.eq(' '),
              (record) => expect(record.get('710')[0].subf[0][0]).to.eq('a'),
              (record) => {
                expect(record.get('710')[0].subf[0][1]).to.eq(
                  newValueOfContributorsField.subfieldA,
                );
              },
              (record) => expect(record.get('710')[0].subf[1][0]).to.eq('5'),
              (record) => {
                expect(record.get('710')[0].subf[1][1]).to.eq(
                  newValueOfContributorsField.subfield5,
                );
              },

              (record) => expect(record.get('999')[0].subf[0][0]).to.eq('i'),
              (record) => expect(record.get('999')[0].subf[0][1]).to.eq(marcInstance.uuid),
            ],
          },
        ];

        parseMrcFileContentAndVerify(fileNames.previewRecordsMarc, assertionsOnMarcFileContent, 1);

        BulkEditActions.downloadPreview();
        BulkEditFiles.verifyValueInRowByUUID(
          fileNames.previewRecordsCSV,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_HRID,
          marcInstance.hrid,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.CONTRIBUTORS,
          newValueOfContributorsField.subfieldA,
        );
        BulkEditActions.commitChanges();

        const updateDate = DateTools.getFormattedEndDateWithTimUTC(new Date());

        BulkEditActions.verifySuccessBanner(1);
        BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInChangesAccordion(
          marcInstance.hrid,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.CONTRIBUTORS,
          newValueOfContributorsField.subfieldA,
        );
        BulkEditSearchPane.verifyPaginatorInChangedRecords(1);
        BulkEditActions.openActions();
        BulkEditActions.downloadChangedMarc();

        parseMrcFileContentAndVerify(fileNames.changedRecordsMarc, assertionsOnMarcFileContent, 1);

        BulkEditActions.downloadChangedCSV();
        BulkEditFiles.verifyValueInRowByUUID(
          fileNames.changedRecordsCSV,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_HRID,
          marcInstance.hrid,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.CONTRIBUTORS,
          newValueOfContributorsField.subfieldA,
        );

        // remove earlier downloaded files
        FileManager.deleteFile(`cypress/fixtures/${instanceUUIDsFileName}`);
        BulkEditFiles.deleteAllDownloadedFiles(fileNames);

        BulkEditSearchPane.openLogsSearch();
        BulkEditLogs.checkInstancesCheckbox();
        BulkEditLogs.clickActionsByJobHrid(instanceJobHrid);
        BulkEditLogs.verifyLogsRowActionWhenCompleted(true);
        BulkEditLogs.downloadFileUsedToTrigger();
        BulkEditFiles.verifyCSVFileRows(instanceUUIDsFileName, [marcInstance.uuid]);
        BulkEditFiles.verifyCSVFileRecordsNumber(instanceUUIDsFileName, 1);
        BulkEditLogs.downloadFileWithMatchingRecords();
        BulkEditFiles.verifyValueInRowByUUID(
          fileNames.matchedRecordsCSV,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_UUID,
          marcInstance.uuid,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.CONTRIBUTORS,
          contributorsFieldValue,
        );
        BulkEditLogs.downloadFileWithProposedChanges();
        BulkEditFiles.verifyValueInRowByUUID(
          fileNames.previewRecordsCSV,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_HRID,
          marcInstance.hrid,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.CONTRIBUTORS,
          newValueOfContributorsField.subfieldA,
        );
        BulkEditLogs.downloadFileWithProposedChangesMarc();

        parseMrcFileContentAndVerify(fileNames.previewRecordsMarc, assertionsOnMarcFileContent, 1);

        BulkEditLogs.downloadFileWithUpdatedRecords();
        BulkEditFiles.verifyValueInRowByUUID(
          fileNames.changedRecordsCSV,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_HRID,
          marcInstance.hrid,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.CONTRIBUTORS,
          newValueOfContributorsField.subfieldA,
        );
        BulkEditLogs.downloadFileWithUpdatedRecordsMarc();

        parseMrcFileContentAndVerify(fileNames.changedRecordsMarc, assertionsOnMarcFileContent, 1);

        cy.visit(TopMenu.inventoryPath);
        InventoryInstances.waitContentLoading();
        InventorySearchAndFilter.searchInstanceByTitle(marcInstance.title);
        InventoryInstances.selectInstance();
        InventoryInstance.waitLoading();
        InstanceRecordView.verifyContributorNameWithoutMarcAppIcon(
          0,
          newValueOfContributorsField.subfieldA,
        );
        InstanceRecordView.verifyRecentLastUpdatedDateAndTime();
        InstanceRecordView.viewSource();
        InventoryViewSource.verifyFieldInMARCBibSource(
          '710',
          `\t710\t2  \t$a ${newValueOfContributorsField.subfieldA} $5 ${newValueOfContributorsField.subfield5}`,
        );
        InventoryViewSource.verifyAbsenceOfValue('700\t');
        InventoryViewSource.verifyFieldContent(3, updateDate);
      },
    );
  });
});
