import permissions from '../../../../support/dictionary/permissions';
import BulkEditActions from '../../../../support/fragments/bulk-edit/bulk-edit-actions';
import BulkEditSearchPane from '../../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import BulkEditFiles from '../../../../support/fragments/bulk-edit/bulk-edit-files';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import FileManager from '../../../../support/utils/fileManager';
import getRandomPostfix from '../../../../support/utils/stringTools';
import ConsortiumManager from '../../../../support/fragments/settings/consortium-manager/consortium-manager';
import Affiliations, { tenantNames } from '../../../../support/dictionary/affiliations';
import ExportFile from '../../../../support/fragments/data-export/exportFile';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import InventoryHoldings from '../../../../support/fragments/inventory/holdings/inventoryHoldings';

let user;
const testData = {};
const invalidInstanceUUIDsFileName = `AT_C965838_InvalidInstanceUUIDs_${getRandomPostfix()}.csv`;
const invalidInstanceHRIDsFileName = `AT_C965838_InvalidInstanceHRIDs_${getRandomPostfix()}.csv`;
const errorsFromMatchingUUIDsFileName = BulkEditFiles.getErrorsFromMatchingFileName(
  invalidInstanceUUIDsFileName,
  true,
);
const errorsFromMatchingHRIDsFileName = BulkEditFiles.getErrorsFromMatchingFileName(
  invalidInstanceHRIDsFileName,
  true,
);

const sharedInstanceWithoutHoldings = {
  title: `AT_C965838_SharedNoHoldings_${getRandomPostfix()}`,
};
const sharedInstanceWithHoldings = {
  title: `AT_C965838_SharedWithHoldings_${getRandomPostfix()}`,
};
const instanceSharedFromMember = {
  title: `AT_C965838_SharedFromMember_${getRandomPostfix()}`,
};
const sharedInstances = [
  sharedInstanceWithoutHoldings,
  sharedInstanceWithHoldings,
  instanceSharedFromMember,
];

const nonExistentInstanceUUIDs = [];
const nonExistentInstanceHRIDs = [];

for (let i = 0; i < 7; i++) {
  nonExistentInstanceUUIDs.push(
    `${getRandomPostfix()}-${getRandomPostfix()}-${getRandomPostfix()}-${getRandomPostfix()}-${getRandomPostfix()}`,
  );
  nonExistentInstanceHRIDs.push(`hrid${getRandomPostfix()}`);
}

const invalidInstanceUUIDs = [...nonExistentInstanceUUIDs];
const invalidInstanceHRIDs = [...nonExistentInstanceHRIDs];

