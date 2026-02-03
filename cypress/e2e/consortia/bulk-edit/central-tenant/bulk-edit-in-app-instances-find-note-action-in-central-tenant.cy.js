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
  title: `C478257 folio instance testBulkEdit_${getRandomPostfix()}`,
};
const marcInstance = {
  title: `C478257 marc instance testBulkEdit_${getRandomPostfix()}`,
};
const notes = {
  adminUpperCase: 'Test [administrative] note',
  adminLowerCase: 'test [administrative] note',
  reproductionUpperCase: 'Test instance note',
  reproductionLowerCase: 'test instance note',
  reproductionMarc: 'Reproduction test instance note MARC',
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
    tag: '533',
    content: `$a ${notes.reproductionMarc}`,
    indicators: ['1', '0'],
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
const errorReason = ERROR_MESSAGES.EDIT_MARC_INSTANCE_NOTES_NOT_SUPPORTED;
const testParams = [
  {
    action: 'Replace',
    notesInitialValue: {
      adminUpperCase: 'Test [administrative] note',
      adminLowerCase: 'test [administrative] note',
      reproductionUpperCase: 'Test instance note',
      reproductionLowerCase: 'test instance note',
      reproductionMarc: 'Reproduction test instance note MARC',
    },
    notesUpdatedValue: {
      adminUpperCase: 'Test replaced note',
      adminLowerCase: 'test replaced note',
      adminLowerCaseInFile: 'test replaced note',
      reproductionUpperCase: 'Test replaced instance note',
      reproductionLowerCase: 'test replaced instance note',
      reproductionMarc: 'Reproduction test replaced instance note MARC',
    },
  },
  {
    action: 'Remove',
    notesInitialValue: {
      adminUpperCase: 'Test replaced note',
      adminLowerCase: 'test replaced note',
      reproductionUpperCase: 'Test replaced instance note',
      reproductionLowerCase: 'test replaced instance note',
      reproductionMarc: 'Reproduction test instance note MARC',
    },
    notesUpdatedValue: {
      adminUpperCase: 'Test ',
      adminLowerCase: 'test ',
      adminLowerCaseInFile: 'test',
      reproductionUpperCase: 'Test  instance note',
      reproductionLowerCase: 'test  instance note',
      reproductionMarc: 'Reproduction test instance note MARC',
    },
  },
];

describe('Bulk-edit', () => {
  describe('Central tenant', () => {
    describe('Consortia', () => {
      before('create test data', () => {
        cy.clearLocalStorage();
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
            query: 'name=="Reproduction note"',
          })
            .then(({ instanceNoteTypes }) => {
              noteTypeId = instanceNoteTypes[0].id;
            })
            .then(() => {
              InventoryInstances.createFolioInstanceViaApi({
                instance: {
                  instanceTypeId,
                  title: folioInstance.title,
                  administrativeNotes: [notes.adminUpperCase, notes.adminLowerCase],
                  notes: [
                    {
                      instanceNoteTypeId: noteTypeId,
                      note: notes.reproductionUpperCase,
                      staffOnly: true,
                    },
                    {
                      instanceNoteTypeId: noteTypeId,
                      note: notes.reproductionLowerCase,
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
                    instanceData.administrativeNotes = [notes.adminUpperCase, notes.adminLowerCase];
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
        'C478257 Verify "Find" action for Instances notes in Central tenant (consortia) (firebird)',
        { tags: ['criticalPathECS', 'firebird', 'C478257'] },
        () => {
          testParams.forEach((params) => {
            TopMenuNavigation.navigateToApp(APPLICATION_NAMES.BULK_EDIT);
            BulkEditSearchPane.clickToBulkEditMainButton();
            BulkEditSearchPane.verifyDefaultFilterState();
            BulkEditSearchPane.verifyDragNDropRecordTypeIdentifierArea(
              'Instance',
              'Instance UUIDs',
            );
            BulkEditSearchPane.uploadFile(instanceUUIDsFileName);
            BulkEditSearchPane.checkForUploading(instanceUUIDsFileName);
            BulkEditSearchPane.waitFileUploading();
            BulkEditSearchPane.verifyPaneTitleFileName(instanceUUIDsFileName);
            BulkEditSearchPane.verifyPaneRecordsCount('2 instance');
            BulkEditSearchPane.verifyFileNameHeadLine(instanceUUIDsFileName);
            BulkEditActions.openActions();
            BulkEditSearchPane.changeShowColumnCheckboxIfNotYet(
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.ADMINISTRATIVE_NOTE,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.REPRODUCTION_NOTE,
            );

            instances.forEach((instance) => {
              BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInResultsAccordion(
                instance.hrid,
                BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.ADMINISTRATIVE_NOTE,
                `${params.notesInitialValue.adminUpperCase} | ${params.notesInitialValue.adminLowerCase}`,
              );
            });
            BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInResultsAccordion(
              folioInstance.hrid,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.REPRODUCTION_NOTE,
              `${params.notesInitialValue.reproductionUpperCase} (staff only) | ${params.notesInitialValue.reproductionLowerCase}`,
            );

            BulkEditSearchPane.verifyPaginatorInMatchedRecords(2);
            BulkEditActions.openActions();
            BulkEditActions.downloadMatchedResults();

            instances.forEach((instance) => {
              BulkEditFiles.verifyValueInRowByUUID(
                matchedRecordsFileName,
                BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_UUID,
                instance.uuid,
                BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.ADMINISTRATIVE_NOTE,
                `${params.notesInitialValue.adminUpperCase} | ${params.notesInitialValue.adminLowerCase}`,
              );
            });

            BulkEditFiles.verifyValueInRowByUUID(
              matchedRecordsFileName,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_UUID,
              marcInstance.uuid,
              'Notes',
              `Reproduction note;${params.notesInitialValue.reproductionMarc};false`,
            );
            BulkEditFiles.verifyValueInRowByUUID(
              matchedRecordsFileName,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_UUID,
              folioInstance.uuid,
              'Notes',
              `Reproduction note;${params.notesInitialValue.reproductionUpperCase};true | Reproduction note;${params.notesInitialValue.reproductionLowerCase};false`,
            );
            BulkEditActions.openStartBulkEditFolioInstanceForm();
            BulkEditActions.verifyInitialStateBulkEditForm();

            if (params.action === 'Replace') {
              BulkEditActions.noteReplaceWith(
                BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.ADMINISTRATIVE_NOTE,
                '[administrative]',
                'replaced',
              );
              BulkEditActions.verifyConfirmButtonDisabled(false);
              BulkEditActions.addNewBulkEditFilterString();
              BulkEditActions.verifyNewBulkEditRow();
              BulkEditActions.noteReplaceWith(
                BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.REPRODUCTION_NOTE,
                'instance note',
                'replaced instance note',
                1,
              );
            } else {
              BulkEditActions.noteRemove(
                BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.ADMINISTRATIVE_NOTE,
                'replaced note',
              );
              BulkEditActions.verifyConfirmButtonDisabled(false);
              BulkEditActions.addNewBulkEditFilterString();
              BulkEditActions.verifyNewBulkEditRow();
              BulkEditActions.noteRemove(
                BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.REPRODUCTION_NOTE,
                'replaced',
                1,
              );
            }

            BulkEditActions.verifyConfirmButtonDisabled(false);
            BulkEditActions.confirmChanges();
            BulkEditActions.verifyMessageBannerInAreYouSureForm(2);

            instances.forEach((instance) => {
              BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifier(
                instance.hrid,
                BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.ADMINISTRATIVE_NOTE,
                `${params.notesUpdatedValue.adminUpperCase} | ${params.notesUpdatedValue.adminLowerCase}`,
              );
            });

            BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifier(
              folioInstance.hrid,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.REPRODUCTION_NOTE,
              `${params.notesUpdatedValue.reproductionUpperCase} (staff only) | ${params.notesUpdatedValue.reproductionLowerCase}`,
            );
            BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifier(
              marcInstance.hrid,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.REPRODUCTION_NOTE,
              params.notesUpdatedValue.reproductionMarc,
            );
            BulkEditActions.verifyAreYouSureForm(2);
            BulkEditActions.downloadPreview();

            instances.forEach((instance) => {
              BulkEditFiles.verifyValueInRowByUUID(
                previewFileName,
                BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_UUID,
                instance.uuid,
                BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.ADMINISTRATIVE_NOTE,
                `${params.notesUpdatedValue.adminUpperCase} | ${params.notesUpdatedValue.adminLowerCaseInFile}`,
              );
            });

            BulkEditFiles.verifyValueInRowByUUID(
              previewFileName,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_UUID,
              marcInstance.uuid,
              'Notes',
              `Reproduction note;${params.notesUpdatedValue.reproductionMarc};false`,
            );
            BulkEditFiles.verifyValueInRowByUUID(
              previewFileName,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_UUID,
              folioInstance.uuid,
              'Notes',
              `Reproduction note;${params.notesUpdatedValue.reproductionUpperCase};true|Reproduction note;${params.notesUpdatedValue.reproductionLowerCase};false`,
            );
            BulkEditActions.commitChanges();
            BulkEditActions.verifySuccessBanner(2);

            instances.forEach((instance) => {
              BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInChangesAccordion(
                instance.hrid,
                BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.ADMINISTRATIVE_NOTE,
                `${params.notesUpdatedValue.adminUpperCase} | ${params.notesUpdatedValue.adminLowerCase}`,
              );
            });

            BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInChangesAccordion(
              folioInstance.hrid,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.REPRODUCTION_NOTE,
              `${params.notesUpdatedValue.reproductionUpperCase} (staff only) | ${params.notesUpdatedValue.reproductionLowerCase}`,
            );
            BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInChangesAccordion(
              marcInstance.hrid,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.REPRODUCTION_NOTE,
              params.notesInitialValue.reproductionMarc,
            );
            BulkEditSearchPane.verifyErrorLabel(1);
            BulkEditSearchPane.verifyErrorByIdentifier(marcInstance.uuid, errorReason);
            BulkEditActions.openActions();
            BulkEditActions.downloadChangedCSV();

            instances.forEach((instance) => {
              BulkEditFiles.verifyValueInRowByUUID(
                changedRecordsFileName,
                BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_UUID,
                instance.uuid,
                BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.ADMINISTRATIVE_NOTE,
                `${params.notesUpdatedValue.adminUpperCase} | ${params.notesUpdatedValue.adminLowerCaseInFile}`,
              );
            });

            BulkEditFiles.verifyValueInRowByUUID(
              changedRecordsFileName,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_UUID,
              marcInstance.uuid,
              'Notes',
              `Reproduction note;${params.notesInitialValue.reproductionMarc};false`,
            );
            BulkEditFiles.verifyValueInRowByUUID(
              changedRecordsFileName,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_UUID,
              folioInstance.uuid,
              'Notes',
              `Reproduction note;${params.notesUpdatedValue.reproductionUpperCase};true|Reproduction note;${params.notesUpdatedValue.reproductionLowerCase};false`,
            );
            BulkEditActions.downloadErrors();
            ExportFile.verifyFileIncludes(errorsFromCommittingFileName, [
              `ERROR,${marcInstance.uuid},${errorReason}`,
            ]);

            TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
            cy.wait(4000);
            InventorySearchAndFilter.searchInstanceByTitle(folioInstance.title);
            InventoryInstances.selectInstance();
            InventoryInstance.waitLoading();
            InstanceRecordView.verifyAdministrativeNote(params.notesUpdatedValue.adminUpperCase);
            InstanceRecordView.verifyAdministrativeNote(params.notesUpdatedValue.adminLowerCase);
            InstanceRecordView.checkMultipleItemNotesWithStaffOnly(
              0,
              'Yes',
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.REPRODUCTION_NOTE,
              params.notesUpdatedValue.reproductionUpperCase,
            );
            InstanceRecordView.checkMultipleItemNotesWithStaffOnly(
              0,
              'No',
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.REPRODUCTION_NOTE,
              params.notesUpdatedValue.reproductionLowerCase,
              1,
            );
            InventorySearchAndFilter.resetAll();
            InventorySearchAndFilter.searchInstanceByTitle(marcInstance.title);
            InventoryInstances.selectInstance();
            InventoryInstance.waitLoading();
            InstanceRecordView.verifyAdministrativeNote(params.notesUpdatedValue.adminUpperCase);
            InstanceRecordView.verifyAdministrativeNote(params.notesUpdatedValue.adminLowerCase);
            InstanceRecordView.checkMultipleItemNotesWithStaffOnly(
              0,
              'No',
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.REPRODUCTION_NOTE,
              params.notesInitialValue.reproductionMarc,
            );
            InventorySearchAndFilter.resetAll();
          });
        },
      );
    });
  });
});
