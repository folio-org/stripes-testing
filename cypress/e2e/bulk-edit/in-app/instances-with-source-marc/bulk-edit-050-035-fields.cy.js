/* eslint-disable no-unused-expressions */
import permissions from '../../../../support/dictionary/permissions';
import BulkEditActions from '../../../../support/fragments/bulk-edit/bulk-edit-actions';
import BulkEditSearchPane, {
  classificationsTableHeaders,
} from '../../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import BulkEditFiles from '../../../../support/fragments/bulk-edit/bulk-edit-files';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import FileManager from '../../../../support/utils/fileManager';
import getRandomPostfix from '../../../../support/utils/stringTools';
import InventorySearchAndFilter from '../../../../support/fragments/inventory/inventorySearchAndFilter';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryViewSource from '../../../../support/fragments/inventory/inventoryViewSource';
import {
  APPLICATION_NAMES,
  BULK_EDIT_FORMS,
  BULK_EDIT_TABLE_COLUMN_HEADERS,
} from '../../../../support/constants';
import TopMenuNavigation from '../../../../support/fragments/topMenuNavigation';
import InstanceRecordView from '../../../../support/fragments/inventory/instanceRecordView';
import parseMrcFileContentAndVerify from '../../../../support/utils/parseMrcFileContent';
import DateTools from '../../../../support/utils/dateTools';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';

let user;
const field050a = 'Study roomJX1974.7';
const field035a = '814782';
const newField050a = 'JX1974.7';
const newField035a = '(OCoLC)814782';
const marcInstance = {
  title: `AT_C663270_MarcInstance_${getRandomPostfix()}`,
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
    tag: '050',
    content: `$a ${field050a}`,
    indicators: ['0', '0'],
  },
  {
    tag: '035',
    content: `$a ${field035a}`,
    indicators: ['\\', '\\'],
  },
];
const instanceUUIDsFileName = `instanceUUIdsFileName_${getRandomPostfix()}.csv`;
const fileNames = BulkEditFiles.getAllDownloadedFileNames(instanceUUIDsFileName, true);

