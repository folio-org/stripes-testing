import permissions from '../../../../support/dictionary/permissions';
import BulkEditActions from '../../../../support/fragments/bulk-edit/bulk-edit-actions';
import BulkEditSearchPane from '../../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import BulkEditFiles from '../../../../support/fragments/bulk-edit/bulk-edit-files';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import FileManager from '../../../../support/utils/fileManager';
import getRandomPostfix from '../../../../support/utils/stringTools';
import ExportFile from '../../../../support/fragments/data-export/exportFile';
import InventorySearchAndFilter from '../../../../support/fragments/inventory/inventorySearchAndFilter';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import ConsortiumManager from '../../../../support/fragments/settings/consortium-manager/consortium-manager';
import { tenantNames } from '../../../../support/dictionary/affiliations';
import { APPLICATION_NAMES, BULK_EDIT_TABLE_COLUMN_HEADERS } from '../../../../support/constants';
import TopMenuNavigation from '../../../../support/fragments/topMenuNavigation';
import InstanceRecordView from '../../../../support/fragments/inventory/instanceRecordView';
import InstanceNoteTypes from '../../../../support/fragments/settings/inventory/instance-note-types/instanceNoteTypes';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';

let user;
let instanceTypeId;
let noteTypeId;
const folioInstance = {
  title: `AT_C478265_FolioInstance_${getRandomPostfix()}`,
};
const marcInstance = {
  title: `AT_C478265_MarcInstance_${getRandomPostfix()}`,
};
const notes = {
  administrative: 'Test administrative note',
  dissertation: 'Test dissertation note',
  dissertationStaffOnly: 'Test dissertation staff only note',
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
];
const instances = [folioInstance, marcInstance];
const instanceUUIDsFileName = `instanceUUIdsFileName_${getRandomPostfix()}.csv`;
const matchedRecordsFileName = BulkEditFiles.getMatchedRecordsFileName(instanceUUIDsFileName, true);
const previewFileName = BulkEditFiles.getPreviewFileName(instanceUUIDsFileName, true);
const changedRecordsFileName = BulkEditFiles.getChangedRecordsFileName(instanceUUIDsFileName, true);
const errorsFromCommittingFileName = BulkEditFiles.getErrorsFromCommittingFileName(
  instanceUUIDsFileName,
  true,
);
const errorReason = 'Bulk edit of instance notes is not supported for MARC Instances.';

