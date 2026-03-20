import uuid from 'uuid';
import permissions from '../../../../support/dictionary/permissions';
import BulkEditActions from '../../../../support/fragments/bulk-edit/bulk-edit-actions';
import BulkEditSearchPane, {
  ERROR_MESSAGES,
} from '../../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import BulkEditFiles from '../../../../support/fragments/bulk-edit/bulk-edit-files';
import ExportFile from '../../../../support/fragments/data-export/exportFile';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import InventoryHoldings from '../../../../support/fragments/inventory/holdings/inventoryHoldings';
import InventoryItems from '../../../../support/fragments/inventory/item/inventoryItems';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import FileManager from '../../../../support/utils/fileManager';
import getRandomPostfix from '../../../../support/utils/stringTools';
import ConsortiumManager from '../../../../support/fragments/settings/consortium-manager/consortium-manager';
import Affiliations, { tenantNames } from '../../../../support/dictionary/affiliations';
import { ITEM_STATUS_NAMES, LOAN_TYPE_NAMES } from '../../../../support/constants';

let user;
let instanceTypeId;
let locationId;
let loanTypeId;
let materialTypeId;
let sourceId;
const sharedInstance = {
  title: `AT_C477640_SharedInstance_${getRandomPostfix()}`,
};
const duplicateItemBarcode = `duplicateBarcode_${getRandomPostfix()}`;
const collegeItemData = {};
const universityItemData = {};
const userPermissions = [
  permissions.bulkEditEdit.gui,
  permissions.uiInventoryViewCreateEditItems.gui,
];
const invalidItemBarcode = getRandomPostfix();
const invalidItemUUID = uuid();
const invalidItemHRID = getRandomPostfix();
const itemBarcodesFileName = `itemBarcodes_${getRandomPostfix()}.csv`;
const itemUUIDsFileName = `itemUUIDs_${getRandomPostfix()}.csv`;
const itemHRIDsFileName = `itemHRIDs_${getRandomPostfix()}.csv`;
const errorsFromMatchingFileNameWithBarcodes = BulkEditFiles.getErrorsFromMatchingFileName(
  itemBarcodesFileName,
  true,
);
const errorsFromMatchingFileNameWithUUIDs = BulkEditFiles.getErrorsFromMatchingFileName(
  itemUUIDsFileName,
  true,
);
const errorsFromMatchingFileNameWithHRIDs = BulkEditFiles.getErrorsFromMatchingFileName(
  itemHRIDsFileName,
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
            // Create shared instance in Central tenant
            cy.getInstanceTypes({ limit: 1 }).then((instanceTypes) => {
              instanceTypeId = instanceTypes[0].id;

              InventoryInstances.createFolioInstanceViaApi({
                instance: {
                  instanceTypeId,
                  title: sharedInstance.title,
                },
              }).then((createdInstanceData) => {
                sharedInstance.id = createdInstanceData.instanceId;
              });
            });
          })
          .then(() => {
            // Create holding and item with duplicate barcode in College tenant
            cy.setTenant(Affiliations.College);
            cy.getLocations({ limit: 1 }).then((locations) => {
              locationId = locations.id;
            });
            cy.getLoanTypes({ query: `name="${LOAN_TYPE_NAMES.CAN_CIRCULATE}"` }).then(
              (loanTypes) => {
                loanTypeId = loanTypes[0].id;
              },
            );
            cy.getMaterialTypes({ limit: 1 }).then((materialTypes) => {
              materialTypeId = materialTypes.id;
            });
            InventoryHoldings.getHoldingsFolioSource().then((folioSource) => {
              sourceId = folioSource.id;

              InventoryHoldings.createHoldingRecordViaApi({
                instanceId: sharedInstance.id,
                permanentLocationId: locationId,
                sourceId,
              }).then((holding) => {
                collegeItemData.holdingId = holding.id;

                InventoryItems.createItemViaApi({
                  barcode: duplicateItemBarcode,
                  holdingsRecordId: collegeItemData.holdingId,
                  materialType: { id: materialTypeId },
                  permanentLoanType: { id: loanTypeId },
                  status: { name: ITEM_STATUS_NAMES.AVAILABLE },
                }).then((item) => {
                  collegeItemData.id = item.id;
                });
              });
            });
          })
          .then(() => {
            // Create holding and item with duplicate barcode in University tenant
            cy.setTenant(Affiliations.University);
            cy.getLocations({ limit: 1 }).then((locations) => {
              locationId = locations.id;
            });
            cy.getLoanTypes({ query: `name="${LOAN_TYPE_NAMES.CAN_CIRCULATE}"` }).then(
              (loanTypes) => {
                loanTypeId = loanTypes[0].id;
              },
            );
            cy.getMaterialTypes({ limit: 1 }).then((materialTypes) => {
              materialTypeId = materialTypes.id;
            });
            InventoryHoldings.getHoldingsFolioSource().then((folioSource) => {
              sourceId = folioSource.id;

              InventoryHoldings.createHoldingRecordViaApi({
                instanceId: sharedInstance.id,
                permanentLocationId: locationId,
                sourceId,
              }).then((holding) => {
                universityItemData.holdingId = holding.id;

                InventoryItems.createItemViaApi({
                  barcode: duplicateItemBarcode,
                  holdingsRecordId: universityItemData.holdingId,
                  materialType: { id: materialTypeId },
                  permanentLoanType: { id: loanTypeId },
                  status: { name: ITEM_STATUS_NAMES.AVAILABLE },
                }).then((item) => {
                  universityItemData.id = item.id;
                });
              });
            });
          })
          .then(() => {
            cy.resetTenant();
            // Create CSV files with identifiers
            FileManager.createFile(
              `cypress/fixtures/${itemBarcodesFileName}`,
              `${invalidItemBarcode}\n${duplicateItemBarcode}`,
            );
            FileManager.createFile(`cypress/fixtures/${itemUUIDsFileName}`, invalidItemUUID);
            FileManager.createFile(`cypress/fixtures/${itemHRIDsFileName}`, invalidItemHRID);
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
        cy.setTenant(Affiliations.College);
        InventoryItems.deleteItemViaApi(collegeItemData.id);
        InventoryHoldings.deleteHoldingRecordViaApi(collegeItemData.holdingId);
        cy.setTenant(Affiliations.University);
        InventoryItems.deleteItemViaApi(universityItemData.id);
        InventoryHoldings.deleteHoldingRecordViaApi(universityItemData.holdingId);
        cy.resetTenant();
        InventoryInstance.deleteInstanceViaApi(sharedInstance.id);
        Users.deleteViaApi(user.userId);

        FileManager.deleteFile(`cypress/fixtures/${itemBarcodesFileName}`);
        FileManager.deleteFile(`cypress/fixtures/${itemUUIDsFileName}`);
        FileManager.deleteFile(`cypress/fixtures/${itemHRIDsFileName}`);

        [
          errorsFromMatchingFileNameWithBarcodes,
          errorsFromMatchingFileNameWithUUIDs,
          errorsFromMatchingFileNameWithHRIDs,
        ].forEach((fileName) => {
          FileManager.deleteFileFromDownloadsByMask(fileName);
        });
      });

      it(
        'C477640 Identifier - Verify "Errors" when uploading invalid Items identifiers in Central tenant (consortia) (firebird)',
        { tags: ['criticalPathECS', 'firebird', 'C477640'] },
        () => {
          const testParams = [
            {
              identifierType: 'Item barcodes',
              fileName: itemBarcodesFileName,
              errorsFileName: errorsFromMatchingFileNameWithBarcodes,
              identifiers: [
                { value: invalidItemBarcode, error: ERROR_MESSAGES.NO_MATCH_FOUND },
                {
                  value: duplicateItemBarcode,
                  error: ERROR_MESSAGES.DUPLICATES_ACROSS_TENANTS,
                },
              ],
              recordType: 'items',
            },
            {
              identifierType: 'Item UUIDs',
              fileName: itemUUIDsFileName,
              errorsFileName: errorsFromMatchingFileNameWithUUIDs,
              identifiers: [{ value: invalidItemUUID, error: ERROR_MESSAGES.NO_MATCH_FOUND }],
              recordType: 'items',
            },
            {
              identifierType: 'Item HRIDs',
              fileName: itemHRIDsFileName,
              errorsFileName: errorsFromMatchingFileNameWithHRIDs,
              identifiers: [{ value: invalidItemHRID, error: ERROR_MESSAGES.NO_MATCH_FOUND }],
              recordType: 'items',
            },
          ];

          testParams.forEach(
            ({ identifierType, fileName, errorsFileName, identifiers, recordType }) => {
              BulkEditSearchPane.clickToBulkEditMainButton();
              BulkEditSearchPane.verifyDragNDropRecordTypeIdentifierArea('Items', identifierType);

              BulkEditSearchPane.uploadFile(fileName);
              BulkEditSearchPane.verifyPaneTitleFileName(fileName);
              BulkEditSearchPane.verifyPaneRecordsCount(`0 ${recordType}`);
              BulkEditSearchPane.verifyFileNameHeadLine(fileName);
              BulkEditSearchPane.verifyErrorLabel(identifiers.length);
              BulkEditSearchPane.verifyShowWarningsCheckbox(true, false);
              BulkEditSearchPane.verifyPaginatorInErrorsAccordion(identifiers.length);

              identifiers.forEach((identifier) => {
                BulkEditSearchPane.verifyErrorByIdentifier(identifier.value, identifier.error);
              });

              BulkEditActions.openActions();
              BulkEditActions.downloadErrors();

              identifiers.forEach((identifier) => {
                ExportFile.verifyFileIncludes(errorsFileName, [
                  `ERROR,${identifier.value},${identifier.error}`,
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
