import uuid from 'uuid';
import permissions from '../../../../support/dictionary/permissions';
import BulkEditActions from '../../../../support/fragments/bulk-edit/bulk-edit-actions';
import BulkEditSearchPane, {
  ERROR_MESSAGES,
} from '../../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import BulkEditFiles from '../../../../support/fragments/bulk-edit/bulk-edit-files';
import ExportFile from '../../../../support/fragments/data-export/exportFile';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import FileManager from '../../../../support/utils/fileManager';
import getRandomPostfix from '../../../../support/utils/stringTools';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import ConsortiumManager from '../../../../support/fragments/settings/consortium-manager/consortium-manager';
import Affiliations, { tenantNames } from '../../../../support/dictionary/affiliations';

let user;
const userPermissions = [
  permissions.bulkEditEdit.gui,
  permissions.bulkEditQueryView.gui,
  permissions.uiInventoryViewCreateEditHoldings.gui,
];
const sharedInstance = {
  title: `AT_C477616_SharedInstance_${getRandomPostfix()}`,
};
const invalidHoldingUUID = uuid();
const invalidHoldingHRID = getRandomPostfix();
const invalidInstanceHRID = getRandomPostfix();
const holdingUUIDsFileName = `holdingUUIDs_${getRandomPostfix()}.csv`;
const holdingHRIDsFileName = `holdingHRIDs_${getRandomPostfix()}.csv`;
const instanceHRIDsFileName = `instanceHRIDs_${getRandomPostfix()}.csv`;
const errorsFromMatchingFileNameWithUUIDs = BulkEditFiles.getErrorsFromMatchingFileName(
  holdingUUIDsFileName,
  true,
);
const errorsFromMatchingFileNameWithHRIDs = BulkEditFiles.getErrorsFromMatchingFileName(
  holdingHRIDsFileName,
  true,
);
const errorsFromMatchingFileNameWithInstanceHRIDs = BulkEditFiles.getErrorsFromMatchingFileName(
  instanceHRIDsFileName,
  true,
);

describe('Bulk-edit', () => {
  describe('Central tenant', () => {
    describe('Consortia', () => {
      before('create test data', () => {
        cy.clearLocalStorage();
        cy.getAdminToken();
        cy.createTempUser(userPermissions)
          .then((userProperties) => {
            user = userProperties;

            cy.affiliateUserToTenant({
              tenantId: Affiliations.College,
              userId: user.userId,
              permissions: userPermissions,
            });

            cy.affiliateUserToTenant({
              tenantId: Affiliations.University,
              userId: user.userId,
              permissions: userPermissions,
            });
          })
          .then(() => {
            cy.getInstanceTypes({ limit: 1 }).then((instanceTypes) => {
              InventoryInstances.createFolioInstanceViaApi({
                instance: {
                  instanceTypeId: instanceTypes[0].id,
                  title: sharedInstance.title,
                },
              }).then((createdInstanceData) => {
                sharedInstance.id = createdInstanceData.instanceId;

                cy.getInstanceById(sharedInstance.id).then((instanceData) => {
                  sharedInstance.hrid = instanceData.hrid;
                });
              });
            });
          })
          .then(() => {
            FileManager.createFile(`cypress/fixtures/${holdingUUIDsFileName}`, invalidHoldingUUID);
            FileManager.createFile(`cypress/fixtures/${holdingHRIDsFileName}`, invalidHoldingHRID);
            FileManager.createFile(
              `cypress/fixtures/${instanceHRIDsFileName}`,
              `${sharedInstance.hrid}\n${invalidInstanceHRID}`,
            );
          })
          .then(() => {
            cy.login(user.username, user.password, {
              path: TopMenu.bulkEditPath,
              waiter: BulkEditSearchPane.waitLoading,
            });
            ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.central);
          });
      });

      after('delete test data', () => {
        cy.resetTenant();
        cy.getAdminToken();
        InventoryInstance.deleteInstanceViaApi(sharedInstance.id);
        Users.deleteViaApi(user.userId);
        FileManager.deleteFile(`cypress/fixtures/${holdingUUIDsFileName}`);
        FileManager.deleteFile(`cypress/fixtures/${holdingHRIDsFileName}`);
        FileManager.deleteFile(`cypress/fixtures/${instanceHRIDsFileName}`);

        [
          errorsFromMatchingFileNameWithUUIDs,
          errorsFromMatchingFileNameWithHRIDs,
          errorsFromMatchingFileNameWithInstanceHRIDs,
        ].forEach((fileName) => {
          FileManager.deleteFileFromDownloadsByMask(fileName);
        });
      });

      it(
        'C477616 Identifier - Verify "Errors" when uploading invalid Holdings identifiers in Central tenant (consortia) (firebird)',
        { tags: ['criticalPathECS', 'firebird', 'C477616'] },
        () => {
          const testParams = [
            {
              identifierType: 'Holdings UUIDs',
              fileName: holdingUUIDsFileName,
              errorsFileName: errorsFromMatchingFileNameWithUUIDs,
              identifiers: [invalidHoldingUUID],
              recordType: 'holdings',
            },
            {
              identifierType: 'Holdings HRIDs',
              fileName: holdingHRIDsFileName,
              errorsFileName: errorsFromMatchingFileNameWithHRIDs,
              identifiers: [invalidHoldingHRID],
              recordType: 'holdings',
            },
            {
              identifierType: 'Instance HRIDs',
              fileName: instanceHRIDsFileName,
              errorsFileName: errorsFromMatchingFileNameWithInstanceHRIDs,
              identifiers: [sharedInstance.hrid, invalidInstanceHRID],
              recordType: 'holdings',
            },
          ];

          testParams.forEach(
            ({ identifierType, fileName, errorsFileName, identifiers, recordType }) => {
              BulkEditSearchPane.clickToBulkEditMainButton();
              BulkEditSearchPane.verifyDragNDropRecordTypeIdentifierArea(
                'Holdings',
                identifierType,
              );

              BulkEditSearchPane.uploadFile(fileName);
              BulkEditSearchPane.verifyPaneTitleFileName(fileName);
              BulkEditSearchPane.verifyPaneRecordsCount(`0 ${recordType}`);
              BulkEditSearchPane.verifyFileNameHeadLine(fileName);
              BulkEditSearchPane.verifyErrorLabel(identifiers.length);
              BulkEditSearchPane.verifyShowWarningsCheckbox(true, false);
              BulkEditSearchPane.verifyPaginatorInErrorsAccordion(identifiers.length);

              identifiers.forEach((identifier) => {
                BulkEditSearchPane.verifyNonMatchedResults(identifier);
              });

              BulkEditActions.openActions();
              BulkEditActions.downloadErrors();

              identifiers.forEach((identifier) => {
                ExportFile.verifyFileIncludes(errorsFileName, [
                  `ERROR,${identifier},${ERROR_MESSAGES.NO_MATCH_FOUND}`,
                ]);
              });

              BulkEditFiles.verifyCSVFileRecordsNumber(errorsFileName, identifiers.length);
            },
          );
        },
      );
    });
  });
});
