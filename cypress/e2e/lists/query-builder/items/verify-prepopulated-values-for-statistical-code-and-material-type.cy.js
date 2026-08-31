import Permissions from '../../../../support/dictionary/permissions';
import QueryModal, {
  itemFieldValues,
  enumOperators,
  QUERY_OPERATIONS,
} from '../../../../support/fragments/bulk-edit/query-modal';
import { Lists } from '../../../../support/fragments/lists/lists';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../support/utils/stringTools';

let user;
const listName = `AT_C540400_List_${getRandomPostfix()}`;
const testData = {
  statisticalCodeOption: '',
  materialTypeName: '',
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
          });
        });

        cy.getMaterialTypes({ limit: 1 }).then((materialTypes) => {
          testData.materialTypeName = materialTypes.name;
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
        Users.deleteViaApi(user.userId);
      });

      it(
        'C540400 The field "Items — Statistical code" has prepopulated values in the "Value" dropdown (athena)',
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

          // Step 3: Click "Select field" dropdown and select "Item — Statistical codes" option
          QueryModal.selectField(itemFieldValues.statisticalCodeNames);
          QueryModal.verifySelectedField(itemFieldValues.statisticalCodeNames);
          QueryModal.verifyQueryAreaContent('(items.statistical_code_names  )');

          // Step 4: Click on "Select operator" dropdown
          QueryModal.verifyOperatorsList(enumOperators);

          // Step 5: Select "IN" option
          QueryModal.selectOperator(QUERY_OPERATIONS.IN);
          QueryModal.verifySelectedOperator(QUERY_OPERATIONS.IN);
          QueryModal.verifyQueryAreaContent('(items.statistical_code_names in ())');

          // Step 6: Click on "Value" dropdown
          QueryModal.verifyValueMultiselectMenuIncludesOption(testData.statisticalCodeOption);

          // Step 7: Click on selected "Item — Statistical codes" option => select "Material type — Name"
          QueryModal.selectField(itemFieldValues.materialTypeName);

          // Expected: Field changed to Material type, query updated
          QueryModal.verifySelectedField(itemFieldValues.materialTypeName);
          QueryModal.verifySelectedOperator('Select operator');
          QueryModal.verifyQueryAreaContent('(mtypes.name  )');

          // Step 8: Click on "Select operator" dropdown
          // Expected: Operators listed for Material type field
          QueryModal.verifyOperatorsList(enumOperators);

          // Step 9: Select "in" option
          QueryModal.selectOperator(QUERY_OPERATIONS.IN);

          // Expected: Operator is displayed and added to query
          QueryModal.verifySelectedOperator(QUERY_OPERATIONS.IN);
          QueryModal.verifyQueryAreaContent('(mtypes.name in ())');

          // Step 10: Click on "Value" dropdown
          QueryModal.verifyValueMultiselectMenuIncludesOption(testData.materialTypeName);
        },
      );
    });
  });
});
