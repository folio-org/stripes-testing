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

      describe('Update textbox custom field, existing queries still available', () => {
        const customFieldValue = 'AT_C648494_TextboxValue';
        let userData = {};
        let loginUser;
        let listName;
        const testData = {
          customField: generateTextFieldCustomFieldData({
            testNumber: 'C648494',
          }),
        };

        before('Create test data', () => {
          cy.getAdminToken()
            .then(() => cy.createCustomFieldsViaApi([testData.customField]))
            .then(([createdCustomField]) => {
              testData.customField = createdCustomField;
              testData.customFieldLabel = `User — ${createdCustomField.name}`;
              testData.updatedFieldName = `${createdCustomField.name}_Updated`;
              testData.updatedFieldLabel = `User — ${testData.updatedFieldName}`;

              return cy
                .createTempUserParameterized(
                  {
                    ...Users.generateUserModel(),
                    customFields: {
                      [createdCustomField.refId]: customFieldValue,
                    },
                  },
                  [],
                )
                .then((userProperties) => {
                  userData = userProperties;
                });
            })
            .then(() => Lists.waitForCustomFieldToBeQueryable(testData.customFieldLabel, recordType));

          cy.createTempUser([]).then((user) => {
            loginUser = user;
            cy.assignCapabilitiesToExistingUser(user.userId, [], [
              CapabilitySets.moduleListsManage,
              CapabilitySets.uiInventory,
              CapabilitySets.uiOrdersOrdersCreate,
            ]);
          });
        });

        after('Delete test data', () => {
          cy.getAdminToken();
          if (listName) {
            Lists.deleteListByNameViaApi(listName);
          }
          if (testData.customField?.id) {
            cy.deleteCustomFieldsViaApi({ ids: [testData.customField.id] });
          }
          if (userData.userId) {
            Users.deleteViaApi(userData.userId);
          }
          if (loginUser) {
            Users.deleteViaApi(loginUser.userId);
          }
          userData = {};
        });

        it(
          "C648494 Verify that it's possible to update the textbox custom fields, and all existing queries are still available (athena)",
          { tags: ['criticalPath', 'athena', 'C648494'] },
          () => {
            listName = getTestEntityValue('C648494_List');

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

            // #1-#3 Update the textbox custom field name via API (Settings → Users → Custom fields → Edit)
            cy.getAdminToken();
            cy.replaceCustomFieldViaApi({
              ...testData.customField,
              name: testData.updatedFieldName,
            });
            testData.customField.name = testData.updatedFieldName;

            // Wait ~5-6 min for the update to propagate to the entity type
            Lists.waitForCustomFieldToBeQueryable(testData.updatedFieldLabel, recordType);

            // #4 Go to the "Lists" app and open the list that uses the updated custom field
            cy.login(loginUser.username, loginUser.password, {
              path: TopMenu.listsPath,
              waiter: Lists.filtersWaitLoading,
            });
            Lists.openList(listName);

            // Verify the user-friendly query contains the updated field name
            Lists.getQueryText().then((queryText) => {
              expect(queryText).to.include(testData.updatedFieldName);
            });

            // #5 Click on "Actions" => "Edit list" => "Edit query"
            Lists.openActions();
            Lists.editList();
            Lists.editQuery();

            // Verify the field name is updated in the query builder
            QueryModal.verifySelectedField(testData.updatedFieldLabel);
          },
        );
      });
    });
  });
});
