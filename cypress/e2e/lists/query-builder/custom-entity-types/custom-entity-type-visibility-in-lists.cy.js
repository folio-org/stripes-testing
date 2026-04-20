import Capabilities from '../../../../support/dictionary/capabilities';
import CapabilitySets from '../../../../support/dictionary/capabilitySets';
import { Lists } from '../../../../support/fragments/lists/lists';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';

describe('Lists', () => {
  describe('Query Builder', () => {
    describe('Custom Entity Types', () => {
      let userData = {};
      let newCustomEntityTypeWithSources;

      const capabSetsToAssign = [
        CapabilitySets.moduleListsManage,
        CapabilitySets.uiUsersView,
      ];
      const capabsToAssign = [
        Capabilities.fqmEntityTypesCustomCollectionCreate,
        Capabilities.fqmEntityTypesCustomItemView,
        Capabilities.fqmEntityTypesCustomItemEdit,
        Capabilities.fqmEntityTypesCustomItemDelete,
      ];

      before('Create test data', () => {
        cy.getAdminToken();
        Lists.generateSimpleUsersEntityTypeSource().then((source) => {
          newCustomEntityTypeWithSources = Lists.generateCustomEntityTypeBodyWithSources(
            'Custom entity type C825347',
            [source],
            false,
          );
        });
        cy.createTempUser([]).then((userProperties) => {
          userData = userProperties;
          cy.assignCapabilitiesToExistingUser(userData.userId, capabsToAssign, capabSetsToAssign);
        }).then(() => {
          cy.getUserToken(userData.username, userData.password);
          Lists.createCustomEntityType(newCustomEntityTypeWithSources).then((response) => {
            expect(response.status).to.equal(201);
          });
        });
      });

      after('Delete test data', () => {
        cy.getUserToken(userData.username, userData.password);
        Lists.deleteCustomEntityTypeById(newCustomEntityTypeWithSources.id);
        cy.getAdminToken();
        Users.deleteViaApi(userData.userId);
      });

      it(
        'C825347 Verify that when private sets to "False", the custom entity type appears in the Lists app (eureka)',
        { tags: ['extendedPath', 'eureka', 'C825347'] },
        () => {
          // Step 2: Login to Lists app and verify the public ET appears in record type dropdowns
          cy.login(userData.username, userData.password, {
            path: TopMenu.listsPath,
            waiter: Lists.waitLoading,
          });

          // Check Record types filter dropdown
          Lists.openRecordTypeFilter();
          Lists.searchRecordTypeFilterInDropdown(newCustomEntityTypeWithSources.name);
          Lists.verifyRecordTypeFilterDropdownContainsOptions([newCustomEntityTypeWithSources.name]);

          // Check Record type dropdown when creating a new list
          Lists.openNewListPane();
          Lists.openRecordTypeDropdownAndSearchOption(newCustomEntityTypeWithSources.name);
          Lists.verifySelectedOptionsInRecordTypeDropdown(newCustomEntityTypeWithSources.name);
          Lists.cancelList();

          // Step 3: Update the entity type to private: true
          cy.getUserToken(userData.username, userData.password);
          const privateEntityType = { ...newCustomEntityTypeWithSources, private: true };
          Lists.updateCustomEntityTypeById(newCustomEntityTypeWithSources.id, privateEntityType).then((response) => {
            expect(response.status).to.equal(200);
          });

          // Step 4: Verify the private ET no longer appears in the Lists app dropdowns
          cy.login(userData.username, userData.password, {
            path: TopMenu.listsPath,
            waiter: Lists.waitLoading,
          });

          // Check Record types filter dropdown - ET should be absent
          Lists.openRecordTypeFilter();
          Lists.searchRecordTypeFilterInDropdown(newCustomEntityTypeWithSources.name);
          Lists.verifyRecordTypeFilterDropdownNoMatchingItem();

          // Check Record type dropdown when creating a new list - ET should be absent
          Lists.openNewListPane();
          Lists.openRecordTypeDropdownAndSearchOption(newCustomEntityTypeWithSources.name);
          Lists.verifyRecordTypeAbsentInDropdownOptions();
        },
      );
    });
  });
});
