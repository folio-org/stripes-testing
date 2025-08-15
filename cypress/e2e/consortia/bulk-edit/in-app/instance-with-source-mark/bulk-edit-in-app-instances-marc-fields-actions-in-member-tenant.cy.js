import permissions from '../../../../../support/dictionary/permissions';
import BulkEditActions from '../../../../../support/fragments/bulk-edit/bulk-edit-actions';
import BulkEditSearchPane from '../../../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import BulkEditFiles from '../../../../../support/fragments/bulk-edit/bulk-edit-files';
import InventoryInstances from '../../../../../support/fragments/inventory/inventoryInstances';
import TopMenu from '../../../../../support/fragments/topMenu';
import Users from '../../../../../support/fragments/users/users';
import FileManager from '../../../../../support/utils/fileManager';
import getRandomPostfix from '../../../../../support/utils/stringTools';
import InventorySearchAndFilter from '../../../../../support/fragments/inventory/inventorySearchAndFilter';
import InventoryInstance from '../../../../../support/fragments/inventory/inventoryInstance';
import InventoryViewSource from '../../../../../support/fragments/inventory/inventoryViewSource';
import ConsortiumManager from '../../../../../support/fragments/settings/consortium-manager/consortium-manager';
import Affiliations, { tenantNames } from '../../../../../support/dictionary/affiliations';
import {
  APPLICATION_NAMES,
  BULK_EDIT_TABLE_COLUMN_HEADERS,
} from '../../../../../support/constants';
import TopMenuNavigation from '../../../../../support/fragments/topMenuNavigation';
import InstanceRecordView from '../../../../../support/fragments/inventory/instanceRecordView';
import QuickMarcEditor from '../../../../../support/fragments/quickMarcEditor';
import parseMrcFileContentAndVerify from '../../../../../support/utils/parseMrcFileContent';

