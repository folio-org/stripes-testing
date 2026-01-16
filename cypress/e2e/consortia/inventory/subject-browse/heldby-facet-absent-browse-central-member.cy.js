import Permissions from '../../../../support/dictionary/permissions';
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
  describe('Subject Browse', () => {
    describe('Consortia', () => {
      const randomPostfix = getRandomPostfix();
      const testData = {
        instanceTitlePrefix: `AT_C413363_Instance_${randomPostfix}`,
        searchOption: searchInstancesOptions[1],
        subjectPrefix: `AT_C413363_Subject_${randomPostfix}`,
        contributorPrefix: `AT_C413363_Contributor_${randomPostfix}`,
        heldbyAccordionName: 'Held by',
        contributorNameTypeName: 'Personal name',
      };
      const instances = [
        {
          title: `${testData.instanceTitlePrefix}_Shared`,
          affiliation: Affiliations.Consortia,
          subjectValue: `${testData.subjectPrefix}_Shared`,
          contributorValue: `${testData.contributorPrefix}_Shared`,
        },
        {
          title: `${testData.instanceTitlePrefix}_Local`,
          affiliation: Affiliations.College,
          subjectValue: `${testData.subjectPrefix}_Local`,
          contributorValue: `${testData.contributorPrefix}_Local`,
        },
      ];
      let user;

      before('Create test data', () => {
        cy.resetTenant();
        cy.getAdminToken();
        cy.setTenant(Affiliations.College);
        InventoryInstances.deleteInstanceByTitleViaApi('AT_C413363');
        cy.resetTenant();
        InventoryInstances.deleteInstanceByTitleViaApi('AT_C413363');

        cy.then(() => {
          cy.resetTenant();
          cy.getInstanceTypes({ limit: 1, query: 'source=rdacontent' }).then((instanceTypes) => {
            instances.forEach((instance) => {
              BrowseContributors.getContributorNameTypes({
                searchParams: { limit: 1, query: `name==${testData.contributorNameTypeName}` },
              }).then((contributorNameTypes) => {
                cy.setTenant(instance.affiliation);
                InventoryInstances.createFolioInstanceViaApi({
                  instance: {
                    instanceTypeId: instanceTypes[0].id,
                    title: instance.title,
                    subjects: [
                      {
                        value: instance.subjectValue,
                        sourceId: null,
                        typeId: null,
                      },
                    ],
                    contributors: [
                      {
                        name: instance.contributorValue,
                        contributorNameTypeId: contributorNameTypes[0].id,
                        contributorTypeText: '',
                        primary: false,
                      },
                    ],
                  },
                });
              });
            });
          });
        })
          .then(() => {
            cy.resetTenant();
            cy.createTempUser([Permissions.uiInventoryViewInstances.gui]).then((userProperties) => {
              user = userProperties;

              cy.assignAffiliationToUser(Affiliations.College, user.userId);

              cy.setTenant(Affiliations.College);
              cy.assignPermissionsToExistingUser(user.userId, [
                Permissions.uiInventoryViewInstances.gui,
              ]);
            });
          })
          .then(() => {
            cy.resetTenant();
            cy.login(user.username, user.password, {
              path: TopMenu.inventoryPath,
              waiter: InventoryInstances.waitContentLoading,
              authRefresh: true,
            });
            ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.central);
            InventorySearchAndFilter.switchToBrowseTab();
            InventorySearchAndFilter.validateBrowseToggleIsSelected();
          });
      });

      after('Delete test data', () => {
        cy.resetTenant();
        cy.getAdminToken();
        cy.setTenant(Affiliations.College);
        InventoryInstances.deleteInstanceByTitleViaApi(testData.instanceTitlePrefix);
        cy.resetTenant();
        Users.deleteViaApi(user.userId);
        InventoryInstances.deleteInstanceByTitleViaApi(testData.instanceTitlePrefix);
      });

      it(
        'C413363 "Held by" facet not shown for Subject/Contributor Browse on Central and Member tenants (consortia) (spitfire)',
        { tags: ['extendedPathECS', 'spitfire', 'C413363'] },
        () => {
          BrowseSubjects.waitForSubjectToAppear(instances[0].subjectValue);
          BrowseContributors.waitForContributorToAppear(instances[0].contributorValue);

          BrowseSubjects.select();
          InventorySearchAndFilter.verifyAccordionExistance(testData.heldbyAccordionName, false);

          BrowseSubjects.browse(testData.subjectPrefix);
          BrowseSubjects.verifyNonExistentSearchResult(testData.subjectPrefix);
          BrowseSubjects.checkRowWithValueAndNoAuthorityIconExists(instances[0].subjectValue);
          InventorySearchAndFilter.verifyAccordionExistance(testData.heldbyAccordionName, false);

          BrowseContributors.select();
          InventorySearchAndFilter.verifyAccordionExistance(testData.heldbyAccordionName, false);

          BrowseContributors.browse(testData.contributorPrefix);
          BrowseContributors.checkMissedMatchSearchResultRecord(testData.contributorPrefix);
          BrowseContributors.checkRecordPresentInSearchResults(instances[0].contributorValue);
          InventorySearchAndFilter.verifyAccordionExistance(testData.heldbyAccordionName, false);

          ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
          InventoryInstances.waitContentLoading();
          InventorySearchAndFilter.switchToBrowseTab();
          InventorySearchAndFilter.validateBrowseToggleIsSelected();

          cy.setTenant(Affiliations.College);
          BrowseSubjects.waitForSubjectToAppear(instances[1].subjectValue);
          BrowseContributors.waitForContributorToAppear(instances[1].contributorValue);

          BrowseSubjects.select();
          InventorySearchAndFilter.verifyAccordionExistance(testData.heldbyAccordionName, false);

          BrowseSubjects.browse(testData.subjectPrefix);
          BrowseSubjects.verifyNonExistentSearchResult(testData.subjectPrefix);
          BrowseSubjects.checkRowWithValueAndNoAuthorityIconExists(instances[1].subjectValue);
          InventorySearchAndFilter.verifyAccordionExistance(testData.heldbyAccordionName, false);

          BrowseContributors.select();
          InventorySearchAndFilter.verifyAccordionExistance(testData.heldbyAccordionName, false);

          BrowseContributors.browse(testData.contributorPrefix);
          BrowseContributors.checkMissedMatchSearchResultRecord(testData.contributorPrefix);
          BrowseContributors.checkRecordPresentInSearchResults(instances[1].contributorValue);
          InventorySearchAndFilter.verifyAccordionExistance(testData.heldbyAccordionName, false);
        },
      );
    });
  });
});
