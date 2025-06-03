import permissions from '../../../support/dictionary/permissions';
import BulkEditSearchPane from '../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import QueryModal, {
  usersFieldValues,
  STRING_STORES_UUID_OPERATORS,
  booleanOperators,
} from '../../../support/fragments/bulk-edit/query-modal';

let user;
const preferredContactTypeEmail = 'Mail (Primary Address)';
const preferredContactTypeTextMessage = 'Text Message';

describe('Bulk-edit', () => {
  describe('Query', () => {
    before('create test data', () => {
      cy.getAdminToken();
      cy.createTempUser([
        permissions.bulkEditUpdateRecords.gui,
        permissions.uiUsersView.gui,
        permissions.bulkEditQueryView.gui,
      ]).then((userProperties) => {
        user = userProperties;
        cy.getUsers({ limit: 1, query: `username=${user.username}` }).then((users) => {
          cy.updateUser({
            ...users[0],
            personal: {
              ...users[0].personal,
              preferredContactTypeId: '001',
            },
          });
        });
        cy.login(user.username, user.password, {
          path: TopMenu.bulkEditPath,
          waiter: BulkEditSearchPane.waitLoading,
        });
      });
    });

    after('delete test data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(user.userId);
    });

    it(
      'C436741 Query builder - Search users that has preferred contact type and have "Active" status ("String stores UUID" and "Boolean" property types) ("String stores UUID" and "Boolean" property types) (firebird)',
      { tags: ['smoke', 'firebird', 'C436741'] },
      () => {
        BulkEditSearchPane.openQuerySearch();
        BulkEditSearchPane.checkUsersRadio();
        BulkEditSearchPane.clickBuildQueryButton();
        QueryModal.verify();
        QueryModal.verifyFieldsSortedAlphabetically();
        QueryModal.clickSelectFieldButton();
        QueryModal.selectField(usersFieldValues.preferredContactType);
        QueryModal.verifySelectedField(usersFieldValues.preferredContactType);
        QueryModal.verifyQueryAreaContent('(users.preferred_contact_type  )');
        QueryModal.verifyOperatorColumn();
        QueryModal.selectOperator(STRING_STORES_UUID_OPERATORS.EQUAL);
        QueryModal.verifyOperatorsList(STRING_STORES_UUID_OPERATORS);
        QueryModal.verifyQueryAreaContent('(users.preferred_contact_type == )');
        QueryModal.verifyValueColumn();
        QueryModal.chooseValueSelect(preferredContactTypeEmail);
        QueryModal.testQueryDisabled(false);
        QueryModal.runQueryDisabled();
        QueryModal.verifyQueryAreaContent(
          `(users.preferred_contact_type == ${preferredContactTypeEmail})`,
        );
        QueryModal.selectOperator(STRING_STORES_UUID_OPERATORS.NOT_EQUAL);
        QueryModal.testQueryDisabled(false);
        QueryModal.runQueryDisabled();
        QueryModal.verifyQueryAreaContent(
          `(users.preferred_contact_type != ${preferredContactTypeEmail})`,
        );
        QueryModal.verifyValueColumn();
        QueryModal.selectOperator(STRING_STORES_UUID_OPERATORS.IN);
        QueryModal.verifyQueryAreaContent(
          `(users.preferred_contact_type in [${preferredContactTypeEmail}])`,
        );
        QueryModal.verifyValueColumn();
        QueryModal.chooseFromValueMultiselect('Email');
        QueryModal.verifyQueryAreaContent(
          `(users.preferred_contact_type in [${preferredContactTypeEmail}, Email])`,
        );
        QueryModal.testQueryDisabled(false);
        QueryModal.runQueryDisabled();
        QueryModal.fillInValueMultiselect(preferredContactTypeTextMessage);
        QueryModal.verifyQueryAreaContent(
          `(users.preferred_contact_type in [${preferredContactTypeEmail}, Email, ${preferredContactTypeTextMessage}])`,
        );
        QueryModal.testQueryDisabled(false);
        QueryModal.runQueryDisabled();
        QueryModal.removeValueFromMultiselect(preferredContactTypeEmail);
        QueryModal.removeValueFromMultiselect('Email');
        QueryModal.removeValueFromMultiselect(preferredContactTypeTextMessage);
        QueryModal.verifyQueryAreaContent('(users.preferred_contact_type in [])');
        QueryModal.testQueryDisabled();
        QueryModal.runQueryDisabled();
        QueryModal.chooseFromValueMultiselect(preferredContactTypeEmail);
        QueryModal.verifyQueryAreaContent(
          `(users.preferred_contact_type in [${preferredContactTypeEmail}])`,
        );
        QueryModal.testQueryDisabled(false);
        QueryModal.runQueryDisabled();
        QueryModal.addNewRow();
        QueryModal.verifyBooleanColumn();
        QueryModal.verifyEmptyField(1);
        QueryModal.verifyEmptyOperator(1);
        QueryModal.verifyEmptyValue(1);
        QueryModal.verifyPlusAndTrashButtonsDisabled(1, false, false);
        QueryModal.verifyPlusAndTrashButtonsDisabled(0, false, false);
        QueryModal.verifyQueryAreaContent(
          `(users.preferred_contact_type in [${preferredContactTypeEmail}]) AND (  )`,
        );
        QueryModal.testQueryDisabled();
        QueryModal.runQueryDisabled();
        QueryModal.selectField(usersFieldValues.userActive, 1);
        QueryModal.verifySelectedField(usersFieldValues.userActive, 1);
        QueryModal.verifyOperatorsList(booleanOperators, 1);
        QueryModal.selectOperator(STRING_STORES_UUID_OPERATORS.EQUAL, 1);
        QueryModal.verifyQueryAreaContent(
          `(users.preferred_contact_type in [${preferredContactTypeEmail}]) AND (users.active == )`,
        );
        QueryModal.verifyValueColumn();
        QueryModal.testQueryDisabled();
        QueryModal.runQueryDisabled();
        QueryModal.selectValueFromSelect('True', 1);
        QueryModal.testQueryDisabled(false);
        QueryModal.runQueryDisabled();
        QueryModal.verifyQueryAreaContent(
          `(users.preferred_contact_type in [${preferredContactTypeEmail}]) AND (users.active == true)`,
        );
        QueryModal.addNewRow(1);
        QueryModal.verifyBooleanColumn(2);
        QueryModal.verifyEmptyField(2);
        QueryModal.verifyEmptyOperator(2);
        QueryModal.verifyEmptyValue(2);
        QueryModal.verifyPlusAndTrashButtonsDisabled(0, false, false);
        QueryModal.testQueryDisabled();
        QueryModal.runQueryDisabled();
        QueryModal.selectField(usersFieldValues.userActive, 2);
        QueryModal.verifySelectedField(usersFieldValues.userActive, 2);
        QueryModal.verifyOperatorsList(booleanOperators, 2);
        QueryModal.selectOperator(STRING_STORES_UUID_OPERATORS.NOT_EQUAL, 2);
        QueryModal.verifyQueryAreaContent(
          `(users.preferred_contact_type in [${preferredContactTypeEmail}]) AND (users.active == true) AND (users.active != )`,
        );
        QueryModal.verifyValueColumn();
        QueryModal.testQueryDisabled();
        QueryModal.runQueryDisabled();
        QueryModal.selectValueFromSelect('False', 2);
        QueryModal.testQueryDisabled(false);
        QueryModal.runQueryDisabled();
        QueryModal.verifyQueryAreaContent(
          `(users.preferred_contact_type in [${preferredContactTypeEmail}]) AND (users.active == true) AND (users.active != false)`,
        );
        QueryModal.clickGarbage(2);
        QueryModal.verifyQueryAreaContent(
          `(users.preferred_contact_type in [${preferredContactTypeEmail}]) AND (users.active == true)`,
        );
        QueryModal.testQueryDisabled(false);
        QueryModal.runQueryDisabled();
        QueryModal.clickTestQuery();
        QueryModal.verifyPreviewOfRecordsMatched();
        QueryModal.clickRunQuery();
        QueryModal.verifyClosed();
        BulkEditSearchPane.verifySpecificTabHighlighted('Query');
      },
    );
  });
});
