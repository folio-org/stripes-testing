import Permissions from '../../../../support/dictionary/permissions';
import QueryModal, { QUERY_OPERATIONS } from '../../../../support/fragments/bulk-edit/query-modal';
import { Lists } from '../../../../support/fragments/lists/lists';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import { generateSingleSelectCustomFieldData } from '../../../../support/utils/customFields';
import { getTestEntityValue } from '../../../../support/utils/stringTools';

const recordType = Lists.recordTypes.users;
let userData = {};
let listName;
const testData = {
  customField: generateSingleSelectCustomFieldData({
    testNumber: 'C651464',
    data: {
      selectField: {
        multiSelect: false,
        options: {
          values: [
            { id: 'opt_0', value: 'AT_C651464_SS_Option1', default: false },
            { id: 'opt_1', value: 'AT_C651464_SS_Option2', default: false },
            { id: 'opt_2', value: 'AT_C651464_SS_Option3', default: false },
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
              Permissions.uiOrdersDelete.gui,
            ]).then((userProperties) => {
              userData = userProperties;
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
        'C651464 Verify that the custom field labels are displaying in the user-friendly query (athena)',
        { tags: ['criticalPath', 'athena', 'C651464'] },
        () => {
          listName = getTestEntityValue('C651464_List');

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
          QueryModal.selectOperator(QUERY_OPERATIONS.IN);

          QueryModal.chooseFromValueMultiselect('AT_C651464_SS_Option1', 0, { exactMatch: true });
          QueryModal.chooseFromValueMultiselect('AT_C651464_SS_Option2', 0, { exactMatch: true });
          QueryModal.chooseFromValueMultiselect('AT_C651464_SS_Option3', 0, { exactMatch: true });

          QueryModal.verifyQueryAreaContent(
            `(${testData.customFieldLabel} in [AT_C651464_SS_Option1, AT_C651464_SS_Option2, AT_C651464_SS_Option3])`,
          );
        },
      );
    });
  });
});
