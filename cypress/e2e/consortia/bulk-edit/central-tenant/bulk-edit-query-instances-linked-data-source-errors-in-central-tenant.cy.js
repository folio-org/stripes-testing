import permissions from '../../../../support/dictionary/permissions';
import BulkEditActions from '../../../../support/fragments/bulk-edit/bulk-edit-actions';
import BulkEditSearchPane, {
  ERROR_MESSAGES,
} from '../../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import BulkEditFiles from '../../../../support/fragments/bulk-edit/bulk-edit-files';
import ExportFile from '../../../../support/fragments/data-export/exportFile';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix, { randomFourDigitNumber } from '../../../../support/utils/stringTools';
import ConsortiumManager from '../../../../support/fragments/settings/consortium-manager/consortium-manager';
import { tenantNames } from '../../../../support/dictionary/affiliations';
import { getLongDelay } from '../../../../support/utils/cypressTools';
import { INSTANCE_SOURCE_NAMES } from '../../../../support/constants';
import QueryModal, {
  QUERY_OPERATIONS,
  instanceFieldValues,
} from '../../../../support/fragments/bulk-edit/query-modal';

let user;
let instanceTypeId;
let fileNames;
const postfix = randomFourDigitNumber();
const folioInstance = {
  title: `C651550_${postfix} folio instance testBulkEdit_${getRandomPostfix()}`,
};
const linkedDataInstance = {
  title: `C651550_${postfix} linked data instance testBulkEdit_${getRandomPostfix()}`,
};

describe('Bulk-edit', () => {
  describe('Central tenant', () => {
    describe('Consortia', () => {
      before('create test data', () => {
        cy.getAdminToken();
        cy.createTempUser([
          permissions.bulkEditEdit.gui,
          permissions.uiInventoryViewCreateEditInstances.gui,
          permissions.bulkEditQueryView.gui,
        ]).then((userProperties) => {
          user = userProperties;

          cy.getInstanceTypes({ limit: 1 })
            .then((instanceTypes) => {
              instanceTypeId = instanceTypes[0].id;
            })
            .then(() => {
              // Create FOLIO instance
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
              });
            })
            .then(() => {
              // Create LINKED_DATA instance (create as FOLIO, then update source to LINKED_DATA)
              InventoryInstances.createFolioInstanceViaApi({
                instance: {
                  instanceTypeId,
                  title: linkedDataInstance.title,
                },
              }).then((createdInstanceData) => {
                linkedDataInstance.uuid = createdInstanceData.instanceId;

                cy.getInstanceById(linkedDataInstance.uuid).then((instanceData) => {
                  linkedDataInstance.hrid = instanceData.hrid;
                  instanceData.source = INSTANCE_SOURCE_NAMES.LDE;
                  cy.updateInstance(instanceData);
                });
              });
            })
            .then(() => {
              cy.resetTenant();
              cy.login(user.username, user.password, {
                path: TopMenu.bulkEditPath,
                waiter: BulkEditSearchPane.waitLoading,
              });
              ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.central);
            });
        });
      });

      after('delete test data', () => {
        cy.getAdminToken();
        Users.deleteViaApi(user.userId);
        InventoryInstance.deleteInstanceViaApi(folioInstance.uuid);
        InventoryInstance.deleteInstanceViaApi(linkedDataInstance.uuid);
        BulkEditFiles.deleteAllDownloadedFiles(fileNames);
      });

      it(
        'C651550 Verify Instances with source LINKED_DATA are displayed under "Errors & warnings" accordion in Bulk edit in Central tenant (consortia) (firebird)',
        { tags: ['extendedPathECS', 'firebird', 'C651550'] },
        () => {
          // Precondition: Navigate to Bulk edit, Query tab, select Inventory - instances
          BulkEditSearchPane.openQuerySearch();
          BulkEditSearchPane.checkInstanceRadio();
          BulkEditSearchPane.clickBuildQueryButton();
          QueryModal.verify();
          QueryModal.selectField(instanceFieldValues.updatedDate);
          QueryModal.verifySelectedField(instanceFieldValues.updatedDate);
          QueryModal.selectOperator(QUERY_OPERATIONS.GREATER_THAN);
          QueryModal.fillInValueTextfield('01/01/2020');
          QueryModal.addNewRow();
          QueryModal.selectField(instanceFieldValues.instanceResourceTitle, 1);
          QueryModal.selectOperator(QUERY_OPERATIONS.START_WITH, 1);
          QueryModal.fillInValueTextfield(`C651550_${postfix}`, 1);

          cy.intercept('GET', '**/errors?limit=10&offset=0&errorType=ERROR').as('getErrors');
          cy.intercept('GET', '**/preview?limit=100&offset=0&step=UPLOAD*').as('getPreview');
          cy.intercept('GET', '/query/**').as('waiterForQueryCompleted');
          QueryModal.clickTestQuery();
          QueryModal.waitForQueryCompleted('@waiterForQueryCompleted');

          // Step 1: Click "Run query" button and check the Preview of record matched
          QueryModal.clickRunQuery();
          QueryModal.verifyClosed();

          cy.wait('@getErrors', getLongDelay()).then((interception) => {
            const interceptedUuid = interception.request.url.match(
              /bulk-operations\/([a-f0-9-]+)\/errors/,
            )[1];
            fileNames = BulkEditFiles.getAllQueryDownloadedFileNames(interceptedUuid, true);

            BulkEditSearchPane.verifyBulkEditQueryPaneExists();

            // Verify the "Errors & warnings" accordion
            BulkEditSearchPane.verifyErrorLabel(1, 0);
            BulkEditSearchPane.verifyShowWarningsCheckbox(true, false);
            BulkEditSearchPane.verifyPaginatorInErrorsAccordion(1);

            // Step 2: Check the table under "Errors & warnings" accordion for LINKED_DATA instances
            BulkEditSearchPane.verifyErrorByIdentifier(
              linkedDataInstance.uuid,
              ERROR_MESSAGES.LINKED_DATA_SOURCE_NOT_SUPPORTED,
            );

            // Step 3: Click "Actions" menu => Click "Download errors (CSV)" option
            BulkEditActions.openActions();
            BulkEditSearchPane.searchColumnNameTextfieldAbsent();
            BulkEditActions.downloadErrorsExists();
            BulkEditActions.downloadErrors();

            ExportFile.verifyFileIncludes(fileNames.errorsFromMatching, [
              `ERROR,${linkedDataInstance.uuid},${ERROR_MESSAGES.LINKED_DATA_SOURCE_NOT_SUPPORTED}`,
            ]);
          });
        },
      );
    });
  });
});
