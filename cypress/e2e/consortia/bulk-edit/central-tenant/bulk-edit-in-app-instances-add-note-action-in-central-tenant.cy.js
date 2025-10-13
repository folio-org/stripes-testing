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
import { getLongDelay } from '../../../../support/utils/cypressTools';
import { tenantNames } from '../../../../support/dictionary/affiliations';
import { APPLICATION_NAMES, BULK_EDIT_TABLE_COLUMN_HEADERS } from '../../../../support/constants';
import TopMenuNavigation from '../../../../support/fragments/topMenuNavigation';
import InstanceRecordView from '../../../../support/fragments/inventory/instanceRecordView';
import QueryModal, {
  QUERY_OPERATIONS,
  instanceFieldValues,
} from '../../../../support/fragments/bulk-edit/query-modal';
import DateTools from '../../../../support/utils/dateTools';

let user;
let instanceTypeId;
const postfix = getRandomPostfix();
const catalogDate = DateTools.getPreviousDayDateForFiscalYear();
const dateToPick = DateTools.getTwoPreviousDaysDateForFiscalYearOnUIEdit();
const folioInstance = {
  title: `AT_C477644_${postfix} FolioInstance`,
};
const marcInstance = {
  title: `AT_C477644_${postfix} MarcBibInstance`,
};
const notes = {
  administrative: "Administrative note ~,!,@,#,$,%,^,&,*,(,),~,', {.[,]<},>,ø, Æ, §,",
  dataQuality: 'New data quality note',
};
const instances = [folioInstance, marcInstance];
let identifiersQueryFilename;
let matchedRecordsQueryFileName;
let previewQueryFileName;
let changedRecordsQueryFileName;
let errorsFromCommittingFileName;
const errorReason = ERROR_MESSAGES.EDIT_MARC_INSTANCE_NOTES_NOT_SUPPORTED;

