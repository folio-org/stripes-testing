import permissions from '../../../../support/dictionary/permissions';
import BulkEditActions from '../../../../support/fragments/bulk-edit/bulk-edit-actions';
import BulkEditSearchPane from '../../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import BulkEditFiles from '../../../../support/fragments/bulk-edit/bulk-edit-files';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import FileManager from '../../../../support/utils/fileManager';
import getRandomPostfix from '../../../../support/utils/stringTools';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import ConsortiumManager from '../../../../support/fragments/settings/consortium-manager/consortium-manager';
import { getLongDelay } from '../../../../support/utils/cypressTools';
import { tenantNames } from '../../../../support/dictionary/affiliations';
import { BULK_EDIT_TABLE_COLUMN_HEADERS } from '../../../../support/constants';
import QueryModal, {
  QUERY_OPERATIONS,
  instanceFieldValues,
} from '../../../../support/fragments/bulk-edit/query-modal';

let user;
let instanceTypeId;
let matchedRecordsQueryFileName;
const instances = [...Array(3)].map(() => ({
  title: `AT_C503012_FolioInstance_${getRandomPostfix()}`,
}));

describe('Bulk-edit', () => {
  describe('In-app approach', () => {
    describe('Consortia', () => {
      before('create test data', () => {
        cy.getAdminToken();
        cy.createTempUser([
          permissions.bulkEditView.gui,
          permissions.bulkEditQueryView.gui,
          permissions.uiInventoryViewInstances.gui,
        ]).then((userProperties) => {
          user = userProperties;

          cy.getInstanceTypes({ limit: 1 })
            .then((instanceTypes) => {
              instanceTypeId = instanceTypes[0].id;
            })
            .then(() => {
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

        instances.forEach((instance) => {
          InventoryInstance.deleteInstanceViaApi(instance.uuid);
        });

        FileManager.deleteFileFromDownloadsByMask(matchedRecordsQueryFileName);
      });

      it(
        'C503012 Query - Verify "Preview of record matched" when querying by valid Instance identifiers in Central tenant (consortia) (firebird)',
        { tags: ['criticalPathECS', 'firebird', 'C503012'] },
        () => {
          const [firstInstance, secondInstance, thirdInstance] = instances;

          BulkEditSearchPane.checkInstanceRadio();
          BulkEditSearchPane.clickBuildQueryButton();
          QueryModal.verify();

          QueryModal.selectField(instanceFieldValues.instanceId);
          QueryModal.verifySelectedField(instanceFieldValues.instanceId);
          QueryModal.selectOperator(QUERY_OPERATIONS.IN);
          QueryModal.fillInValueTextfield(`${firstInstance.uuid},${secondInstance.uuid}`);
          QueryModal.verifyQueryAreaContent(
            `(instance.id in (${firstInstance.uuid}, ${secondInstance.uuid}))`,
          );

          cy.intercept('GET', '**/preview?limit=100&offset=0&step=UPLOAD*').as('getPreview');
          cy.intercept('GET', '/query/**').as('waiterForQueryCompleted');
          QueryModal.clickTestQuery();
          QueryModal.waitForQueryCompleted('@waiterForQueryCompleted');
          QueryModal.verifyNumberOfMatchedRecords(2);
          QueryModal.verifyMatchedRecordsByIdentifier(
            firstInstance.uuid,
            instanceFieldValues.instanceId,
            firstInstance.uuid,
          );
          QueryModal.verifyMatchedRecordsByIdentifier(
            secondInstance.uuid,
            instanceFieldValues.instanceId,
            secondInstance.uuid,
          );

          QueryModal.clickRunQuery();
          QueryModal.verifyClosed();
          cy.wait('@getPreview', getLongDelay()).then((interception) => {
            const interceptedUuid = interception.request.url.match(
              /bulk-operations\/([a-f0-9-]+)\/preview/,
            )[1];
            matchedRecordsQueryFileName = `*-Matched-Records-Query-${interceptedUuid}.csv`;

            BulkEditSearchPane.verifyBulkEditQueryPaneExists();
            BulkEditSearchPane.verifyRecordsCountInBulkEditQueryPane('2 instance');
            BulkEditSearchPane.verifyQueryHeadLine(
              `(instance.id in (${firstInstance.uuid}, ${secondInstance.uuid}))`,
            );

            [firstInstance, secondInstance].forEach((instance) => {
              BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInResultsAccordion(
                instance.hrid,
                BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.RESOURCE_TITLE,
                instance.title,
              );
            });

            BulkEditSearchPane.verifyPaginatorInMatchedRecords(2);
            BulkEditSearchPane.verifyActionsAfterConductedCSVUploading(false);
            BulkEditActions.openActions();
            BulkEditActions.downloadMatchedResults();
            BulkEditFiles.verifyCSVFileRowsRecordsNumber(matchedRecordsQueryFileName, 2);

            [firstInstance, secondInstance].forEach((instance) => {
              BulkEditFiles.verifyValueInRowByUUID(
                matchedRecordsQueryFileName,
                BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_UUID,
                instance.uuid,
                BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_HRID,
                instance.hrid,
              );
            });

            // remove earlier downloaded file
            FileManager.deleteFileFromDownloadsByMask(matchedRecordsQueryFileName);
          });

          BulkEditSearchPane.clickToBulkEditMainButton();
          BulkEditSearchPane.openQuerySearch();

          BulkEditSearchPane.checkInstanceRadio();
          BulkEditSearchPane.clickBuildQueryButton();
          QueryModal.verify();
          QueryModal.selectField(instanceFieldValues.instanceHrid);
          QueryModal.verifySelectedField(instanceFieldValues.instanceHrid);
          QueryModal.selectOperator(QUERY_OPERATIONS.EQUAL);
          QueryModal.fillInValueTextfield(thirdInstance.hrid);
          QueryModal.verifyQueryAreaContent(`(instance.hrid == ${thirdInstance.hrid})`);
          cy.intercept('GET', '**/preview?limit=100&offset=0&step=UPLOAD*').as('getPreview');
          cy.intercept('GET', '/query/**').as('waiterForQueryCompleted');
          QueryModal.clickTestQuery();
          QueryModal.waitForQueryCompleted('@waiterForQueryCompleted');
          QueryModal.verifyNumberOfMatchedRecords(1);
          QueryModal.verifyMatchedRecordsByIdentifier(
            thirdInstance.hrid,
            instanceFieldValues.instanceHrid,
            thirdInstance.hrid,
          );
          QueryModal.clickRunQuery();
          QueryModal.verifyClosed();

          cy.wait('@getPreview', getLongDelay()).then((interception) => {
            const interceptedUuid = interception.request.url.match(
              /bulk-operations\/([a-f0-9-]+)\/preview/,
            )[1];
            matchedRecordsQueryFileName = `*-Matched-Records-Query-${interceptedUuid}.csv`;

            BulkEditSearchPane.verifyBulkEditQueryPaneExists();
            BulkEditSearchPane.verifyRecordsCountInBulkEditQueryPane('1 instance');
            BulkEditSearchPane.verifyQueryHeadLine(`(instance.hrid == ${thirdInstance.hrid})`);

            BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInResultsAccordion(
              thirdInstance.hrid,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.RESOURCE_TITLE,
              thirdInstance.title,
            );
            BulkEditSearchPane.verifyPaginatorInMatchedRecords(1);
            BulkEditSearchPane.verifyActionsAfterConductedCSVUploading(false);
            BulkEditActions.openActions();
            BulkEditActions.downloadMatchedResults();
            BulkEditFiles.verifyCSVFileRowsRecordsNumber(matchedRecordsQueryFileName, 1);
            BulkEditFiles.verifyValueInRowByUUID(
              matchedRecordsQueryFileName,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_UUID,
              thirdInstance.uuid,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_HRID,
              thirdInstance.hrid,
            );
          });
        },
      );
    });
  });
});
