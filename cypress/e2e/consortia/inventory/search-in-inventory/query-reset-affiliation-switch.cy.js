import Permissions from '../../../../support/dictionary/permissions';
import Affiliations, { tenantNames } from '../../../../support/dictionary/affiliations';
import Users from '../../../../support/fragments/users/users';
import TopMenu from '../../../../support/fragments/topMenu';
import InventoryInstances, {
  searchInstancesOptions,
} from '../../../../support/fragments/inventory/inventoryInstances';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import ConsortiumManager from '../../../../support/fragments/settings/consortium-manager/consortium-manager';
import getRandomPostfix from '../../../../support/utils/stringTools';
import InventorySearchAndFilter from '../../../../support/fragments/inventory/inventorySearchAndFilter';
import { INSTANCE_SOURCE_NAMES } from '../../../../support/constants';

describe('Inventory', () => {
  describe('Search in Inventory', () => {
    describe('Consortia', () => {
      const instanceTitle = `AT_C423590_FolioInstance_${getRandomPostfix()}`;
      const folioInstances = InventoryInstances.generateFolioInstances({
        instanceTitlePrefix: instanceTitle,
        count: 1,
        holdingsCount: 0,
      });
      const keywordSearchOption = searchInstancesOptions[0];
      const sourceAccordionName = 'Source';
      let user;

      before('Create data, user', () => {
        cy.resetTenant();
        cy.getAdminToken();

        cy.createTempUser([Permissions.inventoryAll.gui]).then((userProperties) => {
          user = userProperties;
          cy.assignAffiliationToUser(Affiliations.College, user.userId);

          cy.setTenant(Affiliations.College);
          cy.assignPermissionsToExistingUser(user.userId, [Permissions.inventoryAll.gui]);

          cy.resetTenant();
          InventoryInstances.createFolioInstancesViaApi({ folioInstances });

          cy.login(user.username, user.password, {
            path: TopMenu.inventoryPath,
            waiter: InventoryInstances.waitContentLoading,
            authRefresh: true,
          });
          ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.central);
          InventorySearchAndFilter.validateSearchTabIsDefault();
          InventorySearchAndFilter.verifyDefaultSearchOptionSelected(keywordSearchOption);
        });
      });

      after('Delete data, user', () => {
        cy.resetTenant();
        cy.getAdminToken();
        InventoryInstance.deleteInstanceViaApi(folioInstances[0].instanceId);
        Users.deleteViaApi(user.userId);
      });

      it(
        'C423590 Verify reset of search query in Inventory when affiliation is switched to Member from Central (consortia) (spitfire)',
        { tags: ['extendedPathECS', 'spitfire', 'C423590'] },
        () => {
          InventoryInstances.searchBySource(INSTANCE_SOURCE_NAMES.FOLIO);
          InventorySearchAndFilter.fillInSearchQuery(instanceTitle);
          InventorySearchAndFilter.clickSearch();
          InventorySearchAndFilter.verifySearchResult(instanceTitle);
          InventorySearchAndFilter.verifyCheckboxInAccordion(
            sourceAccordionName,
            INSTANCE_SOURCE_NAMES.FOLIO,
            true,
          );

          ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
          InventoryInstances.waitContentLoading();
          InventorySearchAndFilter.validateSearchTabIsDefault();
          InventorySearchAndFilter.verifyDefaultSearchOptionSelected(keywordSearchOption);
          InventorySearchAndFilter.verifyResultPaneEmpty();

          InventorySearchAndFilter.toggleAccordionByName(sourceAccordionName);
          InventorySearchAndFilter.verifyCheckboxInAccordion(
            sourceAccordionName,
            INSTANCE_SOURCE_NAMES.FOLIO,
            false,
          );
        },
      );
    });
  });
});
