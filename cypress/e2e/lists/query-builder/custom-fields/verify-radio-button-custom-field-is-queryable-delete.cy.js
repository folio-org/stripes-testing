import CapabilitySets from '../../../../support/dictionary/capabilitySets';
import QueryModal, { QUERY_OPERATIONS } from '../../../../support/fragments/bulk-edit/query-modal';
import { Lists } from '../../../../support/fragments/lists/lists';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import { generateRadioButtonCustomFieldData } from '../../../../support/utils/customFields';
import { getTestEntityValue } from '../../../../support/utils/stringTools';

describe('Lists', () => {
  describe('Query Builder', () => {
    describe('Custom fields', () => {
      const recordType = 'Users';

      describe('Radio button custom field not queryable after deletion', () => {
        let listName;
        let userData = {};
        let loginUser;
        const testData = {
          customField: generateRadioButtonCustomFieldData({
            testNumber: 'C648498',
            data: {
              selectField: {
                multiSelect: false,
                options: {
                  values: [
                    { id: 'opt_0', value: 'AT_C648498_RB_Option1', default: false },
                    { id: 'opt_1', value: 'AT_C648498_RB_Option2', default: false },
                  ],
                },
              },
            },
          }),
        };

        before('Create radio button custom field', () => {
          cy.getAdminToken()
            .then(() => cy.createCustomFieldsViaApi([testData.customField]))
            .then(([createdCustomField]) => {
              testData.customField = createdCustomField;
              testData.customFieldLabel = `User — ${createdCustomField.name}`;

              return cy
                .createTempUserParameterized(
                  {
                    ...Users.generateUserModel(),
                    customFields: {
                      // select-type custom fields store the option id, not the display value
                      [createdCustomField.refId]: 'opt_0',
                    },
                  },
                  [],
                )
                .then((userProperties) => {
                  userData = userProperties;
                });
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
          if (userData.userId) {
            Users.deleteViaApi(userData.userId);
          }
          if (loginUser) {
            Users.deleteViaApi(loginUser.userId);
          }
        });

        it(
          'C648498 Verify that the Radio custom field is not queryable after deleting it (corsair)',
          { tags: ['extendedPath', 'corsair', 'C648498'] },
          () => {
            listName = getTestEntityValue('C648498_List');

            cy.login(loginUser.username, loginUser.password, {
              path: TopMenu.listsPath,
              waiter: Lists.filtersWaitLoading,
            });

            // Create a new list with a query using the radio button custom field
            Lists.openNewListPane();
            Lists.setName(listName);
            Lists.selectRecordType(recordType);
            Lists.buildQuery();
            QueryModal.verify();

            QueryModal.selectField(testData.customFieldLabel);
            QueryModal.verifySelectedField(testData.customFieldLabel);
            QueryModal.selectOperator(QUERY_OPERATIONS.EQUAL);
            QueryModal.chooseValueSelect('AT_C648498_RB_Option1');
            QueryModal.testQuery();
            QueryModal.waitForQueryTestToFinish();
            QueryModal.clickRunQueryAndSave();
            QueryModal.verifyClosed();
            Lists.waitForCompilingToComplete(3000);

            // #1 Go to "Settings" → "Users" → "Custom fields" → "Edit", remove the radio button field
            // (performed via API to avoid UI navigation overhead)
            cy.getAdminToken();
            cy.deleteCustomFieldsViaApi({ ids: [testData.customField.id] });
            testData.customField = null;

            // Wait ~5-6 min for the deletion to propagate to the entity type
            Lists.waitForFieldLabelToBeAbsent(recordType, testData.customFieldLabel);

            // #2 Go to the "Lists" app and open the list that contained the radio button custom field
            cy.login(loginUser.username, loginUser.password, {
              path: TopMenu.listsPath,
              waiter: Lists.filtersWaitLoading,
            });
            Lists.openList(listName);

            // #3 Verify the query is empty — the deleted field no longer appears in the query
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
