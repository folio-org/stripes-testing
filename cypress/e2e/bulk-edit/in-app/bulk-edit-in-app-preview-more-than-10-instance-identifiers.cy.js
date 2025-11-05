import permissions from '../../../support/dictionary/permissions';
import BulkEditActions from '../../../support/fragments/bulk-edit/bulk-edit-actions';
import BulkEditSearchPane from '../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import BulkEditFiles from '../../../support/fragments/bulk-edit/bulk-edit-files';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix from '../../../support/utils/stringTools';
import ExportFile from '../../../support/fragments/data-export/exportFile';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';

let user;
const validInstancesCount = 12;
const invalidInstancesCount = 12;
const instanceUUIDsFileName = `AT_C423686_InstanceUUIDs_${getRandomPostfix()}.csv`;
const errorsFromMatchingFileName =
  BulkEditFiles.getErrorsFromMatchingFileName(instanceUUIDsFileName);
const matchedRecordsFileName = BulkEditFiles.getMatchedRecordsFileName(instanceUUIDsFileName);
const validInstances = [];
const invalidInstanceUUIDs = new Array(invalidInstancesCount)
  .fill(null)
  .map(() => getRandomPostfix());

describe('Bulk-edit', () => {
  describe('In-app approach', () => {
    before('create test data', () => {
      cy.createTempUser([
        permissions.bulkEditEdit.gui,
        permissions.uiInventoryViewCreateEditInstances.gui,
      ]).then((userProperties) => {
        user = userProperties;

        cy.getInstanceTypes({ limit: 1 })
          .then((instanceTypes) => {
            const instanceTypeId = instanceTypes[0].id;

            for (let i = 0; i < validInstancesCount; i++) {
              const folioInstanceTitle = `AT_C423686_FolioInstance_${i + 1}_${getRandomPostfix()}`;

              InventoryInstances.createFolioInstanceViaApi({
                instance: {
                  instanceTypeId,
                  title: folioInstanceTitle,
                },
              }).then((createdInstanceData) => {
                validInstances.push({
                  uuid: createdInstanceData.instanceId,
                  title: folioInstanceTitle,
                });
              });
            }
          })
          .then(() => {
            const validUUIDs = validInstances.map((instance) => instance.uuid);
            const allUUIDs = [...validUUIDs, ...invalidInstanceUUIDs];

            FileManager.createFile(
              `cypress/fixtures/${instanceUUIDsFileName}`,
              allUUIDs.join('\n'),
            );

            cy.login(user.username, user.password, {
              path: TopMenu.bulkEditPath,
              waiter: BulkEditSearchPane.waitLoading,
            });
          });
      });
    });

    after('delete test data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(user.userId);

      validInstances.forEach((instance) => {
        InventoryInstance.deleteInstanceViaApi(instance.uuid);
      });

      FileManager.deleteFile(`cypress/fixtures/${instanceUUIDsFileName}`);
      FileManager.deleteFileFromDownloadsByMask(errorsFromMatchingFileName, matchedRecordsFileName);
    });

    it(
      'C423686 Verify "Preview of record matched" in case of uploading more than 10 Instance identifiers (firebird)',
      { tags: ['extendedPath', 'firebird', 'C423686'] },
      () => {
        // Step 1: Select "Inventory - instances" radio button and "Instance UUIDs" identifier
        BulkEditSearchPane.checkInstanceRadio();
        BulkEditSearchPane.selectRecordIdentifier('Instance UUIDs');
        BulkEditSearchPane.verifyDragNDropRecordTypeIdentifierArea('Instance', 'Instance UUIDs');
        BulkEditSearchPane.isDragAndDropAreaDisabled(false);
        BulkEditSearchPane.verifySpecificTabHighlighted('Identifier');

        // Step 2: Upload .csv file with more than 10 valid and more than 10 invalid Instance UUIDs
        BulkEditSearchPane.uploadFile(instanceUUIDsFileName);
        BulkEditSearchPane.checkForUploading(instanceUUIDsFileName);

        // Step 3: Check the result of uploading the .csv file with Instance UUIDs
        BulkEditSearchPane.waitFileUploading();
        BulkEditSearchPane.verifyPaneTitleFileName(instanceUUIDsFileName);
        BulkEditSearchPane.verifyPaneRecordsCount(`${validInstancesCount} instance`);
        BulkEditSearchPane.verifyFileNameHeadLine(instanceUUIDsFileName);
        BulkEditSearchPane.verifyPopulatedPreviewPage();
        BulkEditSearchPane.verifyPaginatorInMatchedRecords(validInstancesCount);
        BulkEditSearchPane.verifyErrorLabel(invalidInstancesCount);
        BulkEditSearchPane.verifyPaginatorInErrorsAccordion(10, false);

        // Step 4: Click Actions menu
        BulkEditActions.openActions();
        BulkEditActions.downloadMatchedRecordsExists();
        BulkEditActions.downloadErrorsExists();
        BulkEditActions.startBulkEditFolioInstanceAbsent(false);
        BulkEditSearchPane.verifySearchColumnNameTextFieldExists();

        // Step 5: Download matched records (CSV)
        BulkEditActions.openActions();
        BulkEditActions.downloadMatchedResults();

        validInstances.forEach((instance) => {
          ExportFile.verifyFileIncludes(matchedRecordsFileName, [instance.uuid]);
        });

        // Step 6: Download errors (CSV)
        BulkEditActions.downloadErrors();

        invalidInstanceUUIDs.forEach((uuid) => {
          ExportFile.verifyFileIncludes(errorsFromMatchingFileName, [
            `ERROR,${uuid},No match found`,
          ]);
        });
      },
    );
  });
});
