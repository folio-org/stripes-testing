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
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';

describe('Inventory', () => {
  describe('Subject Browse', () => {
    describe('Consortia', () => {
      const randomPostfix = getRandomPostfix();
      const testData = {
        instanceTitlePrefix: `AT_C402380_FolioInstance_${randomPostfix}`,
        searchOption: searchInstancesOptions[1],
        subjectValue: `AT_C402380_Subject_${randomPostfix}`,
        sharedAccordionName: 'Shared',
        subjectTypeName: 'Personal name',
      };
      const instances = [
        {
          title: `${testData.instanceTitlePrefix}_Shared_Folio`,
          tenantId: Affiliations.Consortia,
        },
        {
          title: `${testData.instanceTitlePrefix}_Shared_Marc`,
          tenantId: Affiliations.Consortia,
        },
        {
          title: `${testData.instanceTitlePrefix}_LocalM1_Folio`,
          tenantId: Affiliations.College,
        },
        {
          title: `${testData.instanceTitlePrefix}_LocalM1_Marc`,
          tenantId: Affiliations.College,
        },
        {
          title: `${testData.instanceTitlePrefix}_LocalM2_Folio`,
          tenantId: Affiliations.University,
        },
        {
          title: `${testData.instanceTitlePrefix}_LocalM2_Marc`,
          tenantId: Affiliations.University,
        },
      ];
      const sharedInstances = instances.filter((inst) => inst.title.includes('Shared'));
      const localM1Instances = instances.filter((inst) => inst.title.includes('LocalM1'));
      let user;

      before('Create test data', () => {
        cy.resetTenant();
        cy.getAdminToken();
        InventoryInstances.deleteInstanceByTitleViaApi('AT_C402380');
        cy.setTenant(Affiliations.College);
        InventoryInstances.deleteInstanceByTitleViaApi('AT_C402380');
        cy.setTenant(Affiliations.University);
        InventoryInstances.deleteInstanceByTitleViaApi('AT_C402380');
        cy.resetTenant();

        cy.then(() => {
          cy.getInstanceTypes({ limit: 1, query: 'source=rdacontent' }).then((instanceTypes) => {
            cy.getSubjectTypesViaApi({
              limit: 1,
              query: `name="${testData.subjectTypeName}"`,
            }).then((subjectTypes) => {
              instances.forEach((instance) => {
                cy.setTenant(instance.tenantId);
                if (!instance.title.includes('Marc')) {
                  InventoryInstances.createFolioInstanceViaApi({
                    instance: {
                      instanceTypeId: instanceTypes[0].id,
                      title: instance.title,
                      subjects: [
                        {
                          value: testData.subjectValue,
                          sourceId: null,
                          typeId: subjectTypes[0].id,
                        },
                      ],
                    },
                  });
                } else {
                  const marcInstanceFields = [
                    {
                      tag: '008',
                      content: QuickMarcEditor.defaultValid008Values,
                    },
                    {
                      tag: '245',
                      content: `$a ${instance.title}`,
                      indicators: ['1', '1'],
                    },
                    {
                      tag: '600',
                      content: `$a ${testData.subjectValue}`,
                      indicators: ['\\', '\\'],
                    },
                  ];
                  cy.createMarcBibliographicViaAPI(
                    QuickMarcEditor.defaultValidLdr,
                    marcInstanceFields,
                  );
                }
              });
            });
          });
        }).then(() => {
          cy.resetTenant();
          cy.createTempUser([]).then((userProperties) => {
            user = userProperties;

            cy.assignAffiliationToUser(Affiliations.College, user.userId);

            cy.setTenant(Affiliations.College);
            cy.assignPermissionsToExistingUser(user.userId, [
              Permissions.uiInventoryViewInstances.gui,
            ]);
          });
        });
      });

      after('Delete test data', () => {
        cy.resetTenant();
        cy.getAdminToken();
        Users.deleteViaApi(user.userId);
        InventoryInstances.deleteInstanceByTitleViaApi('AT_C402380');
        cy.setTenant(Affiliations.College);
        InventoryInstances.deleteInstanceByTitleViaApi('AT_C402380');
        cy.setTenant(Affiliations.University);
        InventoryInstances.deleteInstanceByTitleViaApi('AT_C402380');
      });

      it(
        'C402380 Apply "Shared" facet when Browse for same subject existing in different tenants (exact match) (consortia) (spitfire)',
        { tags: ['extendedPathECS', 'spitfire', 'C402380'] },
        () => {
          cy.resetTenant();
          cy.login(user.username, user.password);
          ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
          cy.visit(TopMenu.inventoryPath);
          InventoryInstances.waitContentLoading();
          InventorySearchAndFilter.switchToBrowseTab();
          InventorySearchAndFilter.verifyKeywordsAsDefault();
          BrowseSubjects.select();

          cy.setTenant(Affiliations.College);
          BrowseSubjects.waitForSubjectToAppear(testData.subjectValue);

          InventorySearchAndFilter.clickAccordionByName(testData.sharedAccordionName);
          InventorySearchAndFilter.verifyAccordionByNameExpanded(testData.sharedAccordionName);
          InventorySearchAndFilter.verifyCheckboxesWithCountersExistInAccordion(
            testData.sharedAccordionName,
          );
          InventorySearchAndFilter.verifyCheckboxInAccordion(
            testData.sharedAccordionName,
            'Yes',
            false,
          );
          InventorySearchAndFilter.verifyCheckboxInAccordion(
            testData.sharedAccordionName,
            'No',
            false,
          );

          BrowseContributors.browse(testData.subjectValue);
          BrowseContributors.checkSearchResultRecord(testData.subjectValue);
          BrowseSubjects.verifyNumberOfTitlesForRowWithValueAndNoAuthorityIcon(
            testData.subjectValue,
            [...sharedInstances, ...localM1Instances].length,
          );
          InventorySearchAndFilter.verifyCheckboxesWithCountersExistInAccordion(
            testData.sharedAccordionName,
          );
          InventorySearchAndFilter.verifyCheckboxInAccordion(
            testData.sharedAccordionName,
            'Yes',
            false,
          );
          InventorySearchAndFilter.verifyCheckboxInAccordion(
            testData.sharedAccordionName,
            'No',
            false,
          );

          BrowseContributors.openRecord(testData.subjectValue);
          sharedInstances.forEach((instance) => {
            InventoryInstance.verifySharedIconByTitle(instance.title);
          });
          localM1Instances.forEach((instance) => {
            InventorySearchAndFilter.verifySearchResult(instance.title);
          });
          InventorySearchAndFilter.checkRowsCount([...sharedInstances, ...localM1Instances].length);

          InventorySearchAndFilter.switchToBrowseTab();
          BrowseContributors.checkSearchResultRecord(testData.subjectValue);
          BrowseSubjects.verifyNumberOfTitlesForRowWithValueAndNoAuthorityIcon(
            testData.subjectValue,
            [...sharedInstances, ...localM1Instances].length,
          );

          InventorySearchAndFilter.clickAccordionByName(testData.sharedAccordionName);
          InventorySearchAndFilter.verifyAccordionByNameExpanded(testData.sharedAccordionName);
          InventorySearchAndFilter.selectOptionInExpandedFilter(testData.sharedAccordionName, 'No');
          InventorySearchAndFilter.verifyCheckboxesWithCountersExistInAccordion(
            testData.sharedAccordionName,
          );
          InventorySearchAndFilter.verifyCheckboxInAccordion(
            testData.sharedAccordionName,
            'Yes',
            false,
          );
          InventorySearchAndFilter.verifyCheckboxInAccordion(
            testData.sharedAccordionName,
            'No',
            true,
          );

          BrowseContributors.checkSearchResultRecord(testData.subjectValue);
          BrowseSubjects.verifyNumberOfTitlesForRowWithValueAndNoAuthorityIcon(
            testData.subjectValue,
            localM1Instances.length,
          );

          BrowseContributors.openRecord(testData.subjectValue);
          localM1Instances.forEach((instance) => {
            InventorySearchAndFilter.verifySearchResult(instance.title);
          });
          InventorySearchAndFilter.checkRowsCount(localM1Instances.length);

          InventorySearchAndFilter.switchToBrowseTab();
          BrowseContributors.checkSearchResultRecord(testData.subjectValue);
          BrowseSubjects.verifyNumberOfTitlesForRowWithValueAndNoAuthorityIcon(
            testData.subjectValue,
            localM1Instances.length,
          );

          InventorySearchAndFilter.clickAccordionByName(testData.sharedAccordionName);
          InventorySearchAndFilter.verifyAccordionByNameExpanded(testData.sharedAccordionName);
          InventorySearchAndFilter.selectOptionInExpandedFilter(
            testData.sharedAccordionName,
            'No',
            false,
          );
          BrowseContributors.checkSearchResultRecord(testData.subjectValue);
          BrowseSubjects.verifyNumberOfTitlesForRowWithValueAndNoAuthorityIcon(
            testData.subjectValue,
            [...sharedInstances, ...localM1Instances].length,
          );

          InventorySearchAndFilter.selectOptionInExpandedFilter(
            testData.sharedAccordionName,
            'Yes',
          );
          BrowseContributors.checkSearchResultRecord(testData.subjectValue);
          BrowseSubjects.verifyNumberOfTitlesForRowWithValueAndNoAuthorityIcon(
            testData.subjectValue,
            sharedInstances.length,
          );
          InventorySearchAndFilter.verifyCheckboxesWithCountersExistInAccordion(
            testData.sharedAccordionName,
          );
          InventorySearchAndFilter.verifyCheckboxInAccordion(
            testData.sharedAccordionName,
            'Yes',
            true,
          );
          InventorySearchAndFilter.verifyCheckboxInAccordion(
            testData.sharedAccordionName,
            'No',
            false,
          );

          BrowseContributors.openRecord(testData.subjectValue);
          sharedInstances.forEach((instance) => {
            InventoryInstance.verifySharedIconByTitle(instance.title);
          });
          InventorySearchAndFilter.checkRowsCount(sharedInstances.length);

          InventorySearchAndFilter.switchToBrowseTab();
          BrowseContributors.checkSearchResultRecord(testData.subjectValue);
          BrowseSubjects.verifyNumberOfTitlesForRowWithValueAndNoAuthorityIcon(
            testData.subjectValue,
            sharedInstances.length,
          );

          InventorySearchAndFilter.clickAccordionByName(testData.sharedAccordionName);
          InventorySearchAndFilter.verifyAccordionByNameExpanded(testData.sharedAccordionName);
          InventorySearchAndFilter.verifyCheckboxInAccordion(
            testData.sharedAccordionName,
            'Yes',
            true,
          );
          InventorySearchAndFilter.verifyCheckboxInAccordion(
            testData.sharedAccordionName,
            'No',
            false,
          );

          InventorySearchAndFilter.selectOptionInExpandedFilter(
            testData.sharedAccordionName,
            'No',
            true,
          );
          BrowseContributors.checkSearchResultRecord(testData.subjectValue);
          BrowseSubjects.verifyNumberOfTitlesForRowWithValueAndNoAuthorityIcon(
            testData.subjectValue,
            [...sharedInstances, ...localM1Instances].length,
          );
          InventorySearchAndFilter.verifyCheckboxInAccordion(
            testData.sharedAccordionName,
            'Yes',
            true,
          );
          InventorySearchAndFilter.verifyCheckboxInAccordion(
            testData.sharedAccordionName,
            'No',
            true,
          );

          BrowseContributors.openRecord(testData.subjectValue);
          sharedInstances.forEach((instance) => {
            InventoryInstance.verifySharedIconByTitle(instance.title);
          });
          localM1Instances.forEach((instance) => {
            InventorySearchAndFilter.verifySearchResult(instance.title);
          });
          InventorySearchAndFilter.checkRowsCount([...sharedInstances, ...localM1Instances].length);

          InventorySearchAndFilter.switchToBrowseTab();
          BrowseContributors.checkSearchResultRecord(testData.subjectValue);
          BrowseSubjects.verifyNumberOfTitlesForRowWithValueAndNoAuthorityIcon(
            testData.subjectValue,
            [...sharedInstances, ...localM1Instances].length,
          );
          InventorySearchAndFilter.clickAccordionByName(testData.sharedAccordionName);
          InventorySearchAndFilter.verifyAccordionByNameExpanded(testData.sharedAccordionName);
          InventorySearchAndFilter.verifyCheckboxInAccordion(
            testData.sharedAccordionName,
            'Yes',
            true,
          );
          InventorySearchAndFilter.verifyCheckboxInAccordion(
            testData.sharedAccordionName,
            'No',
            true,
          );
        },
      );
    });
  });
});
