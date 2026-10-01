import QueryModal from '../../../../support/fragments/bulk-edit/query-modal';
import { Lists } from '../../../../support/fragments/lists/lists';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import Permissions from '../../../../support/dictionary/permissions';
import { generateCheckboxCustomFieldData } from '../../../../support/utils/customFields';
import { getTestEntityValue } from '../../../../support/utils/stringTools';

const recordType = Lists.recordTypes.users;
let userData = {};
const testData = {
  customField: generateCheckboxCustomFieldData({ testNumber: 'C613150' }),
  listName: getTestEntityValue('C613150_List'),
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
                  customFields: { [createdCustomField.refId]: true },
                });
              });
            });
          })
          .then(() => Lists.waitForCustomFieldToBeQueryable(testData.customFieldLabel, recordType));
      });

      after('Delete test data', () => {
        cy.getAdminToken();
        if (testData.customField?.id) {
          cy.deleteCustomFieldsViaApi({ ids: [testData.customField.id] });
        }
        if (userData.userId) {
          Users.deleteViaApi(userData.userId);
        }
      });

      it(
        'C613150 Verify that the checkbox custom fields are queryable (athena)',
        { tags: ['extendedPath', 'athena', 'C613150'] },
        () => {
          cy.login(userData.username, userData.password, {
            path: TopMenu.listsPath,
            waiter: Lists.filtersWaitLoading,
          });

          // Step 1: Create new list, set name, and select Users record type
          Lists.openNewListPane();
          Lists.setName(testData.listName);
          Lists.selectRecordType(recordType);

          // Step 2: Open Build query form
          Lists.buildQuery();
          QueryModal.verify();

          // Step 3: Search for the checkbox custom field in Select field dropdown
          QueryModal.selectField(testData.customFieldLabel);
          QueryModal.verifySelectedField(testData.customFieldLabel);
        },
      );
    });
  });
});
