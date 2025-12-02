import Permissions from '../../../../support/dictionary/permissions';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../../support/fragments/inventory/inventorySearchAndFilter';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../support/utils/stringTools';
import BrowseSubjects from '../../../../support/fragments/inventory/search/browseSubjects';
import BrowseContributors from '../../../../support/fragments/inventory/search/browseContributors';
import Affiliations, { tenantNames } from '../../../../support/dictionary/affiliations';
import ConsortiumManager from '../../../../support/fragments/settings/consortium-manager/consortium-manager';

describe('Inventory', () => {
  describe('Subject Browse', () => {
    describe('Consortia', () => {
      const randomPostfix = getRandomPostfix();
      const testData = {
        instanceTitle: `AT_C423584_FolioInstance_${randomPostfix}`,
        subjectValue: `AT_C423584_Subject_${randomPostfix}`,
      };
      let user;

      before('Create test data', () => {
        cy.resetTenant();
        cy.getAdminToken();
        InventoryInstances.deleteInstanceByTitleViaApi('AT_C423584');

        cy.then(() => {
          cy.getInstanceTypes({ limit: 1, query: 'source=rdacontent' }).then((instanceTypes) => {
            InventoryInstances.createFolioInstanceViaApi({
              instance: {
                instanceTypeId: instanceTypes[0].id,
                title: testData.instanceTitle,
                subjects: [
                  {
                    value: testData.subjectValue,
                    sourceId: null,
                    typeId: null,
                  },
                ],
              },
            });
          });
        }).then(() => {
          cy.resetTenant();
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
        Users.deleteViaApi(user.userId);
        InventoryInstances.deleteInstanceByTitleViaApi('AT_C423584');
      });

      it(
        'C423584 "Number of titles" column counts unique Subjects from "Shared" Instances once, regardless of existing "Shadow" copies at member tenants (consortia) (spitfire)',
        { tags: ['extendedPathECS', 'spitfire', 'C423584'] },
        () => {
          cy.resetTenant();
          cy.login(user.username, user.password, {
            path: TopMenu.inventoryPath,
            waiter: InventoryInstances.waitContentLoading,
            authRefresh: true,
          });
          InventorySearchAndFilter.switchToBrowseTab();
          InventorySearchAndFilter.verifyKeywordsAsDefault();
          BrowseSubjects.select();

          BrowseSubjects.waitForSubjectToAppear(testData.subjectValue);

          BrowseContributors.browse(testData.subjectValue);
          BrowseContributors.checkSearchResultRecord(testData.subjectValue);
          BrowseSubjects.verifyNumberOfTitlesForRowWithValueAndNoAuthorityIcon(
            testData.subjectValue,
            1,
          );

          ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
          InventoryInstances.waitContentLoading();
          InventorySearchAndFilter.switchToBrowseTab();
          InventorySearchAndFilter.verifyKeywordsAsDefault();
          InventorySearchAndFilter.verifyBrowseResultsEmptyPane();
          InventorySearchAndFilter.checkBrowseSearchInputFieldContent('');

          BrowseSubjects.select();
          BrowseContributors.browse(testData.subjectValue);
          BrowseContributors.checkSearchResultRecord(testData.subjectValue);
          BrowseSubjects.verifyNumberOfTitlesForRowWithValueAndNoAuthorityIcon(
            testData.subjectValue,
            1,
          );
        },
      );
    });
  });
});
