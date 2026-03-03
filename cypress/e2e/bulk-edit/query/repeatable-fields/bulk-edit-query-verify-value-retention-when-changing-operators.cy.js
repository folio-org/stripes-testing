import permissions from '../../../../support/dictionary/permissions';
import BulkEditSearchPane from '../../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import QueryModal, {
  QUERY_OPERATIONS,
  STRING_OPERATORS,
  instanceFieldValues,
  booleanOperatorsInRepeatableFields,
} from '../../../../support/fragments/bulk-edit/query-modal';

let user;
const statisticalCodes = [];
const testValue = 'Test value';

describe('Bulk-edit', () => {
  describe('Query', () => {
    describe('Repeatable fields', () => {
      before('Create test data', () => {
        cy.clearLocalStorage();
        cy.getAdminToken();

        cy.createTempUser([
          permissions.bulkEditView.gui,
          permissions.uiInventoryViewInstances.gui,
          permissions.bulkEditQueryView.gui,
        ]).then((userProperties) => {
          user = userProperties;

          cy.getStatisticalCodeTypes({ limit: 200 }).then((codeTypes) => {
            cy.getStatisticalCodes({ limit: 2 }).then((codes) => {
              codes.forEach((code) => {
                const codeType = codeTypes.find((type) => type.id === code.statisticalCodeTypeId);
                statisticalCodes.push({
                  ...code,
                  typeName: codeType.name,
                  fullName: `${codeType.name}: ${code.code} - ${code.name}`,
                });
              });
            });
          });

          cy.login(user.username, user.password, {
            path: TopMenu.bulkEditPath,
            waiter: BulkEditSearchPane.waitLoading,
          });
          BulkEditSearchPane.openQuerySearch();
          BulkEditSearchPane.checkInstanceRadio();
          BulkEditSearchPane.clickBuildQueryButton();
          QueryModal.verify();
        });
      });

      after('Delete test data', () => {
        cy.getAdminToken();
        Users.deleteViaApi(user.userId);
      });

      it(
        'C957373 Verify value retention when changing operators for repeatable fields (firebird)',
        { tags: ['extendedPath', 'firebird', 'C957373'] },
        () => {
          // Step 1: Select a free text repeatable field (Instance — Notes — Note)
          QueryModal.selectField(instanceFieldValues.note);
          QueryModal.verifySelectedField(instanceFieldValues.note);

          // Step 2: Select "equals" operator and enter a value
          QueryModal.selectOperator(STRING_OPERATORS.EQUAL);
          QueryModal.fillInValueTextfield(testValue);

          // Step 3: Change operator to "not equal to"
          QueryModal.selectOperator(STRING_OPERATORS.NOT_EQUAL);
          QueryModal.verifyTextFieldValue(testValue);

          // Step 4: Change operator to "starts with"
          QueryModal.selectOperator(STRING_OPERATORS.START_WITH);
          QueryModal.verifyTextFieldValue(testValue);

          // Step 5: Change operator to "contains"
          QueryModal.selectOperator(STRING_OPERATORS.CONTAINS);
          QueryModal.verifyTextFieldValue(testValue);

          // Step 6: Change operator to "is null/empty"
          QueryModal.selectOperator(QUERY_OPERATIONS.IS_NULL);
          QueryModal.verifySelectedValue('Select value');

          // Step 7: Change operator back to "equals"
          QueryModal.selectOperator(STRING_OPERATORS.EQUAL);
          QueryModal.verifyTextFieldValue(''); // verifyEmptyValue maybe this method

          // Step 8: Select a repeatable field with predefined values (Instance — Statistical codes)
          QueryModal.selectField(instanceFieldValues.statisticalCodeNames);
          QueryModal.verifySelectedField(instanceFieldValues.statisticalCodeNames);

          // Step 9: Select "equals" operator and select a single value
          QueryModal.selectOperator(QUERY_OPERATIONS.EQUAL);
          QueryModal.chooseValueSelect(statisticalCodes[0].fullName);
          QueryModal.verifySelectedValue(statisticalCodes[0].fullName);

          // Step 10: Change operator to "not equal to"
          QueryModal.selectOperator(QUERY_OPERATIONS.NOT_EQUAL);
          QueryModal.verifySelectedValue(statisticalCodes[0].fullName);

          // Step 11: Change operator to "in"
          QueryModal.selectOperator(QUERY_OPERATIONS.IN);
          QueryModal.verifySelectedMultiselectValue([statisticalCodes[0].fullName]);

          // Step 12: Select additional values
          QueryModal.chooseFromValueMultiselect(statisticalCodes[1].fullName);
          QueryModal.verifySelectedMultiselectValue([
            statisticalCodes[0].fullName,
            statisticalCodes[1].fullName,
          ]);

          // Step 13: Change operator to "equals"
          QueryModal.selectOperator(QUERY_OPERATIONS.EQUAL);
          QueryModal.verifySelectedValue(statisticalCodes[0].fullName);

          // Step 14: Change operator back to "in"
          QueryModal.selectOperator(QUERY_OPERATIONS.IN);
          QueryModal.verifySelectedMultiselectValue([statisticalCodes[0].fullName]);

          // Step 15: Select multiple values again
          QueryModal.chooseFromValueMultiselect(statisticalCodes[1].fullName);
          QueryModal.verifySelectedMultiselectValue([
            statisticalCodes[0].fullName,
            statisticalCodes[1].fullName,
          ]);

          // Step 16: Change operator to "not in"
          QueryModal.selectOperator(QUERY_OPERATIONS.NOT_IN);
          QueryModal.verifySelectedMultiselectValue([
            statisticalCodes[0].fullName,
            statisticalCodes[1].fullName,
          ]);

          // Step 17: Change operator to "is null/empty"
          QueryModal.selectOperator(QUERY_OPERATIONS.IS_NULL);
          QueryModal.verifySelectedValue('Select value');

          // Step 18: Change operator back to "not in"
          QueryModal.selectOperator(QUERY_OPERATIONS.NOT_IN);
          QueryModal.verifySelectedMultiselectValue([]);

          // Step 19: Select repeatable boolean field (Instance — Contributors — Primary)
          QueryModal.selectField(instanceFieldValues.contributorPrimary);
          QueryModal.verifySelectedField(instanceFieldValues.contributorPrimary);

          // Step 20: Select "equals" operator and select "True"
          QueryModal.verifyOperatorsList(booleanOperatorsInRepeatableFields);
          QueryModal.selectOperator(QUERY_OPERATIONS.EQUAL);
          QueryModal.chooseValueSelect('True');
          QueryModal.verifySelectedValue('True');

          // Step 21: Change operator to "is null/empty"
          QueryModal.selectOperator(QUERY_OPERATIONS.IS_NULL);
          QueryModal.verifySelectedValue('Select value');

          // Step 22: Change operator back to "equals"
          QueryModal.selectOperator(QUERY_OPERATIONS.EQUAL);
          QueryModal.verifySelectedValue('Select value');
        },
      );
    });
  });
});
