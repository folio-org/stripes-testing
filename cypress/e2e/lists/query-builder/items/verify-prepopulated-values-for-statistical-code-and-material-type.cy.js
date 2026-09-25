import Permissions from '../../../../support/dictionary/permissions';
import { ITEM_STATUS_NAMES } from '../../../../support/constants';
import QueryModal, {
  itemFieldValues,
  enumOperators,
  QUERY_OPERATIONS,
} from '../../../../support/fragments/bulk-edit/query-modal';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import { Lists } from '../../../../support/fragments/lists/lists';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../support/utils/stringTools';

let user;
const listName = `AT_C540400_List_${getRandomPostfix()}`;
const testData = {
  statisticalCodeOption: '',
  statisticalCodeId: '',
  materialTypeName: '',
  materialTypeId: '',
  instanceTypeId: '',
  locationId: '',
  loanTypeId: '',
  instanceId: '',
  instanceTitle: `AT_C540400_Instance_${getRandomPostfix()}`,
  itemBarcode: '',
};

describe('Lists', () => {
  describe('Query Builder', () => {
    describe('Items', () => {
      before('Create test data', () => {
        cy.getAdminToken();
        cy.getStatisticalCodes({ limit: 1 }).then((codes) => {
          cy.getStatisticalCodeTypes({ limit: 200 }).then((codeTypes) => {
            const code = codes[0];
            const codeType = codeTypes.filter((type) => type.id === code.statisticalCodeTypeId)[0];
            testData.statisticalCodeOption = `${codeType.name}: ${code.code} - ${code.name}`;
            testData.statisticalCodeId = code.id;
          });
        });

        cy.getMaterialTypes({ limit: 1 }).then((materialType) => {
          testData.materialTypeName = materialType.name;
          testData.materialTypeId = materialType.id;
        });

        cy.getInstanceTypes({ limit: 1 }).then((types) => {
          testData.instanceTypeId = types[0].id;
        });

        cy.getLocations({ limit: 1 }).then((location) => {
          testData.locationId = location.id;
        });

        cy.getLoanTypes({ limit: 1 }).then((loanTypes) => {
          testData.loanTypeId = loanTypes[0].id;
        });

        cy.then(() => {
          // At least one item with statistical code exists in the environment
          testData.itemBarcode = getRandomPostfix();
          InventoryInstances.createFolioInstanceViaApi({
            instance: {
              instanceTypeId: testData.instanceTypeId,
              title: testData.instanceTitle,
            },
            holdings: [{ permanentLocationId: testData.locationId }],
            items: [
              {
                barcode: testData.itemBarcode,
                status: { name: ITEM_STATUS_NAMES.AVAILABLE },
                permanentLoanType: { id: testData.loanTypeId },
                materialType: { id: testData.materialTypeId },
                statisticalCodeIds: [testData.statisticalCodeId],
              },
            ],
          }).then(({ instanceId }) => {
            testData.instanceId = instanceId;
          });
        });

        cy.createTempUser([Permissions.listsAll.gui, Permissions.inventoryAll.gui]).then(
          (userProperties) => {
            user = userProperties;

            cy.login(user.username, user.password, {
              path: TopMenu.listsPath,
              waiter: Lists.waitLoading,
            });
          },
        );
      });

      after('Delete test data', () => {
        cy.getAdminToken();
        InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(testData.instanceId);
        Users.deleteViaApi(user.userId);
      });

      it(
        'C540400 The fields "Material type — Name", "Items — Statistical code" have prepopulated values in the "Value" dropdown (athena)',
        { tags: ['extendedPath', 'athena', 'C540400'] },
        () => {
          // Step 1: Click "New" button, add list name, select "Items" record type
          Lists.openNewListPane();
          Lists.setName(listName);
          Lists.selectRecordType(Lists.recordTypes.items);
          Lists.verifySelectedOptionsInRecordTypeDropdown(Lists.recordTypes.items);
          Lists.verifySaveButtonIsActive();
          Lists.verifyCancelButtonIsActive();

          // Step 2: Click on "Build query" button
          Lists.buildQuery();
          QueryModal.verify();
          QueryModal.verifyQueryTextboxReadOnly();

          // Step 3: Click "Select field" dropdown in the "Field" column and select "Material type — Name" option
          QueryModal.selectField(itemFieldValues.materialTypeName);
          QueryModal.verifySelectedField(itemFieldValues.materialTypeName);
          QueryModal.verifyQueryAreaContent('');
          QueryModal.verifyOperatorColumn();

          // Step 4: Click on "Select operator" dropdown in the "Operator" column
          QueryModal.verifyOperatorsList(enumOperators);

          // Step 5: Select "in" option in "Select operator" dropdown
          QueryModal.selectOperator(QUERY_OPERATIONS.IN);
          QueryModal.verifySelectedOperator(QUERY_OPERATIONS.IN);
          QueryModal.verifyQueryAreaContent('(mtypes.name in [])');

          // Step 6: Click on "Value" dropdown
          QueryModal.verifyValueMultiselectMenuIncludesOption(testData.materialTypeName);

          // Step 7: Click "Select field" dropdown and select "Item — Statistical codes" option
          QueryModal.selectField(itemFieldValues.statisticalCodeNames);
          QueryModal.verifySelectedField(itemFieldValues.statisticalCodeNames);
          QueryModal.verifyQueryAreaContent('');
          QueryModal.verifyOperatorColumn();

          // Step 8: Click on "Select operator" dropdown
          QueryModal.verifyOperatorsList(enumOperators);

          // Step 9: Select "IN" option
          QueryModal.selectOperator(QUERY_OPERATIONS.IN);
          QueryModal.verifySelectedOperator(QUERY_OPERATIONS.IN);
          QueryModal.verifyQueryAreaContent('(items.statistical_code_names in [])');

          // Step 10: Click on "Value" dropdown, select any value from dropdown menu, click "Test query"
          QueryModal.verifyValueMultiselectMenuIncludesOption(testData.statisticalCodeOption);
          QueryModal.chooseFromValueMultiselect(testData.statisticalCodeOption);
          QueryModal.verifySelectedMultiselectValue(testData.statisticalCodeOption);
          QueryModal.clickTestQuery();
          QueryModal.waitForQueryTestToFinish();
          QueryModal.verifyAllPreviewRowsContain(testData.statisticalCodeOption);

          // Step 11: Check the preview of found records
          QueryModal.verifyPreviewOfRecordsMatched();
          QueryModal.verifyColumnDisplayed(itemFieldValues.statisticalCodeNames);
          QueryModal.verifyColumnValueForRow(
            testData.instanceTitle,
            itemFieldValues.statisticalCodeNames,
            testData.statisticalCodeOption,
          );

          // Step 12: Click on "Run query & save" and verify list details page
          QueryModal.clickRunQueryAndSave();
          QueryModal.verifyClosed();
          Lists.verifyListSavedCalloutMessage(listName);
          Lists.waitForCompilingAnimationToDisappear();

          // Step 13: Click on "View updated list" link on the toast message
          Lists.viewUpdatedList();
          QueryModal.verifyColumnValueForRow(
            testData.instanceTitle,
            itemFieldValues.statisticalCodeNames,
            testData.statisticalCodeOption,
          );
        },
      );
    });
  });
});
