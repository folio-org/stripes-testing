import BulkEditActions from '../../../../../support/fragments/bulk-edit/bulk-edit-actions';
import BulkEditSearchPane, {
  ITEM_IDENTIFIERS,
} from '../../../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import InventoryInstances from '../../../../../support/fragments/inventory/inventoryInstances';
import FileManager from '../../../../../support/utils/fileManager';
import getRandomPostfix from '../../../../../support/utils/stringTools';
import TopMenu from '../../../../../support/fragments/topMenu';
import { parseSanityParameters } from '../../../../../support/utils/users';

const { user, memberTenant } = parseSanityParameters();
let instanceTypeId;
let holdingsTypeId;
let locationId;
let loanTypeId;
let loanTypeName;
let materialTypeId;
const item = {
  instanceName: `AT_C350941_FolioInstance_${getRandomPostfix()}`,
  itemBarcode: getRandomPostfix(),
};
const invalidItemBarcodesFileName = `invalidItemBarcodes_${getRandomPostfix()}.csv`;
const validItemBarcodeFileName = `validItemBarcodes_${getRandomPostfix()}.csv`;
const invalidBarcode = getRandomPostfix();

describe('Bulk-edit', () => {
  describe('In-app approach', () => {
    before('create test data', () => {
      cy.clearLocalStorage();
      cy.setTenant(memberTenant.id);
      cy.getUserToken(user.username, user.password)
        .then(() => {
          // Fetch required type IDs
          cy.getInstanceTypes({ limit: 1 }).then((instanceTypes) => {
            instanceTypeId = instanceTypes[0].id;
          });
          cy.getHoldingTypes({ limit: 1 }).then((holdingTypes) => {
            holdingsTypeId = holdingTypes[0].id;
          });
          cy.getLocations({ limit: 1 }).then((locationData) => {
            locationId = locationData.id;
          });
          cy.getLoanTypes({ limit: 1 }).then((loanTypes) => {
            loanTypeId = loanTypes[0].id;
            loanTypeName = loanTypes[0].name;
          });
          cy.getDefaultMaterialType().then((materialType) => {
            materialTypeId = materialType.id;
          });
        })
        .then(() => {
          // Create FOLIO instance with holdings and item
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
          });
          cy.wait(3000);

          FileManager.createFile(
            `cypress/fixtures/${invalidItemBarcodesFileName}`,
            `${item.itemBarcode}\r\n${invalidBarcode}`,
          );
          FileManager.createFile(
            `cypress/fixtures/${validItemBarcodeFileName}`,
            `${item.itemBarcode}`,
          );
        });

      cy.allure().logCommandSteps(false);
      cy.login(user.username, user.password, {
        path: TopMenu.bulkEditPath,
        waiter: BulkEditSearchPane.waitLoading,
      });
      cy.allure().logCommandSteps(true);
      BulkEditSearchPane.checkItemsRadio();
      BulkEditSearchPane.selectRecordIdentifier(ITEM_IDENTIFIERS.ITEM_BARCODES);
    });

    after('delete test data', () => {
      cy.getUserToken(user.username, user.password);
      cy.setTenant(memberTenant.id);
      InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(item.itemBarcode);
      FileManager.deleteFile(`cypress/fixtures/${invalidItemBarcodesFileName}`);
      FileManager.deleteFile(`cypress/fixtures/${validItemBarcodeFileName}`);
    });

    it(
      'C350941 Verify uploading file with identifiers -- In app approach (firebird)',
      { tags: ['dryRun', 'firebird', 'C350941'] },
      () => {
        BulkEditSearchPane.verifyDragNDropRecordTypeIdentifierArea(
          'Items',
          ITEM_IDENTIFIERS.ITEM_BARCODES,
        );
        BulkEditSearchPane.uploadFile(validItemBarcodeFileName);
        BulkEditSearchPane.waitFileUploading();

        BulkEditSearchPane.verifyMatchedResults(item.itemBarcode);
        BulkEditSearchPane.actionsIsShown();

        const expectedColumnTitles = [
          'Item effective location',
          'Effective call number',
          'Item HRID',
          'Barcode',
          'Material type',
        ];
        expectedColumnTitles.forEach((title) => BulkEditSearchPane.verifyResultColumnTitles(title));

        BulkEditSearchPane.verifyResultsUnderColumns('Status', 'Available');
        BulkEditSearchPane.verifyResultsUnderColumns('Permanent loan type', loanTypeName);
        BulkEditSearchPane.verifyResultsUnderColumns('Temporary loan type', '');

        BulkEditSearchPane.verifyActionsAfterConductedInAppUploading(false);
        BulkEditActions.verifyItemActionDropdownItems();

        BulkEditSearchPane.changeShowColumnCheckboxIfNotYet('Item UUID');
        BulkEditSearchPane.verifyResultColumnTitles('Item UUID');
      },
    );
  });
});
