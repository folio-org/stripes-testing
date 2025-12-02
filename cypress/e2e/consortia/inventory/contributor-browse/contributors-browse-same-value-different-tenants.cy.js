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
import BrowseCallNumber from '../../../../support/fragments/inventory/search/browseCallNumber';

describe('Inventory', () => {
  describe('Contributors Browse', () => {
    describe('Consortia', () => {
      const randomPostfix = getRandomPostfix();
      const testData = {
        instanceTitlePrefix: `AT_C402366_FolioInstance_${randomPostfix}`,
        searchOption: searchInstancesOptions[1],
        contributorValue: `AT_C402366_Contributor_${randomPostfix}`,
        contributorValueAlt: `AT_C402366_Contrib_Alt_${randomPostfix}`,
        contributorNameTypeName: 'Personal name',
        contributorNameTypeNameAlt: 'Corporate name',
        sharedAccordionName: 'Shared',
      };
      const instances = [
        {
          title: `${testData.instanceTitlePrefix}_Shared_Folio`,
          tenantId: Affiliations.Consortia,
          contributorType: 'Actor',
        },
        {
          title: `${testData.instanceTitlePrefix}_Shared_Marc`,
          tenantId: Affiliations.Consortia,
          contributorType: 'Author',
        },
        {
          title: `${testData.instanceTitlePrefix}_LocalM1_Folio`,
          tenantId: Affiliations.College,
          contributorType: 'Collector',
        },
        {
          title: `${testData.instanceTitlePrefix}_LocalM1_Marc`,
          tenantId: Affiliations.College,
          contributorType: 'Reporter',
        },
        {
          title: `${testData.instanceTitlePrefix}_LocalM2_Folio`,
          tenantId: Affiliations.University,
          contributorType: 'Libelant',
        },
        {
          title: `${testData.instanceTitlePrefix}_LocalM2_Marc`,
          tenantId: Affiliations.University,
          contributorType: 'Bookseller',
        },
      ];
      const sharedInstances = instances.filter((inst) => inst.title.includes('Shared'));
      const localM1Instances = instances.filter((inst) => inst.title.includes('LocalM1'));
      let user;

      before('Create test data', () => {
        cy.resetTenant();
        cy.getAdminToken();
        InventoryInstances.deleteInstanceByTitleViaApi('AT_C402366');
        cy.setTenant(Affiliations.College);
        InventoryInstances.deleteInstanceByTitleViaApi('AT_C402366');
        cy.setTenant(Affiliations.University);
        InventoryInstances.deleteInstanceByTitleViaApi('AT_C402366');
        cy.resetTenant();

        cy.then(() => {
          cy.getInstanceTypes({ limit: 1, query: 'source=rdacontent' }).then((instanceTypes) => {
            BrowseContributors.getContributorNameTypes({ searchParams: { limit: 100 } }).then(
              (contributorNameTypes) => {
                BrowseContributors.getContributorTypes({
                  searchParams: { limit: 200, query: 'source<>local' },
                }).then((contributorTypes) => {
                  // Instance with "Corporate name" contributor name type to check non-exact match
                  InventoryInstances.createFolioInstanceViaApi({
                    instance: {
                      instanceTypeId: instanceTypes[0].id,
                      title: `${testData.instanceTitlePrefix}_Shared_CorporateName`,
                      contributors: [
                        {
                          name: testData.contributorValueAlt,
                          contributorNameTypeId: contributorNameTypes.find(
                            (type) => type.name === testData.contributorNameTypeNameAlt,
                          ).id,
                          contributorTypeText: '',
                          primary: false,
                        },
                      ],
                    },
                  });

                  instances.forEach((instance) => {
                    cy.setTenant(instance.tenantId);
                    if (!instance.title.includes('Marc')) {
                      const contributorNameTypeId = contributorNameTypes.find(
                        (type) => type.name === testData.contributorNameTypeName,
                      ).id;
                      const contributorTypeId = contributorTypes.find(
                        (type) => type.name === instance.contributorType,
                      ).id;
                      InventoryInstances.createFolioInstanceViaApi({
                        instance: {
                          instanceTypeId: instanceTypes[0].id,
                          title: instance.title,
                          contributors: [
                            {
                              name: testData.contributorValue,
                              contributorNameTypeId,
                              contributorTypeId,
                              contributorTypeText: '',
                              primary: false,
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
                          tag: '700',
                          content: `$a ${testData.contributorValue} $e ${instance.contributorType}`,
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
              },
            );
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
        InventoryInstances.deleteInstanceByTitleViaApi('AT_C402366');
        cy.setTenant(Affiliations.College);
        InventoryInstances.deleteInstanceByTitleViaApi('AT_C402366');
        cy.setTenant(Affiliations.University);
        InventoryInstances.deleteInstanceByTitleViaApi('AT_C402366');
      });

      it(
        'C402366 Apply "Shared" facet when Browse for same contributor existing in different tenants (exact match) (consortia) (spitfire)',
        { tags: ['extendedPathECS', 'spitfire', 'C402366'] },
        () => {
          cy.resetTenant();
          cy.login(user.username, user.password);
          ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
          cy.visit(TopMenu.inventoryPath);
          InventoryInstances.waitContentLoading();
          InventorySearchAndFilter.switchToBrowseTab();
          InventorySearchAndFilter.verifyKeywordsAsDefault();
          BrowseContributors.select();

          cy.setTenant(Affiliations.College);
          BrowseContributors.waitForContributorToAppear(testData.contributorValue);

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

          BrowseContributors.browse(testData.contributorValue);
          BrowseContributors.checkSearchResultRecord(testData.contributorValue);
          BrowseSubjects.verifyNumberOfTitlesForRowWithValueAndNoAuthorityIcon(
            testData.contributorValue,
            [...sharedInstances, ...localM1Instances].length,
          );
          BrowseCallNumber.checkValuePresentForRow(
            testData.contributorValue,
            1,
            testData.contributorNameTypeName,
          );
          [...sharedInstances, ...localM1Instances].forEach((instance) => {
            BrowseContributors.checkValueIncludedForRow(
              testData.contributorValue,
              2,
              instance.contributorType,
            );
          });
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

          BrowseContributors.openRecord(testData.contributorValue);
          sharedInstances.forEach((instance) => {
            InventoryInstance.verifySharedIconByTitle(instance.title);
          });
          localM1Instances.forEach((instance) => {
            InventorySearchAndFilter.verifySearchResult(instance.title);
          });
          InventorySearchAndFilter.checkRowsCount([...sharedInstances, ...localM1Instances].length);

          InventorySearchAndFilter.switchToBrowseTab();
          BrowseContributors.checkSearchResultRecord(testData.contributorValue);
          BrowseSubjects.verifyNumberOfTitlesForRowWithValueAndNoAuthorityIcon(
            testData.contributorValue,
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

          BrowseContributors.checkSearchResultRecord(testData.contributorValue);
          BrowseSubjects.verifyNumberOfTitlesForRowWithValueAndNoAuthorityIcon(
            testData.contributorValue,
            localM1Instances.length,
          );
          BrowseCallNumber.checkValuePresentForRow(
            testData.contributorValue,
            1,
            testData.contributorNameTypeName,
          );
          localM1Instances.forEach((instance) => {
            BrowseContributors.checkValueIncludedForRow(
              testData.contributorValue,
              2,
              instance.contributorType,
            );
          });

          BrowseContributors.openRecord(testData.contributorValue);
          localM1Instances.forEach((instance) => {
            InventorySearchAndFilter.verifySearchResult(instance.title);
          });
          InventorySearchAndFilter.checkRowsCount(localM1Instances.length);

          InventorySearchAndFilter.switchToBrowseTab();
          BrowseContributors.checkSearchResultRecord(testData.contributorValue);
          BrowseSubjects.verifyNumberOfTitlesForRowWithValueAndNoAuthorityIcon(
            testData.contributorValue,
            localM1Instances.length,
          );

          InventorySearchAndFilter.clickAccordionByName(testData.sharedAccordionName);
          InventorySearchAndFilter.verifyAccordionByNameExpanded(testData.sharedAccordionName);
          InventorySearchAndFilter.selectOptionInExpandedFilter(
            testData.sharedAccordionName,
            'No',
            false,
          );
          BrowseContributors.checkSearchResultRecord(testData.contributorValue);
          BrowseSubjects.verifyNumberOfTitlesForRowWithValueAndNoAuthorityIcon(
            testData.contributorValue,
            [...sharedInstances, ...localM1Instances].length,
          );
          BrowseCallNumber.checkValuePresentForRow(
            testData.contributorValue,
            1,
            testData.contributorNameTypeName,
          );
          [...sharedInstances, ...localM1Instances].forEach((instance) => {
            BrowseContributors.checkValueIncludedForRow(
              testData.contributorValue,
              2,
              instance.contributorType,
            );
          });

          InventorySearchAndFilter.selectOptionInExpandedFilter(
            testData.sharedAccordionName,
            'Yes',
          );
          BrowseContributors.checkSearchResultRecord(testData.contributorValue);
          BrowseSubjects.verifyNumberOfTitlesForRowWithValueAndNoAuthorityIcon(
            testData.contributorValue,
            sharedInstances.length,
          );
          BrowseCallNumber.checkValuePresentForRow(
            testData.contributorValue,
            1,
            testData.contributorNameTypeName,
          );
          sharedInstances.forEach((instance) => {
            BrowseContributors.checkValueIncludedForRow(
              testData.contributorValue,
              2,
              instance.contributorType,
            );
          });
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

          BrowseContributors.openRecord(testData.contributorValue);
          sharedInstances.forEach((instance) => {
            InventoryInstance.verifySharedIconByTitle(instance.title);
          });
          InventorySearchAndFilter.checkRowsCount(sharedInstances.length);

          InventorySearchAndFilter.switchToBrowseTab();
          BrowseContributors.checkSearchResultRecord(testData.contributorValue);
          BrowseSubjects.verifyNumberOfTitlesForRowWithValueAndNoAuthorityIcon(
            testData.contributorValue,
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
          BrowseContributors.checkSearchResultRecord(testData.contributorValue);
          BrowseSubjects.verifyNumberOfTitlesForRowWithValueAndNoAuthorityIcon(
            testData.contributorValue,
            [...sharedInstances, ...localM1Instances].length,
          );
          BrowseCallNumber.checkValuePresentForRow(
            testData.contributorValue,
            1,
            testData.contributorNameTypeName,
          );
          [...sharedInstances, ...localM1Instances].forEach((instance) => {
            BrowseContributors.checkValueIncludedForRow(
              testData.contributorValue,
              2,
              instance.contributorType,
            );
          });
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

          BrowseContributors.openRecord(testData.contributorValue);
          sharedInstances.forEach((instance) => {
            InventoryInstance.verifySharedIconByTitle(instance.title);
          });
          localM1Instances.forEach((instance) => {
            InventorySearchAndFilter.verifySearchResult(instance.title);
          });
          InventorySearchAndFilter.checkRowsCount([...sharedInstances, ...localM1Instances].length);

          InventorySearchAndFilter.switchToBrowseTab();
          BrowseContributors.checkSearchResultRecord(testData.contributorValue);
          BrowseSubjects.verifyNumberOfTitlesForRowWithValueAndNoAuthorityIcon(
            testData.contributorValue,
            [...sharedInstances, ...localM1Instances].length,
          );
          BrowseCallNumber.checkValuePresentForRow(
            testData.contributorValue,
            1,
            testData.contributorNameTypeName,
          );
          [...sharedInstances, ...localM1Instances].forEach((instance) => {
            BrowseContributors.checkValueIncludedForRow(
              testData.contributorValue,
              2,
              instance.contributorType,
            );
          });
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

          BrowseContributors.expandNameTypeSection();
          BrowseContributors.expandNameTypeMenu();
          BrowseContributors.selectNameTypeOption(testData.contributorNameTypeNameAlt);
          BrowseContributors.checkNonExactMatchPlaceholder(testData.contributorValue);
        },
      );
    });
  });
});
