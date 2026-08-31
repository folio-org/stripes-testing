import CapabilitySets from '../../../../support/dictionary/capabilitySets';
import QueryModal, { QUERY_OPERATIONS } from '../../../../support/fragments/bulk-edit/query-modal';
import { Lists } from '../../../../support/fragments/lists/lists';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import { generateTextFieldCustomFieldData } from '../../../../support/utils/customFields';
import { getTestEntityValue } from '../../../../support/utils/stringTools';

describe('Lists', () => {
  describe('Query Builder', () => {
    describe('Custom fields', () => {
      const recordType = 'Users';

      describe('Textbox custom field not queryable after deletion', () => {
        const customFieldValue = 'AT_C648499_TextboxValue';
        let loginUser;
        let listName;
        const testData = {
          customField: generateTextFieldCustomFieldData({
            testNumber: 'C648499',
          }),
        };

        before('Create test data', () => {
          cy.getAdminToken()
            .then(() => cy.createCustomFieldsViaApi([testData.customField]))
            .then(([createdCustomField]) => {
              testData.customField = createdCustomField;
              testData.customFieldLabel = `User — ${createdCustomField.name}`;
            })
            .then(() => Lists.waitForCustomFieldToBeQueryable(recordType, testData.customFieldLabel));

          cy.createTempUser([]).then((user) => {
            loginUser = user;
            cy.assignCapabilitiesToExistingUser(user.userId, [], [
              CapabilitySets.moduleListsManage,
              CapabilitySets.uiInventory,
              CapabilitySets.uiOrdersOrdersCreate,
            ]);
          });
        });

        after('Delete test list', () => {
          cy.getAdminToken();
          if (listName) {
            Lists.deleteListByNameViaApi(listName);
          }
          if (loginUser) {
            Users.deleteViaApi(loginUser.userId);
          }
        });

        it(
          'C648499 Verify that the textbox custom field is not queryable after deleting it (corsair)',
          { tags: ['extendedPath', 'corsair', 'C648499'] },
          () => {
            listName = getTestEntityValue('C648499_List');

            cy.login(loginUser.username, loginUser.password, {
              path: TopMenu.listsPath,
              waiter: Lists.filtersWaitLoading,
            });

            // Create a new list with a query using the textbox custom field
            Lists.openNewListPane();
            Lists.setName(listName);
            Lists.selectRecordType(recordType);
            Lists.buildQuery();
            QueryModal.verify();

            QueryModal.selectField(testData.customFieldLabel);
            QueryModal.verifySelectedField(testData.customFieldLabel);
            QueryModal.selectOperator(QUERY_OPERATIONS.EQUAL);
            QueryModal.fillInValueTextfield(customFieldValue);
            QueryModal.testQuery();
            QueryModal.waitForQueryTestToFinish();
            QueryModal.clickRunQueryAndSave();
            QueryModal.verifyClosed();
            Lists.waitForCompilingToComplete();

            // #1-#2 Go to "Settings" → "Users" → "Custom fields" → "Edit", remove the textbox field
            // (performed via API to avoid UI navigation overhead)
            cy.getAdminToken();
            cy.deleteCustomFieldsViaApi({ ids: [testData.customField.id] });
            testData.customField = null;

            // Wait ~5-6 min for the deletion to propagate to the entity type
            Lists.waitForFieldLabelToBeAbsent(recordType, testData.customFieldLabel);

            // #3 Go to the "Lists" app and open the list that contained the textbox custom field
            cy.login(loginUser.username, loginUser.password, {
              path: TopMenu.listsPath,
              waiter: Lists.filtersWaitLoading,
            });
            Lists.openList(listName);

            // Verify the query is empty — the deleted field no longer appears in the query
            Lists.getQueryText().then((queryText) => {
              expect(queryText).not.to.include(testData.customFieldLabel);
            });

            // #4 Click on "Actions" -> "Edit list" -> "Edit query"
            Lists.openActions();
            Lists.editList();
            Lists.editQuery();

            // Verify the query builder is empty — no fields are selected
            QueryModal.verify();
            QueryModal.verifyEmptyField();
            QueryModal.verifyQueryAreaContent('');
          },
        );
      });
    });
  });
});
