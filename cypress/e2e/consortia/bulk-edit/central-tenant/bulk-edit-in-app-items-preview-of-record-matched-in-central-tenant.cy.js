import BulkEditActions from '../../../../support/fragments/bulk-edit/bulk-edit-actions';
import BulkEditSearchPane from '../../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import BulkEditFiles from '../../../../support/fragments/bulk-edit/bulk-edit-files';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import FileManager from '../../../../support/utils/fileManager';
import getRandomPostfix from '../../../../support/utils/stringTools';
import InventoryHoldings from '../../../../support/fragments/inventory/holdings/inventoryHoldings';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryItems from '../../../../support/fragments/inventory/item/inventoryItems';
import ConsortiumManager from '../../../../support/fragments/settings/consortium-manager/consortium-manager';
import Affiliations, { tenantNames } from '../../../../support/dictionary/affiliations';
import {
  BULK_EDIT_TABLE_COLUMN_HEADERS,
  CAPABILITY_ACTIONS,
  CAPABILITY_TYPES,
  ITEM_STATUS_NAMES,
  LOAN_TYPE_NAMES,
} from '../../../../support/constants';
import ExportFile from '../../../../support/fragments/data-export/exportFile';

let user;
let instanceTypeId;
let locationId;
let loanTypeId;
let materialTypeId;
let sourceId;

const capabSetsToAssign = [
  {
    type: CAPABILITY_TYPES.DATA,
    resource: 'UI-Bulk-Edit Inventory',
    action: CAPABILITY_ACTIONS.VIEW,
  },
  {
    type: CAPABILITY_TYPES.DATA,
    resource: 'UI-Bulk-Edit Inventory',
    action: CAPABILITY_ACTIONS.EDIT,
  },
  {
    type: CAPABILITY_TYPES.DATA,
    resource: 'UI-Inventory Item',
    action: CAPABILITY_ACTIONS.EDIT,
  },
];

// Test data objects for instances
const folioInstance = {
  title: `AT_C477538_FolioInstance_${getRandomPostfix()}`,
  barcodesCollege: [],
  barcodesUniversity: [],
  itemIdsCollege: [],
  itemIdsUniversity: [],
  hridsCollege: [],
  hridsUniversity: [],
  holdingIdCollege: null,
  holdingIdUniversity: null,
};

// File names for different identifier types
const itemBarcodesFileName = `itemBarcodes_${getRandomPostfix()}.csv`;
const itemUUIDsFileName = `itemUUIDs_${getRandomPostfix()}.csv`;
const itemHRIDsFileName = `itemHRIDs_${getRandomPostfix()}.csv`;

// Matched records file names
const matchedRecordsFileBarcode = BulkEditFiles.getMatchedRecordsFileName(
  itemBarcodesFileName,
  true,
);
const matchedRecordsFileUUID = BulkEditFiles.getMatchedRecordsFileName(itemUUIDsFileName, true);
const matchedRecordsFileHRID = BulkEditFiles.getMatchedRecordsFileName(itemHRIDsFileName, true);

// Error file names
const errorFileHRID = BulkEditFiles.getErrorsFromMatchingFileName(itemHRIDsFileName, true);
const errorFileUUID = BulkEditFiles.getErrorsFromMatchingFileName(itemUUIDsFileName, true);

// Error message templates
const errorNoAffiliationTemplate = (key) => (itemId) => `User ${user.username} does not have required affiliation to view the item record - ${key}=${itemId} on the tenant ${Affiliations.College.toLowerCase()}`;

const errorNoPermissionTemplate = (key) => (itemId) => `User ${user.username} does not have required permission to view the item record - ${key}=${itemId} on the tenant ${Affiliations.College.toLowerCase()}`;

const createRoleWithCapabilitiesForAffiliation = (affiliation, testData) => {
  cy.setTenant(affiliation);

  // Create role
  cy.createAuthorizationRoleApi(testData.roleName).then((role) => {
    testData.roleIds[affiliation] = role.id;

    // Original "pre-fetch" capability sets (kept to avoid changing behavior)
    cy.wrap(capabSetsToAssign).each((capabilitySet) => {
      cy.getCapabilitySetIdViaApi(capabilitySet);
    });
  });

  // Fetch capability set IDs and add them to the role/user
  cy.wrap([]).then(() => {
    const capabSetIds = [];
    return cy
      .wrap(capabSetsToAssign)
      .each((capabilitySet) => {
        return cy.getCapabilitySetIdViaApi(capabilitySet).then((capabSetId) => {
          capabSetIds.push(capabSetId);
        });
      })
      .then(() => {
        cy.addCapabilitySetsToNewRoleApi(testData.roleIds[affiliation], capabSetIds);
        cy.addRolesToNewUserApi(user.userId, [testData.roleIds[affiliation]]);
      });
  });
};

