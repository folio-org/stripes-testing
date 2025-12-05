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
    resource: 'UI-Inventory Holdings',
    action: CAPABILITY_ACTIONS.EDIT,
  },
];

// Test data objects for instances
const folioInstance = {
  title: `AT_C476787_FolioInstance_${getRandomPostfix()}`,
  barcodesCollege: [],
  barcodesUniversity: [],
  holdingIdsCollege: [],
  holdingIdsUniversity: [],
  holdingHridsCollege: [],
  holdingHridsUniversity: [],
  instanceHrid: null,
};

// File names for different identifier types
const holdingsUUIDsFileName = `holdingsUUIDs_${getRandomPostfix()}.csv`;
const holdingsHRIDsFileName = `holdingsHRIDs_${getRandomPostfix()}.csv`;
const instanceHRIDsFileName = `instanceHRIDs_${getRandomPostfix()}.csv`;
const itemBarcodesFileName = `itemBarcodes_${getRandomPostfix()}.csv`;

// Matched records file names
const matchedRecordsFileHoldingsUUID = BulkEditFiles.getMatchedRecordsFileName(
  holdingsUUIDsFileName,
  true,
);
const matchedRecordsFileHoldingsHRID = BulkEditFiles.getMatchedRecordsFileName(
  holdingsHRIDsFileName,
  true,
);
const matchedRecordsFileInstanceHRID = BulkEditFiles.getMatchedRecordsFileName(
  instanceHRIDsFileName,
  true,
);
const matchedRecordsFileItemBarcode = BulkEditFiles.getMatchedRecordsFileName(
  itemBarcodesFileName,
  true,
);

// Error file names
const errorFileHoldingsUUID = BulkEditFiles.getErrorsFromMatchingFileName(
  holdingsUUIDsFileName,
  true,
);
const errorFileHoldingsHRID = BulkEditFiles.getErrorsFromMatchingFileName(
  holdingsHRIDsFileName,
  true,
);
const errorFileItemBarcode = BulkEditFiles.getErrorsFromMatchingFileName(
  itemBarcodesFileName,
  true,
);

// Error message templates
const errorNoAffiliationTemplate = (key) => (holdingId) => `User ${user.username} does not have required affiliation to view the holdings record - ${key}=${holdingId} on the tenant ${Affiliations.College.toLowerCase()}`;

const errorNoPermissionTemplate = (key) => (holdingId) => `User ${user.username} does not have required permission to view the holdings record - ${key}=${holdingId} on the tenant ${Affiliations.College.toLowerCase()}`;

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

const createHoldingsAndItemsForTenant = ({
  barcodePrefix,
  barcodesArray,
  holdingIdsArray,
  holdingHridsArray,
  numberOfHoldings = 2,
}) => {
  const createHoldingWithItem = () => {
    return InventoryHoldings.createHoldingRecordViaApi({
      instanceId: folioInstance.uuid,
      permanentLocationId: locationId,
      sourceId,
    }).then((holding) => {
      holdingIdsArray.push(holding.id);
      holdingHridsArray.push(holding.hrid);

      // Create item for this holding
      const barcode = `${barcodePrefix}${getRandomPostfix()}`;
      barcodesArray.push(barcode);

      return InventoryItems.createItemViaApi({
        barcode,
        holdingsRecordId: holding.id,
        materialType: { id: materialTypeId },
        permanentLoanType: { id: loanTypeId },
        status: { name: ITEM_STATUS_NAMES.AVAILABLE },
      });
    });
  };

  // Create holdings sequentially using recursive chaining
  const createMultipleHoldings = (count) => {
    if (count === 0) {
      return cy.wrap(null);
    }
    return createMultipleHoldings(count - 1).then(() => createHoldingWithItem());
  };

  return createMultipleHoldings(numberOfHoldings);
};

