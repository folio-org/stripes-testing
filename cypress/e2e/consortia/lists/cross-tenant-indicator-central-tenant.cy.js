import Affiliations from '../../../support/dictionary/affiliations';
import Permissions from '../../../support/dictionary/permissions';
import { Lists } from '../../../support/fragments/lists/lists';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Lists', () => {
  describe('Consortia', () => {
    const crossTenantIndicator = 'This list may contain records from multiple tenants.';
    const testData = {
      user: {},
      lists: [],
    };
    const getCentralAdminToken = () => {
      cy.setTenant(Affiliations.Consortia);
      cy.getToken('consortium_admin', Cypress.env('diku_password'));
    };
    const recordTypes = [
      { name: 'Instances', hasCrossTenantIndicator: true },
      { name: 'Holdings', hasCrossTenantIndicator: true },
      { name: 'Items', hasCrossTenantIndicator: true },
      { name: 'Loans', hasCrossTenantIndicator: false },
      { name: 'Organizations', hasCrossTenantIndicator: false },
      { name: 'Purchase order lines', hasCrossTenantIndicator: false },
      { name: 'Users', hasCrossTenantIndicator: false },
    ];

    before('Create test data', () => {
      if (!Cypress.env('ecsEnabled')) {
        throw new Error('This spec must be run against an ECS environment with ecsEnabled=true.');
      }
      getCentralAdminToken();
      cy.createTempUser([
        Permissions.listsAll.gui,
        Permissions.inventoryAll.gui,
        Permissions.loansAll.gui,
        Permissions.uiUsersView.gui,
        Permissions.uiOrdersCreate.gui,
        Permissions.uiOrdersView.gui,
        Permissions.uiOrganizationsViewEditCreate.gui,
        Permissions.ordersStorageAcquisitionMethodsCollectionGet.gui,
      ]).then((userProperties) => {
        testData.user = userProperties;
      });
    });

    after('Delete test data', () => {
      if (!testData.user.username) return;

      cy.setTenant(Affiliations.Consortia);
      cy.getUserToken(testData.user.username, testData.user.password);
      testData.lists.forEach(({ name }) => {
        Lists.deleteListByNameViaApi(name);
      });

      getCentralAdminToken();
      Users.deleteViaApi(testData.user.userId);
    });

    it(
      'Verify cross-tenant indicator displays only for Inventory lists created in central tenant (consortia)',
      { tags: ['criticalPathECS', 'corsair'] },
      () => {
        cy.setTenant(Affiliations.Consortia);
        cy.login(testData.user.username, testData.user.password, {
          path: TopMenu.listsPath,
          waiter: Lists.waitLoading,
        });

        recordTypes.forEach(({ name: recordType, hasCrossTenantIndicator }) => {
          const recordTypeNamePart = recordType.replace(/\s/g, '_');
          const listData = {
            name: `AT_C_lists_cross_tenant_${recordTypeNamePart}_${getRandomPostfix()}`,
            description: `Cross-tenant indicator check for ${recordType}`,
            recordType,
            status: 'Active',
            visibility: hasCrossTenantIndicator ? 'Private' : 'Shared',
          };
          testData.lists.push(listData);

          Lists.openNewListPane();
          Lists.setName(listData.name);
          Lists.setDescription(listData.description);
          Lists.selectRecordType(listData.recordType);
          if (!hasCrossTenantIndicator) {
            Lists.selectVisibility(listData.visibility);
          }
          Lists.selectStatus(listData.status);
          Lists.saveList();
          Lists.verifySuccessCalloutMessage(`List ${listData.name} saved.`);
          Lists.verifyRecordType(listData.recordType);

          cy.get('[data-testid="listInformation"]').within(() => {
            if (hasCrossTenantIndicator) {
              cy.contains(crossTenantIndicator).should('be.visible');
            } else {
              cy.contains(crossTenantIndicator).should('not.exist');
            }
          });

          Lists.closeListDetailsPane();
        });
      },
    );
  });
});
