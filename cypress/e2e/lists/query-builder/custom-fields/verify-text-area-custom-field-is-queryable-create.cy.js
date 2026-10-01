import CapabilitySets from '../../../../support/dictionary/capabilitySets';
import QueryModal, { QUERY_OPERATIONS } from '../../../../support/fragments/bulk-edit/query-modal';
import { Lists } from '../../../../support/fragments/lists/lists';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import { generateTextAreaCustomFieldData } from '../../../../support/utils/customFields';
import { getTestEntityValue } from '../../../../support/utils/stringTools';

describe('Lists', () => {
  describe('Query Builder', () => {
    describe('Custom fields', () => {
      const recordType = 'Users';

      describe('Text area custom field queryable', () => {
        const customFieldValue = 'AT_C648490_TextAreaValue';
        let userData = {};
        let loginUser;
        let listName;
        const testData = {
          customField: generateTextAreaCustomFieldData({
            testNumber: 'C648490',
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
          'C648490 Verify that the custom field with a type text area is queryable (athena)',
          { tags: ['criticalPath', 'athena', 'C648490'] },
          () => {
            listName = getTestEntityValue('C648490_List');

            cy.login(loginUser.username, loginUser.password, {
              path: TopMenu.listsPath,
              waiter: Lists.filtersWaitLoading,
            });

            // #1 Click on "New" button, select "Users" record type
            Lists.openNewListPane();
            Lists.setName(listName);
            Lists.selectRecordType(recordType);

            // #2 Click on "Build query" button
            Lists.buildQuery();
            QueryModal.verify();

            // #3 Click "Select field" dropdown and search for the added text area custom field
            QueryModal.selectField(testData.customFieldLabel);
            QueryModal.verifySelectedField(testData.customFieldLabel);

            // #4 Click "Select operator" dropdown and choose an operator
            QueryModal.selectOperator(QUERY_OPERATIONS.EQUAL);

            // #5 Click into the "Value" box and type a value that matches the record from the precondition
            QueryModal.fillInValueTextfield(customFieldValue);

            // #6 Click "Test query" — verify the query returns the user record
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
