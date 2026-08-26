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

      describe('Radio button custom field queryable', () => {
        const option1Value = 'AT_C648488_RB_Option1';
        const option2Value = 'AT_C648488_RB_Option2';
        let userData = {};
        let listName;
        const testData = {
          customField: generateRadioButtonCustomFieldData({
            testNumber: 'C648488',
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

        before('Create test data', () => {
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
          userData = {};
        });

        it(
          'C648488 Verify that the custom field with a type Radio button is queryable (corsair)',
          { tags: ['criticalPath', 'corsair', 'C648488'] },
          () => {
            listName = getTestEntityValue('C648488_List');

            cy.loginAsAdmin({
              path: TopMenu.listsPath,
              waiter: Lists.filtersWaitLoading,
            });

            // #1 Click on "New" button, click on "Select record type" dropdown and select "Users" option
            Lists.openNewListPane();
            Lists.setName(listName);
            Lists.selectRecordType(recordType);

            // #2 Click on "Build query" button
            Lists.buildQuery();
            QueryModal.verify();

            // #3 Click "Select field" dropdown and search for the added radio button custom field
            QueryModal.selectField(testData.customFieldLabel);
            QueryModal.verifySelectedField(testData.customFieldLabel);

            // #4 Click "Select operator" dropdown and choose an operator (equals)
            QueryModal.selectOperator(QUERY_OPERATIONS.EQUAL);

            // #5 Click "Select value" dropdown — verify it is pre-populated with values from the custom field
            QueryModal.verifyOptionsInValueSelect([option1Value, option2Value]);

            // #6 Choose a value that matches the user record from the precondition
            QueryModal.chooseValueSelect(option1Value);

            // #7 Click "Test query" — verify the query returns the user record
            QueryModal.testQuery();
            QueryModal.waitForQueryTestToFinish();
            QueryModal.verifyPreviewOfRecordsMatched();
            QueryModal.verifyRecordWithContent(userData.username);
          },
        );
      });

      describe('Update radio button custom field, existing queries still available', () => {
        const option1Value = 'AT_C648493_RB_Option1';
        const option2Value = 'AT_C648493_RB_Option2';
        const updatedOption1Value = 'AT_C648493_RB_Option1_Updated';
        const updatedOption2Value = 'AT_C648493_RB_Option2_Updated';
        let userData = {};
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
        });

        it(
          'C648493 Verify that it\'s possible to update the Radio custom fields, and all existing queries are still available (corsair)',
          { tags: ['criticalPath', 'corsair', 'C648493'] },
          () => {
            listName = getTestEntityValue('C648493_List');

            cy.loginAsAdmin({
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
            Lists.waitForCompilingToComplete(3000);

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
            cy.loginAsAdmin({
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

      describe.only('Radio button custom field not queryable after deletion', () => {
        let listName;
        let userData = {};
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
        });

        after('Delete test list', () => {
          cy.getAdminToken();
          if (listName) {
            Lists.deleteListByNameViaApi(listName);
          }
          if (userData.userId) {
            Users.deleteViaApi(userData.userId);
          }
        });

        it(
          'C648498 Verify that the Radio custom field is not queryable after deleting it (corsair)',
          { tags: ['extendedPath', 'corsair', 'C648498'] },
          () => {
            listName = getTestEntityValue('C648498_List');

            cy.loginAsAdmin({
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
            cy.loginAsAdmin({
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
