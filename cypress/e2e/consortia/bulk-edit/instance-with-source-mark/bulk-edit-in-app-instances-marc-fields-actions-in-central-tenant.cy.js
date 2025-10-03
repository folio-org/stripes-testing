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
import ConsortiumManager from '../../../../support/fragments/settings/consortium-manager/consortium-manager';
import { tenantNames } from '../../../../support/dictionary/affiliations';
import { APPLICATION_NAMES, BULK_EDIT_TABLE_COLUMN_HEADERS } from '../../../../support/constants';
import TopMenuNavigation from '../../../../support/fragments/topMenuNavigation';
import InstanceRecordView from '../../../../support/fragments/inventory/instanceRecordView';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import parseMrcFileContentAndVerify from '../../../../support/utils/parseMrcFileContent';

let user;
const marcInstance = {
  title: `C543818 marc instance testBulkEdit_${getRandomPostfix()}`,
};
const notes = {
  addedAction: 'Action note v.5',
  dissertation: 'Mémoire de stage (3e cycle)',
  dataQuality:
    'The map layer that displays Special Feature Symbols shows the approximate location of small (less than 2 acres in size) areas of soils Estimated to be 98.5%. Approximately 95%',
  editedDataQuailty: 'Estimated to be 98.5%. Approximately 95%',
  firstLocal:
    "Born Kingston, N.Y., April 4, 1856; worked at J.J. Bufford's Lith. in Boston, 1990-1995.",
  firstLocalReplaced:
    "Born Kingston, N.Y., April 4, 1856; worked at J.J. Bufford's Lith. in Boston, 1890-1895.",
  secondLocalRemoved: '45 cu. ft. average annual accumulation 1970-1979.',
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
    tag: '502',
    content: `$a ${notes.dissertation}`,
    indicators: ['\\', '\\'],
  },
  {
    tag: '514',
    content:
      '$a The map layer that displays Special Feature Symbols shows the approximate location of small (less than 2 acres in size) areas of soils $b Estimated to be 98.5%. $b Approximately 95%',
    indicators: ['\\', '\\'],
  },
  {
    tag: '566',
    content: '$3 v.5',
    indicators: ['1', '1'],
  },
  {
    tag: '945',
    content:
      "$a Born Kingston, N.Y., April 4, 1856; worked at J.J. Bufford's Lith. in Boston, 1990-1995. $u http://www.test1.org $u https://www.test2.org",
    indicators: ['0', '\\'],
  },
  {
    tag: '984',
    content:
      '$a 45 cu. ft. average annual accumulation 1970-1979. $b An average of 15 reference requests per month, with peak demand during June and December. $3 General subject files $5 MH-H $6 530-00/(2/r $8 1\\p',
    indicators: ['\\', '\\'],
  },
];
const instanceUUIDsFileName = `instanceUUIdsFileName_${getRandomPostfix()}.csv`;
const previewFileName = BulkEditFiles.getPreviewMarcFileName(instanceUUIDsFileName, true);
const changedRecordsFileName = BulkEditFiles.getChangedRecordsMarcFileName(
  instanceUUIDsFileName,
  true,
);

