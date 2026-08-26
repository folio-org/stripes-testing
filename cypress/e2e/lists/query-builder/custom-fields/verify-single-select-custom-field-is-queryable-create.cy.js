import CapabilitySets from '../../../../support/dictionary/capabilitySets';
import QueryModal, { QUERY_OPERATIONS } from '../../../../support/fragments/bulk-edit/query-modal';
import { Lists } from '../../../../support/fragments/lists/lists';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import { generateSingleSelectCustomFieldData } from '../../../../support/utils/customFields';
import { getTestEntityValue } from '../../../../support/utils/stringTools';

describe('Lists', () => {
  describe('Query Builder', () => {
    describe('Custom fields', () => {
      const recordType = 'Users';

      describe('Single select custom field queryable', () => {
        const option1Value = 'AT_C648487_SS_Option1';
        const option2Value = 'AT_C648487_SS_Option2';
        let userData = {};
        let loginUser;
        let listName;
        const testData = {
          customField: generateSingleSelectCustomFieldData({
            testNumber: 'C648487',
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
          'C648487 Verify that the custom field with a type Single select dropdown is queryable (corsair)',
          { tags: ['criticalPath', 'corsair', 'C648487'] },
          () => {
            listName = getTestEntityValue('C648487_List');

            cy.login(loginUser.username, loginUser.password, {
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

            // #3 Click "Select field" dropdown and search for the added single select custom field
            QueryModal.selectField(testData.customFieldLabel);
            QueryModal.verifySelectedField(testData.customFieldLabel);

            // #4 Click "Select operator" dropdown and choose "equals"
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
    });
  });
});
