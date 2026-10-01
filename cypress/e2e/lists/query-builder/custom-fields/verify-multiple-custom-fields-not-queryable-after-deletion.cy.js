import QueryModal, {
  QUERY_OPERATIONS,
  usersFieldValues,
} from '../../../../support/fragments/bulk-edit/query-modal';
import { Lists } from '../../../../support/fragments/lists/lists';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import Permissions from '../../../../support/dictionary/permissions';
import {
  generateSingleSelectCustomFieldData,
  generateRadioButtonCustomFieldData,
  generateCheckboxCustomFieldData,
  generateTextAreaCustomFieldData,
  generateTextFieldCustomFieldData,
} from '../../../../support/utils/customFields';
import { getTestEntityValue } from '../../../../support/utils/stringTools';

let userData = {};
let listName;
const recordType = Lists.recordTypes.users;
const testData = {
  customFields: [],
  customFieldLabels: [],
  singleSelectField: null,
  radioButtonField: null,
  checkboxField: null,
  textAreaField: null,
  textboxField: null,
};

describe('Lists', () => {
  describe('Query Builder', () => {
    describe('Custom fields', () => {
      before('Create test data', () => {
        const customFieldsToCreate = [
          generateSingleSelectCustomFieldData({
            testNumber: 'C784444',
            data: {
              selectField: {
                multiSelect: false,
                options: {
                  values: [
                    { id: 'opt_0', value: 'AT_C784444_SS_Option1', default: false },
                    { id: 'opt_1', value: 'AT_C784444_SS_Option2', default: false },
                  ],
                },
              },
            },
          }),
          generateRadioButtonCustomFieldData({
            testNumber: 'C784444',
            data: {
              selectField: {
                multiSelect: false,
                options: {
                  values: [
                    { id: 'opt_0', value: 'AT_C784444_RB_Option1', default: false },
                    { id: 'opt_1', value: 'AT_C784444_RB_Option2', default: false },
                  ],
                },
              },
            },
          }),
          generateCheckboxCustomFieldData({ testNumber: 'C784444' }),
          generateTextAreaCustomFieldData({ testNumber: 'C784444' }),
          generateTextFieldCustomFieldData({ testNumber: 'C784444' }),
        ];

        cy.getAdminToken()
          .then(() => cy.createCustomFieldsViaApi(customFieldsToCreate))
          .then((createdCustomFields) => {
            testData.customFields = createdCustomFields;
            testData.customFieldLabels = createdCustomFields.map((cf) => `User — ${cf.name}`);
            testData.singleSelectField = createdCustomFields[0];
            testData.radioButtonField = createdCustomFields[1];
            testData.checkboxField = createdCustomFields[2];
            testData.textAreaField = createdCustomFields[3];
            testData.textboxField = createdCustomFields[4];

            cy.createTempUser([
              Permissions.listsAll.gui,
              Permissions.inventoryAll.gui,
              Permissions.uiOrdersCreate.gui,
              Permissions.uiOrdersEdit.gui,
              Permissions.uiOrdersView.gui,
            ]).then((userProperties) => {
              userData = userProperties;

              cy.getUsers({ limit: 1, query: `username=${userData.username}` }).then((users) => {
                cy.updateUser({
                  ...users[0],
                  customFields: {
                    [testData.singleSelectField.refId]:
                      testData.singleSelectField.selectField.options.values[0].id,
                    [testData.radioButtonField.refId]:
                      testData.radioButtonField.selectField.options.values[0].id,
                    [testData.checkboxField.refId]: true,
                    [testData.textAreaField.refId]: 'AT_C784444_TextAreaValue',
                    [testData.textboxField.refId]: 'AT_C784444_TextboxValue',
                  },
                });
              });
            });
          })
          .then(() => {
            const waitPromises = testData.customFieldLabels.map((label) => {
              return Lists.waitForCustomFieldToBeQueryable(label, recordType);
            });
            return cy.wrap(Promise.all(waitPromises));
          });
      });

      after('Delete test data', () => {
        cy.getAdminToken();
        if (listName) {
          Lists.deleteListByNameViaApi(listName);
        }
        if (testData.customFields && testData.customFields.length > 0) {
          const customFieldIds = testData.customFields
            .filter((cf) => cf && cf.id)
            .map((cf) => cf.id);
          if (customFieldIds.length > 0) {
            cy.deleteCustomFieldsViaApi({ ids: customFieldIds });
          }
        }
        if (userData.userId) {
          Users.deleteViaApi(userData.userId);
        }
      });

      it(
        'C784444 Verify that it\'s possible to update the Single select custom fields, and all existing queries are still available (athena)',
        { tags: ['criticalPath', 'athena', 'C784444'] },
        () => {
          listName = getTestEntityValue('C784444_List');

          cy.login(userData.username, userData.password, {
            path: TopMenu.listsPath,
            waiter: Lists.filtersWaitLoading,
          });

          // Create a new list with a query using SEVERAL custom fields AND non-custom fields
          Lists.openNewListPane();
          Lists.setName(listName);
          Lists.selectRecordType(recordType);
          Lists.buildQuery();
          QueryModal.verify();

          // Add first custom field: Single Select
          QueryModal.selectField(testData.customFieldLabels[0]);
          QueryModal.verifySelectedField(testData.customFieldLabels[0]);
          QueryModal.selectOperator(QUERY_OPERATIONS.EQUAL);
          QueryModal.chooseValueSelect('AT_C784444_SS_Option1');

          // Add AND condition with second custom field: Checkbox
          QueryModal.addNewRow();
          QueryModal.selectField(testData.customFieldLabels[2], 1);
          QueryModal.verifySelectedField(testData.customFieldLabels[2], 1);
          QueryModal.selectOperator(QUERY_OPERATIONS.EQUAL, 1);
          QueryModal.chooseValueSelect('True', 1);

          // Add AND condition with non-custom field: Status
          QueryModal.addNewRow();
          QueryModal.selectField(usersFieldValues.userActive, 2);
          QueryModal.verifySelectedField(usersFieldValues.userActive, 2);
          QueryModal.selectOperator(QUERY_OPERATIONS.EQUAL, 2);
          QueryModal.chooseValueSelect('True', 2);

          QueryModal.testQuery();
          QueryModal.waitForQueryTestToFinish();
          QueryModal.clickRunQueryAndSave();
          QueryModal.verifyClosed();
          Lists.waitForCompilingToComplete(3000);
          Lists.verifyQuery(
            `${testData.customFieldLabels[0]} == AT_C784444_SS_Option1) AND (${testData.customFieldLabels[2]} == True) AND (users.active == True`,
          );

          // Delete ALL custom fields via API
          cy.getAdminToken(false);
          const customFieldIds = testData.customFields.map((cf) => cf.id);
          cy.deleteCustomFieldsViaApi({ ids: customFieldIds });
          testData.customFields = [];

          // Wait for all custom fields to be absent from the entity type
          const waitPromises = testData.customFieldLabels.map((label) => {
            return Lists.waitForFieldLabelToBeAbsent(label, recordType);
          });
          cy.wrap(Promise.all(waitPromises));

          // Open the list that contained the custom fields
          cy.getUserToken(userData.username, userData.password);
          cy.visit(TopMenu.listsPath);
          Lists.waitLoading();
          Lists.openList(listName);

          // Verify custom fields are removed from query, but non-custom field (Status) remains
          Lists.getQueryText().then((queryText) => {
            // Verify custom fields are NOT in the query
            testData.customFieldLabels.forEach((label) => {
              expect(queryText).not.to.include(label);
            });
            // Verify non-custom field (Status) IS still in the query
            expect(queryText).to.include('users.active == True');
          });

          // Click on "Actions" -> "Edit list" -> "Edit query"
          Lists.openActions();
          Lists.editList();
          Lists.editQuery();

          // Verify query builder shows only non-custom field, custom fields are removed
          QueryModal.verifySelectedField(usersFieldValues.userActive);
          QueryModal.verifySelectedOperator(QUERY_OPERATIONS.EQUAL);
          QueryModal.verifySelectedValue('True');
          QueryModal.verifyQueryAreaContent('(users.active == True)');
          QueryModal.verifyFieldOptionAbsent(testData.customFieldLabels);
          QueryModal.testQueryDisabled(false);
        },
      );
    });
  });
});