describe('Bulk-edit', () => {
  describe('Instances with source MARC', () => {
    describe('Consortia', () => {
      before('create test data', () => {
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

              FileManager.createFile(
                `cypress/fixtures/${instanceUUIDsFileName}`,
                marcInstance.uuid,
              );
            });
          });

          cy.resetTenant();
          cy.login(user.username, user.password, {
            path: TopMenu.bulkEditPath,
            waiter: BulkEditSearchPane.waitLoading,
          });
          ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.central);
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
        cy.resetTenant();
        cy.getAdminToken();
        Users.deleteViaApi(user.userId);
        InventoryInstance.deleteInstanceViaApi(marcInstance.uuid);
        FileManager.deleteFile(`cypress/fixtures/${instanceUUIDsFileName}`);
        FileManager.deleteFileFromDownloadsByMask(previewFileName, changedRecordsFileName);
      });

      it(
        'C543818 ECS | Verify bulk edit actions for Instance MARC fields in Central tenant (consortia) (firebird)',
        { tags: ['criticalPathECS', 'firebird', 'C543818'] },
        () => {
          BulkEditActions.openActions();
          BulkEditSearchPane.changeShowColumnCheckboxIfNotYet(
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.SOURCE,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.DISSERTATION_NOTE,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.DATA_QUALITY_NOTE,
          );
          BulkEditSearchPane.verifyExactChangesInMultipleColumnsByIdentifierInResultsAccordion(
            marcInstance.hrid,
            [
              { header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.SOURCE, value: 'MARC' },
              {
                header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.DISSERTATION_NOTE,
                value: notes.dissertation,
              },
              {
                header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.DATA_QUALITY_NOTE,
                value: notes.dataQuality,
              },
            ],
          );
          BulkEditSearchPane.changeShowColumnCheckboxIfNotYet(
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.DISSERTATION_NOTE,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.DATA_QUALITY_NOTE,
          );
          BulkEditSearchPane.verifyResultColumnTitlesDoNotIncludeTitles(
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.DISSERTATION_NOTE,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.DATA_QUALITY_NOTE,
          );
          BulkEditActions.openStartBulkEditMarcInstanceForm();
          BulkEditActions.verifyInitialStateBulkEditMarcFieldsForm(
            instanceUUIDsFileName,
            '1 instance',
          );
          BulkEditActions.fillInTagAndIndicatorsAndSubfield('583', '0', '\\', 'a');
          BulkEditActions.selectActionForMarcInstance('Add');
          BulkEditActions.fillInDataTextAreaForMarcInstance('Action note');
          BulkEditActions.verifyConfirmButtonDisabled(false);
          BulkEditActions.verifyTheActionOptionsForMarcInstance(['Additional subfield']);
          BulkEditActions.selectSecondActionForMarcInstance('Additional subfield');
          BulkEditActions.verifyAdditionalSubfieldRowInitialState();
          BulkEditActions.fillInSubfieldInSubRow('3');
          BulkEditActions.fillInDataInSubRow('v.5');
          BulkEditActions.verifyConfirmButtonDisabled(false);
          BulkEditActions.addNewBulkEditFilterStringForMarcInstance();
          BulkEditActions.fillInTagAndIndicatorsAndSubfield('502', '\\', '\\', 'a', 1);
          BulkEditActions.findAndAppendActionForMarc(
            notes.dissertation,
            'c',
            'Université de Nantes',
            1,
          );
          BulkEditActions.verifyConfirmButtonDisabled(false);
          BulkEditActions.addNewBulkEditFilterStringForMarcInstance(1);
          BulkEditActions.fillInTagAndIndicatorsAndSubfield('514', '\\', '\\', 'a', 2);
          BulkEditActions.findAndRemoveSubfieldActionForMarc(
            'The map layer that displays Special Feature Symbols shows the approximate location of small (less than 2 acres in size) areas of soils',
            2,
          );
          BulkEditActions.verifyConfirmButtonDisabled(false);
          BulkEditActions.addNewBulkEditFilterStringForMarcInstance(2);
          BulkEditActions.fillInTagAndIndicatorsAndSubfield('566', '1', '1', '3', 3);
          BulkEditActions.findAndRemoveFieldActionForMarc('v.5', 3);
          BulkEditActions.verifyConfirmButtonDisabled(false);
          BulkEditActions.addNewBulkEditFilterStringForMarcInstance(3);
          BulkEditActions.fillInTagAndIndicatorsAndSubfield('945', '0', '\\', 'a', 4);
          BulkEditActions.findAndReplaceWithActionForMarc(
            notes.firstLocal,
            notes.firstLocalReplaced,
            4,
          );
          BulkEditActions.verifyConfirmButtonDisabled(false);
          BulkEditActions.addNewBulkEditFilterStringForMarcInstance(4);
          BulkEditActions.fillInTagAndIndicatorsAndSubfield('984', '\\', '\\', 'b', 5);
          BulkEditActions.selectActionForMarcInstance('Remove all', 5);
          BulkEditActions.verifyConfirmButtonDisabled(false);
          BulkEditActions.confirmChanges();
          BulkEditActions.verifyMessageBannerInAreYouSureForm(1);

          const editedHeaderValues = [
            {
              header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.ACTION_NOTE,
              value: `${notes.addedAction} (staff only)`,
            },
            {
              header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.DISSERTATION_NOTE,
              value: `${notes.dissertation} Université de Nantes`,
            },
            {
              header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.DATA_QUALITY_NOTE,
              value: notes.editedDataQuailty,
            },
          ];

          BulkEditSearchPane.verifyExactChangesInMultipleColumnsByIdentifierInAreYouSureForm(
            marcInstance.hrid,
            editedHeaderValues,
          );
          BulkEditSearchPane.verifyAreYouSureColumnTitlesDoNotInclude(
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.GENERAL_NOTE,
            true,
          );
          BulkEditActions.verifyAreYouSureForm(1);
          BulkEditActions.verifyDownloadPreviewInMarcFormatButtonEnabled();
          BulkEditActions.verifyCellWithContentAbsentsInAreYouSureForm(
            notes.firstLocalReplaced,
            notes.secondLocalRemoved,
          );
          BulkEditSearchPane.verifyPaginatorInAreYouSureForm(1);
          BulkEditActions.downloadPreviewInMarcFormat();

          const assertionsOnMarcFileContent = [
            {
              uuid: marcInstance.uuid,
              assertions: [
                (record) => expect(record.leader).to.exist,
                (record) => expect(record.get('001')).to.not.be.empty,
                (record) => expect(record.get('005')).to.not.be.empty,
                (record) => expect(record.get('008')).to.not.be.empty,
                (record) => expect(record.get('583')[0].ind1).to.eq('0'),
                (record) => expect(record.get('583')[0].ind2).to.eq(' '),
                (record) => expect(record.get('583')[0].subf[0][0]).to.eq('a'),
                (record) => expect(record.get('583')[0].subf[0][1]).to.eq('Action note'),
                (record) => expect(record.get('583')[0].subf[1][0]).to.eq('3'),
                (record) => expect(record.get('583')[0].subf[1][1]).to.eq('v.5'),
                (record) => expect(record.get('502')[0].ind1).to.eq(' '),
                (record) => expect(record.get('502')[0].ind2).to.eq(' '),
                (record) => expect(record.get('502')[0].subf[0][0]).to.eq('a'),
                (record) => expect(record.get('502')[0].subf[0][1]).to.eq(notes.dissertation),
                (record) => expect(record.get('502')[0].subf[1][0]).to.eq('c'),
                (record) => expect(record.get('502')[0].subf[1][1]).to.eq('Université de Nantes'),
                (record) => expect(record.get('514')[0].ind1).to.eq(' '),
                (record) => expect(record.get('514')[0].ind2).to.eq(' '),
                (record) => expect(record.get('514')[0].subf[0][0]).to.eq('b'),
                (record) => expect(record.get('514')[0].subf[0][1]).to.eq('Estimated to be 98.5%.'),
                (record) => expect(record.get('514')[0].subf[1][0]).to.eq('b'),
                (record) => expect(record.get('514')[0].subf[1][1]).to.eq('Approximately 95%'),
                (record) => expect(record.get('566')).to.be.empty,
                (record) => expect(record.get('945')[0].ind1).to.eq('0'),
                (record) => expect(record.get('945')[0].ind2).to.eq(' '),
                (record) => expect(record.get('945')[0].subf[0][0]).to.eq('a'),
                (record) => expect(record.get('945')[0].subf[0][1]).to.eq(notes.firstLocalReplaced),
                (record) => expect(record.get('945')[0].subf[1][0]).to.eq('u'),
                (record) => expect(record.get('945')[0].subf[1][1]).to.eq('http://www.test1.org'),
                (record) => expect(record.get('945')[0].subf[2][0]).to.eq('u'),
                (record) => expect(record.get('945')[0].subf[2][1]).to.eq('https://www.test2.org'),
                (record) => expect(record.get('984')).to.be.empty,
                (record) => expect(record.get('999')[0].subf[0][0]).to.eq('i'),
                (record) => expect(record.get('999')[0].subf[0][1]).to.eq(marcInstance.uuid),
              ],
            },
          ];

          parseMrcFileContentAndVerify(previewFileName, assertionsOnMarcFileContent, 1);

          BulkEditActions.commitChanges();
          BulkEditActions.verifySuccessBanner(1);
          BulkEditSearchPane.verifyExactChangesInMultipleColumnsByIdentifierInChangesAccordion(
            marcInstance.hrid,
            editedHeaderValues,
          );
          BulkEditSearchPane.verifyCellWithContentAbsentsInChangesAccordion(
            notes.firstLocalReplaced,
            notes.secondLocalRemoved,
          );
          BulkEditSearchPane.verifyChangedColumnTitlesDoNotInclude(
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.GENERAL_NOTE,
            true,
          );
          BulkEditSearchPane.verifyPaginatorInChangedRecords(1);
          BulkEditActions.openActions();
          BulkEditActions.downloadChangedMarc();

          parseMrcFileContentAndVerify(changedRecordsFileName, assertionsOnMarcFileContent, 1);

          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
          InventorySearchAndFilter.searchInstanceByTitle(marcInstance.title);
          InventoryInstances.selectInstance();
          InventoryInstance.waitLoading();
          InstanceRecordView.checkMultipleItemNotesWithStaffOnly(
            0,
            'Yes',
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.ACTION_NOTE,
            notes.addedAction,
          );
          InstanceRecordView.checkMultipleItemNotesWithStaffOnly(
            1,
            'No',
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.DATA_QUALITY_NOTE,
            notes.editedDataQuailty,
          );
          InstanceRecordView.checkMultipleItemNotesWithStaffOnly(
            2,
            'No',
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.DISSERTATION_NOTE,
            'Mémoire de stage (3e cycle) Université de Nantes',
          );
          InstanceRecordView.verifyNoteTextAbsentInInstanceAccordion(notes.firstLocalReplaced);
          InstanceRecordView.verifyNoteTextAbsentInInstanceAccordion(notes.secondLocalRemoved);
          InstanceRecordView.viewSource();
          InventoryViewSource.verifyFieldInMARCBibSource('583', '$a Action note $3 v.5');
          InventoryViewSource.verifyFieldInMARCBibSource(
            '502',
            `$a ${notes.dissertation} $c Université de Nantes`,
          );
          InventoryViewSource.verifyFieldInMARCBibSource(
            '514',
            '$b Estimated to be 98.5%. $b Approximately 95%',
          );
          InventoryViewSource.notContains('566\t');
          InventoryViewSource.verifyFieldInMARCBibSource(
            '945',
            `$a ${notes.firstLocalReplaced} $u http://www.test1.org $u https://www.test2.org`,
          );
          InventoryViewSource.notContains('984\t');
        },
      );
    });
  });
});
