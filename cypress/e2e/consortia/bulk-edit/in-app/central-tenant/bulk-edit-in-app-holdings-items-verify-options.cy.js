import permissions from '../../../../../support/dictionary/permissions';
import Affiliations, { tenantNames } from '../../../../../support/dictionary/affiliations';
import BulkEditSearchPane, {
  holdingsIdentifiers,
  itemIdentifiers,
} from '../../../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import TopMenu from '../../../../../support/fragments/topMenu';
import Users from '../../../../../support/fragments/users/users';
import ConsortiumManager from '../../../../../support/fragments/settings/consortium-manager/consortium-manager';

let user;
const selectRecordIdentifierPlaceHolder = 'Select record identifier';
const itemIdentifiersInCentralTenant = itemIdentifiers.slice(0, 3);
const holdingIdentifiersInCentralTenant = holdingsIdentifiers.slice(0, 3);

describe('Bulk-edit', () => {
  describe('In-app approach', () => {
    describe('Consortia', () => {
      before('create test data', () => {
        cy.getAdminToken();
        cy.createTempUser([
          permissions.bulkEditEdit.gui,
          permissions.uiInventoryViewCreateEditHoldings.gui,
          permissions.uiInventoryViewCreateEditItems.gui,
        ]).then((userProperties) => {
          user = userProperties;

          cy.assignAffiliationToUser(Affiliations.College, user.userId);
          cy.setTenant(Affiliations.College);
          cy.assignPermissionsToExistingUser(user.userId, [
            permissions.bulkEditEdit.gui,
            permissions.uiInventoryViewCreateEditHoldings.gui,
            permissions.uiInventoryViewCreateEditItems.gui,
          ]);

          cy.resetTenant();
          cy.login(user.username, user.password, {
            path: TopMenu.bulkEditPath,
            waiter: BulkEditSearchPane.waitLoading,
          });
          ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.central);
        });
      });

      after('delete test data', () => {
        cy.resetTenant();
        cy.getAdminToken();
        Users.deleteViaApi(user.userId);
      });

      it(
        'C553004 ECS | Verify options for holdings and items on Central and member tenants (consortia) (firebird)',
        { tags: ['smokeECS', 'firebird', 'C553004'] },
        () => {
          BulkEditSearchPane.checkHoldingsRadio();
          BulkEditSearchPane.isHoldingsRadioChecked(true);
          BulkEditSearchPane.verifyFirstOptionRecordIdentifierDropdown(
            selectRecordIdentifierPlaceHolder,
          );
          BulkEditSearchPane.verifyRecordIdentifiers(holdingIdentifiersInCentralTenant);
          BulkEditSearchPane.checkItemsRadio();
          BulkEditSearchPane.isItemsRadioChecked(true);
          BulkEditSearchPane.verifyFirstOptionRecordIdentifierDropdown(
            selectRecordIdentifierPlaceHolder,
          );
          BulkEditSearchPane.verifyRecordIdentifiers(itemIdentifiersInCentralTenant);

          ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
          BulkEditSearchPane.checkHoldingsRadio();
          BulkEditSearchPane.isHoldingsRadioChecked(true);
          BulkEditSearchPane.verifyFirstOptionRecordIdentifierDropdown(
            selectRecordIdentifierPlaceHolder,
          );
          BulkEditSearchPane.verifyRecordIdentifiers(holdingsIdentifiers);
          BulkEditSearchPane.checkItemsRadio();
          BulkEditSearchPane.isItemsRadioChecked(true);
          BulkEditSearchPane.verifyFirstOptionRecordIdentifierDropdown(
            selectRecordIdentifierPlaceHolder,
          );
          BulkEditSearchPane.verifyRecordIdentifiers(itemIdentifiers);
        },
      );
    });
  });
});
