import permissions from '../../../../support/dictionary/permissions';
import BulkEditActions from '../../../../support/fragments/bulk-edit/bulk-edit-actions';
import BulkEditSearchPane, {
  ERROR_MESSAGES,
} from '../../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import BulkEditFiles from '../../../../support/fragments/bulk-edit/bulk-edit-files';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import Users from '../../../../support/fragments/users/users';
import FileManager from '../../../../support/utils/fileManager';
import getRandomPostfix from '../../../../support/utils/stringTools';
import InventorySearchAndFilter from '../../../../support/fragments/inventory/inventorySearchAndFilter';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import ConsortiumManager from '../../../../support/fragments/settings/consortium-manager/consortium-manager';
import Affiliations, { tenantNames } from '../../../../support/dictionary/affiliations';
import { APPLICATION_NAMES, BULK_EDIT_TABLE_COLUMN_HEADERS } from '../../../../support/constants';
import TopMenuNavigation from '../../../../support/fragments/topMenuNavigation';
import InstanceRecordView from '../../../../support/fragments/inventory/instanceRecordView';
import InstanceNoteTypes from '../../../../support/fragments/settings/inventory/instance-note-types/instanceNoteTypes';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import ExportFile from '../../../../support/fragments/data-export/exportFile';

let user;
let instanceTypeId;
let dissertationNoteTypeId;
let generalNoteTypeId;
const folioInstance = {
  title: `AT_C566139_FolioInstance_${getRandomPostfix()}`,
};
const marcInstance = {
  title: `AT_C566139_MarcInstance_${getRandomPostfix()}`,
};
const notes = {
  dissertation: 'Dissertation note',
  general: 'General note',
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
    tag: '500',
    content: `$a ${notes.general}`,
    indicators: ['\\', '\\'],
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
const errorReason = ERROR_MESSAGES.EDIT_MARC_INSTANCE_NOTES_NOT_SUPPORTED;

describe('Bulk-edit', () => {
  describe('Member tenant', () => {
    describe('Consortia', () => {
      before('create test data', () => {
        cy.getAdminToken();
        cy.createTempUser().then((userProperties) => {
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
              query: 'name=="General note"',
            }).then(({ instanceNoteTypes }) => {
              generalNoteTypeId = instanceNoteTypes[0].id;
            });
            InstanceNoteTypes.getInstanceNoteTypesViaApi({
              limit: 1,
              query: 'name=="Dissertation note"',
            })
              .then(({ instanceNoteTypes }) => {
                dissertationNoteTypeId = instanceNoteTypes[0].id;
              })
              .then(() => {
                InventoryInstances.createFolioInstanceViaApi({
                  instance: {
                    instanceTypeId,
                    title: folioInstance.title,
                    notes: [
                      {
                        instanceNoteTypeId: generalNoteTypeId,
                        note: notes.general,
                        staffOnly: false,
                      },
                      {
                        instanceNoteTypeId: dissertationNoteTypeId,
                        note: notes.dissertation,
                        staffOnly: true,
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

                      FileManager.createFile(
                        `cypress/fixtures/${instanceUUIDsFileName}`,
                        `${folioInstance.uuid}\n${marcInstance.uuid}`,
                      );
                    });
                  });
                });
              });
          });

          cy.resetTenant();
          cy.login(user.username, user.password);
          ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.BULK_EDIT);
        });
      });

      after('delete test data', () => {
        cy.resetTenant();
        cy.getAdminToken();
        Users.deleteViaApi(user.userId);

        cy.withinTenant(Affiliations.College, () => {
          instances.forEach((instance) => {
            InventoryInstance.deleteInstanceViaApi(instance.uuid);
          });
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
        'C566139 Verify "Staff only" action for Instances notes in Member tenant (consortia) (firebird)',
        { tags: ['criticalPathECS', 'firebird', 'C566139'] },
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
          BulkEditFiles.verifyValueInRowByUUID(
            matchedRecordsFileName,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_UUID,
            folioInstance.uuid,
            'Notes',
            `${BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.GENERAL_NOTE};${notes.general};false | ${BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.DISSERTATION_NOTE};${notes.dissertation};true`,
          );
          BulkEditFiles.verifyValueInRowByUUID(
            matchedRecordsFileName,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_UUID,
            marcInstance.uuid,
            'Notes',
            `${BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.GENERAL_NOTE};${notes.general};false | ${BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.DISSERTATION_NOTE};${notes.dissertation};false`,
          );
          BulkEditActions.openStartBulkEditFolioInstanceForm();
          BulkEditActions.verifyInitialStateBulkEditForm();
          BulkEditActions.markAsStaffOnly(
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.GENERAL_NOTE,
          );
          BulkEditActions.verifyConfirmButtonDisabled(false);
          BulkEditActions.addNewBulkEditFilterString();
          BulkEditActions.verifyNewBulkEditRow();
          BulkEditActions.removeMarkAsStaffOnly(
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.DISSERTATION_NOTE,
            1,
          );
          BulkEditActions.verifyConfirmButtonDisabled(false);
          BulkEditActions.confirmChanges();
          BulkEditActions.verifyMessageBannerInAreYouSureForm(2);

          instances.forEach((instance) => {
            BulkEditSearchPane.verifyExactChangesInMultipleColumnsByIdentifierInAreYouSureForm(
              instance.hrid,
              [
                {
                  header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.GENERAL_NOTE,
                  value: `${notes.general} (staff only)`,
                },
                {
                  header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.DISSERTATION_NOTE,
                  value: notes.dissertation,
                },
              ],
            );
          });

          BulkEditActions.verifyAreYouSureForm(2);
          BulkEditActions.downloadPreview();

          instances.forEach((instance) => {
            BulkEditFiles.verifyValueInRowByUUID(
              previewFileName,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_UUID,
              instance.uuid,
              'Notes',
              `${BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.GENERAL_NOTE};${notes.general};true|${BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.DISSERTATION_NOTE};${notes.dissertation};false`,
            );
          });

          BulkEditActions.commitChanges();
          BulkEditActions.verifySuccessBanner(1);
          BulkEditSearchPane.verifyExactChangesInMultipleColumnsByIdentifierInChangesAccordion(
            folioInstance.hrid,
            [
              {
                header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.GENERAL_NOTE,
                value: `${notes.general} (staff only)`,
              },
              {
                header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.DISSERTATION_NOTE,
                value: notes.dissertation,
              },
            ],
          );
          BulkEditSearchPane.verifyErrorLabel(2);
          BulkEditSearchPane.verifyError(marcInstance.uuid, errorReason);
          BulkEditActions.openActions();
          BulkEditActions.downloadChangedCSV();
          BulkEditFiles.verifyValueInRowByUUID(
            changedRecordsFileName,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_UUID,
            folioInstance.uuid,
            'Notes',
            `${BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.GENERAL_NOTE};${notes.general};true|${BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.DISSERTATION_NOTE};${notes.dissertation};false`,
          );
          BulkEditActions.downloadErrors();
          ExportFile.verifyFileIncludes(errorsFromCommittingFileName, [
            `ERROR,${marcInstance.uuid},${errorReason}`,
            `ERROR,${marcInstance.uuid},${errorReason}`,
          ]);
          BulkEditFiles.verifyCSVFileRecordsNumber(errorsFromCommittingFileName, 2);

          instances.forEach((instance) => {
            TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
            InventorySearchAndFilter.searchInstanceByTitle(instance.title);
            InventoryInstances.selectInstance();
            InventoryInstance.waitLoading();
            cy.wait(3000);
            InstanceRecordView.checkMultipleItemNotesWithStaffOnly(
              0,
              'No',
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.DISSERTATION_NOTE,
              notes.dissertation,
            );
            InstanceRecordView.checkMultipleItemNotesWithStaffOnly(
              1,
              instance === folioInstance ? 'Yes' : 'No',
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.GENERAL_NOTE,
              notes.general,
            );
          });
        },
      );
    });
  });
});
