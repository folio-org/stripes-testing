import uuid from 'uuid';
import permissions from '../../../../support/dictionary/permissions';
import BulkEditSearchPane from '../../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import QueryModal, {
  usersFieldValues,
  QUERY_OPERATIONS,
} from '../../../../support/fragments/bulk-edit/query-modal';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import ConsortiumManager from '../../../../support/fragments/settings/consortium-manager/consortium-manager';
import Affiliations, { tenantNames } from '../../../../support/dictionary/affiliations';

let user;
let memberTenantUser;
let invalidUserIds;
let invalidBarcode;
let invalidUsername;
const invalidExternalId = uuid();

describe('Bulk-edit', () => {
  describe('In-app approach', () => {
    describe('Consortia', () => {
      before('create test data', () => {
        cy.getAdminToken();

        // Create user in central tenant
        cy.createTempUser([
          permissions.bulkEditQueryView.gui,
          permissions.uiUsersView.gui,
          permissions.bulkEditUpdateRecords.gui,
        ]).then((userProperties) => {
          user = userProperties;

          // Create test user in member tenant to get invalid identifiers
          cy.setTenant(Affiliations.College);
          cy.createTempUser([], 'faculty', 'patron').then((memberUserProperties) => {
            memberTenantUser = memberUserProperties;

            cy.getUsers({ limit: 1, query: `username=${memberUserProperties.username}` }).then(
              (users) => {
                cy.updateUser({
                  ...users[0],
                  externalSystemId: invalidExternalId,
                });
              },
            );

            // Prepare invalid identifiers from member tenant user
            invalidUserIds = [memberUserProperties.userId, uuid(), uuid()].join(',');
            invalidBarcode = memberUserProperties.barcode;
            invalidUsername = memberUserProperties.username;

            cy.resetTenant();
            cy.login(user.username, user.password, {
              path: TopMenu.bulkEditPath,
              waiter: BulkEditSearchPane.waitLoading,
            });
            ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.central);
            BulkEditSearchPane.openQuerySearch();
          });
        });
      });

      after('delete test data', () => {
        cy.getAdminToken();
        Users.deleteViaApi(user.userId);
        cy.setTenant(Affiliations.College);
        Users.deleteViaApi(memberTenantUser.userId);
      });

      it(
        'C503034 Query - Verify "Errors" when querying by invalid Users identifiers in Central tenant (consortia) (firebird)',
        { tags: ['criticalPathECS', 'firebird', 'C503034'] },
        () => {
          // Step 1: Select "Users" radio button under "Record types" accordion
          BulkEditSearchPane.checkUsersRadio();
          BulkEditSearchPane.clickBuildQueryButton();
          QueryModal.verify();

          // Step 2: Select "User - User UUID" field, "in" operator, type User UUIDs
          QueryModal.selectField(usersFieldValues.userId);
          QueryModal.selectOperator(QUERY_OPERATIONS.IN);
          QueryModal.fillInValueTextfield(invalidUserIds);
          QueryModal.verifyQueryAreaContent(
            `(users.id in (${invalidUserIds.replace(/,/g, ', ')}))`,
          );
          QueryModal.testQueryDisabled(false);

          // Step 3: Click "Test query" button
          QueryModal.testQuery();
          QueryModal.verifyNumberOfMatchedRecords(0);
          QueryModal.runQueryDisabled();

          // Step 4: Select "User - Barcode" field, "equals" operator, type barcode
          QueryModal.selectField(usersFieldValues.userBarcode);
          QueryModal.selectOperator(QUERY_OPERATIONS.EQUAL);
          QueryModal.fillInValueTextfield(invalidBarcode);
          QueryModal.testQuery();
          QueryModal.verifyNumberOfMatchedRecords(0);
          QueryModal.runQueryDisabled();

          // Step 5: Select "User - External system ID" field, "equals" operator
          QueryModal.selectField(usersFieldValues.externalSystemId);
          QueryModal.selectOperator(QUERY_OPERATIONS.EQUAL);
          QueryModal.fillInValueTextfield(invalidExternalId);
          QueryModal.testQuery();
          QueryModal.verifyNumberOfMatchedRecords(0);
          QueryModal.runQueryDisabled();

          // Step 6: Select "User - Username" field, "equals" operator
          QueryModal.selectField(usersFieldValues.userName);
          QueryModal.selectOperator(QUERY_OPERATIONS.EQUAL);
          QueryModal.fillInValueTextfield(invalidUsername);
          QueryModal.testQuery();
          QueryModal.verifyNumberOfMatchedRecords(0);
          QueryModal.runQueryDisabled();
        },
      );
    });
  });
});
