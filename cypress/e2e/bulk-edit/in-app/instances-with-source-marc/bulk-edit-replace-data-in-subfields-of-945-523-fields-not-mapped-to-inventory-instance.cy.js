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
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';

let user;
const note945a =
  "Born Kingston, N.Y., April 4, 1856; worked at J.J. Bufford's Lith. in Boston, 1990-1995.";
const note945u1 = 'http://www.test1.org';
const note945u2 = 'https://www.test2.org';
const note523d = '1997 April 22-23';
const newNote945a =
  "Born Kingston, N.Y., April 4, 1856; worked at J.J. Bufford's Lith. in Boston, 1890-1895.";
const newNote945u1 = 'https://www.test1.org';
const newNote523d = '1997 September 01';
const marcInstance = {
  title: `AT_C506682_MarcInstance_${getRandomPostfix()}`,
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
    tag: '945',
    content: `$a ${note945a} $u ${note945u1} $u ${note945u2}`,
    indicators: ['0', '\\'],
  },
  {
    tag: '523',
    content: `$d ${note523d}`,
    indicators: ['\\', '\\'],
  },
];
const instanceUUIDsFileName = `instanceUUIdsFileName_${getRandomPostfix()}.csv`;
const fileNames = BulkEditFiles.getAllDownloadedFileNames(instanceUUIDsFileName, true);

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
      'C506682 Replace data in the subfields of MARC fields (945, 523) not mapped to Inventory Instance (MARC) (firebird)',
      { tags: ['criticalPath', 'firebird', 'C506682'] },
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

        // Step 3-6: 945 $a Find, then Replace with
        BulkEditActions.fillInTagAndIndicatorsAndSubfield('945', '0', '\\', 'a');
        BulkEditActions.findAndReplaceWithActionForMarc(note945a, newNote945a);
        BulkEditActions.verifyConfirmButtonDisabled(false);

        // Step 7-8: Add new row for 945 $u
        BulkEditActions.addNewBulkEditFilterStringForMarcInstance();
        BulkEditActions.verifyConfirmButtonDisabled(true);
        BulkEditActions.fillInTagAndIndicatorsAndSubfield('945', '0', '\\', 'u', 1);
        BulkEditActions.findAndReplaceWithActionForMarc(note945u1, newNote945u1, 1);
        BulkEditActions.verifyConfirmButtonDisabled(false);

        // Step 9: Add new row for 523 $d
        BulkEditActions.addNewBulkEditFilterStringForMarcInstance(1);
        BulkEditActions.fillInTagAndIndicatorsAndSubfield('523', '\\', '\\', 'd', 2);
        BulkEditActions.findAndReplaceWithActionForMarc(note523d, newNote523d, 2);
        BulkEditActions.verifyConfirmButtonDisabled(false);

        // Step 10: Confirm changes
        BulkEditActions.confirmChanges();
        BulkEditActions.verifyMessageBannerInAreYouSureForm(1);
        BulkEditSearchPane.verifyAreYouSureColumnTitlesDoNotInclude(
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.GENERAL_NOTE,
        );
        BulkEditSearchPane.verifyCellWithContentAbsentsInAreYouSureForm(
          newNote945a,
          newNote945u1,
          newNote523d,
        );
        BulkEditActions.verifyAreYouSureForm(1);
        BulkEditSearchPane.verifyPaginatorInAreYouSureForm(1);

        // Step 11: Download preview in MARC format
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

              (record) => expect(record.get('945')[0].ind1).to.eq('0'),
              (record) => expect(record.get('945')[0].ind2).to.eq(' '),
              (record) => expect(record.get('945')[0].subf[0][0]).to.eq('a'),
              (record) => expect(record.get('945')[0].subf[0][1]).to.eq(newNote945a),
              (record) => expect(record.get('945')[0].subf[1][0]).to.eq('u'),
              (record) => expect(record.get('945')[0].subf[1][1]).to.eq(newNote945u1),
              (record) => expect(record.get('945')[0].subf[2][0]).to.eq('u'),
              (record) => expect(record.get('945')[0].subf[2][1]).to.eq(note945u2),

              (record) => expect(record.get('523')[0].ind1).to.eq(' '),
              (record) => expect(record.get('523')[0].ind2).to.eq(' '),
              (record) => expect(record.get('523')[0].subf[0][0]).to.eq('d'),
              (record) => expect(record.get('523')[0].subf[0][1]).to.eq(newNote523d),
              (record) => expect(record.get('999')[0].subf[0][0]).to.eq('i'),
              (record) => expect(record.get('999')[0].subf[0][1]).to.eq(marcInstance.uuid),
            ],
          },
        ];

        parseMrcFileContentAndVerify(fileNames.previewMarc, assertionsOnMarcFileContent, 1);

        // Step 12: Download preview in CSV format
        BulkEditActions.downloadPreview();
        BulkEditFiles.verifyValueInRowByUUID(
          fileNames.previewCSV,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_HRID,
          marcInstance.hrid,
          'Notes',
          '',
        );

        // Step 13: Commit changes
        BulkEditActions.commitChanges();
        BulkEditActions.verifySuccessBanner(1);
        BulkEditSearchPane.verifyCellWithContentAbsentsInChangesAccordion(
          newNote945a,
          newNote945u1,
          newNote523d,
        );
        BulkEditSearchPane.verifyPaginatorInChangedRecords(1);

        // Step 14: Download changed records in MARC format
        BulkEditActions.openActions();
        BulkEditActions.downloadChangedMarc();

        parseMrcFileContentAndVerify(fileNames.changedRecordsMarc, assertionsOnMarcFileContent, 1);

        // Step 15: Download changed records in CSV format
        BulkEditActions.downloadChangedCSV();
        BulkEditFiles.verifyValueInRowByUUID(
          fileNames.changedRecordsCSV,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_HRID,
          marcInstance.hrid,
          'Notes',
          '',
        );

        // Step 16: Verify changes in Inventory app
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
        InventorySearchAndFilter.searchInstanceByTitle(marcInstance.title);
        InventoryInstances.selectInstance();
        InventoryInstance.waitLoading();
        InstanceRecordView.verifyRecentLastUpdatedDateAndTime();

        const notes = [newNote945a, newNote945u1, newNote523d];

        notes.forEach((note) => {
          InstanceRecordView.verifyNoteTextAbsentInInstanceAccordion(note);
        });

        // Step 17: Verify changes in MARC source
        InstanceRecordView.viewSource();
        InventoryViewSource.verifyFieldInMARCBibSource(
          '945',
          `\t945\t0  \t$a ${newNote945a} $u ${newNote945u1} $u ${note945u2}`,
        );
        InventoryViewSource.verifyFieldInMARCBibSource('523', `\t523\t   \t$d ${newNote523d}`);
        InventoryViewSource.verifyFieldContent(
          3,
          DateTools.getFormattedEndDateWithTimUTC(new Date()),
        );
      },
    );
  });
});
