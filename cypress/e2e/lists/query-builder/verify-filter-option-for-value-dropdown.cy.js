import QueryModal, {
  itemFieldValues,
  QUERY_OPERATIONS,
} from '../../../support/fragments/bulk-edit/query-modal';
import { Lists } from '../../../support/fragments/lists/lists';
import MaterialTypes from '../../../support/fragments/settings/inventory/materialTypes';
import TopMenu from '../../../support/fragments/topMenu';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Lists', () => {
  describe('Query Builder', () => {
    const recordType = 'Items';
    const listName = `C1312673_List_${getRandomPostfix()}`;
    const testData = {
      materialType: {
        ...MaterialTypes.getDefaultMaterialType(),
        name: `AT_C1312673_Recording_${getRandomPostfix()}`,
      },
    };

    before('Create test data and login', () => {
      cy.getAdminToken();
      MaterialTypes.createMaterialTypeViaApi(testData.materialType).then(({ body }) => {
        testData.materialType.id = body.id;
      });

      cy.loginAsAdmin({
        path: TopMenu.listsPath,
        waiter: Lists.waitLoading,
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      MaterialTypes.deleteViaApi(testData.materialType.id);
    });

    it(
      'C1312673 Verify that the "Filter" option exists for "Value" dropdown when building a query (corsair)',
      { tags: ['criticalPath', 'corsair', 'C1312673'] },
      () => {
        // Step 1: Create new list with Item record type
        Lists.openNewListPane();
        Lists.setName(listName);
        Lists.selectRecordType(recordType);
        Lists.buildQuery();

        // Step 2: Select field "Material type — Name" and operator "IN"
        QueryModal.selectField(itemFieldValues.materialTypeName);
        QueryModal.selectOperator(QUERY_OPERATIONS.IN);
        QueryModal.verifySelectedMultiselectValue([]);

        // Step 3: Change operator from "IN" to "equals"
        QueryModal.selectOperator(QUERY_OPERATIONS.EQUAL);
        QueryModal.verifySelectedValue('Select value');

        // Step 4: Click on "Select value" field
        QueryModal.verifySearchableFilterExists();

        // Step 5: Enter "rec" in the searchable field and verify filtering
        // Verify only material types containing "rec" are displayed
        QueryModal.verifyFilteredOptionsInValueSelect(testData.materialType.name, [
          testData.materialType.name,
        ]);
      },
    );
  });
});