let user;
const marcInstance = {
  title: `C543845 marc instance testBulkEdit_${getRandomPostfix()}`,
};
const notes = {
  biographicalOrHistorical:
    'The Baton Rouge Audubon Society is a chapter of the National Audubon Society, a bird preservation group founded in 1905 and named for the American naturalist and wildlife painter John James Audubon (1785-1851).',
  biographicalOrHistoricalReplaced:
    'The Baton Rouge Audubon Society is a chapter of the National Audubon Society, a bird preservation group founded in 1905 and named for the American naturalist and wildlife painter John James Audubon (1785-1851). The Baton Rouge Audubon Society is dedicated to protecting birds, wildlife, and their habitats in Louisiana. More information about the Baton Rouge Audubon Society is available on its websites at:',
  fundingInformation:
    'Sponsored by the Advanced Research Projects Agency through the Office of Naval Research N00014-68-A-0245-0007 ARPA Order No. 2616 910 3450 601101F 1D161102B710 RF11121806 WU08',
  local: "Karl Schmidt's thesis (doctoral)",
  appendedLocal: 'Ludwig-Maximilians-Universität, Munich',
  addedLocal: 'Local note nine hundred one',
  field570: '"Selected bibliography": v. 1, p. 351-358, v. 2, p. 234-236.',
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
    tag: '902',
    content: `$a ${notes.local}`,
    indicators: ['\\', '\\'],
  },
  {
    tag: '570',
    content: `$a ${notes.field570} $5 NjP`,
    indicators: ['\\', '\\'],
  },
  {
    tag: '536',
    content:
      '$a Sponsored by the Advanced Research Projects Agency through the Office of Naval Research $b N00014-68-A-0245-0007 $c ARPA Order No. 2616 $d 910 3450 $e 601101F $f 1D161102B710 $g RF11121806 $h WU08 $6 245-03/ $8 1.3\\a',
    indicators: ['\\', '\\'],
  },
  {
    tag: '545',
    content: `$a ${notes.biographicalOrHistorical} $u http://www.braudubon.org/ $u http://www.braudubon.com/`,
    indicators: ['0', '\\'],
  },
  {
    tag: '584',
    content:
      '$a 5.4 cu. ft. average monthly accumulation, $b Total reference requests for 1984: 179. $3 Employee records $5 DLC $6 100-01/Cyrl $8 1.5\\a',
    indicators: ['\\', '\\'],
  },
];
const instanceUUIDsFileName = `instanceUUIdsFileName_${getRandomPostfix()}.csv`;
const previewFileNameMrc = BulkEditFiles.getPreviewMarcFileName(instanceUUIDsFileName, true);
const previewFileNameCsv = BulkEditFiles.getPreviewFileName(instanceUUIDsFileName, true);
const changedRecordsFileNameMrc = BulkEditFiles.getChangedRecordsMarcFileName(
  instanceUUIDsFileName,
  true,
);
const changedRecordsFileNameCsv = BulkEditFiles.getChangedRecordsFileName(
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

          cy.assignAffiliationToUser(Affiliations.College, user.userId);
          cy.setTenant(Affiliations.College);
          cy.assignPermissionsToExistingUser(user.userId, [
            permissions.bulkEditEdit.gui,
            permissions.uiInventoryViewCreateEditInstances.gui,
            permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
          ]);
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
          ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
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
        cy.setTenant(Affiliations.College);
        InventoryInstance.deleteInstanceViaApi(marcInstance.uuid);
        FileManager.deleteFile(`cypress/fixtures/${instanceUUIDsFileName}`);
        FileManager.deleteFileFromDownloadsByMask(
          previewFileNameMrc,
          previewFileNameCsv,
          changedRecordsFileNameMrc,
          changedRecordsFileNameCsv,
        );
      });

      it(
        'C543845 ECS | Verify bulk edit actions for Instance MARC fields in Member tenant (consortia) (firebird)',
        { tags: ['criticalPathECS', 'firebird', 'C543845'] },
        () => {
          BulkEditActions.openActions();
          BulkEditSearchPane.changeShowColumnCheckboxIfNotYet(
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.SOURCE,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.FUNDING_INFORMATION_NOTE,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.BIOGRAPHICAL_HISTORICAL_DATA,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.ACCUMULATION_FREQUENCY_USE_NOTE,
          );
          BulkEditSearchPane.verifyExactChangesInMultipleColumnsByIdentifierInResultsAccordion(
            marcInstance.hrid,
            [
              { header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.SOURCE, value: 'MARC' },
              {
                header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.FUNDING_INFORMATION_NOTE,
                value: notes.fundingInformation,
              },
              {
                header:
                  BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.BIOGRAPHICAL_HISTORICAL_DATA,
                value: `${notes.biographicalOrHistorical} http://www.braudubon.org/ http://www.braudubon.com/`,
              },
              {
                header:
                  BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES
                    .ACCUMULATION_FREQUENCY_USE_NOTE,
                value:
                  '5.4 cu. ft. average monthly accumulation, Total reference requests for 1984: 179. Employee records DLC',
              },
            ],
          );
          BulkEditSearchPane.changeShowColumnCheckboxIfNotYet(
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.FUNDING_INFORMATION_NOTE,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.BIOGRAPHICAL_HISTORICAL_DATA,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.ACCUMULATION_FREQUENCY_USE_NOTE,
          );
          BulkEditSearchPane.verifyResultColumnTitlesDoNotIncludeTitles(
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.FUNDING_INFORMATION_NOTE,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.BIOGRAPHICAL_HISTORICAL_DATA,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.ACCUMULATION_FREQUENCY_USE_NOTE,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.GENERAL_NOTE,
          );
          BulkEditActions.openStartBulkEditMarcInstanceForm();
          BulkEditActions.verifyInitialStateBulkEditMarcFieldsForm(
            instanceUUIDsFileName,
            '1 instance',
          );
          BulkEditActions.fillInTagAndIndicatorsAndSubfield('901', '\\', '\\', 'a');
          BulkEditActions.selectActionForMarcInstance('Add');
          BulkEditActions.fillInDataTextAreaForMarcInstance(notes.addedLocal);
          BulkEditActions.verifyConfirmButtonDisabled(false);
          BulkEditActions.verifyTheActionOptionsForMarcInstance(['Additional subfield']);
          BulkEditActions.selectSecondActionForMarcInstance('Additional subfield');
          BulkEditActions.verifyAdditionalSubfieldRowInitialState();
          BulkEditActions.fillInSubfieldInSubRow('3');
          BulkEditActions.fillInDataInSubRow('v.5');
          BulkEditActions.verifyConfirmButtonDisabled(false);
          BulkEditActions.addNewBulkEditFilterStringForMarcInstance();
          BulkEditActions.fillInTagAndIndicatorsAndSubfield('902', '\\', '\\', 'a', 1);
          BulkEditActions.findAndAppendActionForMarc(notes.local, 'c', notes.appendedLocal, 1);
          BulkEditActions.verifyConfirmButtonDisabled(false);
          BulkEditActions.addNewBulkEditFilterStringForMarcInstance(1);
          BulkEditActions.fillInTagAndIndicatorsAndSubfield('570', '\\', '\\', '5', 2);
          BulkEditActions.findAndRemoveSubfieldActionForMarc('NjP', 2);
          BulkEditActions.verifyConfirmButtonDisabled(false);
          BulkEditActions.addNewBulkEditFilterStringForMarcInstance(2);
          BulkEditActions.fillInTagAndIndicatorsAndSubfield('536', '\\', '\\', 'b', 3);
          BulkEditActions.findAndRemoveFieldActionForMarc('N00014-68-A-0245-0007', 3);
          BulkEditActions.verifyConfirmButtonDisabled(false);
          BulkEditActions.addNewBulkEditFilterStringForMarcInstance(3);
          BulkEditActions.fillInTagAndIndicatorsAndSubfield('545', '0', '\\', 'a', 4);
          BulkEditActions.findAndReplaceWithActionForMarc(
            notes.biographicalOrHistorical,
            notes.biographicalOrHistoricalReplaced,
            4,
          );
          BulkEditActions.verifyConfirmButtonDisabled(false);
          BulkEditActions.addNewBulkEditFilterStringForMarcInstance(4);
          BulkEditActions.fillInTagAndIndicatorsAndSubfield('584', '\\', '\\', 'b', 5);
          BulkEditActions.selectActionForMarcInstance('Remove all', 5);
          BulkEditActions.verifyConfirmButtonDisabled(false);
          BulkEditActions.confirmChanges();
          BulkEditActions.verifyMessageBannerInAreYouSureForm(1);

          const editedHeaderValues = [
            {
              header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.FUNDING_INFORMATION_NOTE,
              value: '',
            },
            {
              header:
                BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.BIOGRAPHICAL_HISTORICAL_DATA,
              value: `${notes.biographicalOrHistoricalReplaced} http://www.braudubon.org/ http://www.braudubon.com/`,
            },
            {
              header:
                BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.ACCUMULATION_FREQUENCY_USE_NOTE,
              value: '',
            },
          ];

          BulkEditSearchPane.verifyExactChangesInMultipleColumnsByIdentifierInAreYouSureForm(
            marcInstance.hrid,
            editedHeaderValues,
          );
          BulkEditActions.verifyCellWithContentAbsentsInAreYouSureForm(notes.field570, notes.local);
          BulkEditSearchPane.verifyAreYouSureColumnTitlesDoNotInclude(
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.GENERAL_NOTE,
            true,
          );
          BulkEditActions.verifyAreYouSureForm(1);
          BulkEditActions.verifyDownloadPreviewInMarcFormatButtonEnabled();
          BulkEditSearchPane.verifyPreviousPaginationButtonInAreYouSureFormDisabled();
          BulkEditSearchPane.verifyNextPaginationButtonInAreYouSureFormDisabled();
          BulkEditActions.downloadPreviewInMarcFormat();

          const assertionsOnMarcFileContent = [
            {
              uuid: marcInstance.uuid,
              assertions: [
                (record) => expect(record.get('901')[0].ind1).to.eq(' '),
                (record) => expect(record.get('901')[0].ind2).to.eq(' '),
                (record) => expect(record.get('901')[0].subf[0][0]).to.eq('a'),
                (record) => expect(record.get('901')[0].subf[0][1]).to.eq(notes.addedLocal),
                (record) => expect(record.get('901')[0].subf[1][0]).to.eq('3'),
                (record) => expect(record.get('901')[0].subf[1][1]).to.eq('v.5'),

                (record) => expect(record.get('902')[0].ind1).to.eq(' '),
                (record) => expect(record.get('902')[0].ind2).to.eq(' '),
                (record) => expect(record.get('902')[0].subf[0][0]).to.eq('a'),
                (record) => expect(record.get('902')[0].subf[0][1]).to.eq(notes.local),
                (record) => expect(record.get('902')[0].subf[1][0]).to.eq('c'),
                (record) => expect(record.get('902')[0].subf[1][1]).to.eq(notes.appendedLocal),

                (record) => expect(record.get('570')[0].ind1).to.eq(' '),
                (record) => expect(record.get('570')[0].ind2).to.eq(' '),
                (record) => expect(record.get('570')[0].subf[0][0]).to.eq('a'),
                (record) => expect(record.get('570')[0].subf[0][1]).to.eq(notes.field570),

                (record) => expect(record.get('536')).to.be.empty,

                (record) => expect(record.get('545')[0].ind1).to.eq('0'),
                (record) => expect(record.get('545')[0].ind2).to.eq(' '),
                (record) => expect(record.get('545')[0].subf[0][0]).to.eq('a'),
                (record) => {
                  expect(record.get('545')[0].subf[0][1]).to.eq(
                    notes.biographicalOrHistoricalReplaced,
                  );
                },
                (record) => expect(record.get('545')[0].subf[1][0]).to.eq('u'),
                (record) => expect(record.get('545')[0].subf[1][1]).to.eq('http://www.braudubon.org/'),
                (record) => expect(record.get('545')[0].subf[2][0]).to.eq('u'),
                (record) => expect(record.get('545')[0].subf[2][1]).to.eq('http://www.braudubon.com/'),

                (record) => expect(record.get('584')).to.be.empty,

                (record) => expect(record.get('999')[0].subf[0][0]).to.eq('i'),
                (record) => expect(record.get('999')[0].subf[0][1]).to.eq(marcInstance.uuid),
              ],
            },
          ];

          parseMrcFileContentAndVerify(previewFileNameMrc, assertionsOnMarcFileContent, 1);

          BulkEditActions.downloadPreview();
          BulkEditFiles.verifyValueInRowByUUID(
            previewFileNameCsv,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_HRID,
            marcInstance.hrid,
            'Notes',
            `${BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.BIOGRAPHICAL_HISTORICAL_DATA};${notes.biographicalOrHistoricalReplaced} http://www.braudubon.org/ http://www.braudubon.com/;false`,
          );
          BulkEditActions.commitChanges();
          BulkEditActions.verifySuccessBanner(1);
          BulkEditSearchPane.verifyExactChangesInMultipleColumnsByIdentifierInChangesAccordion(
            marcInstance.hrid,
            editedHeaderValues,
          );
          BulkEditSearchPane.verifyCellWithContentAbsentsInChangesAccordion(
            notes.field570,
            notes.local,
          );
          BulkEditSearchPane.verifyChangedColumnTitlesDoNotInclude(
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.GENERAL_NOTE,
            true,
          );
          BulkEditSearchPane.verifyPreviousPaginationButtonDisabled();
          BulkEditSearchPane.verifyNextPaginationButtonDisabled();
          BulkEditActions.openActions();
          BulkEditActions.downloadChangedMarc();

          parseMrcFileContentAndVerify(changedRecordsFileNameMrc, assertionsOnMarcFileContent, 1);

          BulkEditActions.downloadChangedCSV();
          BulkEditFiles.verifyValueInRowByUUID(
            changedRecordsFileNameCsv,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_HRID,
            marcInstance.hrid,
            'Notes',
            `${BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.BIOGRAPHICAL_HISTORICAL_DATA};${notes.biographicalOrHistoricalReplaced} http://www.braudubon.org/ http://www.braudubon.com/;false`,
          );

          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
          InventorySearchAndFilter.searchInstanceByTitle(marcInstance.title);
          InventoryInstances.selectInstance();
          InventoryInstance.waitLoading();
          InstanceRecordView.verifyNoteTextAbsentInInstanceAccordion(notes.field570);
          InstanceRecordView.verifyNoteTextAbsentInInstanceAccordion(notes.local);
          InstanceRecordView.verifyNoteTextAbsentInInstanceAccordion(notes.fundingInformation);
          InstanceRecordView.verifyNoteTextAbsentInInstanceAccordion(
            '5.4 cu. ft. average monthly accumulation, Total reference requests for 1984: 179. Employee records DLC 100-01/Cyrl 1.5\\a',
          );
          InstanceRecordView.verifyNoteTextAbsentInInstanceAccordion(
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.FUNDING_INFORMATION_NOTE,
          );
          InstanceRecordView.verifyNoteTextAbsentInInstanceAccordion(
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.ACCUMULATION_FREQUENCY_USE_NOTE,
          );
          InstanceRecordView.checkMultipleItemNotesWithStaffOnly(
            0,
            'No',
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.BIOGRAPHICAL_HISTORICAL_DATA,
            `${notes.biographicalOrHistoricalReplaced} http://www.braudubon.org/ http://www.braudubon.com/`,
          );
          InstanceRecordView.viewSource();
          InventoryViewSource.verifyFieldInMARCBibSource('901', `$a ${notes.addedLocal} $3 v.5`);
          InventoryViewSource.verifyFieldInMARCBibSource(
            '902',
            `$a ${notes.local} $c ${notes.appendedLocal}`,
          );
          InventoryViewSource.verifyFieldInMARCBibSource('570', `$a ${notes.field570}`);
          InventoryViewSource.notContains('536\t');
          InventoryViewSource.verifyFieldInMARCBibSource(
            '545',
            `$a ${notes.biographicalOrHistoricalReplaced} $u http://www.braudubon.org/ $u http://www.braudubon.com/`,
          );
          InventoryViewSource.notContains('584\t');
        },
      );
    });
  });
});
