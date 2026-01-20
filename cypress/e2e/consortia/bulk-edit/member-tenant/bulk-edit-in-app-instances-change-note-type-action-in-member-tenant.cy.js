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
import Affiliations, { tenantNames } from '../../../../support/dictionary/affiliations';
import { APPLICATION_NAMES, BULK_EDIT_TABLE_COLUMN_HEADERS } from '../../../../support/constants';
import TopMenuNavigation from '../../../../support/fragments/topMenuNavigation';
import InstanceRecordView from '../../../../support/fragments/inventory/instanceRecordView';
import InstanceNoteTypes from '../../../../support/fragments/settings/inventory/instance-note-types/instanceNoteTypes';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';

let user;
let instanceTypeId;
let reproductioNoteTypeId;
let actionNoteTypeId;
const folioInstance = {
  title: `C566126 folio instance testBulkEdit_${getRandomPostfix()}`,
};
const marcInstance = {
  title: `C566126 marc instance testBulkEdit_${getRandomPostfix()}`,
};
const notes = {
  administrative: 'Administrative note',
  action: 'Action note',
  reproduction: 'Reproduction note',
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
    content: `$a ${notes.reproduction}`,
    indicators: ['\\', '\\'],
  },
  {
    tag: '583',
    content: `$a ${notes.action}`,
    indicators: ['\\', '\\'],
  },
];
const instances = [folioInstance, marcInstance];
const instanceHRIDsFileName = `instanceHRIdsFileName_${getRandomPostfix()}.csv`;
const matchedRecordsFileName = BulkEditFiles.getMatchedRecordsFileName(instanceHRIDsFileName, true);
const previewFileName = BulkEditFiles.getPreviewFileName(instanceHRIDsFileName, true);
const changedRecordsFileName = BulkEditFiles.getChangedRecordsFileName(instanceHRIDsFileName, true);
const errorsFromCommittingFileName = BulkEditFiles.getErrorsFromCommittingFileName(
  instanceHRIDsFileName,
  true,
);
const errorReasonNotes = ERROR_MESSAGES.EDIT_MARC_INSTANCE_NOTES_NOT_SUPPORTED;
const errorReasonAdminNotes = ERROR_MESSAGES.ADMINISTRATIVE_NOTES_NOT_SUPPORTED_FOR_MARC;

