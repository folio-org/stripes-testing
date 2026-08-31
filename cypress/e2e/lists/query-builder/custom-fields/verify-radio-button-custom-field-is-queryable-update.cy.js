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

      describe('Update radio button custom field, existing queries still available', () => {
        const option1Value = 'AT_C648493_RB_Option1';
        const option2Value = 'AT_C648493_RB_Option2';
        const updatedOption1Value = 'AT_C648493_RB_Option1_Updated';
        const updatedOption2Value = 'AT_C648493_RB_Option2_Updated';
        let userData = {};
        let loginUser;
        let listName;
        const testData = {
          customField: generateRadioButtonCustomFieldData({
            testNumber: 'C648493',
            data: {
              selectField: {
                multiSelect: false,
                options: {
                  values: [
                    { id: 'opt_0', value: option1Value, default: false },
                    { id: 'opt_1', value: option2Value, default: false },
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
              testData.updatedFieldName = `${createdCustomField.name}_Updated`;
              testData.updatedFieldLabel = `User — ${testData.updatedFieldName}`;

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
        });

        it(
          "C648493 Verify that it's possible to update the Radio custom fields, and all existing queries are still available (corsair)",
          { tags: ['criticalPath', 'corsair', 'C648493'] },
          () => {
            listName = getTestEntityValue('C648493_List');

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

            // #1 Select the custom field, operator and value; run query and save the list
            QueryModal.selectField(testData.customFieldLabel);
            QueryModal.verifySelectedField(testData.customFieldLabel);
            QueryModal.selectOperator(QUERY_OPERATIONS.EQUAL);
            QueryModal.chooseValueSelect(option1Value);
            QueryModal.testQuery();
            QueryModal.waitForQueryTestToFinish();
            QueryModal.clickRunQueryAndSave();
            QueryModal.verifyClosed();
            Lists.waitForCompilingToComplete();

            // #2 Update the radio button custom field name and option labels via API
            cy.getAdminToken();
            cy.replaceCustomFieldViaApi({
              ...testData.customField,
              name: testData.updatedFieldName,
              selectField: {
                ...testData.customField.selectField,
                options: {
                  values: [
                    {
                      ...testData.customField.selectField.options.values[0],
                      value: updatedOption1Value,
                    },
                    {
                      ...testData.customField.selectField.options.values[1],
                      value: updatedOption2Value,
                    },
                  ],
                },
              },
            });

            // Wait ~5-6 min for the update to propagate to the entity type
            Lists.waitForCustomFieldToBeQueryable(recordType, testData.updatedFieldLabel);

            // #3 Go to the "Lists" app and open the list that uses the updated custom field
            cy.login(loginUser.username, loginUser.password, {
              path: TopMenu.listsPath,
              waiter: Lists.filtersWaitLoading,
            });
            Lists.openList(listName);

            // #4 Verify the user-friendly query contains the updated field name and option values
            Lists.getQueryText().then((queryText) => {
              expect(queryText).to.include(testData.updatedFieldName);
              expect(queryText).to.include(updatedOption1Value);
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
