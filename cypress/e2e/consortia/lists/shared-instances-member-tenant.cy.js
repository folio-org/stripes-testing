import Affiliations, { tenantNames } from '../../../support/dictionary/affiliations';
import Permissions from '../../../support/dictionary/permissions';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import { Lists } from '../../../support/fragments/lists/lists';
import ConsortiumManager from '../../../support/fragments/settings/consortium-manager/consortium-manager';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Lists', () => {
  describe('Consortia', () => {
    const permissions = [Permissions.listsEdit.gui, Permissions.inventoryAll.gui];
    const testData = {
      user: {},
      instanceIds: [],
    };
    const titlePrefix = `AT_C_lists_shared_instances_${getRandomPostfix()}`;
    const sharedInstanceTitles = [1, 2, 3].map(
      (index) => `${titlePrefix} Shared instance ${index}`,
    );
    const listData = {
      name: `${titlePrefix} list`,
      description: `${titlePrefix} list description`,
      recordType: 'Instances',
      isActive: true,
      isPrivate: false,
    };

    before('Create test data', () => {
      cy.resetTenant();
      cy.getAdminToken();

      cy.getInstanceTypes({ limit: 1, query: 'source=rdacontent' }).then((instanceTypes) => {
        const instanceTypeId = instanceTypes[0].id;

        sharedInstanceTitles.forEach((title) => {
          InventoryInstances.createFolioInstanceViaApi({
            instance: {
              title,
              instanceTypeId,
            },
          }).then(({ instanceId }) => {
            testData.instanceIds.push(instanceId);
          });
        });
      });

      cy.createTempUser(permissions).then((userProperties) => {
        testData.user = userProperties;

        cy.affiliateUserToTenant({
          tenantId: Affiliations.College,
          userId: testData.user.userId,
          permissions,
        });

        cy.setTenant(Affiliations.College);
        cy.getUserToken(testData.user.username, testData.user.password);

        Lists.getEntityTypeIdByNameViaApi('Instances').then((entityTypeId) => {
          const query = {
            entityTypeId,
            fqlQuery: JSON.stringify({
              'instance.title': {
                $in: sharedInstanceTitles,
              },
            }),
          };

          Lists.createQueryViaApi(query).then((createdQuery) => {
            listData.queryId = createdQuery.queryId;
            listData.fqlQuery = createdQuery.fqlQuery;
            listData.fields = ['instance.hrid', 'instance.title', 'instance.source'];

            Lists.createViaApi(listData).then((body) => {
              listData.id = body.id;
              Lists.refreshViaApi(listData.id);
              Lists.waitForListToCompleteRefreshViaApi(listData.id);
            });
          });
        });
      });
    });

    after('Delete test data', () => {
      cy.resetTenant();
      cy.getAdminToken();

      cy.setTenant(Affiliations.College);
      cy.getUserToken(testData.user.username, testData.user.password);
      Lists.deleteViaApi(listData.id);

      cy.resetTenant();
      cy.getAdminToken();
      Users.deleteViaApi(testData.user.userId);
      testData.instanceIds.forEach((instanceId) => {
        InventoryInstance.deleteInstanceViaApi(instanceId);
      });
    });

    it(
      'Verify affiliated user can refresh and edit a member tenant list of central shared instances (consortia)',
      { tags: ['criticalPathECS', 'corsair'] },
      () => {
        cy.login(testData.user.username, testData.user.password, {
          path: TopMenu.listsPath,
          waiter: Lists.waitLoading,
        });
        ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.central);
        ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
        Lists.waitLoading();

        Lists.verifyListIsPresent(listData.name);
        Lists.openList(listData.name);
        Lists.verifyRecordsNumber(sharedInstanceTitles.length);
        sharedInstanceTitles.forEach((title) => {
          cy.contains(title).should('be.visible');
        });

        Lists.openActions();
        Lists.verifyRefreshListButtonIsActive();
        Lists.verifyEditListButtonIsActive();
        Lists.verifyDuplicateListButtonIsActive();
        Lists.verifyDeleteListButtonDoesNotExist();
        Lists.verifyExportListButtonDoesNotExist();

        Lists.refreshList();
        Lists.waitForCompilingToComplete();
        Lists.verifyRecordsNumber(sharedInstanceTitles.length);
        sharedInstanceTitles.forEach((title) => {
          cy.contains(title).should('be.visible');
        });

        Lists.openActions();
        Lists.editList();
        Lists.verifyActionsButtonDoesNotExist();
      },
    );
  });
});
