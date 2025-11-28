import Permissions from '../../../../support/dictionary/permissions';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances, {
  searchInstancesOptions,
} from '../../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../../support/fragments/inventory/inventorySearchAndFilter';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../support/utils/stringTools';
import BrowseSubjects from '../../../../support/fragments/inventory/search/browseSubjects';
import BrowseContributors from '../../../../support/fragments/inventory/search/browseContributors';
import Affiliations, { tenantNames } from '../../../../support/dictionary/affiliations';
import ConsortiumManager from '../../../../support/fragments/settings/consortium-manager/consortium-manager';

describe('Inventory', () => {
  describe('Contributors Browse', () => {
    describe('Consortia', () => {
      const randomPostfix = getRandomPostfix();
      const testData = {
        instanceTitle: `AT_C423580_FolioInstance_${randomPostfix}`,
        searchOption: searchInstancesOptions[1],
        contributorValue: `AT_C423580_Contributor_${randomPostfix}`,
      };
      let instanceId;
      let user;

      before('Create test data', () => {
        cy.resetTenant();
        cy.getAdminToken();
        InventoryInstances.deleteInstanceByTitleViaApi('AT_C423580');

        cy.then(() => {
          cy.getInstanceTypes({ limit: 1, query: 'source=rdacontent' }).then((instanceTypes) => {
            BrowseContributors.getContributorNameTypes().then((contributorNameTypes) => {
              InventoryInstances.createFolioInstanceViaApi({
                instance: {
                  instanceTypeId: instanceTypes[0].id,
                  title: testData.instanceTitle,
                  contributors: [
                    {
                      name: testData.contributorValue,
                      contributorNameTypeId: contributorNameTypes[0].id,
                      contributorTypeText: '',
                      primary: false,
                    },
                  ],
                },
              }).then((instanceData) => {
                instanceId = instanceData.instanceId;
              });
            });
          });
        }).then(() => {
          cy.createTempUser([Permissions.inventoryAll.gui]).then((userProperties) => {
            user = userProperties;

            cy.assignAffiliationToUser(Affiliations.College, user.userId);
            cy.assignAffiliationToUser(Affiliations.University, user.userId);

            cy.setTenant(Affiliations.College);
            cy.assignPermissionsToExistingUser(user.userId, [Permissions.inventoryAll.gui]);

            cy.setTenant(Affiliations.University);
            cy.assignPermissionsToExistingUser(user.userId, [Permissions.inventoryAll.gui]);
          });
        });
      });

      after('Delete test data', () => {
        cy.resetTenant();
        cy.getAdminToken();
        InventoryInstance.deleteInstanceViaApi(instanceId);
        Users.deleteViaApi(user.userId);
      });

      it(
        'C423580 "Number of titles" column counts unique Contributors from "Shared" Instances once, regardless of existing "Shadow" copies at member tenants (consortia) (spitfire)',
        { tags: ['extendedPathECS', 'spitfire', 'C423580'] },
        () => {
          cy.resetTenant();
          cy.login(user.username, user.password, {
            path: TopMenu.inventoryPath,
            waiter: InventoryInstances.waitContentLoading,
          });
          ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.central);
          InventorySearchAndFilter.switchToBrowseTab();
          InventorySearchAndFilter.verifyKeywordsAsDefault();
          BrowseContributors.select();

          BrowseContributors.waitForContributorToAppear(testData.contributorValue);

          BrowseContributors.browse(testData.contributorValue);
          BrowseSubjects.verifyNumberOfTitlesForRowWithValueAndNoAuthorityIcon(
            testData.contributorValue,
            1,
          );

          ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
          InventoryInstances.waitContentLoading();

          InventorySearchAndFilter.switchToBrowseTab();
          InventorySearchAndFilter.verifyKeywordsAsDefault();
          InventorySearchAndFilter.checkBrowseSearchInputFieldContent('');
          InventorySearchAndFilter.verifyBrowseResultsEmptyPane();

          BrowseContributors.select();

          BrowseContributors.browse(testData.contributorValue);
          BrowseSubjects.verifyNumberOfTitlesForRowWithValueAndNoAuthorityIcon(
            testData.contributorValue,
            1,
          );
        },
      );
    });
  });
});