describe('Bulk-edit', () => {
  describe('Central tenant', () => {
    describe('Consortia', () => {
      before('create test data', () => {
        cy.getAdminToken();
        cy.createTempUser([
          permissions.bulkEditEdit.gui,
          permissions.uiInventoryViewCreateEditInstances.gui,
        ]).then((userProperties) => {
          user = userProperties;

          cy.getInstanceTypes({ limit: 1 }).then((instanceTypes) => {
            instanceTypeId = instanceTypes[0].id;
          });
          InstanceNoteTypes.getInstanceNoteTypesViaApi({
            limit: 1,
            query: 'name=="Dissertation note"',
          })
            .then(({ instanceNoteTypes }) => {
              noteTypeId = instanceNoteTypes[0].id;
            })
            .then(() => {
              InventoryInstances.createFolioInstanceViaApi({
                instance: {
                  instanceTypeId,
                  title: folioInstance.title,
                  administrativeNotes: [notes.administrative],
                  notes: [
                    {
                      instanceNoteTypeId: noteTypeId,
                      note: notes.dissertationStaffOnly,
                      staffOnly: true,
                    },
                    {
                      instanceNoteTypeId: noteTypeId,
                      note: notes.dissertation,
                      staffOnly: false,
                    },
                  ],
                },
              }).then((createdInstanceData) => {
                folioInstance.uuid = createdInstanceData.instanceId;

                cy.getInstanceById(folioInstance.uuid).then((instanceData) => {
                  folioInstance.hrid = instanceData.hrid;
                });

                cy.createMarcBibliographicViaAPI(
                  QuickMarcEditor.defaultValidLdr,
                  marcInstanceFields,
                ).then((instanceId) => {
                  marcInstance.uuid = instanceId;

                  cy.getInstanceById(marcInstance.uuid).then((instanceData) => {
                    marcInstance.hrid = instanceData.hrid;
                    instanceData.administrativeNotes = [notes.administrative];
                    cy.updateInstance(instanceData);

                    FileManager.createFile(
                      `cypress/fixtures/${instanceUUIDsFileName}`,
                      `${folioInstance.uuid}\n${marcInstance.uuid}`,
                    );
                  });
                });
              });
            });

          cy.resetTenant();
          cy.login(user.username, user.password, {
            path: TopMenu.bulkEditPath,
            waiter: BulkEditSearchPane.waitLoading,
          });
          ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.central);
        });
      });

      after('delete test data', () => {
        cy.resetTenant();
        cy.getAdminToken();
        Users.deleteViaApi(user.userId);

        instances.forEach((instance) => {
          InventoryInstance.deleteInstanceViaApi(instance.uuid);
        });

        FileManager.deleteFile(`cypress/fixtures/${instanceUUIDsFileName}`);
        FileManager.deleteFileFromDownloadsByMask(
          matchedRecordsFileName,
          previewFileName,
          changedRecordsFileName,
          errorsFromCommittingFileName,
        );
      });

      it(
        'C478265 Verify "Remove all" action for Instances notes in Central tenant (consortia) (firebird)',
        { tags: ['criticalPathECS', 'firebird', 'C478265'] },
        () => {
          BulkEditSearchPane.verifyDragNDropRecordTypeIdentifierArea('Instance', 'Instance UUIDs');
          BulkEditSearchPane.uploadFile(instanceUUIDsFileName);
          BulkEditSearchPane.checkForUploading(instanceUUIDsFileName);
          BulkEditSearchPane.waitFileUploading();
          BulkEditSearchPane.verifyPaneTitleFileName(instanceUUIDsFileName);
          BulkEditSearchPane.verifyPaneRecordsCount('2 instance');
          BulkEditSearchPane.verifyFileNameHeadLine(instanceUUIDsFileName);

          instances.forEach((instance) => {
            BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInResultsAccordion(
              instance.hrid,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_HRID,
              instance.hrid,
            );
          });

          BulkEditSearchPane.verifyPaginatorInMatchedRecords(2);
          BulkEditActions.downloadMatchedResults();

          instances.forEach((instance) => {
            BulkEditFiles.verifyValueInRowByUUID(
              matchedRecordsFileName,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_UUID,
              instance.uuid,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.ADMINISTRATIVE_NOTE,
              notes.administrative,
            );
          });

          BulkEditFiles.verifyValueInRowByUUID(
            matchedRecordsFileName,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_UUID,
            marcInstance.uuid,
            'Notes',
            `Dissertation note;${notes.dissertation};false`,
          );
          BulkEditFiles.verifyValueInRowByUUID(
            matchedRecordsFileName,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_UUID,
            folioInstance.uuid,
            'Notes',
            `Dissertation note;${notes.dissertationStaffOnly};true | Dissertation note;${notes.dissertation};false`,
          );
          BulkEditActions.openStartBulkEditFolioInstanceForm();
          BulkEditActions.verifyInitialStateBulkEditForm();
          BulkEditActions.noteRemoveAll(
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.ADMINISTRATIVE_NOTE,
          );
          BulkEditActions.verifyConfirmButtonDisabled(false);
          BulkEditActions.addNewBulkEditFilterString();
          BulkEditActions.verifyNewBulkEditRow();
          BulkEditActions.noteRemoveAll(
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.DISSERTATION_NOTE,
            1,
          );
          BulkEditActions.verifyConfirmButtonDisabled(false);
          BulkEditActions.confirmChanges();
          BulkEditActions.verifyMessageBannerInAreYouSureForm(2);

          instances.forEach((instance) => {
            BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifier(
              instance.hrid,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.ADMINISTRATIVE_NOTE,
              '',
            );
            BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifier(
              instance.hrid,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.DISSERTATION_NOTE,
              '',
            );
          });

          BulkEditActions.verifyAreYouSureForm(2);
          BulkEditActions.downloadPreview();

          instances.forEach((instance) => {
            BulkEditFiles.verifyValueInRowByUUID(
              previewFileName,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_UUID,
              instance.uuid,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.ADMINISTRATIVE_NOTE,
              '',
            );
            BulkEditFiles.verifyValueInRowByUUID(
              previewFileName,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_UUID,
              instance.uuid,
              'Notes',
              '',
            );
          });

          BulkEditActions.commitChanges();
          BulkEditActions.verifySuccessBanner(2);

          instances.forEach((instance) => {
            BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInChangesAccordion(
              instance.hrid,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.ADMINISTRATIVE_NOTE,
              '',
            );
          });

          BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInChangesAccordion(
            marcInstance.hrid,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.DISSERTATION_NOTE,
            notes.dissertation,
          );
          BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInChangesAccordion(
            folioInstance.hrid,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.DISSERTATION_NOTE,
            '',
          );
          BulkEditSearchPane.verifyErrorLabel(1);
          BulkEditSearchPane.verifyShowWarningsCheckbox(true, false);
          BulkEditSearchPane.verifyErrorByIdentifier(marcInstance.uuid, errorReason);
          BulkEditActions.openActions();
          BulkEditActions.downloadChangedCSV();

          instances.forEach((instance) => {
            BulkEditFiles.verifyValueInRowByUUID(
              changedRecordsFileName,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_UUID,
              instance.uuid,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.ADMINISTRATIVE_NOTE,
              '',
            );
          });

          BulkEditFiles.verifyValueInRowByUUID(
            changedRecordsFileName,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_UUID,
            marcInstance.uuid,
            'Notes',
            `Dissertation note;${notes.dissertation};false`,
          );
          BulkEditFiles.verifyValueInRowByUUID(
            changedRecordsFileName,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_UUID,
            folioInstance.uuid,
            'Notes',
            '',
          );
          BulkEditActions.downloadErrors();
          ExportFile.verifyFileIncludes(errorsFromCommittingFileName, [
            `ERROR,${marcInstance.uuid},${errorReason}`,
          ]);

          instances.forEach((instance) => {
            TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
            InventorySearchAndFilter.searchInstanceByTitle(instance.title);
            InventoryInstances.selectInstance();
            InventoryInstance.waitLoading();
            cy.wait(3000);
            InstanceRecordView.verifyAdministrativeNote('No value set-');

            if (instance === folioInstance) {
              InstanceRecordView.verifyNoteTextAbsentInInstanceAccordion(notes.dissertation);
            } else {
              InstanceRecordView.checkMultipleItemNotesWithStaffOnly(
                0,
                'No',
                BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.DISSERTATION_NOTE,
                notes.dissertation,
              );
            }
          });
        },
      );
    });
  });
});