const createItemsForTenant = ({
  firstBarcodePrefix,
  secondBarcodePrefix,
  barcodesArray,
  itemIdsArray,
  hridsArray,
  holdingId,
}) => {
  const barcode1 = `${firstBarcodePrefix}${getRandomPostfix()}`;
  barcodesArray.push(barcode1);

  return InventoryItems.createItemViaApi({
    barcode: barcode1,
    holdingsRecordId: holdingId,
    materialType: { id: materialTypeId },
    permanentLoanType: { id: loanTypeId },
    status: { name: ITEM_STATUS_NAMES.AVAILABLE },
  })
    .then((item) => {
      itemIdsArray.push(item.id);
      hridsArray.push(item.hrid);
      cy.wait(500);

      const barcode2 = `${secondBarcodePrefix}${getRandomPostfix()}`;
      barcodesArray.push(barcode2);

      return InventoryItems.createItemViaApi({
        barcode: barcode2,
        holdingsRecordId: holdingId,
        materialType: { id: materialTypeId },
        permanentLoanType: { id: loanTypeId },
        status: { name: ITEM_STATUS_NAMES.AVAILABLE },
      });
    })
    .then((item) => {
      itemIdsArray.push(item.id);
      hridsArray.push(item.hrid);
      cy.wait(500);
    });
};

const createIdentifierFiles = () => {
  FileManager.createFile(
    `cypress/fixtures/${itemBarcodesFileName}`,
    [...folioInstance.barcodesCollege, ...folioInstance.barcodesUniversity].join('\n'),
  );

  FileManager.createFile(
    `cypress/fixtures/${itemUUIDsFileName}`,
    [...folioInstance.itemIdsCollege, ...folioInstance.itemIdsUniversity].join('\n'),
  );

  FileManager.createFile(
    `cypress/fixtures/${itemHRIDsFileName}`,
    [...folioInstance.hridsCollege, ...folioInstance.hridsUniversity].join('\n'),
  );
};

const uploadAndVerifyMatchedResults = ({
  recordIdentifier,
  fileName,
  expectedCountLabel,
  matchedFileName,
  expectedValues,
  valueType,
}) => {
  if (recordIdentifier) {
    BulkEditSearchPane.selectRecordIdentifier(recordIdentifier);
  }

  BulkEditSearchPane.uploadFile(fileName);
  BulkEditSearchPane.waitFileUploading();
  BulkEditSearchPane.verifyPaneTitleFileName(fileName);
  BulkEditSearchPane.verifyPaneRecordsCount(expectedCountLabel);

  BulkEditActions.downloadMatchedResults();
  BulkEditFiles.verifyMatchedResultFileContent(matchedFileName, expectedValues, valueType);
};

const verifyErrorsForCollegeItems = ({
  errorTemplate,
  identifier,
  identifiersFile,
  errorsFile,
  identifierKey,
}) => {
  BulkEditSearchPane.verifyDragNDropRecordTypeIdentifierArea('Items', identifier);
  BulkEditSearchPane.uploadFile(identifiersFile);
  BulkEditSearchPane.verifyPaneTitleFileName(identifiersFile);
  BulkEditSearchPane.verifyPaneRecordsCount('2 item');
  BulkEditSearchPane.verifyErrorLabel(2);
  BulkEditActions.openActions();
  BulkEditActions.downloadErrors();
  ExportFile.verifyFileIncludes(errorsFile, [
    `ERROR,${folioInstance[identifierKey][0]},${errorTemplate(folioInstance[identifierKey][0])}`,
    `ERROR,${folioInstance[identifierKey][1]},${errorTemplate(folioInstance[identifierKey][1])}`,
  ]);
};

const deleteItemsAndHoldingsForTenant = (affiliation, itemIdsArray, holdingId) => {
  cy.setTenant(affiliation);
  itemIdsArray.forEach((itemId) => {
    cy.deleteItemViaApi(itemId);
  });
  if (holdingId) {
    cy.deleteHoldingRecordViaApi(holdingId);
  }
};

