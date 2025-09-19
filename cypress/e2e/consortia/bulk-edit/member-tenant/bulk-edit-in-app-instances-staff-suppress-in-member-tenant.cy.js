import permissions from '../../../../support/dictionary/permissions';
import BulkEditActions from '../../../../support/fragments/bulk-edit/bulk-edit-actions';
import BulkEditSearchPane from '../../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import BulkEditFiles from '../../../../support/fragments/bulk-edit/bulk-edit-files';
import BulkEditLogs from '../../../../support/fragments/bulk-edit/bulk-edit-logs';
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

let user;
let instanceTypeId;
let identifiersQueryFilename;
let matchedRecordsQueryFileName;
let previewQueryFileName;
let changedRecordsQueryFileName;
let previewFileName;
let changedRecordsFileName;
let downloadedFileNameForUpload;
const postfix = randomFourDigitNumber();
const staffSuppressOption = 'Staff suppress';
const actions = {
  setTrue: 'Set true',
  setFalse: 'Set false',
};
const folioInstance = {
  title: `C566118_${postfix} folio instance testBulkEdit_${getRandomPostfix()}`,
  itemBarcode: `folioItem${getRandomPostfix()}`,
};
const marcInstance = {
  title: `C566118_${postfix} marc instance testBulkEdit_${getRandomPostfix()}`,
};
const instances = [folioInstance, marcInstance];

