/* eslint-disable no-unused-expressions */
import permissions from '../../../../support/dictionary/permissions';
import BulkEditActions from '../../../../support/fragments/bulk-edit/bulk-edit-actions';
import BulkEditSearchPane from '../../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import BulkEditFiles from '../../../../support/fragments/bulk-edit/bulk-edit-files';
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
import DateTools from '../../../../support/utils/dateTools';
import parseMrcFileContentAndVerify from '../../../../support/utils/parseMrcFileContent';
import { APPLICATION_NAMES, BULK_EDIT_TABLE_COLUMN_HEADERS } from '../../../../support/constants';

let user;
const marcInstance = {
  title: `AT_C729188_MarcInstance_${getRandomPostfix()}`,
};
const publicationFrequencyData = {
  annual: 'annual',
  dateRange: '1993-2005',
  uri: 'http://id.loc.gov/vocabulary/frequencies/ann',
};
const electronicAccessData = {
  provider: 'Internet Archive',
  accessNote: 'Free access',
};
const instanceUUIDsFileName = `instanceUUIdsFileName_${getRandomPostfix()}.csv`;
const fileNames = BulkEditFiles.getAllDownloadedFileNames(instanceUUIDsFileName, true);

describe('Bulk-edit', () => {
  describe('Instances with source MARC', () => {
    before('create test data', () => {
      cy.clearLocalStorage();
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

            // Mark instance as deleted
            InstanceRecordView.markAsDeletedViaApi(marcInstance.uuid);

            FileManager.createFile(`cypress/fixtures/${instanceUUIDsFileName}`, marcInstance.uuid);
          });
        });

        cy.login(user.username, user.password, {
          path: TopMenu.bulkEditPath,
          waiter: BulkEditSearchPane.waitLoading,
        });
        BulkEditSearchPane.verifyDragNDropRecordTypeIdentifierArea('Instances', 'Instance UUIDs');
        BulkEditSearchPane.uploadFile(instanceUUIDsFileName);
        BulkEditSearchPane.checkForUploading(instanceUUIDsFileName);
        BulkEditSearchPane.waitFileUploading();
        BulkEditSearchPane.verifyPaneTitleFileName(instanceUUIDsFileName);
        BulkEditSearchPane.verifyPaneRecordsCount('1 instance');
        BulkEditSearchPane.verifyFileNameHeadLine(instanceUUIDsFileName);
      });
    });

    after('delete test data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(user.userId);
      InventoryInstance.deleteInstanceViaApi(marcInstance.uuid);
      FileManager.deleteFile(`cypress/fixtures/${instanceUUIDsFileName}`);
      BulkEditFiles.deleteAllDownloadedFiles(fileNames);
    });

    it(
      'C729188 Verify bulk edit of deleted Instances via MARC flow (firebird)',
      { tags: ['criticalPath', 'firebird', 'C729188'] },
      () => {
        // Step 1: Click "Actions" menu and select "Instances with source MARC" option
        BulkEditActions.openActions();
        BulkEditActions.openStartBulkEditMarcInstanceForm();
        BulkEditActions.verifyInitialStateBulkEditsFormForMarcInstance();

        // Step 2: Under "Bulk edits for instances with source MARC" accordion - add 321 field
        BulkEditActions.fillInTagAndIndicatorsAndSubfield('321', '\\', '\\', 'a');
        BulkEditActions.addSubfieldActionForMarc(publicationFrequencyData.annual);
        BulkEditActions.verifyConfirmButtonDisabled(false);

        // Step 3: Select "Additional subfield" option - add subfield b
        BulkEditActions.selectSecondActionForMarcInstance('Additional subfield');
        BulkEditActions.verifyAdditionalSubfieldRowInitialState();
        BulkEditActions.fillInSubfieldInSubRow('b');
        BulkEditActions.fillInDataInSubRow(publicationFrequencyData.dateRange);
        BulkEditActions.verifyConfirmButtonDisabled(false);

        // Step 4: Select "Additional subfield" option - add subfield 0
        BulkEditActions.selectActionInSubRow('Additional subfield', 0, 0);
        BulkEditActions.fillInSubfieldInSubRow('0', 0, 1);
        BulkEditActions.fillInDataInSubRow(publicationFrequencyData.uri, 0, 1);
        BulkEditActions.verifyConfirmButtonDisabled(false);

        // Step 5: Click "Plus" icon and add 857 field
        BulkEditActions.addNewBulkEditFilterStringForMarcInstance();
        BulkEditActions.fillInTagAndIndicatorsAndSubfield('857', '4', '0', 'a', 1);
        BulkEditActions.selectActionForMarcInstance('Add', 1);
        BulkEditActions.fillInDataTextAreaForMarcInstance(electronicAccessData.provider, 1);
        BulkEditActions.verifyConfirmButtonDisabled(false);

        // Step 6: Select "Additional subfield" option - add subfield n
        BulkEditActions.selectSecondActionForMarcInstance('Additional subfield', 1);
        BulkEditActions.verifyAdditionalSubfieldRowInitialState(1);
        BulkEditActions.fillInSubfieldInSubRow('n', 1);
        BulkEditActions.fillInDataInSubRow(electronicAccessData.accessNote, 1);
        BulkEditActions.verifyConfirmButtonDisabled(false);

        // Step 7: Click "Confirm changes" button
        BulkEditActions.confirmChanges();
        BulkEditActions.verifyMessageBannerInAreYouSureForm(1);
        BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifier(
          marcInstance.hrid,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.PUBLICATION_FREQUENCY,
          `${publicationFrequencyData.annual} ${publicationFrequencyData.dateRange}`,
        );
        BulkEditActions.verifyAreYouSureForm(1);
        BulkEditSearchPane.verifyPaginatorInAreYouSureForm(1);
        BulkEditActions.verifyKeepEditingButtonDisabled(false);
        BulkEditActions.verifyDownloadPreviewButtonDisabled(false);
        BulkEditActions.verifyDownloadPreviewInMarcFormatButtonEnabled();

        // Step 8: Click "Download preview in MARC format" button
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
                const field321 = record.get('321')[0];

                expect(field321.ind1).to.eq(' ');
                expect(field321.ind2).to.eq(' ');
                expect(field321.subf[0][0]).to.eq('a');
                expect(field321.subf[0][1]).to.eq(publicationFrequencyData.annual);
                expect(field321.subf[1][0]).to.eq('b');
                expect(field321.subf[1][1]).to.eq(publicationFrequencyData.dateRange);
                expect(field321.subf[2][0]).to.eq('0');
                expect(field321.subf[2][1]).to.eq(publicationFrequencyData.uri);
              },
              (record) => {
                const field857 = record.get('857')[0];

                expect(field857.ind1).to.eq('4');
                expect(field857.ind2).to.eq('0');
                expect(field857.subf[0][0]).to.eq('a');
                expect(field857.subf[0][1]).to.eq(electronicAccessData.provider);
                expect(field857.subf[1][0]).to.eq('n');
                expect(field857.subf[1][1]).to.eq(electronicAccessData.accessNote);
              },
              (record) => {
                const field999 = record.get('999')[0];
                expect(field999.subf[0][0]).to.eq('i');
                expect(field999.subf[0][1]).to.eq(marcInstance.uuid);
              },
            ],
          },
        ];

        parseMrcFileContentAndVerify(fileNames.previewRecordsMarc, assertionsOnMarcFileContent, 1);

        // Step 9: Click the "Download preview in CSV format" button
        BulkEditActions.downloadPreview();
        BulkEditFiles.verifyValueInRowByUUID(
          fileNames.previewRecordsCSV,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_HRID,
          marcInstance.hrid,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.PUBLICATION_FREQUENCY,
          `${publicationFrequencyData.annual} ${publicationFrequencyData.dateRange}`,
        );

        // Step 10: Click "Commit changes" button
        BulkEditActions.commitChanges();
        BulkEditActions.verifySuccessBanner(1);
        BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInChangesAccordion(
          marcInstance.hrid,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.PUBLICATION_FREQUENCY,
          `${publicationFrequencyData.annual} ${publicationFrequencyData.dateRange}`,
        );
        BulkEditSearchPane.verifyPaginatorInChangedRecords(1);

        // Step 11: Click "Actions" menu and select "Download changed records (MARC)" option
        BulkEditActions.openActions();
        BulkEditActions.downloadChangedMarc();

        parseMrcFileContentAndVerify(fileNames.changedRecordsMarc, assertionsOnMarcFileContent, 1);

        // Step 12: Click the "Actions" menu and click "Download changed records (CSV)" element
        BulkEditActions.downloadChangedCSV();
        BulkEditFiles.verifyValueInRowByUUID(
          fileNames.changedRecordsCSV,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_HRID,
          marcInstance.hrid,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.PUBLICATION_FREQUENCY,
          `${publicationFrequencyData.annual} ${publicationFrequencyData.dateRange}`,
        );

        // Step 13: Navigate to "Inventory" app and verify changes
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
        InventorySearchAndFilter.waitLoading();
        InventorySearchAndFilter.searchInstanceByTitle(marcInstance.title);
        InventoryInstances.selectInstance();
        InventoryInstance.waitLoading();
        InstanceRecordView.verifyPublicationFrequency(
          `${publicationFrequencyData.annual} ${publicationFrequencyData.dateRange}`,
        );
        InstanceRecordView.verifyRecentLastUpdatedDateAndTime();
        InstanceRecordView.verifyInstanceIsSetForDeletion();

        // Step 14: Click "Actions" menu and select "View source" option
        InstanceRecordView.viewSource();
        InventoryViewSource.verifyFieldInMARCBibSource(
          '321',
          `\t321\t   \t$a ${publicationFrequencyData.annual} $b ${publicationFrequencyData.dateRange} $0 ${publicationFrequencyData.uri}`,
        );
        InventoryViewSource.verifyFieldInMARCBibSource(
          '857',
          `\t857\t4 0\t$a ${electronicAccessData.provider} $n ${electronicAccessData.accessNote}`,
        );

        const updateDate = DateTools.getFormattedEndDateWithTimUTC(new Date());

        InventoryViewSource.verifyFieldContent(3, updateDate);
        InventoryViewSource.checkFieldContentMatch('LDR', /^LEADER \d{5}d/);
      },
    );
  });
});
