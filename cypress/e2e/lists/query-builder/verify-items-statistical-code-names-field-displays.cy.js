import Permissions from '../../../support/dictionary/permissions';
import QueryModal, {
  itemFieldValues,
  enumOperators,
  QUERY_OPERATIONS,
} from '../../../support/fragments/bulk-edit/query-modal';
import { Lists } from '../../../support/fragments/lists/lists';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

const listName = `AT_C451494_List_${getRandomPostfix()}`;
const testData = {
  statisticalCodes: [],
};
let user;

describe('Lists', () => {
  describe('Query Builder', () => {
    before('Create test user and login', () => {
      cy.getAdminToken();

      // Get statistical codes with full names
      cy.getStatisticalCodes({ limit: 2 }).then((codes) => {
        cy.getStatisticalCodeTypes({ limit: 200 }).then((codeTypes) => {
          codes.forEach((code) => {
            const codeType = codeTypes.find((item) => item.id === code.statisticalCodeTypeId);
            code.typeName = codeType.name;
            code.fullName = `${code.typeName}: ${code.code} - ${code.name}`;
            testData.statisticalCodes.push(code);
          });
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
      Users.deleteViaApi(user.userId);
    });

    it(
      'C451494 [Items] Verify that the field "Items — Statistical code" shown in the Query Builder for "Items" entity type (corsair)',
      { tags: ['criticalPath', 'corsair', 'C451494'] },
      () => {
        // Step 1: Create new list with Items record type
        Lists.openNewListPane();
        Lists.setName(listName);
        Lists.selectRecordType(Lists.recordTypes.items);
        Lists.verifySelectedOptionsInRecordTypeDropdown(Lists.recordTypes.items);
        Lists.verifySaveButtonIsActive();
        Lists.verifyCancelButtonIsActive();
        Lists.buildQuery();
        QueryModal.verify();

        // Step 2: Click "Select field" dropdown in the "Field" column => search for the field 'Items — Statistical code'
        QueryModal.selectField(itemFieldValues.statisticalCodeNames);
        QueryModal.verifySelectedField(itemFieldValues.statisticalCodeNames);

        // Step 3: Select an available operator such as 'IN'
        QueryModal.verifyOperatorsList(enumOperators);

        // Step 4: Select any of the operators
        QueryModal.selectOperator(QUERY_OPERATIONS.IN);
        QueryModal.fillInValueMultiselect(testData.statisticalCodes[0].fullName, 0);
        QueryModal.chooseFromValueMultiselect(testData.statisticalCodes[1].fullName, 0);
        QueryModal.verifyQueryAreaContent(
          `(items.statistical_code_names in [${testData.statisticalCodes[0].fullName}, ${testData.statisticalCodes[1].fullName}])`,
        );
      },
    );
  });
});
