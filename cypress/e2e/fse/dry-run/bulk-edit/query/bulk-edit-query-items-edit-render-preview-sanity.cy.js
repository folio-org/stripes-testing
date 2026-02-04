import BulkEditSearchPane from '../../../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import TopMenu from '../../../../../support/fragments/topMenu';
import QueryModal, {
  itemFieldValues,
  QUERY_OPERATIONS,
} from '../../../../../support/fragments/bulk-edit/query-modal';
import InventoryInstances from '../../../../../support/fragments/inventory/inventoryInstances';
import getRandomPostfix from '../../../../../support/utils/stringTools';
import { parseSanityParameters } from '../../../../../support/utils/users';

const { user, memberTenant } = parseSanityParameters();
let instanceTypeId;
let holdingsTypeId;
let locationId1;
let locationId2;
let loanTypeId;
let materialTypeId;
const item = {
  instanceName: `AT_C440063_FolioInstance_${getRandomPostfix()}`,
  barcode: getRandomPostfix(),
};

describe('Bulk-edit', () => {
  describe('Query', () => {
    before('create test data', () => {
      cy.setTenant(memberTenant.id);
      cy.getUserToken(user.username, user.password)
        .then(() => {
          // Fetch required type IDs
          cy.getInstanceTypes({ limit: 1 }).then((instanceTypes) => {
            instanceTypeId = instanceTypes[0].id;
          });
          cy.getHoldingTypes({ limit: 1 }).then((res) => {
            holdingsTypeId = res[0].id;
          });
          InventoryInstances.getLocations({ limit: 2 }).then((locations) => {
            locationId1 = locations[0].id;
            locationId2 = locations[1].id;
          });
          cy.getLoanTypes({ limit: 1 }).then((res) => {
            loanTypeId = res[0].id;
          });
          cy.getDefaultMaterialType().then((res) => {
            materialTypeId = res.id;
          });
        })
        .then(() => {
          InventoryInstances.createFolioInstanceViaApi({
            instance: {
              instanceTypeId,
              title: item.instanceName,
            },
            holdings: [
              {
                holdingsTypeId,
                permanentLocationId: locationId1,
              },
            ],
            items: [
              {
                barcode: item.barcode,
                status: { name: 'Available' },
                permanentLoanType: { id: loanTypeId },
                materialType: { id: materialTypeId },
                temporaryLocationId: locationId2,
              },
            ],
          });
        })
        .then(() => {
          cy.allure().logCommandSteps(false);
          cy.login(user.username, user.password, {
            path: TopMenu.bulkEditPath,
            waiter: BulkEditSearchPane.waitLoading,
          });
          cy.allure().logCommandSteps(true);
        });
    });

    after('delete test data', () => {
      cy.getUserToken(user.username, user.password);
      cy.setTenant(memberTenant.id);
      InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(item.barcode);
    });

    it(
      'C440063 Render preview after query executed (Items - Edit) (firebird)',
      { tags: ['dryRun', 'firebird', 'C440063'] },
      () => {
        BulkEditSearchPane.openQuerySearch();
        BulkEditSearchPane.checkItemsRadio();
        BulkEditSearchPane.clickBuildQueryButton();
        QueryModal.verify();
        QueryModal.verifyFieldsSortedAlphabetically();
        QueryModal.clickSelectFieldButton();
        QueryModal.selectField(itemFieldValues.itemBarcode);
        QueryModal.verifySelectedField(itemFieldValues.itemBarcode);
        QueryModal.verifyQueryAreaContent('(items.barcode  )');
        QueryModal.verifyOperatorColumn();
        QueryModal.selectOperator(QUERY_OPERATIONS.EQUAL);
        QueryModal.verifyQueryAreaContent('(items.barcode == )');
        QueryModal.verifyValueColumn();
        QueryModal.fillInValueTextfield(item.barcode);
        QueryModal.verifyQueryAreaContent(`(items.barcode == ${item.barcode})`);
        QueryModal.testQueryDisabled(false);
        QueryModal.runQueryDisabled();
        QueryModal.clickTestQuery();
        QueryModal.verifyPreviewOfRecordsMatched();
        QueryModal.clickRunQuery();
        QueryModal.verifyClosed();
        BulkEditSearchPane.verifySpecificTabHighlighted('Query');
        BulkEditSearchPane.isBuildQueryButtonDisabled();
        BulkEditSearchPane.isHoldingsRadioChecked(false);
        BulkEditSearchPane.isInstancesRadioChecked(false);
        BulkEditSearchPane.isItemsRadioChecked(true);
        BulkEditSearchPane.verifyActionsAfterConductedInAppUploading(false);
        BulkEditSearchPane.verifyActionsDropdownScrollable();
        BulkEditSearchPane.searchColumnName('note');
        const columnNameNote = 'Action note';
        BulkEditSearchPane.changeShowColumnCheckboxIfNotYet(columnNameNote);
        BulkEditSearchPane.verifyResultColumnTitles(columnNameNote);
        BulkEditSearchPane.searchColumnName('fewoh', false);
        BulkEditSearchPane.clearSearchColumnNameTextfield();
        BulkEditSearchPane.verifyActionsDropdownScrollable();
        const columnName = 'Item HRID';
        BulkEditSearchPane.searchColumnName(columnName);
        BulkEditSearchPane.changeShowColumnCheckboxIfNotYet(columnName);
        BulkEditSearchPane.changeShowColumnCheckbox(columnName);
        BulkEditSearchPane.verifyResultColumnTitlesDoNotInclude(columnName);
      },
    );
  });
});