describe('Bulk-edit', () => {
  describe('Member tenant', () => {
    describe('Consortia', () => {
      before('create test data', () => {
        cy.getAdminToken();
        cy.createTempUser([
          permissions.bulkEditEdit.gui,
          permissions.uiInventoryViewCreateEditInstances.gui,
          permissions.enableStaffSuppressFacet.gui,
          permissions.bulkEditQueryView.gui,
          permissions.bulkEditLogsView.gui,
        ]).then((userProperties) => {
          user = userProperties;

          cy.assignAffiliationToUser(Affiliations.College, user.userId);
          cy.setTenant(Affiliations.College);
          cy.assignPermissionsToExistingUser(user.userId, [
            permissions.bulkEditEdit.gui,
            permissions.uiInventoryViewCreateEditInstances.gui,
            permissions.enableStaffSuppressFacet.gui,
            permissions.bulkEditQueryView.gui,
            permissions.bulkEditLogsView.gui,
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
                  QueryModal.selectField(instanceFieldValues.staffSuppress);
                  QueryModal.verifySelectedField(instanceFieldValues.staffSuppress);
                  QueryModal.selectOperator(QUERY_OPERATIONS.NOT_EQUAL);
                  QueryModal.chooseValueSelect('True');
                  QueryModal.addNewRow();
                  QueryModal.selectField(instanceFieldValues.instanceResourceTitle, 1);
                  QueryModal.selectOperator(QUERY_OPERATIONS.START_WITH, 1);
                  QueryModal.fillInValueTextfield(`C566118_${postfix}`, 1);
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
        cy.setTenant(Affiliations.College);
        InventoryInstance.deleteInstanceViaApi(marcInstance.uuid);
        InventoryInstance.deleteInstanceViaApi(folioInstance.uuid);
        cy.resetTenant();
        Users.deleteViaApi(user.userId);
        FileManager.deleteFile(`cypress/fixtures/downloaded-${identifiersQueryFilename}`);
        FileManager.deleteFileFromDownloadsByMask(
          identifiersQueryFilename,
          matchedRecordsQueryFileName,
          previewQueryFileName,
          changedRecordsQueryFileName,
          previewFileName,
          changedRecordsFileName,
        );
      });

      it(
        'C566118 Verify "Staff suppress" action for Instances in Member tenant (consortia) (firebird)',
        { tags: ['smokeECS', 'firebird', 'C566118'] },
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

            BulkEditSearchPane.verifyBulkEditQueryPaneExists();
            BulkEditSearchPane.verifyRecordsCountInBulkEditQueryPane('2 instance');
            BulkEditSearchPane.verifyQueryHeadLine(
              `(instance.staff_suppress != True) AND (instance.title starts with C566118_${postfix})`,
            );

            instances.forEach((instance) => {
              BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInResultsAccordion(
                instance.hrid,
                BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.RESOURCE_TITLE,
                instance.title,
              );
            });

            BulkEditSearchPane.verifyPreviousPaginationButtonDisabled();
            BulkEditSearchPane.verifyNextPaginationButtonDisabled();
            BulkEditActions.openActions();
            BulkEditSearchPane.changeShowColumnCheckboxIfNotYet(
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.STAFF_SUPPRESS,
            );
            BulkEditSearchPane.verifyResultColumnTitles(
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.STAFF_SUPPRESS,
            );

            instances.forEach((instance) => {
              BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInResultsAccordion(
                instance.hrid,
                BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.STAFF_SUPPRESS,
                'false',
              );
            });

            BulkEditActions.openActions();
            BulkEditActions.downloadMatchedResults();

            instances.forEach((instance) => {
              BulkEditFiles.verifyValueInRowByUUID(
                matchedRecordsQueryFileName,
                BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_UUID,
                instance.uuid,
                BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.STAFF_SUPPRESS,
                false,
              );
            });

            BulkEditActions.openStartBulkEditFolioInstanceForm();
            BulkEditActions.verifyBulkEditsAccordionExists();
            BulkEditActions.verifyOptionsDropdown();
            BulkEditActions.verifyRowIcons();
            BulkEditActions.verifyCancelButtonDisabled(false);
            BulkEditActions.verifyConfirmButtonDisabled(true);
            BulkEditActions.selectOption(staffSuppressOption);
            BulkEditSearchPane.verifyInputLabel(staffSuppressOption);
            BulkEditActions.selectSecondAction(actions.setTrue);
            BulkEditActions.verifySecondActionSelected(actions.setTrue);
            BulkEditActions.verifyCheckboxAbsent();
            BulkEditActions.verifyConfirmButtonDisabled(false);
            BulkEditActions.confirmChanges();
            BulkEditActions.verifyMessageBannerInAreYouSureForm(2);

            instances.forEach((instance) => {
              BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifier(
                instance.hrid,
                BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.STAFF_SUPPRESS,
                'true',
              );
            });

            BulkEditActions.verifyAreYouSureForm(2);
            BulkEditActions.downloadPreview();

            instances.forEach((instance) => {
              BulkEditFiles.verifyValueInRowByUUID(
                previewQueryFileName,
                BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_UUID,
                instance.uuid,
                BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.STAFF_SUPPRESS,
                true,
              );
            });

            BulkEditActions.commitChanges();
            BulkEditActions.verifySuccessBanner(2);

            instances.forEach((instance) => {
              BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInChangesAccordion(
                instance.hrid,
                BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.STAFF_SUPPRESS,
                'true',
              );
            });

            BulkEditActions.openActions();
            BulkEditActions.downloadChangedCSV();

            instances.forEach((instance) => {
              BulkEditFiles.verifyValueInRowByUUID(
                changedRecordsQueryFileName,
                BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_UUID,
                instance.uuid,
                BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.STAFF_SUPPRESS,
                true,
              );
            });

            instances.forEach((instance) => {
              TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
              InventorySearchAndFilter.selectYesfilterStaffSuppress();
              InventorySearchAndFilter.searchInstanceByTitle(instance.title);
              InventoryInstances.selectInstance();
              InventoryInstance.waitLoading();
              InventoryInstance.verifyStaffSuppress();
              InventoryInstances.resetAllFilters();
              cy.wait(3000);
            });

            TopMenuNavigation.navigateToApp(APPLICATION_NAMES.BULK_EDIT);
            BulkEditSearchPane.openLogsSearch();
            BulkEditLogs.verifyLogsPane();
            BulkEditLogs.checkInstancesCheckbox();
            BulkEditLogs.verifyCheckboxIsSelected('INSTANCE', true);
            BulkEditLogs.clickActionsRunBy(user.username);
            BulkEditLogs.downloadQueryIdentifiers();
            ExportFile.verifyFileIncludes(identifiersQueryFilename, [
              folioInstance.uuid,
              marcInstance.uuid,
            ]);
            BulkEditSearchPane.openIdentifierSearch();
            BulkEditSearchPane.verifyDragNDropRecordTypeIdentifierArea(
              'Instances',
              'Instance UUIDs',
            );
            BulkEditSearchPane.uploadRecentlyDownloadedFile(identifiersQueryFilename).then(
              (changedFileName) => {
                downloadedFileNameForUpload = changedFileName;
                previewFileName = `*-Updates-Preview-CSV-${downloadedFileNameForUpload}`;
                changedRecordsFileName = `*-Changed-Records-CSV-${downloadedFileNameForUpload}`;

                instances.forEach((instance) => {
                  BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInResultsAccordion(
                    instance.hrid,
                    BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.RESOURCE_TITLE,
                    instance.title,
                  );
                });

                BulkEditActions.openActions();
                BulkEditActions.openStartBulkEditFolioInstanceForm();
                BulkEditActions.selectOption(staffSuppressOption);
                BulkEditSearchPane.verifyInputLabel(staffSuppressOption);
                BulkEditActions.selectSecondAction(actions.setFalse);
                BulkEditActions.verifySecondActionSelected(actions.setFalse);
                BulkEditActions.verifyCheckboxAbsent();
                BulkEditActions.verifyConfirmButtonDisabled(false);
                BulkEditActions.confirmChanges();
                BulkEditActions.verifyMessageBannerInAreYouSureForm(2);

                instances.forEach((instance) => {
                  BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifier(
                    instance.hrid,
                    BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.STAFF_SUPPRESS,
                    'false',
                  );
                });

                BulkEditActions.verifyAreYouSureForm(2);
                BulkEditSearchPane.verifyPreviousPaginationButtonInAreYouSureFormDisabled();
                BulkEditSearchPane.verifyNextPaginationButtonInAreYouSureFormDisabled();
                BulkEditActions.downloadPreview();

                instances.forEach((instance) => {
                  BulkEditFiles.verifyValueInRowByUUID(
                    previewFileName,
                    BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_UUID,
                    instance.uuid,
                    BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.STAFF_SUPPRESS,
                    false,
                  );
                });

                BulkEditActions.commitChanges();
                BulkEditActions.verifySuccessBanner(2);

                instances.forEach((instance) => {
                  BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInChangesAccordion(
                    instance.hrid,
                    BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.STAFF_SUPPRESS,
                    'false',
                  );
                });

                BulkEditActions.openActions();
                BulkEditActions.downloadChangedCSV();

                instances.forEach((instance) => {
                  BulkEditFiles.verifyValueInRowByUUID(
                    changedRecordsFileName,
                    BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_UUID,
                    instance.uuid,
                    BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.STAFF_SUPPRESS,
                    false,
                  );
                });

                instances.forEach((instance) => {
                  TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
                  InventorySearchAndFilter.searchInstanceByTitle(instance.title);
                  InventoryInstances.selectInstance();
                  InventoryInstance.waitLoading();
                  InventoryInstance.verifyNoStaffSuppress();
                });
              },
            );
          });
        },
      );
    });
  });
});
