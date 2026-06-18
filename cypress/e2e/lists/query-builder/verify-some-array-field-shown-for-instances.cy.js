import Permissions from '../../../support/dictionary/permissions';
import QueryModal, {
  instanceFieldValues,
  QUERY_OPERATIONS,
} from '../../../support/fragments/bulk-edit/query-modal';
import { Lists } from '../../../support/fragments/lists/lists';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

const listName = `AT_C451496_List_${getRandomPostfix()}`;
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

    // Trillium
    it.skip(
      "C451496 [instance] Verify that some array type fields are shown in the Query Builder for 'Instances' entity type (corsair)",
      { tags: [] },
      () => {
        // Step 1: Create new list with Instances record type
        Lists.openNewListPane();
        Lists.setName(listName);
        Lists.selectRecordType(Lists.recordTypes.instances);
        Lists.verifySelectedOptionsInRecordTypeDropdown(Lists.recordTypes.instances);
        Lists.verifySaveButtonIsActive();
        Lists.verifyCancelButtonIsActive();
        Lists.buildQuery();
        QueryModal.verify();

        // Step 2: Click "Select field" dropdown in the "Field" column => search for the field 'Instance — Statistical codes'
        QueryModal.selectField(instanceFieldValues.statisticalCodeNames);
        QueryModal.verifySelectedField(instanceFieldValues.statisticalCodeNames);

        // Step 3: Select an available operator such as 'IN'
        QueryModal.selectOperator(QUERY_OPERATIONS.IN);

        // Step 4: Click on the dropdown under "Value"
        QueryModal.fillInValueMultiselect(testData.statisticalCodes[0].fullName, 0);
        QueryModal.chooseFromValueMultiselect(testData.statisticalCodes[1].fullName, 0);
        QueryModal.verifyQueryAreaContent(
          `(instance.statistical_code_names in [${testData.statisticalCodes[0].fullName}, ${testData.statisticalCodes[1].fullName}])`,
        );
      },
    );
  });
});
