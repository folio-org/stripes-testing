import uuid from 'uuid';
import permissions from '../../../../support/dictionary/permissions';
import BulkEditActions from '../../../../support/fragments/bulk-edit/bulk-edit-actions';
import BulkEditSearchPane from '../../../../support/fragments/bulk-edit/bulk-edit-search-pane';
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
let instanceTypeId;
const userPermissions = [
  permissions.bulkEditEdit.gui,
  permissions.uiInventoryViewCreateEditInstances.gui,
];
const folioInstance = {
  title: `AT_C477607_FolioInstance_${getRandomPostfix()}`,
};
const invalidUUID = uuid();
const invalidHRID = getRandomPostfix();
const errorReason = 'No match found';
const invalidUUIDsFileName = `invalidUUIDsFileName_${getRandomPostfix()}.csv`;
const invalidHRIDsFileName = `invalidHRIDsFileName_${getRandomPostfix()}.csv`;
const errorsFromMatchingFileNameWithUUIDs = BulkEditFiles.getErrorsFromMatchingFileName(
  invalidUUIDsFileName,
  true,
);
const errorsFromMatchingFileNameWithHRIDs = BulkEditFiles.getErrorsFromMatchingFileName(
  invalidHRIDsFileName,
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

            cy.assignAffiliationToUser(Affiliations.College, user.userId);
          })
          .then(() => {
            cy.withinTenant(Affiliations.College, () => {
              cy.assignPermissionsToExistingUser(user.userId, userPermissions);
              cy.getInstanceTypes({ limit: 1 }).then((instanceTypeData) => {
                instanceTypeId = instanceTypeData[0].id;

                InventoryInstances.createFolioInstanceViaApi({
                  instance: {
                    instanceTypeId,
                    title: folioInstance.title,
                  },
                }).then((createdInstanceData) => {
                  folioInstance.id = createdInstanceData.instanceId;

                  cy.getInstanceById(folioInstance.id).then((instanceData) => {
                    folioInstance.hrid = instanceData.hrid;
                  });
                });
              });
            });
          })
          .then(() => {
            FileManager.createFile(
              `cypress/fixtures/${invalidUUIDsFileName}`,
              `${folioInstance.id}\n${invalidUUID}`,
            );
            FileManager.createFile(
              `cypress/fixtures/${invalidHRIDsFileName}`,
              `${folioInstance.hrid}\n${invalidHRID}`,
            );
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

      after('delete test data', () => {
        cy.getAdminToken();
        cy.withinTenant(Affiliations.College, () => {
          InventoryInstance.deleteInstanceViaApi(folioInstance.id);
        });
        cy.withinTenant(Affiliations.Consortia, () => {
          Users.deleteViaApi(user.userId);
        });
        FileManager.deleteFile(`cypress/fixtures/${invalidUUIDsFileName}`);
        FileManager.deleteFile(`cypress/fixtures/${invalidHRIDsFileName}`);

        [errorsFromMatchingFileNameWithUUIDs, errorsFromMatchingFileNameWithHRIDs].forEach(
          (fileName) => {
            FileManager.deleteFileFromDownloadsByMask(fileName);
          },
        );
      });

      it(
        'C477607 Identifier - Verify "Errors" when uploading invalid Instance identifiers in Central tenant (consortia) (firebird)',
        { tags: ['criticalPathECS', 'firebird', 'C477607'] },
        () => {
          const testParams = [
            {
              identifierType: 'Instance UUIDs',
              fileName: invalidUUIDsFileName,
              errorsFileName: errorsFromMatchingFileNameWithUUIDs,
              identifiers: [folioInstance.id, invalidUUID],
            },
            {
              identifierType: 'Instance HRIDs',
              fileName: invalidHRIDsFileName,
              errorsFileName: errorsFromMatchingFileNameWithHRIDs,
              identifiers: [folioInstance.hrid, invalidHRID],
            },
          ];

          testParams.forEach(({ identifierType, fileName, errorsFileName, identifiers }) => {
            BulkEditSearchPane.verifyDragNDropRecordTypeIdentifierArea('Instance', identifierType);
            BulkEditSearchPane.uploadFile(fileName);
            BulkEditSearchPane.verifyPaneTitleFileName(fileName);
            BulkEditSearchPane.verifyPaneRecordsCount('0 instance');
            BulkEditSearchPane.verifyFileNameHeadLine(fileName);
            BulkEditSearchPane.verifyErrorLabel(identifiers.length);
            BulkEditSearchPane.verifyShowWarningsCheckbox(true, false);
            BulkEditSearchPane.verifyPaginatorInErrorsAccordion(identifiers.length);

            identifiers.forEach((identifier) => {
              BulkEditSearchPane.verifyNonMatchedResults(identifier);
            });

            BulkEditActions.openActions();
            BulkEditSearchPane.searchColumnNameTextfieldAbsent();
            BulkEditActions.downloadErrors();

            identifiers.forEach((identifier) => {
              ExportFile.verifyFileIncludes(errorsFileName, [`ERROR,${identifier},${errorReason}`]);
            });

            BulkEditFiles.verifyCSVFileRecordsNumber(errorsFileName, 2);
          });
        },
      );
    });
  });
});
