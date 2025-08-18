import permissions from '../../../../support/dictionary/permissions';
import BulkEditSearchPane from '../../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../support/utils/stringTools';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import ConsortiumManager from '../../../../support/fragments/settings/consortium-manager/consortium-manager';
import Affiliations, { tenantNames } from '../../../../support/dictionary/affiliations';
import QueryModal, {
  QUERY_OPERATIONS,
  instanceFieldValues,
} from '../../../../support/fragments/bulk-edit/query-modal';

let user;
let instanceTypeId;
const invalidInstanceHrid = getRandomPostfix();
const instances = [...Array(2)].map(() => ({
  title: `AT_C503029_FolioInstance_${getRandomPostfix()}`,
}));

describe('Bulk-edit', () => {
  describe('Central tenant', () => {
    describe('Consortia', () => {
      before('create test data', () => {
        cy.getAdminToken();
        cy.createTempUser([
          permissions.bulkEditView.gui,
          permissions.bulkEditQueryView.gui,
          permissions.uiInventoryViewCreateEditInstances.gui,
        ]).then((userProperties) => {
          user = userProperties;

          cy.getInstanceTypes({ limit: 1 })
            .then((instanceTypes) => {
              instanceTypeId = instanceTypes[0].id;
            })
            .then(() => {
              cy.withinTenant(Affiliations.College, () => {
                instances.forEach((instance) => {
                  InventoryInstances.createFolioInstanceViaApi({
                    instance: {
                      instanceTypeId,
                      title: instance.title,
                    },
                  }).then((createdInstanceData) => {
                    instance.uuid = createdInstanceData.instanceId;
                  });
                });
              });
            });

          cy.resetTenant();
          cy.login(user.username, user.password, {
            path: TopMenu.bulkEditPath,
            waiter: BulkEditSearchPane.waitLoading,
          });
          ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.central);
          BulkEditSearchPane.openQuerySearch();
        });
      });

      after('delete test data', () => {
        cy.resetTenant();
        cy.getAdminToken();
        Users.deleteViaApi(user.userId);
        cy.withinTenant(Affiliations.College, () => {
          instances.forEach((instance) => {
            InventoryInstance.deleteInstanceViaApi(instance.uuid);
          });
        });
      });

      it(
        'C503029 Query - Verify "Errors" when querying by invalid Instance identifiers in Central tenant (consortia) (firebird)',
        { tags: ['criticalPathECS', 'firebird', 'C503029'] },
        () => {
          BulkEditSearchPane.checkInstanceRadio();
          BulkEditSearchPane.clickBuildQueryButton();
          QueryModal.verify();
          QueryModal.selectField(instanceFieldValues.instanceId);
          QueryModal.verifySelectedField(instanceFieldValues.instanceId);
          QueryModal.selectOperator(QUERY_OPERATIONS.IN);
          QueryModal.fillInValueTextfield(`${instances[0].uuid},${instances[1].uuid}`);
          QueryModal.clickTestQuery();
          QueryModal.verifyNumberOfMatchedRecords(0);
          QueryModal.runQueryDisabled();
          QueryModal.selectField(instanceFieldValues.instanceHrid);
          QueryModal.verifySelectedField(instanceFieldValues.instanceHrid);
          QueryModal.selectOperator(QUERY_OPERATIONS.EQUAL);
          QueryModal.fillInValueTextfield(invalidInstanceHrid);
          QueryModal.clickTestQuery();
          QueryModal.verifyNumberOfMatchedRecords(0);
          QueryModal.runQueryDisabled();
        },
      );
    });
  });
});
