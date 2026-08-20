import QueryModal, { QUERY_OPERATIONS } from '../../../../support/fragments/bulk-edit/query-modal';
import { Lists } from '../../../../support/fragments/lists/lists';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import Permissions from '../../../../support/dictionary/permissions';
import { generateSingleSelectCustomFieldData } from '../../../../support/utils/customFields';
import { getTestEntityValue } from '../../../../support/utils/stringTools';

const recordType = Lists.recordTypes.users;
let userData = {};
let listName;
const testData = {
  customField: generateSingleSelectCustomFieldData({
    testNumber: 'C648497',
    data: {
      selectField: {
        multiSelect: false,
        options: {
          values: [
            { id: 'opt_0', value: 'AT_C648497_SS_Option1', default: false },
            { id: 'opt_1', value: 'AT_C648497_SS_Option2', default: false },
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
                    [createdCustomField.refId]:
                      testData.customField.selectField.options.values[0].id,
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
        'C648497 Verify that the Single select custom field is not queryable after deleting it (athena)',
        { tags: ['criticalPath', 'athena', 'C648497'] },
        () => {
          listName = getTestEntityValue('C648497_List');

          cy.login(userData.username, userData.password, {
            path: TopMenu.listsPath,
            waiter: Lists.filtersWaitLoading,
          });

          // Create a new list with a query using the single select custom field
          Lists.openNewListPane();
          Lists.setName(listName);
          Lists.selectRecordType(recordType);
          Lists.buildQuery();
          QueryModal.verify();
          QueryModal.selectField(testData.customFieldLabel);
          QueryModal.verifySelectedField(testData.customFieldLabel);
          QueryModal.selectOperator(QUERY_OPERATIONS.EQUAL);
          QueryModal.chooseValueSelect('AT_C648497_SS_Option1');
          QueryModal.testQuery();
          QueryModal.waitForQueryTestToFinish();
          QueryModal.clickRunQueryAndSave();
          QueryModal.verifyClosed();
          Lists.waitForCompilingToComplete(3000);

          // Step 1: Go to "Settings" → "Users" → "Custom fields" → "Edit", remove the single select field
          // (performed via API to avoid UI navigation overhead)
          cy.getAdminToken(false);
          cy.deleteCustomFieldsViaApi({ ids: [testData.customField.id] });
          testData.customField = null;

          // Wait ~5-6 min for the deletion to propagate to the entity type
          Lists.waitForFieldLabelToBeAbsent(testData.customFieldLabel, recordType);

          // Step 2: Go to the "Lists" app and open the list that contained the single select custom field
          cy.getUserToken(userData.username, userData.password);
          cy.visit(TopMenu.listsPath);
          Lists.waitLoading();
          Lists.openList(listName);

          // Step 3: Verify the query is empty — the deleted field no longer appears in the query
          Lists.getQueryText().then((queryText) => {
            expect(queryText).not.to.include(testData.customFieldLabel);
          });

          // Step 4: Click on "Actions" -> "Edit list" -> "Edit query"
          Lists.openActions();
          Lists.editList();
          Lists.editQuery();

          // Verify the query builder is empty — no fields are selected
          QueryModal.verify();
          QueryModal.verifyEmptyField();
          QueryModal.getQueryAreaContent().then((queryAreaContent) => {
            expect(queryAreaContent).not.to.include(testData.customFieldLabel);
          });
        },
      );
    });
  });
});