describe('Bulk-edit', () => {
  describe('Instances with source MARC', () => {
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

    after('delete test data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(user.userId);
      InventoryInstance.deleteInstanceViaApi(marcInstance.uuid);
      FileManager.deleteFile(`cypress/fixtures/${instanceUUIDsFileName}`);
      BulkEditFiles.deleteAllDownloadedFiles(fileNames);
    });

    it(
      'C663270 Bulk edit marc fields (050, 035) for all records (MARC) (firebird)',
      { tags: ['criticalPath', 'firebird', 'C663270'] },
      () => {
        // Step 1: Show Classification column
        BulkEditActions.openActions();
        BulkEditSearchPane.changeShowColumnCheckboxIfNotYet(
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.CLASSIFICATION,
        );
        BulkEditSearchPane.verifyCheckboxesInActionsDropdownMenuChecked(
          true,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.CLASSIFICATION,
        );
        BulkEditSearchPane.verifyClassificationTableInForm(
          BULK_EDIT_FORMS.PREVIEW_OF_RECORDS_MATCHED,
          marcInstance.hrid,
          'LC',
          field050a,
        );

        // Step 2: Hide Classification column
        BulkEditSearchPane.changeShowColumnCheckbox(
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.CLASSIFICATION,
        );
        BulkEditSearchPane.verifyResultColumnTitlesDoNotInclude(
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.CLASSIFICATION,
        );

        // Step 3: Open MARC bulk edit form
        BulkEditActions.openStartBulkEditMarcInstanceForm();
        BulkEditActions.verifyInitialStateBulkEditsFormForMarcInstance();

        // Step 4: 050 $a Find, Replace with
        BulkEditActions.fillInTagAndIndicatorsAndSubfield('050', '0', '0', 'a');
        BulkEditActions.findAndReplaceWithActionForMarc('Study room', ' ');
        BulkEditActions.verifyConfirmButtonDisabled(false);

        // Step 5: Add new row for 035 $a Find, Replace with
        BulkEditActions.addNewBulkEditFilterStringForMarcInstance();
        BulkEditActions.fillInTagAndIndicatorsAndSubfield('035', '\\', '\\', 'a', 1);
        BulkEditActions.findAndReplaceWithActionForMarc(field035a, newField035a, 1);
        BulkEditActions.verifyConfirmButtonDisabled(false);

        // Step 6: Confirm changes
        BulkEditActions.confirmChanges();
        BulkEditActions.verifyMessageBannerInAreYouSureForm(1);
        BulkEditSearchPane.verifyClassificationTableInForm(
          BULK_EDIT_FORMS.ARE_YOU_SURE,
          marcInstance.hrid,
          'LC',
          newField050a,
        );
        BulkEditActions.verifyAreYouSureForm(1);
        BulkEditSearchPane.verifyPaginatorInAreYouSureForm(1);

        // Step 7: Download preview in MARC format
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
              (record) => expect(record.get('050')[0].ind1).to.eq('0'),
              (record) => expect(record.get('050')[0].ind2).to.eq('0'),
              (record) => expect(record.get('050')[0].subf[0][0]).to.eq('a'),
              (record) => expect(record.get('050')[0].subf[0][1]).to.eq(` ${newField050a}`),

              (record) => expect(record.get('035')[0].ind1).to.eq(' '),
              (record) => expect(record.get('035')[0].ind2).to.eq(' '),
              (record) => expect(record.get('035')[0].subf[0][0]).to.eq('a'),
              (record) => expect(record.get('035')[0].subf[0][1]).to.eq(newField035a),

              (record) => expect(record.get('999')[0].subf[0][0]).to.eq('i'),
              (record) => expect(record.get('999')[0].subf[0][1]).to.eq(marcInstance.uuid),
            ],
          },
        ];

        parseMrcFileContentAndVerify(fileNames.previewRecordsMarc, assertionsOnMarcFileContent, 1);

        // Step 8: Download preview in CSV format
        BulkEditActions.downloadPreview();
        BulkEditFiles.verifyValueInRowByUUID(
          fileNames.previewRecordsCSV,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_HRID,
          marcInstance.hrid,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.CLASSIFICATION,
          `${classificationsTableHeaders.join(';')}\nLC;${newField050a}`,
        );

        // Step 9: Commit changes
        BulkEditActions.commitChanges();
        BulkEditActions.verifySuccessBanner(1);
        BulkEditSearchPane.verifyClassificationTableInForm(
          BULK_EDIT_FORMS.PREVIEW_OF_RECORDS_CHANGED,
          marcInstance.hrid,
          'LC',
          newField050a,
        );
        BulkEditSearchPane.verifyPaginatorInChangedRecords(1);

        // Step 10: Download changed records in MARC format
        BulkEditActions.openActions();
        BulkEditActions.downloadChangedMarc();

        parseMrcFileContentAndVerify(fileNames.changedRecordsMarc, assertionsOnMarcFileContent, 1);

        // Step 11: Download changed records in CSV format
        BulkEditActions.downloadChangedCSV();
        BulkEditFiles.verifyValueInRowByUUID(
          fileNames.changedRecordsCSV,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_HRID,
          marcInstance.hrid,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.CLASSIFICATION,
          `${classificationsTableHeaders.join(';')}\nLC;${newField050a}`,
        );

        // Step 12: Inventory app verification
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
        InventorySearchAndFilter.searchInstanceByTitle(marcInstance.title);
        InventoryInstances.selectInstance();
        InventoryInstance.waitLoading();
        InstanceRecordView.verifyRecentLastUpdatedDateAndTime();
        InstanceRecordView.verifyClassification('LC', ` ${newField050a}`);
        InstanceRecordView.verifyResourceIdentifier('OCLC', newField035a, 0);

        // Step 13: MARC source verification
        InstanceRecordView.viewSource();
        InventoryViewSource.verifyFieldInMARCBibSource('050', `\t050\t0 0\t$a  ${newField050a}`);
        InventoryViewSource.verifyFieldInMARCBibSource('035', `\t035\t   \t$a ${newField035a}`);
        InventoryViewSource.verifyFieldContent(
          3,
          DateTools.getFormattedEndDateWithTimUTC(new Date()),
        );
      },
    );
  });
});
