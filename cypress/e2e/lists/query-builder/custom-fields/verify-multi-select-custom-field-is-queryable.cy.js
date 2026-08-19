import QueryModal, { QUERY_OPERATIONS } from '../../../../support/fragments/bulk-edit/query-modal';
import { Lists } from '../../../../support/fragments/lists/lists';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import { generateMultiSelectCustomFieldData } from '../../../../support/utils/customFields';
import { getTestEntityValue } from '../../../../support/utils/stringTools';

let userData = {};
let listName;
const recordType = Lists.recordTypes.users;
const option1Value = 'AT_C825294_MS_Option1';
const option2Value = 'AT_C825294_MS_Option2';
const option3Value = 'AT_C825294_MS_Option3';
const testData = {
  customField: generateMultiSelectCustomFieldData({
    testNumber: 'C825294',
    data: {
      selectField: {
        multiSelect: true,
        options: {
          values: [
            { id: 'opt_0', value: option1Value, default: false },
            { id: 'opt_1', value: option2Value, default: false },
            { id: 'opt_2', value: option3Value, default: false },
          ],
        },
      },
    },
  }),
};

describe('Lists', () => {
  describe('Query Builder', () => {
    describe('Custom fields', () => {
      before('Create test data', () => {
        cy.getAdminToken()
          .then(() => cy.createCustomFieldsViaApi([testData.customField]))
          .then(([createdCustomField]) => {
            testData.customField = createdCustomField;
            testData.customFieldLabel = `User — ${createdCustomField.name}`;

            cy.createTempUser().then((userProperties) => {
              userData = userProperties;

              cy.getUsers({ limit: 1, query: `username=${userData.username}` }).then((users) => {
                cy.updateUser({
                  ...users[0],
                  customFields: {
                    [createdCustomField.refId]: [
                      testData.customField.selectField.options.values[0].id,
                      testData.customField.selectField.options.values[1].id,
                    ],
                  },
                });
              });
            });
          })
          .then(() => Lists.waitForCustomFieldToBeQueryable(testData.customFieldLabel, recordType));
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
        'C825294 Verify that the custom field with a type multi select dropdown is queryable (athena)',
        { tags: ['criticalPath', 'athena', 'C825294'] },
        () => {
          listName = getTestEntityValue('C825294_List');

          cy.loginAsAdmin({
            path: TopMenu.listsPath,
            waiter: Lists.filtersWaitLoading,
          });

          // Step 1: Click on "New" button, click on "Select record type" dropdown and select "Users" option
          Lists.openNewListPane();
          Lists.setName(listName);
          Lists.selectRecordType(recordType);

          // Step 2: Click on "Build query" button
          Lists.buildQuery();
          QueryModal.verify();

          // Step 3: Click "Select field" dropdown and search for the added multi select custom field
          QueryModal.selectField(testData.customFieldLabel);
          QueryModal.verifySelectedField(testData.customFieldLabel);

          // Step 4: Click "Select operator" dropdown and choose an operator
          QueryModal.selectOperator(QUERY_OPERATIONS.IN);

          // Step 5: Click "Select value" dropdown — verify it is pre-populated with values from the custom field
          [option1Value, option2Value, option3Value].forEach((optionValue) => {
            QueryModal.verifyValueMultiselectMenuIncludesOption(optionValue);
          });

          // Step 6: Choose multiple values that match the user record from the precondition
          QueryModal.chooseFromValueMultiselect(option1Value, 0, { exactMatch: true });
          QueryModal.chooseFromValueMultiselect(option2Value, 0, { exactMatch: true });

          // Step 7: Click "Test query" — verify the query returns the user record
          QueryModal.testQuery();
          QueryModal.waitForQueryTestToFinish();
          QueryModal.verifyPreviewOfRecordsMatched();
          QueryModal.verifyRecordWithContent(userData.username);
          QueryModal.verifyNumberOfRowsInPreviewTable(1);
        },
      );
    });
  });
});
