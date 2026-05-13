import CapabilitySets from '../../../../support/dictionary/capabilitySets';
import QueryModal, { QUERY_OPERATIONS } from '../../../../support/fragments/bulk-edit/query-modal';
import { Lists } from '../../../../support/fragments/lists/lists';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../support/utils/stringTools';
import { AUTHORITY_QUERY_FIELDS, AUTHORITY_HEADING_TYPES } from '../../../../support/constants';

describe('Lists', () => {
  describe('Query Builder', () => {
    describe('Authority', () => {
      const testData = {
        recordType: 'Authority',
        listName: `AT_C1292064_List_${getRandomPostfix()}`,
      };

      const capabSetsToAssign = [
        CapabilitySets.moduleListsManage,
        CapabilitySets.uiMarcAuthoritiesAuthorityRecordView,
      ];

      let userData = {};

      before('Create test data', () => {
        cy.getAdminToken();
        cy.createTempUser([]).then((userProperties) => {
          userData = userProperties;
          cy.assignCapabilitiesToExistingUser(userData.userId, [], capabSetsToAssign);
        });
      });

      after('Delete test data', () => {
        cy.getAdminToken();
        Users.deleteViaApi(userData.userId);
      });

      it(
        'C1292064 Verify the available queryable field labels for "Authority" record type and "Authority headings" in the "Build query" pane (spitfire)',
        { tags: ['extendedPath', 'spitfire', 'C1292064'] },
        () => {
          cy.login(userData.username, userData.password, {
            path: TopMenu.listsPath,
            waiter: Lists.waitLoading,
          });

          // Step 1: Create new list, select Authority record type, open Build query and verify form elements
          Lists.openNewListPane();
          Lists.setName(testData.listName);
          Lists.selectRecordType(testData.recordType);
          Lists.buildQuery();
          QueryModal.verify();
          QueryModal.verifyQueryTextboxReadOnly();
          QueryModal.verifyQueryTextboxResizable();

          // Step 2: Expand field dropdown and verify all available queryable fields
          QueryModal.verifyAllAvailableFieldOptions(Object.values(AUTHORITY_QUERY_FIELDS));

          // Step 3: Select "Authority — Heading type", any operator, and verify value dropdown options
          QueryModal.selectField(AUTHORITY_QUERY_FIELDS.AUTHORITY_HEADING_TYPE);
          QueryModal.selectOperator(QUERY_OPERATIONS.EQUAL);
          QueryModal.verifyOptionsInValueSelect(Object.values(AUTHORITY_HEADING_TYPES));

          // Step 4: Select "Authority — See also from reference — Tracing type", any operator, and verify value dropdown options
          QueryModal.selectField(
            AUTHORITY_QUERY_FIELDS.AUTHORITY_SEE_ALSO_FROM_REFERENCE_TRACING_TYPE,
          );
          QueryModal.selectOperator(QUERY_OPERATIONS.NOT_EQUAL);
          QueryModal.verifyOptionsInValueSelect(Object.values(AUTHORITY_HEADING_TYPES));

          // Step 5: Select "Authority — See from reference — Tracing type", any operator, and verify value dropdown options
          QueryModal.selectField(AUTHORITY_QUERY_FIELDS.AUTHORITY_SEE_FROM_REFERENCE_TRACING_TYPE);
          QueryModal.selectOperator(QUERY_OPERATIONS.EQUAL);
          QueryModal.verifyOptionsInValueSelect(Object.values(AUTHORITY_HEADING_TYPES));
        },
      );
    });
  });
});
