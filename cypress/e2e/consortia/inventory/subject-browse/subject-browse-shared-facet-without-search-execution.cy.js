import Permissions from '../../../../support/dictionary/permissions';
import InventoryInstances, {
  searchInstancesOptions,
} from '../../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../../support/fragments/inventory/inventorySearchAndFilter';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../support/utils/stringTools';
import BrowseSubjects from '../../../../support/fragments/inventory/search/browseSubjects';
import Affiliations, { tenantNames } from '../../../../support/dictionary/affiliations';
import ConsortiumManager from '../../../../support/fragments/settings/consortium-manager/consortium-manager';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import BrowseClassifications from '../../../../support/fragments/inventory/search/browseClassifications';

describe('Inventory', () => {
  describe('Subject Browse', () => {
    describe('Consortia', () => {
      const randomPostfix = getRandomPostfix();
      const testData = {
        instanceTitlePrefix: `AT_C402757_Instance_${randomPostfix}`,
        searchOption: searchInstancesOptions[1],
        subjectValue: `AT_C402757_Subject_${randomPostfix}`,
        sharedAccordionName: 'Shared',
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
      ];
      let user;

      before('Create test data', () => {
        cy.resetTenant();
        cy.getAdminToken();
        InventoryInstances.deleteInstanceByTitleViaApi('AT_C402757');
        cy.setTenant(Affiliations.College);
        InventoryInstances.deleteInstanceByTitleViaApi('AT_C402757');
        cy.resetTenant();

        cy.then(() => {
          cy.getInstanceTypes({ limit: 1, query: 'source=rdacontent' }).then((instanceTypes) => {
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
                        typeId: null,
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
        InventoryInstances.deleteInstanceByTitleViaApi('AT_C402757');
        cy.setTenant(Affiliations.College);
        InventoryInstances.deleteInstanceByTitleViaApi('AT_C402757');
      });

      it(
        'C402757 Apply "Shared" facet when Browse for same subject without executed search (consortia) (spitfire)',
        { tags: ['extendedPathECS', 'spitfire', 'C402757'] },
        () => {
          cy.resetTenant();
          cy.login(user.username, user.password);
          cy.waitForAuthRefresh(() => {
            ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
            cy.visit(TopMenu.inventoryPath);
            InventoryInstances.waitContentLoading();
          });
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

          InventorySearchAndFilter.selectOptionInExpandedFilter(testData.sharedAccordionName, 'No');
          BrowseSubjects.checkSearchResultsTable();
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

          InventorySearchAndFilter.selectOptionInExpandedFilter(
            testData.sharedAccordionName,
            'No',
            false,
          );
          InventorySearchAndFilter.verifyBrowseResultsEmptyPane();
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

          InventorySearchAndFilter.selectOptionInExpandedFilter(
            testData.sharedAccordionName,
            'Yes',
          );
          BrowseSubjects.checkSearchResultsTable();
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

          InventorySearchAndFilter.selectOptionInExpandedFilter(testData.sharedAccordionName, 'No');
          BrowseSubjects.checkSearchResultsTable();
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
            true,
          );

          BrowseClassifications.checkPaginationButtonsShown();
          BrowseClassifications.getNextPaginationButtonState().then((nextEnabled) => {
            BrowseClassifications.getPreviousPaginationButtonState().then((previousEnabled) => {
              if (nextEnabled || previousEnabled) {
                if (nextEnabled) BrowseSubjects.clickNextPaginationButton();
                else if (previousEnabled) BrowseSubjects.clickPreviousPaginationButton();
                cy.wait(2000);

                BrowseSubjects.checkSearchResultsTable();
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
                  true,
                );
              }
            });
          });
        },
      );
    });
  });
});
