import permissions from '../../../../support/dictionary/permissions';
import BulkEditSearchPane, {
  ERROR_MESSAGES,
} from '../../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import BulkEditActions from '../../../../support/fragments/bulk-edit/bulk-edit-actions';
import BulkEditFiles from '../../../../support/fragments/bulk-edit/bulk-edit-files';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../support/utils/stringTools';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import ConsortiumManager from '../../../../support/fragments/settings/consortium-manager/consortium-manager';
import Affiliations, { tenantNames } from '../../../../support/dictionary/affiliations';
import QueryModal, {
  QUERY_OPERATIONS,
  instanceFieldValues,
} from '../../../../support/fragments/bulk-edit/query-modal';
import ExportFile from '../../../../support/fragments/data-export/exportFile';
import FileManager from '../../../../support/utils/fileManager';
import { getLongDelay } from '../../../../support/utils/cypressTools';

let user;
let instanceTypeId;
let errorsFileUUID;
let errorsFileHRID;
const userPermissions = [
  permissions.bulkEditView.gui,
  permissions.bulkEditQueryView.gui,
  permissions.uiInventoryViewCreateEditInstances.gui,
];
const instances = [...Array(2)].map(() => ({
  title: `AT_C503029_FolioInstance_${getRandomPostfix()}`,
}));
const errorReason = ERROR_MESSAGES.NO_MATCH_FOUND;
const invalidUUID = getRandomPostfix();