describe('Bulk-edit', () => {
  describe('Central tenant', () => {
    describe('Consortia', () => {
      const testData = {
        roleName: `AT_C477538_UserRole_${getRandomPostfix()}`,
        roleIds: {},
      };

      before('create test data', () => {
        cy.clearLocalStorage();
        cy.getAdminToken();

        cy.createTempUser([]).then((userProperties) => {
          user = userProperties;

          // Assign affiliations to user
          [Affiliations.College, Affiliations.University].forEach((affiliation) => {
            cy.assignAffiliationToUser(affiliation, user.userId);
          });

          // Create and assign roles for each affiliation
          cy.wrap([Affiliations.Consortia, Affiliations.College, Affiliations.University]).each(
            (affiliation) => {
              createRoleWithCapabilitiesForAffiliation(affiliation, testData);
            },
          );

          cy.resetTenant();

          // Get instance, location, loan and source
          cy.getInstanceTypes({ limit: 1 }).then((instanceTypeData) => {
            instanceTypeId = instanceTypeData[0].id;
          });
          cy.getLocations({ query: 'name="DCB"' }).then((res) => {
            locationId = res.id;
          });
          cy.getLoanTypes({ query: `name="${LOAN_TYPE_NAMES.CAN_CIRCULATE}"` }).then((res) => {
            loanTypeId = res[0].id;
          });
          InventoryHoldings.getHoldingsFolioSource().then((folioSource) => {
            sourceId = folioSource.id;
          });

          // Create shared folio instance
          cy.resetTenant()
            .then(() => InventoryInstances.createFolioInstanceViaApi({
              instance: {
                instanceTypeId,
                title: folioInstance.title,
              },
            }))
            .then((createdInstanceData) => {
              folioInstance.uuid = createdInstanceData.instanceId;
            })
            .then(() => {
              // Create holdings and items in College tenant
              cy.setTenant(Affiliations.College);
              cy.getMaterialTypes({ limit: 1 }).then((res) => {
                materialTypeId = res.id;
              });
            })
            .then(() => InventoryHoldings.createHoldingRecordViaApi({
              instanceId: folioInstance.uuid,
              permanentLocationId: locationId,
              sourceId,
            }))
            .then((holding) => {
              folioInstance.holdingIdCollege = holding.id;
            })
            .then(() => createItemsForTenant({
              firstBarcodePrefix: 'col_',
              secondBarcodePrefix: 'uni_',
              barcodesArray: folioInstance.barcodesCollege,
              itemIdsArray: folioInstance.itemIdsCollege,
              hridsArray: folioInstance.hridsCollege,
              holdingId: folioInstance.holdingIdCollege,
            }))
            .then(() => {
              // Create holdings and items in University tenant
              cy.setTenant(Affiliations.University);
              cy.getMaterialTypes({ limit: 1 }).then((res) => {
                materialTypeId = res.id;
              });
            })
            .then(() => InventoryHoldings.createHoldingRecordViaApi({
              instanceId: folioInstance.uuid,
              permanentLocationId: locationId,
              sourceId,
            }))
            .then((holding) => {
              folioInstance.holdingIdUniversity = holding.id;

              // Verify College and University holdings are different
              expect(folioInstance.holdingIdCollege).to.not.equal(
                folioInstance.holdingIdUniversity,
                'College and University holdings must be different',
              );
            })
            .then(() => createItemsForTenant({
              firstBarcodePrefix: 'UNI_ITEM_',
              secondBarcodePrefix: 'UNI_ITEM_',
              barcodesArray: folioInstance.barcodesUniversity,
              itemIdsArray: folioInstance.itemIdsUniversity,
              hridsArray: folioInstance.hridsUniversity,
              holdingId: folioInstance.holdingIdUniversity,
            }))
            .then(() => {
              // Create CSV files with identifiers
              createIdentifierFiles();
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
        cy.resetTenant();
        cy.getAdminToken();

        // Delete created roles from each affiliation
        [Affiliations.Consortia, Affiliations.College, Affiliations.University].forEach(
          (affiliation) => {
            cy.setTenant(affiliation);
            const id = testData.roleIds[affiliation];

            if (id) {
              cy.deleteAuthorizationRoleApi(id);
            }
          },
        );

        // Delete items/holdings in College tenant
        deleteItemsAndHoldingsForTenant(
          Affiliations.College,
          folioInstance.itemIdsCollege,
          folioInstance.holdingIdCollege,
        );

        // Delete items/holdings in University tenant
        deleteItemsAndHoldingsForTenant(
          Affiliations.University,
          folioInstance.itemIdsUniversity,
          folioInstance.holdingIdUniversity,
        );

        // Delete instance in central tenant
        cy.resetTenant();
        cy.getAdminToken();
        InventoryInstance.deleteInstanceViaApi(folioInstance.uuid);

        // Clean up user and files
        Users.deleteViaApi(user.userId);
        FileManager.deleteFile(`cypress/fixtures/${itemBarcodesFileName}`);
        FileManager.deleteFile(`cypress/fixtures/${itemUUIDsFileName}`);
        FileManager.deleteFile(`cypress/fixtures/${itemHRIDsFileName}`);
        FileManager.deleteFileFromDownloadsByMask(
          matchedRecordsFileBarcode,
          matchedRecordsFileUUID,
          matchedRecordsFileHRID,
          errorFileHRID,
          errorFileUUID,
        );
      });

      it(
        'C477538 Verify "Preview of record matched" when uploading valid Items identifiers in Central tenant (consortia) (firebird)',
        { tags: ['criticalPathECS', 'firebird', 'C477538'] },
        () => {
          // Upload and verify Item barcodes
          BulkEditSearchPane.verifyDragNDropRecordTypeIdentifierArea('Items', 'Item barcodes');
          BulkEditSearchPane.uploadFile(itemBarcodesFileName);
          BulkEditSearchPane.verifyPaneTitleFileName(itemBarcodesFileName);
          BulkEditSearchPane.verifyPaneRecordsCount('4 item');
          BulkEditSearchPane.verifyFileNameHeadLine(itemBarcodesFileName);
          BulkEditSearchPane.verifyPaginatorInMatchedRecords(4);

          // Verify matched records from both tenants
          folioInstance.barcodesCollege.forEach((barcode) => {
            BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInResultsAccordion(
              barcode,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.BARCODE,
              barcode,
            );
          });

          folioInstance.barcodesUniversity.forEach((barcode) => {
            BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInResultsAccordion(
              barcode,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.BARCODE,
              barcode,
            );
          });

          // Download matched records - downloadMatchedResults handles opening Actions menu
          BulkEditActions.downloadMatchedResults();
          BulkEditFiles.verifyMatchedResultFileContent(
            matchedRecordsFileBarcode,
            folioInstance.barcodesCollege.concat(folioInstance.barcodesUniversity),
            'barcode',
          );

          // Upload and verify Item UUIDs
          uploadAndVerifyMatchedResults({
            recordIdentifier: 'Item UUIDs',
            fileName: itemUUIDsFileName,
            expectedCountLabel: '4 item',
            matchedFileName: matchedRecordsFileUUID,
            expectedValues: folioInstance.itemIdsCollege.concat(folioInstance.itemIdsUniversity),
            valueType: 'uuid',
          });

          // Verify Actions menu options, select member tenant column and check hrids
          BulkEditActions.openActions();
          BulkEditSearchPane.verifyActionsAfterConductedInAppUploading(false);
          BulkEditActions.verifyItemActionDropdownItems();
          BulkEditSearchPane.changeShowColumnCheckbox(
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.MEMBER,
          );

          folioInstance.hridsCollege.forEach((hrid) => {
            BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInResultsAccordion(
              hrid,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.MEMBER,
              tenantNames.college,
            );
          });
          folioInstance.hridsUniversity.forEach((hrid) => {
            BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInResultsAccordion(
              hrid,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.MEMBER,
              tenantNames.university,
            );
          });

          [...folioInstance.hridsCollege, ...folioInstance.hridsUniversity].forEach((hrid) => {
            BulkEditSearchPane.verifyResultsUnderColumns(
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.ITEM_HRID,
              hrid,
            );
          });

          // Upload and verify Item HRIDs
          uploadAndVerifyMatchedResults({
            recordIdentifier: 'Item HRIDs',
            fileName: itemHRIDsFileName,
            expectedCountLabel: '4 item',
            matchedFileName: matchedRecordsFileHRID,
            expectedValues: folioInstance.hridsCollege.concat(folioInstance.hridsUniversity),
            valueType: 'hrid',
          });

          // Remove College affiliation from existing user and verify errors when uploading Item UUIDs
          cy.logout();
          cy.getAdminToken();
          cy.removeAffiliationFromUser(Affiliations.College, user.userId);
          cy.resetTenant();

          cy.login(user.username, user.password, {
            path: TopMenu.bulkEditPath,
            waiter: BulkEditSearchPane.waitLoading,
          });

          verifyErrorsForCollegeItems({
            errorTemplate: errorNoAffiliationTemplate('id'),
            identifier: 'Item UUIDs',
            identifiersFile: itemUUIDsFileName,
            errorsFile: errorFileUUID,
            identifierKey: 'itemIdsCollege',
          });

          // Return College affiliation and remove Roles from it to verify permissions errors
          cy.logout();
          cy.getAdminToken();
          cy.assignAffiliationToUser(Affiliations.College, user.userId);
          cy.setTenant(Affiliations.College);
          cy.deleteRolesForUserApi(user.userId);
          cy.resetTenant();

          cy.login(user.username, user.password, {
            path: TopMenu.bulkEditPath,
            waiter: BulkEditSearchPane.waitLoading,
          });

          verifyErrorsForCollegeItems({
            errorTemplate: errorNoPermissionTemplate('hrid'),
            identifier: 'Item HRIDs',
            identifiersFile: itemHRIDsFileName,
            errorsFile: errorFileHRID,
            identifierKey: 'hridsCollege',
          });
        },
      );
    });
  });
});