describe('Bulk-edit', () => {
  describe('Member tenant', () => {
    describe('Consortia', () => {
      before('create test data', () => {
        cy.clearLocalStorage();
        cy.getAdminToken();
        cy.getConsortiaId().then((consortiaId) => {
          testData.consortiaId = consortiaId;
        });
        cy.createTempUser([
          permissions.bulkEditEdit.gui,
          permissions.uiInventoryViewCreateEditInstances.gui,
        ]).then((userProperties) => {
          user = userProperties;

          cy.assignAffiliationToUser(Affiliations.College, user.userId);
          cy.setTenant(Affiliations.College);
          cy.assignPermissionsToExistingUser(user.userId, [
            permissions.bulkEditEdit.gui,
            permissions.uiInventoryViewCreateEditInstances.gui,
          ]);
          cy.resetTenant();

          cy.getInstanceTypes({ limit: 1 }).then((instanceTypes) => {
            testData.instanceTypeId = instanceTypes[0].id;
          });

          // Create shared Instance without Holdings (in Central tenant)
          cy.then(() => {
            InventoryInstances.createFolioInstanceViaApi({
              instance: {
                instanceTypeId: testData.instanceTypeId,
                title: sharedInstanceWithoutHoldings.title,
              },
            }).then((createdInstanceData) => {
              sharedInstanceWithoutHoldings.uuid = createdInstanceData.instanceId;
              cy.getInstanceById(createdInstanceData.instanceId).then((instanceData) => {
                sharedInstanceWithoutHoldings.hrid = instanceData.hrid;
              });
            });
          });

          // Create shared Instance with Holdings in member tenant
          cy.then(() => {
            InventoryInstances.createFolioInstanceViaApi({
              instance: {
                instanceTypeId: testData.instanceTypeId,
                title: sharedInstanceWithHoldings.title,
              },
            }).then((createdInstanceData) => {
              sharedInstanceWithHoldings.uuid = createdInstanceData.instanceId;
              cy.getInstanceById(createdInstanceData.instanceId).then((instanceData) => {
                sharedInstanceWithHoldings.hrid = instanceData.hrid;
              });
            });
          });

          // Create holdings for the shared instance in College (member) tenant
          cy.then(() => {
            cy.setTenant(Affiliations.College);
            cy.getLocations({ query: 'name="DCB"' }).then((location) => {
              testData.locationId = location.id;
            });
            InventoryHoldings.getHoldingsFolioSource().then((folioSource) => {
              testData.sourceId = folioSource.id;
              InventoryHoldings.createHoldingRecordViaApi({
                instanceId: sharedInstanceWithHoldings.uuid,
                permanentLocationId: testData.locationId,
                sourceId: testData.sourceId,
              }).then((holding) => {
                sharedInstanceWithHoldings.collegeHoldingId = holding.id;
              });
            });
          });

          // Create local Instance in member tenant, then share it to Central
          cy.then(() => {
            cy.setTenant(Affiliations.College);
            InventoryInstance.createInstanceViaApi({
              instanceTitle: instanceSharedFromMember.title,
            }).then(({ instanceData }) => {
              instanceSharedFromMember.uuid = instanceData.instanceId;
              InventoryInstance.shareInstanceViaApi(
                instanceSharedFromMember.uuid,
                testData.consortiaId,
                Affiliations.College,
                Affiliations.Consortia,
              );
              cy.getInstanceById(instanceSharedFromMember.uuid).then((fetched) => {
                instanceSharedFromMember.hrid = fetched.hrid;
              });
            });
            cy.resetTenant();
          });

          cy.then(() => {
            sharedInstances.forEach((instance) => {
              invalidInstanceUUIDs.push(instance.uuid);
              invalidInstanceHRIDs.push(instance.hrid);
            });

            FileManager.createFile(
              `cypress/fixtures/${invalidInstanceUUIDsFileName}`,
              invalidInstanceUUIDs.join('\n'),
            );
            FileManager.createFile(
              `cypress/fixtures/${invalidInstanceHRIDsFileName}`,
              invalidInstanceHRIDs.join('\n'),
            );
          });

          cy.login(user.username, user.password, {
            path: TopMenu.bulkEditPath,
            waiter: BulkEditSearchPane.waitLoading,
          });
          ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.central);
          ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
          ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.college);
        });
      });

      after('delete test data', () => {
        cy.resetTenant();
        cy.getAdminToken();
        cy.setTenant(Affiliations.College);
        cy.deleteHoldingRecordViaApi(sharedInstanceWithHoldings.collegeHoldingId);
        cy.resetTenant();
        sharedInstances.forEach((instance) => {
          InventoryInstance.deleteInstanceViaApi(instance.uuid);
        });
        Users.deleteViaApi(user.userId);
        FileManager.deleteFile(`cypress/fixtures/${invalidInstanceUUIDsFileName}`);
        FileManager.deleteFile(`cypress/fixtures/${invalidInstanceHRIDsFileName}`);
        FileManager.deleteFileFromDownloadsByMask(errorsFromMatchingUUIDsFileName);
        FileManager.deleteFileFromDownloadsByMask(errorsFromMatchingHRIDsFileName);
      });

      it(
        'C965838 Verify "Errors" when uploading invalid Instance identifiers in Member tenant (consortia) (firebird)',
        { tags: ['extendedPathECS', 'firebird', 'C965838'] },
        () => {
          // Step 1: Select "Inventory - instances" radio button and "Instance UUIDs" identifier
          BulkEditSearchPane.checkInstanceRadio();
          BulkEditSearchPane.selectRecordIdentifier('Instance UUIDs');
          BulkEditSearchPane.verifyDragNDropRecordTypeIdentifierArea('Instance', 'Instance UUIDs');

          // Step 2: Upload File 1 with invalid Instance UUIDs
          BulkEditSearchPane.uploadFile(invalidInstanceUUIDsFileName);
          BulkEditSearchPane.checkForUploading(invalidInstanceUUIDsFileName);

          // Step 3: Check the result of uploading the .csv file with Instance UUIDs
          BulkEditSearchPane.waitFileUploading();
          BulkEditSearchPane.verifyPaneTitleFileName(invalidInstanceUUIDsFileName);
          BulkEditSearchPane.verifyPaneRecordsCount('0 instance');
          BulkEditSearchPane.verifyFileNameHeadLine(invalidInstanceUUIDsFileName);
          BulkEditSearchPane.verifyErrorLabel(invalidInstanceUUIDs.length);

          invalidInstanceUUIDs.forEach((uuid) => {
            BulkEditSearchPane.verifyNonMatchedResults(uuid);
          });

          BulkEditSearchPane.verifyPaginatorInErrorsAccordion(invalidInstanceUUIDs.length);

          // Step 4: Check the columns in the error table
          invalidInstanceUUIDs.forEach((uuid) => {
            BulkEditSearchPane.verifyErrorByIdentifier(uuid, 'No match found', 'Error');
          });

          // Step 5: Click "Actions" menu
          BulkEditActions.openActions();
          BulkEditSearchPane.searchColumnNameTextfieldAbsent();
          BulkEditActions.downloadErrorsExists();

          // Step 6: Click "Download errors (CSV)"
          BulkEditActions.downloadErrors();
          invalidInstanceUUIDs.forEach((uuid) => {
            ExportFile.verifyFileIncludes(errorsFromMatchingUUIDsFileName, [
              `ERROR,${uuid},No match found`,
            ]);
          });

          // Step 7: Select "Instance HRIDs" from the "Record identifier" dropdown
          BulkEditSearchPane.selectRecordIdentifier('Instance HRIDs');
          BulkEditSearchPane.verifyDragNDropRecordTypeIdentifierArea('Instance', 'Instance HRIDs');

          // Step 8: Upload File 2 with invalid Instance HRIDs
          BulkEditSearchPane.uploadFile(invalidInstanceHRIDsFileName);
          BulkEditSearchPane.checkForUploading(invalidInstanceHRIDsFileName);

          // Step 9: Check the result of uploading the .csv file with Instance HRIDs
          BulkEditSearchPane.waitFileUploading();
          BulkEditSearchPane.verifyPaneTitleFileName(invalidInstanceHRIDsFileName);
          BulkEditSearchPane.verifyPaneRecordsCount('0 instance');
          BulkEditSearchPane.verifyFileNameHeadLine(invalidInstanceHRIDsFileName);
          BulkEditSearchPane.verifyErrorLabel(invalidInstanceHRIDs.length);

          invalidInstanceHRIDs.forEach((hrid) => {
            BulkEditSearchPane.verifyNonMatchedResults(hrid);
          });

          BulkEditSearchPane.verifyPaginatorInErrorsAccordion(invalidInstanceHRIDs.length);

          // Step 10: Check the columns in the error table
          invalidInstanceHRIDs.forEach((hrid) => {
            BulkEditSearchPane.verifyErrorByIdentifier(hrid, 'No match found', 'Error');
          });

          // Step 11: Click "Actions" menu => Click "Download errors (CSV)"
          BulkEditActions.openActions();
          BulkEditActions.downloadErrors();
          invalidInstanceHRIDs.forEach((hrid) => {
            ExportFile.verifyFileIncludes(errorsFromMatchingHRIDsFileName, [
              `ERROR,${hrid},No match found`,
            ]);
          });
        },
      );
    });
  });
});
