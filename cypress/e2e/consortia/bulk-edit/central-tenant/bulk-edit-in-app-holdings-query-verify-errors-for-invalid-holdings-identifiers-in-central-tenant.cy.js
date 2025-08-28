import uuid from 'uuid';
import permissions from '../../../../support/dictionary/permissions';
import BulkEditSearchPane from '../../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import QueryModal, {
  holdingsFieldValues,
  QUERY_OPERATIONS,
} from '../../../../support/fragments/bulk-edit/query-modal';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import ConsortiumManager from '../../../../support/fragments/settings/consortium-manager/consortium-manager';
import Affiliations, { tenantNames } from '../../../../support/dictionary/affiliations';
import getRandomPostfix from '../../../../support/utils/stringTools';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';

let user;
let centralTenantInstance;
let invalidHoldingsIds;
let invalidHoldingsHrid;
let invalidInstanceIds;
const userPermissions = [
  permissions.bulkEditQueryView.gui,
  permissions.uiInventoryViewCreateEditHoldings.gui,
  permissions.bulkEditEdit.gui,
];

describe('Bulk-edit', () => {
  describe('Central tenant', () => {
    describe('Consortia', () => {
      before('create test data', () => {
        cy.getAdminToken();

        cy.createTempUser(userPermissions).then((userProperties) => {
          user = userProperties;

          [Affiliations.College, Affiliations.University].forEach((affiliation) => {
            cy.affiliateUserToTenant({
              tenantId: affiliation,
              userId: user.userId,
              permissions: userPermissions,
            });
          });

          cy.getInstanceTypes({ limit: 1 }).then((instanceTypes) => {
            InventoryInstances.createFolioInstanceViaApi({
              instance: {
                instanceTypeId: instanceTypes[0].id,
                title: `AT_C503030_FolioInstance_${getRandomPostfix()}`,
              },
            }).then((createdInstanceData) => {
              centralTenantInstance = createdInstanceData;

              // Generate invalid identifiers (mix of invalid UUIDs and valid instance without holdings)
              invalidHoldingsIds = [uuid(), uuid(), uuid()].join(',');
              invalidHoldingsHrid = `invalid-hrid-${getRandomPostfix()}`;
              invalidInstanceIds = [centralTenantInstance.instanceId, uuid(), uuid()].join(',');

              cy.login(user.username, user.password, {
                path: TopMenu.bulkEditPath,
                waiter: BulkEditSearchPane.waitLoading,
              });
              ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.central);
              BulkEditSearchPane.openQuerySearch();
            });
          });
        });
      });

      after('delete test data', () => {
        cy.getAdminToken();
        Users.deleteViaApi(user.userId);
        InventoryInstance.deleteInstanceViaApi(centralTenantInstance.instanceId);
      });

      it(
        'C503030 Query - Verify "Errors" when querying by invalid Holdings identifiers in Central tenant (consortia) (firebird)',
        { tags: ['criticalPathECS', 'firebird', 'C503030'] },
        () => {
          // Step 1: Select "Inventory - holdings" radio button under "Record types" accordion
          BulkEditSearchPane.checkHoldingsRadio();
          BulkEditSearchPane.clickBuildQueryButton();
          QueryModal.verify();
          QueryModal.cancelDisabled(false);
          QueryModal.runQueryDisabled();

          // Step 2: Select "Holding — UUID" field, "in" operator, type Holdings UUIDs
          QueryModal.selectField(holdingsFieldValues.holdingsUuid);
          QueryModal.selectOperator(QUERY_OPERATIONS.IN);
          QueryModal.fillInValueTextfield(invalidHoldingsIds);
          QueryModal.verifyQueryAreaContent(
            `(holdings.id in (${invalidHoldingsIds.replace(/,/g, ', ')}))`,
          );
          QueryModal.testQueryDisabled(false);

          // Step 3: Click "Test query" button
          QueryModal.testQuery();
          QueryModal.verifyNumberOfMatchedRecords(0);
          QueryModal.runQueryDisabled();

          // Step 4: Select "Holding — HRID" field, "equals" operator, type Holdings HRID
          QueryModal.selectField(holdingsFieldValues.holdingsHrid);
          QueryModal.selectOperator(QUERY_OPERATIONS.EQUAL);
          QueryModal.fillInValueTextfield(invalidHoldingsHrid);
          QueryModal.testQuery();
          QueryModal.verifyNumberOfMatchedRecords(0);
          QueryModal.runQueryDisabled();

          // Step 5: Select "Holdings — Instance UUID" field, "in" operator, type Instance UUIDs
          QueryModal.selectField(holdingsFieldValues.instanceUuid);
          QueryModal.selectOperator(QUERY_OPERATIONS.IN);
          QueryModal.fillInValueTextfield(invalidInstanceIds);
          QueryModal.testQuery();
          QueryModal.verifyNumberOfMatchedRecords(0);
          QueryModal.runQueryDisabled();
        },
      );
    });
  });
});
