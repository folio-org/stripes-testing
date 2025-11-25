import uuid from 'uuid';
import permissions from '../../../support/dictionary/permissions';
import BulkEditActions from '../../../support/fragments/bulk-edit/bulk-edit-actions';
import BulkEditSearchPane, {
  ERROR_MESSAGES,
} from '../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import QueryModal, {
  instanceFieldValues,
  QUERY_OPERATIONS,
} from '../../../support/fragments/bulk-edit/query-modal';
import getRandomPostfix from '../../../support/utils/stringTools';
import ExportFile from '../../../support/fragments/data-export/exportFile';
import BulkEditFiles from '../../../support/fragments/bulk-edit/bulk-edit-files';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import { including } from '../../../../interactors';

let user;
let originalSrsId;
let fileNames;
const duplicatedSrsId = uuid();
const marcInstance = {
  title: `AT_C692113_MarcInstance_${getRandomPostfix()}`,
};

describe('Bulk-edit', () => {
  describe('Query', () => {
    before('create test data', () => {
      cy.getAdminToken();
      cy.createTempUser([
        permissions.bulkEditEdit.gui,
        permissions.uiInventoryViewCreateEditInstances.gui,
        permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
        permissions.bulkEditQueryView.gui,
      ]).then((userProperties) => {
        user = userProperties;

        // Create a MARC instance with SRS record
        cy.createSimpleMarcBibViaAPI(marcInstance.title).then((instanceId) => {
          marcInstance.uuid = instanceId;
          // Get the existing SRS record for this instance
          cy.getSrsRecordsByInstanceId(marcInstance.uuid).then((srsRecord) => {
            const originalSrsRecord = srsRecord;
            originalSrsId = originalSrsRecord.id;

            // Create a duplicate SRS record for the same instance
            const duplicateSrsRecord = {
              ...originalSrsRecord,
              id: duplicatedSrsId,
              matchedId: duplicatedSrsId,
              rawRecord: {
                ...originalSrsRecord.rawRecord,
                id: duplicatedSrsId,
              },
              parsedRecord: {
                ...originalSrsRecord.parsedRecord,
                id: duplicatedSrsId,
                content: {
                  ...originalSrsRecord.parsedRecord.content,
                  fields: originalSrsRecord.parsedRecord.content.fields.map((field) => {
                    // Update the subfield 's' in appropriate fields to make it unique
                    if (field['999']) {
                      return {
                        999: {
                          ...field['999'],
                          subfields: field['999'].subfields.map((subfield) => {
                            if (subfield.s) {
                              return { s: duplicatedSrsId };
                            }
                            return subfield;
                          }),
                        },
                      };
                    }
                    return field;
                  }),
                },
              },
            };

            // Create the duplicate SRS record
            cy.createSrsRecord(duplicateSrsRecord);
          });
        });

        cy.login(user.username, user.password, {
          path: TopMenu.bulkEditPath,
          waiter: BulkEditSearchPane.waitLoading,
        });
      });
    });

    after('delete test data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(user.userId);
      InventoryInstance.deleteInstanceViaApi(marcInstance.uuid);
      cy.deleteSrsRecord(duplicatedSrsId);
      BulkEditFiles.deleteAllDownloadedFiles(fileNames);
    });

    it(
      'C692113 Verify preventing bulk edit of MARC Instances with more than one active underlying SRS record (firebird)',
      { tags: ['extendedPath', 'firebird', 'C692113'] },
      () => {
        // Step 1: Select instances and build query
        BulkEditSearchPane.openQuerySearch();
        BulkEditSearchPane.checkInstanceRadio();
        BulkEditSearchPane.clickBuildQueryButton();
        QueryModal.verify();
        QueryModal.cancelDisabled(false);
        QueryModal.runQueryDisabled();

        // Step 2: Configure query with Instance UUID
        QueryModal.selectField(instanceFieldValues.instanceId);
        QueryModal.verifySelectedField(instanceFieldValues.instanceId);
        QueryModal.selectOperator(QUERY_OPERATIONS.EQUAL);
        QueryModal.fillInValueTextfield(marcInstance.uuid);
        QueryModal.verifyQueryAreaContent(`(instance.id == ${marcInstance.uuid})`);
        QueryModal.testQueryDisabled(false);

        // Step 3: Test query
        QueryModal.clickTestQuery();
        QueryModal.verifyPreviewOfRecordsMatched();
        QueryModal.runQueryDisabled(false);

        // Step 4: Run query and verify errors
        cy.intercept('GET', '**/errors?limit=10&offset=0&errorType=ERROR*').as('getPreview');
        QueryModal.clickRunQuery();
        QueryModal.absent();

        cy.wait('@getPreview').then((interception) => {
          const bulkEditJobId = interception.request.url.match(
            /bulk-operations\/([a-f0-9-]+)\/errors/,
          )[1];
          fileNames = BulkEditFiles.getAllQueryDownloadedFileNames(bulkEditJobId, true);

          BulkEditSearchPane.verifyRecordsCountInBulkEditQueryPane('0 instance');
          BulkEditSearchPane.verifyErrorLabel(1, 0);
          BulkEditSearchPane.verifyShowWarningsCheckbox(true, false);

          // Step 5: Verify error details in table
          BulkEditSearchPane.verifyNonMatchedResults(
            marcInstance.uuid,
            including(ERROR_MESSAGES.MULTIPLE_SRS_RECORDS_ASSOCIATED),
          );
          BulkEditSearchPane.verifyReasonForError(originalSrsId);
          BulkEditSearchPane.verifyReasonForError(duplicatedSrsId);

          // Step 6: Verify Actions menu
          BulkEditActions.openActions();
          BulkEditSearchPane.searchColumnNameTextfieldAbsent();
          BulkEditActions.downloadErrorsExists();

          // Step 7: Download errors CSV
          BulkEditActions.downloadErrors();
          ExportFile.verifyFileIncludes(fileNames.errorsFromMatching, [
            'ERROR',
            marcInstance.uuid,
            ERROR_MESSAGES.MULTIPLE_SRS_RECORDS_ASSOCIATED,
            originalSrsId,
            duplicatedSrsId,
          ]);
        });
      },
    );
  });
});
