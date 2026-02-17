import { APPLICATION_NAMES } from '../../../../../support/constants';
import BulkEditActions from '../../../../../support/fragments/bulk-edit/bulk-edit-actions';
import BulkEditSearchPane from '../../../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import InventoryInstances from '../../../../../support/fragments/inventory/inventoryInstances';
import TopMenu from '../../../../../support/fragments/topMenu';
import TopMenuNavigation from '../../../../../support/fragments/topMenuNavigation';
import FileManager from '../../../../../support/utils/fileManager';
import getRandomPostfix from '../../../../../support/utils/stringTools';
import { parseSanityParameters } from '../../../../../support/utils/users';

const { user, memberTenant } = parseSanityParameters();
let holdingsHRID;
let instanceHRID;
let instanceTypeId;
let holdingsTypeId;
let locationId;
let loanTypeId;
let materialTypeId;
const invalidItemBarcodes = getRandomPostfix();
const invalidInstanceHrid = getRandomPostfix();
const validHoldingsHRIDFileName = `validHoldingsHRID_${getRandomPostfix()}.csv`;
const instanceHRIDFileName = `instanceHRID_${getRandomPostfix()}.csv`;
const invalidItemBarcodesFileName = `invalidItemBarcodes_${getRandomPostfix()}.csv`;
const item = {
  instanceName: `AT_C360119_FolioInstance_${getRandomPostfix()}`,
  itemBarcode: getRandomPostfix(),
};

describe('Bulk-edit', () => {
  describe('In-app approach', () => {
    before('create test data', () => {
      cy.setTenant(memberTenant.id);
      cy.getUserToken(user.username, user.password, { log: false })
        .then(() => {
          // Fetch required type IDs
          cy.getInstanceTypes({ limit: 1 }).then((instanceTypes) => {
            instanceTypeId = instanceTypes[0].id;
          });
          cy.getHoldingTypes({ limit: 1 }).then((res) => {
            holdingsTypeId = res[0].id;
          });
          InventoryInstances.getLocations({ limit: 1 }).then((locations) => {
            locationId = locations[0].id;
          });
          cy.getLoanTypes({ limit: 1 }).then((res) => {
            loanTypeId = res[0].id;
          });
          cy.getDefaultMaterialType().then((res) => {
            materialTypeId = res.id;
          });
        })
        .then(() => {
          // Create instance with holdings and item
          InventoryInstances.createFolioInstanceViaApi({
            instance: {
              instanceTypeId,
              title: item.instanceName,
            },
            holdings: [
              {
                holdingsTypeId,
                permanentLocationId: locationId,
              },
            ],
            items: [
              {
                barcode: item.itemBarcode,
                status: { name: 'Available' },
                permanentLoanType: { id: loanTypeId },
                materialType: { id: materialTypeId },
              },
            ],
          }).then((specialInstanceIds) => {
            const instanceId = specialInstanceIds.instanceId;
            const holdingId = specialInstanceIds.holdingIds[0].id;

            // Get holdings HRID
            cy.getHoldings({ limit: 1, query: `"id"="${holdingId}"` }).then((holdings) => {
              holdingsHRID = holdings[0].hrid;
              FileManager.createFile(`cypress/fixtures/${validHoldingsHRIDFileName}`, holdingsHRID);
            });

            // Get instance HRID
            cy.getInstance({ limit: 1, expandAll: true, query: `"id"=="${instanceId}"` }).then(
              (instance) => {
                instanceHRID = instance.hrid;
                FileManager.createFile(
                  `cypress/fixtures/${instanceHRIDFileName}`,
                  `${instanceHRID}\r\n${invalidInstanceHrid}`,
                );
              },
            );
          });
        })
        .then(() => {
          FileManager.createFile(
            `cypress/fixtures/${invalidItemBarcodesFileName}`,
            invalidItemBarcodes,
          );
        });

      cy.wait(5000);
      cy.allure().logCommandSteps(false);
      cy.login(user.username, user.password, {
        path: TopMenu.bulkEditPath,
        waiter: BulkEditSearchPane.waitLoading,
      });
      cy.allure().logCommandSteps(true);
    });

    after('delete test data', () => {
      cy.getUserToken(user.username, user.password, { log: false });
      cy.setTenant(memberTenant.id);
      InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(item.itemBarcode);
      FileManager.deleteFile(`cypress/fixtures/${validHoldingsHRIDFileName}`);
      FileManager.deleteFile(`cypress/fixtures/${instanceHRIDFileName}`);
      FileManager.deleteFile(`cypress/fixtures/${invalidItemBarcodesFileName}`);
    });

    it(
      'C360119 Verify that different Holdings identifiers are supported for Bulk edit (firebird)',
      { tags: ['dryRun', 'firebird', 'C360119'] },
      () => {
        BulkEditSearchPane.checkHoldingsRadio();
        BulkEditSearchPane.selectRecordIdentifier('Holdings HRIDs');
        BulkEditSearchPane.uploadFile(validHoldingsHRIDFileName);
        BulkEditSearchPane.waitFileUploading();
        BulkEditSearchPane.verifyMatchedResults(holdingsHRID);
        BulkEditActions.openActions();
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.BULK_EDIT);

        BulkEditSearchPane.checkHoldingsRadio();
        BulkEditSearchPane.selectRecordIdentifier('Instance HRIDs');
        BulkEditSearchPane.uploadFile(instanceHRIDFileName);
        BulkEditSearchPane.waitFileUploading();
        BulkEditSearchPane.verifyMatchedResults(holdingsHRID);
        BulkEditSearchPane.verifyErrorLabel(0, 1);
        BulkEditSearchPane.verifyErrorByIdentifier(
          invalidInstanceHrid,
          `Instance not found by hrid=${invalidInstanceHrid}`,
          'Warning',
        );
        BulkEditActions.openActions();
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.BULK_EDIT);

        BulkEditSearchPane.checkHoldingsRadio();
        BulkEditSearchPane.selectRecordIdentifier('Item barcodes');
        BulkEditSearchPane.uploadFile(invalidItemBarcodesFileName);
        BulkEditSearchPane.waitFileUploading();
        BulkEditSearchPane.verifyErrorLabel(0, 1);
        BulkEditSearchPane.verifyErrorByIdentifier(
          invalidItemBarcodes,
          `Item not found by barcode=${invalidItemBarcodes}`,
          'Warning',
        );
        BulkEditActions.openActions();
      },
    );
  });
});