describe('Bulk-edit', () => {
  describe('Central tenant', () => {
    describe('Consortia', () => {
      before('create test data', () => {
        cy.getAdminToken();
        cy.createTempUser([
          permissions.bulkEditEdit.gui,
          permissions.bulkEditQueryView.gui,
          permissions.uiInventoryViewCreateEditInstances.gui,
        ]).then((userProperties) => {
          user = userProperties;

          cy.getInstanceTypes({ limit: 1 })
            .then((instanceTypes) => {
              instanceTypeId = instanceTypes[0].id;
            })
            .then(() => {
              InventoryInstances.createFolioInstanceViaApi({
                instance: {
                  instanceTypeId,
                  title: folioInstance.title,
                },
              }).then((createdInstanceData) => {
                folioInstance.uuid = createdInstanceData.instanceId;

                cy.getInstanceById(folioInstance.uuid).then((instanceData) => {
                  folioInstance.hrid = instanceData.hrid;
                  instanceData.catalogedDate = catalogDate;

                  cy.updateInstance(instanceData);
                });

                cy.createSimpleMarcBibViaAPI(marcInstance.title).then((instanceId) => {
                  marcInstance.uuid = instanceId;

                  cy.getInstanceById(marcInstance.uuid).then((instanceData) => {
                    marcInstance.hrid = instanceData.hrid;
                    instanceData.catalogedDate = catalogDate;

                    cy.updateInstance(instanceData);
                  });

                  cy.resetTenant();
                  cy.login(user.username, user.password, {
                    path: TopMenu.bulkEditPath,
                    waiter: BulkEditSearchPane.waitLoading,
                  });
                  ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.central);
                  BulkEditSearchPane.openQuerySearch();
                  BulkEditSearchPane.checkInstanceRadio();
                  BulkEditSearchPane.clickBuildQueryButton();
                  QueryModal.verify();
                  QueryModal.selectField(instanceFieldValues.catalogedDate);
                  QueryModal.verifySelectedField(instanceFieldValues.catalogedDate);
                  QueryModal.selectOperator(QUERY_OPERATIONS.GREATER_THAN_OR_EQUAL_TO);
                  QueryModal.pickDate(dateToPick);
                  QueryModal.addNewRow();
                  QueryModal.selectField(instanceFieldValues.instanceId, 1);
                  QueryModal.selectOperator(QUERY_OPERATIONS.IN, 1);
                  QueryModal.fillInValueTextfield(`${folioInstance.uuid},${marcInstance.uuid}`, 1);
                  cy.intercept('GET', '**/preview?limit=100&offset=0&step=UPLOAD*').as(
                    'getPreview',
                  );
                  cy.intercept('GET', '/query/**').as('waiterForQueryCompleted');
                  QueryModal.clickTestQuery();
                  QueryModal.waitForQueryCompleted('@waiterForQueryCompleted');
                });
              });
            });
        });
      });

      after('delete test data', () => {
        cy.resetTenant();
        cy.getAdminToken();
        Users.deleteViaApi(user.userId);

        instances.forEach((instance) => {
          InventoryInstance.deleteInstanceViaApi(instance.uuid);
        });

        FileManager.deleteFile(`cypress/fixtures/downloaded-${identifiersQueryFilename}`);
        FileManager.deleteFileFromDownloadsByMask(
          identifiersQueryFilename,
          matchedRecordsQueryFileName,
          previewQueryFileName,
          changedRecordsQueryFileName,
          errorsFromCommittingFileName,
        );
      });

      it(
        'C477644 Verify "Add note" action for Instances in Central tenant (consortia) (firebird)',
        { tags: ['criticalPathECS', 'firebird', 'C477644'] },
        () => {
          QueryModal.clickRunQuery();
          QueryModal.verifyClosed();
          cy.wait('@getPreview', getLongDelay()).then((interception) => {
            const interceptedUuid = interception.request.url.match(
              /bulk-operations\/([a-f0-9-]+)\/preview/,
            )[1];
            identifiersQueryFilename = `Query-${interceptedUuid}.csv`;
            matchedRecordsQueryFileName = `*-Matched-Records-Query-${interceptedUuid}.csv`;
            previewQueryFileName = `*-Updates-Preview-CSV-Query-${interceptedUuid}.csv`;
            changedRecordsQueryFileName = `*-Changed-Records-CSV-Query-${interceptedUuid}.csv`;
            errorsFromCommittingFileName = `*-Committing-changes-Errors-Query-${interceptedUuid}.csv`;

            BulkEditSearchPane.verifyBulkEditQueryPaneExists();
            BulkEditSearchPane.verifyRecordsCountInBulkEditQueryPane('2 instance');
            BulkEditSearchPane.verifyQueryHeadLine(
              `(instance.cataloged_date >= ${dateToPick}) AND (instance.id in (${folioInstance.uuid}, ${marcInstance.uuid}))`,
            );

            instances.forEach((instance) => {
              BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInResultsAccordion(
                instance.hrid,
                BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.RESOURCE_TITLE,
                instance.title,
              );
            });

            BulkEditSearchPane.verifyPaginatorInMatchedRecords(2);
            BulkEditActions.openActions();

            instances.forEach((instance) => {
              BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInResultsAccordion(
                instance.hrid,
                BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_HRID,
                instance.hrid,
              );
            });

            BulkEditActions.openActions();
            BulkEditActions.downloadMatchedResults();

            instances.forEach((instance) => {
              BulkEditFiles.verifyValueInRowByUUID(
                matchedRecordsQueryFileName,
                BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_UUID,
                instance.uuid,
                BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_HRID,
                instance.hrid,
              );
            });

            BulkEditActions.openStartBulkEditFolioInstanceForm();
            BulkEditActions.verifyBulkEditsAccordionExists();
            BulkEditActions.verifyOptionsDropdown();
            BulkEditActions.verifyRowIcons();
            BulkEditActions.verifyCancelButtonDisabled(false);
            BulkEditActions.verifyConfirmButtonDisabled(true);
            BulkEditActions.addItemNoteAndVerify(
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.ADMINISTRATIVE_NOTE,
              notes.administrative,
            );
            BulkEditActions.verifyConfirmButtonDisabled(false);
            BulkEditActions.addNewBulkEditFilterString();
            BulkEditActions.verifyNewBulkEditRow(1);
            BulkEditActions.addItemNoteAndVerify(
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.DATA_QUALITY_NOTE,
              notes.dataQuality,
              1,
            );
            BulkEditActions.verifyStaffOnlyCheckbox(false, 1);
            BulkEditActions.checkStaffOnlyCheckbox(1);
            BulkEditActions.verifyStaffOnlyCheckbox(true, 1);
            BulkEditActions.verifyConfirmButtonDisabled(false);
            BulkEditActions.confirmChanges();
            BulkEditActions.verifyMessageBannerInAreYouSureForm(2);

            const addedAdministrativeNote = {
              header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.ADMINISTRATIVE_NOTE,
              value: notes.administrative,
            };
            const addedDataQualityNote = {
              header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.DATA_QUALITY_NOTE,
              value: `${notes.dataQuality} (staff only)`,
            };
            const addedDataQualityNoteFileView = {
              header: 'Notes',
              value: `${BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.DATA_QUALITY_NOTE};${notes.dataQuality};true`,
            };

            instances.forEach((instance) => {
              BulkEditSearchPane.verifyExactChangesInMultipleColumnsByIdentifierInAreYouSureForm(
                instance.hrid,
                [addedAdministrativeNote, addedDataQualityNote],
              );
            });

            BulkEditActions.verifyAreYouSureForm(2);
            BulkEditActions.downloadPreview();

            instances.forEach((instance) => {
              BulkEditFiles.verifyHeaderValueInRowByIdentifier(
                previewQueryFileName,
                BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_HRID,
                instance.hrid,
                [addedAdministrativeNote, addedDataQualityNoteFileView],
              );
            });

            BulkEditActions.commitChanges();
            BulkEditActions.verifySuccessBanner(2);
            BulkEditSearchPane.verifyExactChangesInMultipleColumnsByIdentifierInChangesAccordion(
              folioInstance.hrid,
              [addedAdministrativeNote, addedDataQualityNote],
            );
            BulkEditSearchPane.verifyExactChangesInMultipleColumnsByIdentifierInChangesAccordion(
              marcInstance.hrid,
              [
                addedAdministrativeNote,
                {
                  header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.DATA_QUALITY_NOTE,
                  value: '',
                },
              ],
            );
            BulkEditSearchPane.verifyErrorLabel(1);
            BulkEditSearchPane.verifyErrorByIdentifier(marcInstance.uuid, errorReason);
            BulkEditActions.openActions();
            BulkEditActions.downloadChangedCSV();
            BulkEditFiles.verifyHeaderValueInRowByIdentifier(
              changedRecordsQueryFileName,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_UUID,
              folioInstance.uuid,
              [addedAdministrativeNote, addedDataQualityNoteFileView],
            );
            BulkEditFiles.verifyHeaderValueInRowByIdentifier(
              changedRecordsQueryFileName,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_UUID,
              marcInstance.uuid,
              [
                addedAdministrativeNote,
                {
                  header: 'Notes',
                  value: '',
                },
              ],
            );
            BulkEditActions.downloadErrors();
            ExportFile.verifyFileIncludes(errorsFromCommittingFileName, [
              `ERROR,${marcInstance.uuid},${errorReason}`,
            ]);

            TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
            InventorySearchAndFilter.searchInstanceByTitle(folioInstance.title);
            InventoryInstances.selectInstance();
            InventoryInstance.waitLoading();
            InstanceRecordView.verifyAdministrativeNote(notes.administrative);
            InstanceRecordView.checkMultipleItemNotesWithStaffOnly(
              0,
              'Yes',
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.DATA_QUALITY_NOTE,
              notes.dataQuality,
            );

            TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
            InventorySearchAndFilter.searchInstanceByTitle(marcInstance.title);
            InventoryInstances.selectInstance();
            InventoryInstance.waitLoading();
            InstanceRecordView.verifyAdministrativeNote(notes.administrative);
            InstanceRecordView.verifyNoteTextAbsentInInstanceAccordion(notes.dataQuality);
          });
        },
      );
    });
  });
});
