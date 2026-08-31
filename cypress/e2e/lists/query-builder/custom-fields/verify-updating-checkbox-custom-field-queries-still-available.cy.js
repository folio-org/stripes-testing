import QueryModal, { QUERY_OPERATIONS } from '../../../../support/fragments/bulk-edit/query-modal';
import { Lists } from '../../../../support/fragments/lists/lists';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import Permissions from '../../../../support/dictionary/permissions';
import { generateCheckboxCustomFieldData } from '../../../../support/utils/customFields';
import { getTestEntityValue } from '../../../../support/utils/stringTools';

const recordType = Lists.recordTypes.users;
let userData = {};
let listName;
const testData = {
  customField: generateCheckboxCustomFieldData({
    testNumber: 'C648491',
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
            testData.updatedFieldName = `${createdCustomField.name}_Updated`;
            testData.updatedFieldLabel = `User — ${testData.updatedFieldName}`;

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
                    [createdCustomField.refId]: true,
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
        "C648491 Verify that it's possible to update the checkbox custom fields, and all existing queries are still available (athena)",
        { tags: ['criticalPath', 'athena', 'C648491'] },
        () => {
          listName = getTestEntityValue('C648491_List');

          cy.login(userData.username, userData.password, {
            path: TopMenu.listsPath,
            waiter: Lists.filtersWaitLoading,
          });

          Lists.openNewListPane();
          Lists.setName(listName);
          Lists.selectRecordType(recordType);
          Lists.buildQuery();
          QueryModal.verify();

          QueryModal.selectField(testData.customFieldLabel);
          QueryModal.verifySelectedField(testData.customFieldLabel);
          QueryModal.selectOperator(QUERY_OPERATIONS.EQUAL);
          QueryModal.chooseValueSelect('True');
          QueryModal.testQuery();
          QueryModal.waitForQueryTestToFinish();
          QueryModal.clickRunQueryAndSave();
          QueryModal.verifyClosed();
          Lists.waitForCompilingToComplete(3000);

          cy.getAdminToken(false);
          cy.replaceCustomFieldViaApi({
            ...testData.customField,
            name: testData.updatedFieldName,
          });
          testData.customField.name = testData.updatedFieldName;

          Lists.waitForCustomFieldToBeQueryable(testData.updatedFieldLabel, recordType);

          cy.getUserToken(userData.username, userData.password);
          cy.visit(TopMenu.listsPath);
          Lists.waitLoading();
          Lists.openList(listName);

          Lists.getQueryText().then((queryText) => {
            expect(queryText).to.include(testData.updatedFieldName);
          });

          Lists.openActions();
          Lists.editList();
          Lists.editQuery();

          QueryModal.verifyQueryAreaContent(`(${testData.updatedFieldLabel} == True)`);
          QueryModal.verifySelectedField(testData.updatedFieldLabel);
        },
      );
    });
  });
});
