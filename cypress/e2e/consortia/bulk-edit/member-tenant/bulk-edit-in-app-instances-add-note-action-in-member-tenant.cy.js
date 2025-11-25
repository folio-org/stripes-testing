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
import getRandomPostfix, { randomFourDigitNumber } from '../../../../support/utils/stringTools';
import ExportFile from '../../../../support/fragments/data-export/exportFile';
import InventorySearchAndFilter from '../../../../support/fragments/inventory/inventorySearchAndFilter';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import ConsortiumManager from '../../../../support/fragments/settings/consortium-manager/consortium-manager';
import { getLongDelay } from '../../../../support/utils/cypressTools';
import Affiliations, { tenantNames } from '../../../../support/dictionary/affiliations';
import QueryModal, {
  QUERY_OPERATIONS,
  instanceFieldValues,
} from '../../../../support/fragments/bulk-edit/query-modal';
import { APPLICATION_NAMES, BULK_EDIT_TABLE_COLUMN_HEADERS } from '../../../../support/constants';
import TopMenuNavigation from '../../../../support/fragments/topMenuNavigation';
import InstanceRecordView from '../../../../support/fragments/inventory/instanceRecordView';
import DateTools from '../../../../support/utils/dateTools';

let user;
let instanceTypeId;
let identifiersQueryFilename;
let matchedRecordsQueryFileName;
let previewQueryFileName;
let changedRecordsQueryFileName;
let errorsFromCommittingFileName;
const todayDate = DateTools.getCurrentDate();
const postfix = randomFourDigitNumber();
const folioInstance = {
  title: `C566125_${postfix} folio instance testBulkEdit_${getRandomPostfix()}`,
  itemBarcode: `folioItem${getRandomPostfix()}`,
};
const marcInstance = {
  title: `C566125_${postfix} marc instance testBulkEdit_${getRandomPostfix()}`,
};
const notes = {
  administrative: "Administrative note ~,!,@,#,$,%,^,&,*,(,),~,', {.[,]<},>,ø, Æ, §,",
  dataQuality: 'New data quality note',
};
const instances = [folioInstance, marcInstance];
const errorReason = ERROR_MESSAGES.EDIT_MARC_INSTANCE_NOTES_NOT_SUPPORTED;

describe('Bulk-edit', () => {
  describe('Member tenant', () => {
    describe('Consortia', () => {
      before('create test data', () => {
        cy.clearLocalStorage();
        cy.getAdminToken();
        cy.createTempUser([
          permissions.bulkEditEdit.gui,
          permissions.uiInventoryViewCreateEditInstances.gui,
          permissions.bulkEditQueryView.gui,
        ]).then((userProperties) => {
          user = userProperties;

          cy.assignAffiliationToUser(Affiliations.College, user.userId);
          cy.setTenant(Affiliations.College);
          cy.assignPermissionsToExistingUser(user.userId, [
            permissions.bulkEditEdit.gui,
            permissions.uiInventoryViewCreateEditInstances.gui,
            permissions.bulkEditQueryView.gui,
          ]);

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
                });

                cy.createSimpleMarcBibViaAPI(marcInstance.title).then((instanceId) => {
                  marcInstance.uuid = instanceId;

                  cy.getInstanceById(marcInstance.uuid).then((instanceData) => {
                    marcInstance.hrid = instanceData.hrid;
                  });

                  cy.resetTenant();
                  cy.login(user.username, user.password, {
                    path: TopMenu.bulkEditPath,
                    waiter: BulkEditSearchPane.waitLoading,
                  });
                  ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.central);
                  ConsortiumManager.switchActiveAffiliation(
                    tenantNames.central,
                    tenantNames.college,
                  );
                  ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.college);
                  BulkEditSearchPane.openQuerySearch();
                  BulkEditSearchPane.checkInstanceRadio();
                  BulkEditSearchPane.clickBuildQueryButton();
                  QueryModal.verify();
                  QueryModal.selectField(instanceFieldValues.instanceResourceTitle);
                  QueryModal.selectOperator(QUERY_OPERATIONS.START_WITH);
                  QueryModal.fillInValueTextfield(`C566125_${postfix}`);
                  QueryModal.addNewRow();
                  QueryModal.selectField(instanceFieldValues.createdDate, 1);
                  QueryModal.selectOperator(QUERY_OPERATIONS.EQUAL, 1);
                  QueryModal.pickDate(todayDate, 1);
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
        cy.setTenant(Affiliations.College);
        InventoryInstance.deleteInstanceViaApi(marcInstance.uuid);
        InventoryInstance.deleteInstanceViaApi(folioInstance.uuid);
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
        'C566125 Verify "Add note" action for Instances in Member tenant (consortia) (firebird)',
        { tags: ['smokeECS', 'firebird', 'C566125'] },
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
              `(instance.title starts with C566125_${postfix}) AND (instance.created_at == ${todayDate})`,
            );

            instances.forEach((instance) => {
              BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInResultsAccordion(
                instance.hrid,
                BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.RESOURCE_TITLE,
                instance.title,
              );
            });

            BulkEditSearchPane.verifyPaginatorInMatchedRecords(2);
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
            InventorySearchAndFilter.clearDefaultFilter('Held by');
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
            InventorySearchAndFilter.clearDefaultFilter('Held by');
            InventorySearchAndFilter.searchInstanceByTitle(marcInstance.title);
            InventoryInstances.selectInstance();
            InventoryInstance.waitLoading();
            InstanceRecordView.verifyAdministrativeNote(notes.administrative);
          });
        },
      );
    });
  });
});