const createIdentifierFiles = () => {
  FileManager.createFile(
    `cypress/fixtures/${holdingsUUIDsFileName}`,
    [...folioInstance.holdingIdsCollege, ...folioInstance.holdingIdsUniversity].join('\n'),
  );

  FileManager.createFile(
    `cypress/fixtures/${holdingsHRIDsFileName}`,
    [...folioInstance.holdingHridsCollege, ...folioInstance.holdingHridsUniversity].join('\n'),
  );

  FileManager.createFile(
    `cypress/fixtures/${instanceHRIDsFileName}`,
    [folioInstance.instanceHrid].join('\n'),
  );

  FileManager.createFile(
    `cypress/fixtures/${itemBarcodesFileName}`,
    [...folioInstance.barcodesCollege, ...folioInstance.barcodesUniversity].join('\n'),
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
  expectedValues.forEach((value) => {
    BulkEditFiles.verifyValueInRowByUUID(matchedFileName, valueType, value, valueType, value);
  });
};

const verifyErrorsForCollegeHoldings = ({
  errorTemplate,
  identifier,
  identifiersFile,
  errorsFile,
  identifierKey,
}) => {
  BulkEditSearchPane.verifyDragNDropRecordTypeIdentifierArea('Holdings', identifier);
  BulkEditSearchPane.uploadFile(identifiersFile);
  BulkEditSearchPane.verifyPaneTitleFileName(identifiersFile);
  BulkEditSearchPane.verifyPaneRecordsCount('2 holdings');
  BulkEditSearchPane.verifyErrorLabel(11);
  BulkEditActions.openActions();
  BulkEditActions.downloadErrors();

  // Build expected error messages for all 11 College holdings
  const expectedErrors = folioInstance[identifierKey].map(
    (holdingIdentifier) => `ERROR,${holdingIdentifier},${errorTemplate(holdingIdentifier)}`,
  );

  ExportFile.verifyFileIncludes(errorsFile, expectedErrors);
};

const deleteHoldingsAndItemsForTenant = (affiliation, holdingIdsArray) => {
  cy.setTenant(affiliation);
  holdingIdsArray.forEach((holdingId) => {
    cy.deleteHoldingRecordViaApi(holdingId);
  });
};

describe('Bulk-edit', () => {
  describe('Central tenant', () => {
    describe('Consortia', () => {
      const testData = {
        roleName: `AT_C476787_UserRole_${getRandomPostfix()}`,
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

              cy.getInstanceById(createdInstanceData.instanceId).then((instance) => {
                folioInstance.instanceHrid = instance.hrid;
              });
            })
            .then(() => {
              // Create holdings and items in College tenant
              cy.setTenant(Affiliations.College);
              cy.getMaterialTypes({ limit: 1 }).then((res) => {
                materialTypeId = res.id;
              });
            })
            .then(() => createHoldingsAndItemsForTenant({
              barcodePrefix: 'col_',
              barcodesArray: folioInstance.barcodesCollege,
              holdingIdsArray: folioInstance.holdingIdsCollege,
              holdingHridsArray: folioInstance.holdingHridsCollege,
              numberOfHoldings: 11,
            }))
            .then(() => {
              // Create holdings and items in University tenant
              cy.setTenant(Affiliations.University);
              cy.getMaterialTypes({ limit: 1 }).then((res) => {
                materialTypeId = res.id;
              });
            })
            .then(() => createHoldingsAndItemsForTenant({
              barcodePrefix: 'uni_',
              barcodesArray: folioInstance.barcodesUniversity,
              holdingIdsArray: folioInstance.holdingIdsUniversity,
              holdingHridsArray: folioInstance.holdingHridsUniversity,
            }))
            .then(() => {
              // Verify College and University holdings are different
              expect(folioInstance.holdingIdsCollege[0]).to.not.equal(
                folioInstance.holdingIdsUniversity[0],
                'College and University holdings must be different',
              );
            })
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

        // Delete holdings in College tenant
        deleteHoldingsAndItemsForTenant(Affiliations.College, folioInstance.holdingIdsCollege);

        // Delete holdings in University tenant
        deleteHoldingsAndItemsForTenant(
          Affiliations.University,
          folioInstance.holdingIdsUniversity,
        );

        // Delete instance in central tenant
        cy.resetTenant();
        cy.getAdminToken();
        InventoryInstance.deleteInstanceViaApi(folioInstance.uuid);

        // Clean up user and files
        Users.deleteViaApi(user.userId);
        FileManager.deleteFile(`cypress/fixtures/${holdingsUUIDsFileName}`);
        FileManager.deleteFile(`cypress/fixtures/${holdingsHRIDsFileName}`);
        FileManager.deleteFile(`cypress/fixtures/${instanceHRIDsFileName}`);
        FileManager.deleteFile(`cypress/fixtures/${itemBarcodesFileName}`);
        FileManager.deleteFileFromDownloadsByMask(
          matchedRecordsFileHoldingsUUID,
          matchedRecordsFileHoldingsHRID,
          matchedRecordsFileInstanceHRID,
          matchedRecordsFileItemBarcode,
          errorFileHoldingsUUID,
          errorFileHoldingsHRID,
          errorFileItemBarcode,
        );
      });

      it(
        'C476787 Verify "Preview of record matched" when uploading valid Holdings identifiers in Central tenant (consortia) (firebird)',
        { tags: ['criticalPathECS', 'firebird', 'C476787'] },
        () => {
          // Upload and verify Holdings UUIDs
          BulkEditSearchPane.verifyDragNDropRecordTypeIdentifierArea('Holdings', 'Holdings UUIDs');
          BulkEditSearchPane.uploadFile(holdingsUUIDsFileName);
          BulkEditSearchPane.verifyPaneTitleFileName(holdingsUUIDsFileName);
          BulkEditSearchPane.verifyPaneRecordsCount('13 holdings');
          BulkEditSearchPane.verifyFileNameHeadLine(holdingsUUIDsFileName);
          BulkEditSearchPane.verifyPaginatorInMatchedRecords(13);

          // Open Actions menu and enable Holdings UUID column
          BulkEditActions.openActions();
          BulkEditSearchPane.changeShowColumnCheckbox(
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.HOLDINGS_UUID,
          );

          // Verify matched records from both tenants
          folioInstance.holdingIdsCollege.forEach((holdingId) => {
            BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInResultsAccordion(
              holdingId,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.HOLDINGS_UUID,
              holdingId,
            );
          });

          folioInstance.holdingIdsUniversity.forEach((holdingId) => {
            BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInResultsAccordion(
              holdingId,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.HOLDINGS_UUID,
              holdingId,
            );
          });

          // Verify Actions menu options, select member tenant column
          BulkEditActions.openActions();
          BulkEditSearchPane.verifyActionsAfterConductedInAppUploading(false);
          BulkEditSearchPane.changeShowColumnCheckbox(
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.MEMBER,
          );

          folioInstance.holdingHridsCollege.forEach((hrid) => {
            BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInResultsAccordion(
              hrid,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.MEMBER,
              tenantNames.college,
            );
          });
          folioInstance.holdingHridsUniversity.forEach((hrid) => {
            BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInResultsAccordion(
              hrid,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.MEMBER,
              tenantNames.university,
            );
          });

          // Download matched records
          BulkEditActions.openActions();
          BulkEditActions.downloadMatchedResults();
          folioInstance.holdingIdsCollege
            .concat(folioInstance.holdingIdsUniversity)
            .forEach((holdingId) => {
              BulkEditFiles.verifyValueInRowByUUID(
                matchedRecordsFileHoldingsUUID,
                BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.HOLDINGS_UUID,
                holdingId,
                BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.HOLDINGS_UUID,
                holdingId,
              );
            });

          // Upload and verify Holdings HRIDs
          uploadAndVerifyMatchedResults({
            recordIdentifier: 'Holdings HRIDs',
            fileName: holdingsHRIDsFileName,
            expectedCountLabel: '13 holdings',
            matchedFileName: matchedRecordsFileHoldingsHRID,
            expectedValues: folioInstance.holdingHridsCollege.concat(
              folioInstance.holdingHridsUniversity,
            ),
            valueType: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.HOLDINGS_HRID,
          });

          // Upload and verify Instance HRIDs (at least one Instance has more than 10 Holdings)
          uploadAndVerifyMatchedResults({
            recordIdentifier: 'Instance HRIDs',
            fileName: instanceHRIDsFileName,
            expectedCountLabel: '13 holdings',
            matchedFileName: matchedRecordsFileInstanceHRID,
            expectedValues: folioInstance.holdingIdsCollege.concat(
              folioInstance.holdingIdsUniversity,
            ),
            valueType: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.HOLDINGS_UUID,
          });

          // Remove College affiliation from existing user and verify errors when uploading Holdings UUIDs
          cy.logout();
          cy.getAdminToken();
          cy.removeAffiliationFromUser(Affiliations.College, user.userId);
          cy.resetTenant();

          cy.login(user.username, user.password, {
            path: TopMenu.bulkEditPath,
            waiter: BulkEditSearchPane.waitLoading,
          });

          verifyErrorsForCollegeHoldings({
            errorTemplate: errorNoAffiliationTemplate('id'),
            identifier: 'Holdings UUIDs',
            identifiersFile: holdingsUUIDsFileName,
            errorsFile: errorFileHoldingsUUID,
            identifierKey: 'holdingIdsCollege',
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

          verifyErrorsForCollegeHoldings({
            errorTemplate: errorNoPermissionTemplate('hrid'),
            identifier: 'Holdings HRIDs',
            identifiersFile: holdingsHRIDsFileName,
            errorsFile: errorFileHoldingsHRID,
            identifierKey: 'holdingHridsCollege',
          });
        },
      );
    });
  });
});
