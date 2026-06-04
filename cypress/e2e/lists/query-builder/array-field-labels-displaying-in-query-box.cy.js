import Permissions from '../../../support/dictionary/permissions';
import QueryModal, {
  instanceFieldValues,
  QUERY_OPERATIONS,
} from '../../../support/fragments/bulk-edit/query-modal';
import { Lists } from '../../../support/fragments/lists/lists';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

const recordType = 'Instances';
const listName = `AT_C651465_List_${getRandomPostfix()}`;
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
      'C651465 Verify that array field labels are displaying in "Query" box of query builder (corsair)',
      { tags: ['criticalPath', 'corsair', 'C651465'] },
      () => {
        // Step 1: Create new list with Instances record type
        Lists.openNewListPane();
        Lists.setName(listName);
        Lists.selectRecordType(recordType);
        Lists.verifySelectedOptionsInRecordTypeDropdown(recordType);
        Lists.verifySaveButtonIsActive();
        Lists.verifyCancelButtonIsActive();

        // Step 2: Open Build query form
        Lists.buildQuery();
        QueryModal.verify();
        QueryModal.verifyQueryTextboxReadOnly();
        QueryModal.verifyQueryTextboxResizable();

        // Step 3: Configure query with "not in" operator for Instance — Statistical codes
        QueryModal.selectField(instanceFieldValues.statisticalCodeNames);
        QueryModal.selectOperator(QUERY_OPERATIONS.NOT_IN);
        QueryModal.fillInValueMultiselect(testData.statisticalCodes[0].fullName, 0);
        QueryModal.chooseFromValueMultiselect(testData.statisticalCodes[1].fullName, 0);
        QueryModal.verifyQueryAreaContent(
          `(instance.statistical_code_names not in [${testData.statisticalCodes[0].fullName}, ${testData.statisticalCodes[1].fullName}])`,
        );
      },
    );
  });
});