describe('Bulk-edit', () => {
  describe('Central tenant', () => {
    describe('Consortia', () => {
      before('create test data', () => {
        cy.getAdminToken();
        cy.createTempUser(userPermissions).then((userProperties) => {
          user = userProperties;

          cy.assignAffiliationToUser(Affiliations.College, user.userId);

          cy.getInstanceTypes({ limit: 1 })
            .then((instanceTypes) => {
              instanceTypeId = instanceTypes[0].id;
            })
            .then(() => {
              cy.withinTenant(Affiliations.College, () => {
                cy.assignPermissionsToExistingUser(user.userId, userPermissions);

                instances.forEach((instance) => {
                  InventoryInstances.createFolioInstanceViaApi({
                    instance: {
                      instanceTypeId,
                      title: instance.title,
                    },
                  }).then((createdInstanceData) => {
                    instance.uuid = createdInstanceData.instanceId;

                    cy.getInstanceById(instance.uuid).then((instanceData) => {
                      instance.hrid = instanceData.hrid;
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
          ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.central);
          BulkEditSearchPane.openQuerySearch();
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
        FileManager.deleteFileFromDownloadsByMask(errorsFileUUID);
        FileManager.deleteFileFromDownloadsByMask(errorsFileHRID);
      });

      it(
        'C503029 Query - Verify "Errors" when querying by invalid Instance identifiers in Central tenant (consortia) (firebird)',
        { tags: ['criticalPathECS', 'firebird', 'C503029'] },
        () => {
          // Step 1: Select Inventory - instances radio, click Build query
          BulkEditSearchPane.checkInstanceRadio();
          BulkEditSearchPane.clickBuildQueryButton();
          QueryModal.verify();

          // Step 2: Select Instance UUID field, in operator, enter UUIDs
          QueryModal.selectField(instanceFieldValues.instanceId);
          QueryModal.verifySelectedField(instanceFieldValues.instanceId);
          QueryModal.selectOperator(QUERY_OPERATIONS.IN);
          QueryModal.fillInValueTextfield(
            `${instances[0].uuid},${instances[1].uuid},${invalidUUID}`,
          );

          // Step 3: Click Test query - verify matched records shown
          cy.intercept('GET', '/query/**').as('waiterForQueryCompleted');
          QueryModal.clickTestQuery();
          QueryModal.waitForQueryCompleted('@waiterForQueryCompleted');
          QueryModal.verifyNumberOfMatchedRecords(2);
          QueryModal.runQueryDisabled(false);

          // Step 4: Click Run query - verify 0 records matched with errors
          cy.intercept('GET', '**/errors?limit=10&offset=0&errorType=ERROR').as('errors');
          QueryModal.clickRunQuery();
          QueryModal.verifyClosed();

          cy.wait('@errors', getLongDelay()).then((interception) => {
            const interceptedUuid = interception.request.url.match(
              /bulk-operations\/([a-f0-9-]+)\/errors/,
            )[1];
            errorsFileUUID = `*-Matching-Records-Errors-Query-${interceptedUuid}.csv`;

            BulkEditSearchPane.verifyBulkEditQueryPaneExists();
            BulkEditSearchPane.verifyRecordsCountInBulkEditQueryPane('0 instance');
            BulkEditSearchPane.verifyQueryHeadLine(
              `(instance.id in (${instances[0].uuid}, ${instances[1].uuid}, ${invalidUUID}))`,
            );
            BulkEditSearchPane.verifyErrorLabel(2);
            BulkEditSearchPane.verifyShowWarningsCheckbox(true, false);
            BulkEditSearchPane.verifyPaginatorInErrorsAccordion(2);

            // Step 5: Check error table columns
            instances.forEach((instance) => {
              BulkEditSearchPane.verifyError(instance.uuid, errorReason);
            });

            // Step 6: Check Actions menu
            BulkEditActions.openActions();
            BulkEditSearchPane.searchColumnNameTextfieldAbsent();
            BulkEditActions.downloadErrorsExists();

            // Step 7: Download errors CSV
            BulkEditActions.downloadErrors();
            BulkEditFiles.verifyCSVFileRecordsNumber(errorsFileUUID, instances.length);

            instances.forEach((instance) => {
              ExportFile.verifyFileIncludes(errorsFileUUID, [
                `ERROR,${instance.uuid},${errorReason}`,
              ]);
            });
          });

          // Step 8: Start new query with Instance HRID
          BulkEditSearchPane.clickToBulkEditMainButton();
          BulkEditSearchPane.openQuerySearch();
          BulkEditSearchPane.checkInstanceRadio();
          BulkEditSearchPane.clickBuildQueryButton();
          QueryModal.verify();

          QueryModal.selectField(instanceFieldValues.instanceHrid);
          QueryModal.verifySelectedField(instanceFieldValues.instanceHrid);
          QueryModal.selectOperator(QUERY_OPERATIONS.EQUAL);
          QueryModal.fillInValueTextfield(instances[0].hrid);

          // Step 9: Click Test query - verify matched records shown
          cy.intercept('GET', '/query/**').as('waiterForSecondQueryCompleted');
          QueryModal.clickTestQuery();
          QueryModal.waitForQueryCompleted('@waiterForSecondQueryCompleted');
          QueryModal.verifyNumberOfMatchedRecords(1);
          QueryModal.runQueryDisabled(false);

          // Step 10: Click Run query - verify 0 records matched with errors
          QueryModal.clickRunQuery();
          QueryModal.verifyClosed();

          cy.wait('@errors', getLongDelay()).then((interception) => {
            const interceptedUuid = interception.request.url.match(
              /bulk-operations\/([a-f0-9-]+)\/errors/,
            )[1];
            errorsFileHRID = `*-Matching-Records-Errors-Query-${interceptedUuid}.csv`;

            BulkEditSearchPane.verifyBulkEditQueryPaneExists();
            BulkEditSearchPane.verifyRecordsCountInBulkEditQueryPane('0 instance');
            BulkEditSearchPane.verifyQueryHeadLine(`(instance.hrid == ${instances[0].hrid})`);
            BulkEditSearchPane.verifyErrorLabel(1);
            BulkEditSearchPane.verifyShowWarningsCheckbox(true, false);

            // Step 11: Check error table columns
            BulkEditSearchPane.verifyError(instances[0].uuid, errorReason);

            // Step 12: Download errors CSV
            BulkEditActions.openActions();
            BulkEditActions.downloadErrors();
            BulkEditFiles.verifyCSVFileRecordsNumber(errorsFileHRID, 1);
            BulkEditSearchPane.verifyPaginatorInErrorsAccordion(1);

            ExportFile.verifyFileIncludes(errorsFileHRID, [
              `ERROR,${instances[0].uuid},${errorReason}`,
            ]);
          });
        },
      );
    });
  });
});