describe('Bulk-edit', () => {
  describe('Member tenant', () => {
    describe('Consortia', () => {
      before('create test data', () => {
        cy.clearLocalStorage();
        cy.getAdminToken();
        cy.createTempUser([
          permissions.bulkEditEdit.gui,
          permissions.uiInventoryViewCreateEditInstances.gui,
        ]).then((userProperties) => {
          user = userProperties;

          cy.affiliateUserToTenant({
            tenantId: Affiliations.College,
            userId: user.userId,
            permissions: [
              permissions.bulkEditEdit.gui,
              permissions.uiInventoryViewCreateEditInstances.gui,
            ],
          });

          cy.withinTenant(Affiliations.College, () => {
            cy.getInstanceTypes({ limit: 1 }).then((instanceTypes) => {
              instanceTypeId = instanceTypes[0].id;
            });
            InstanceNoteTypes.getInstanceNoteTypesViaApi({
              limit: 1,
              query: 'name=="Action note"',
            }).then(({ instanceNoteTypes }) => {
              actionNoteTypeId = instanceNoteTypes[0].id;
            });
            InstanceNoteTypes.getInstanceNoteTypesViaApi({
              limit: 1,
              query: 'name=="Reproduction note"',
            })
              .then(({ instanceNoteTypes }) => {
                reproductioNoteTypeId = instanceNoteTypes[0].id;
              })
              .then(() => {
                InventoryInstances.createFolioInstanceViaApi({
                  instance: {
                    instanceTypeId,
                    title: folioInstance.title,
                    administrativeNotes: [notes.administrative],
                    notes: [
                      {
                        instanceNoteTypeId: reproductioNoteTypeId,
                        note: notes.reproduction,
                        staffOnly: true,
                      },
                      {
                        instanceNoteTypeId: actionNoteTypeId,
                        note: notes.action,
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
                        `cypress/fixtures/${instanceHRIDsFileName}`,
                        `${folioInstance.hrid}\n${marcInstance.hrid}`,
                      );
                    });
                  });
                });
              });
          });

          cy.resetTenant();
          cy.login(user.username, user.password, {
            path: TopMenu.bulkEditPath,
            waiter: BulkEditSearchPane.waitLoading,
          });
          ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
        });
      });

      after('delete test data', () => {
        cy.withinTenant(Affiliations.Consortia, () => {
          cy.getAdminToken();
          Users.deleteViaApi(user.userId);
        });
        cy.withinTenant(Affiliations.College, () => {
          instances.forEach((instance) => {
            InventoryInstance.deleteInstanceViaApi(instance.uuid);
          });
        });
        FileManager.deleteFile(`cypress/fixtures/${instanceHRIDsFileName}`);
        FileManager.deleteFileFromDownloadsByMask(
          matchedRecordsFileName,
          previewFileName,
          changedRecordsFileName,
          errorsFromCommittingFileName,
        );
      });

      it(
        'C566126 Verify "Change note type" action for Instances in Member tenant (consortia) (firebird)',
        { tags: ['criticalPathECS', 'firebird', 'C566126'] },
        () => {
          BulkEditSearchPane.verifyDragNDropRecordTypeIdentifierArea('Instance', 'Instance HRIDs');
          BulkEditSearchPane.uploadFile(instanceHRIDsFileName);
          BulkEditSearchPane.checkForUploading(instanceHRIDsFileName);
          BulkEditSearchPane.waitFileUploading();
          BulkEditSearchPane.verifyPaneTitleFileName(instanceHRIDsFileName);
          BulkEditSearchPane.verifyPaneRecordsCount('2 instance');
          BulkEditSearchPane.verifyFileNameHeadLine(instanceHRIDsFileName);

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
            `Reproduction note;${notes.reproduction};false | Action note;${notes.action};false`,
          );
          BulkEditFiles.verifyValueInRowByUUID(
            matchedRecordsFileName,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_UUID,
            folioInstance.uuid,
            'Notes',
            `Reproduction note;${notes.reproduction};true | Action note;${notes.action};false`,
          );
          BulkEditActions.openStartBulkEditFolioInstanceForm();
          BulkEditActions.verifyInitialStateBulkEditForm();
          BulkEditActions.changeNoteType(
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.ADMINISTRATIVE_NOTE,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.WITH_NOTE,
          );
          BulkEditActions.verifyConfirmButtonDisabled(false);
          BulkEditActions.addNewBulkEditFilterString();
          BulkEditActions.verifyNewBulkEditRow();
          BulkEditActions.changeNoteType(
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.REPRODUCTION_NOTE,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.GENERAL_NOTE,
            1,
          );
          BulkEditActions.verifyConfirmButtonDisabled(false);
          BulkEditActions.addNewBulkEditFilterString();
          BulkEditActions.verifyNewBulkEditRow(2);
          BulkEditActions.changeNoteType(
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.ACTION_NOTE,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.ADMINISTRATIVE_NOTE,
            2,
          );
          BulkEditActions.verifyConfirmButtonDisabled(false);
          BulkEditActions.confirmChanges();
          BulkEditActions.verifyMessageBannerInAreYouSureForm(2);

          instances.forEach((instance) => {
            BulkEditSearchPane.verifyExactChangesInMultipleColumnsByIdentifierInAreYouSureForm(
              instance.hrid,
              [
                {
                  header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.WITH_NOTE,
                  value: notes.administrative,
                },
                {
                  header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.ADMINISTRATIVE_NOTE,
                  value: notes.action,
                },
                {
                  header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.REPRODUCTION_NOTE,
                  value: '',
                },
              ],
            );
          });

          BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifier(
            folioInstance.hrid,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.GENERAL_NOTE,
            `${notes.reproduction} (staff only)`,
          );
          BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifier(
            marcInstance.hrid,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.GENERAL_NOTE,
            notes.reproduction,
          );
          BulkEditActions.verifyAreYouSureForm(2);
          BulkEditActions.downloadPreview();

          instances.forEach((instance) => {
            BulkEditFiles.verifyValueInRowByUUID(
              previewFileName,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_UUID,
              instance.uuid,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.ADMINISTRATIVE_NOTE,
              notes.action,
            );
          });

          BulkEditFiles.verifyValueInRowByUUID(
            previewFileName,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_UUID,
            marcInstance.uuid,
            'Notes',
            `${BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.GENERAL_NOTE};${notes.reproduction};false|${BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.WITH_NOTE};${notes.administrative};false`,
          );
          BulkEditFiles.verifyValueInRowByUUID(
            previewFileName,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_UUID,
            folioInstance.uuid,
            'Notes',
            `${BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.GENERAL_NOTE};${notes.reproduction};true|${BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.WITH_NOTE};${notes.administrative};false`,
          );
          BulkEditActions.commitChanges();
          BulkEditActions.verifySuccessBanner(1);
          BulkEditSearchPane.verifyExactChangesInMultipleColumnsByIdentifierInChangesAccordion(
            folioInstance.hrid,
            [
              {
                header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.WITH_NOTE,
                value: notes.administrative,
              },
              {
                header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.GENERAL_NOTE,
                value: `${notes.reproduction} (staff only)`,
              },
              {
                header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.ADMINISTRATIVE_NOTE,
                value: notes.action,
              },
              {
                header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.REPRODUCTION_NOTE,
                value: '',
              },
            ],
          );
          BulkEditSearchPane.verifyErrorLabel(3);
          BulkEditSearchPane.verifyReasonForError(errorReasonNotes);
          BulkEditSearchPane.verifyReasonForError(errorReasonAdminNotes);
          BulkEditSearchPane.verifyReasonForError(marcInstance.hrid);
          BulkEditActions.openActions();
          BulkEditActions.downloadChangedCSV();
          BulkEditFiles.verifyHeaderValueInRowByIdentifier(
            changedRecordsFileName,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_UUID,
            folioInstance.uuid,
            [
              {
                header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.ADMINISTRATIVE_NOTE,
                value: notes.action,
              },
              {
                header: 'Notes',
                value: `${BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.GENERAL_NOTE};${notes.reproduction};true|${BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.WITH_NOTE};${notes.administrative};false`,
              },
            ],
          );
          BulkEditActions.downloadErrors();
          ExportFile.verifyFileIncludes(errorsFromCommittingFileName, [
            `ERROR,${marcInstance.hrid},${errorReasonNotes}`,
            `ERROR,${marcInstance.hrid},${errorReasonAdminNotes}`,
          ]);
          BulkEditFiles.verifyCSVFileRecordsNumber(errorsFromCommittingFileName, 3);

          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
          InventorySearchAndFilter.searchInstanceByTitle(folioInstance.title);
          InventoryInstances.selectInstance();
          InventoryInstance.waitLoading();
          cy.wait(3000);
          InstanceRecordView.verifyAdministrativeNote(notes.action);
          InstanceRecordView.checkMultipleItemNotesWithStaffOnly(
            0,
            'Yes',
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.GENERAL_NOTE,
            notes.reproduction,
          );
          InstanceRecordView.checkMultipleItemNotesWithStaffOnly(
            1,
            'No',
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.WITH_NOTE,
            notes.administrative,
          );

          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
          InventorySearchAndFilter.searchInstanceByTitle(marcInstance.title);
          InventoryInstances.selectInstance();
          InventoryInstance.waitLoading();
          InstanceRecordView.verifyAdministrativeNote(notes.administrative);
          InstanceRecordView.checkMultipleItemNotesWithStaffOnly(
            0,
            'No',
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.ACTION_NOTE,
            notes.action,
          );
          InstanceRecordView.checkMultipleItemNotesWithStaffOnly(
            1,
            'No',
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.REPRODUCTION_NOTE,
            notes.reproduction,
          );
        },
      );
    });
  });
});
