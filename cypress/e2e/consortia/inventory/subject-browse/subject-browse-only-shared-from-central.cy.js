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

describe('Inventory', () => {
  describe('Subject Browse', () => {
    describe('Consortia', () => {
      const randomPostfix = getRandomPostfix();
      const testData = {
        instanceTitlePrefix: `AT_C410757_Instance_${randomPostfix}`,
        searchOption: searchInstancesOptions[1],
        subjectPrefix: `AT_C410757_Subject_${randomPostfix}`,
        sharedAccordionName: 'Shared',
        subjectTypeName: 'Personal name',
      };
      const instances = [
        {
          title: `${testData.instanceTitlePrefix}_Shared_Folio`,
          tenantId: Affiliations.Consortia,
          subject: `${testData.subjectPrefix}_Shared_Folio`,
        },
        {
          title: `${testData.instanceTitlePrefix}_Shared_Marc`,
          tenantId: Affiliations.Consortia,
          subject: `${testData.subjectPrefix}_Shared_Marc`,
        },
        {
          title: `${testData.instanceTitlePrefix}_LocalM1_Folio`,
          tenantId: Affiliations.College,
          subject: `${testData.subjectPrefix}_LocalM1_Folio`,
        },
        {
          title: `${testData.instanceTitlePrefix}_LocalM1_Marc`,
          tenantId: Affiliations.College,
          subject: `${testData.subjectPrefix}_LocalM1_Marc`,
        },
      ];
      const sharedInstances = instances.filter((inst) => inst.title.includes('Shared'));
      const localM1Instances = instances.filter((inst) => inst.title.includes('LocalM1'));
      let user;

      before('Create test data', () => {
        cy.resetTenant();
        cy.getAdminToken();
        InventoryInstances.deleteInstanceByTitleViaApi('AT_C410757');
        cy.setTenant(Affiliations.College);
        InventoryInstances.deleteInstanceByTitleViaApi('AT_C410757');
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
                        value: instance.subject,
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
                    content: `$a ${instance.subject}`,
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
          cy.createTempUser([Permissions.uiInventoryViewInstances.gui]).then((userProperties) => {
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
        InventoryInstances.deleteInstanceByTitleViaApi('AT_C410757');
        cy.setTenant(Affiliations.College);
        InventoryInstances.deleteInstanceByTitleViaApi('AT_C410757');
      });

      it(
        'C410757 Only subjects from "Shared" Instance records are shown in the browse result list on Central tenant (consortia) (spitfire)',
        { tags: ['extendedPathECS', 'spitfire', 'C410757'] },
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

          sharedInstances.forEach((instance) => {
            BrowseSubjects.waitForSubjectToAppear(instance.subject);
          });

          BrowseSubjects.browse(testData.subjectPrefix);
          BrowseSubjects.verifyNonExistentSearchResult(testData.subjectPrefix);
          sharedInstances.forEach((instance) => {
            BrowseSubjects.verifyNumberOfTitlesForRowWithValueAndNoAuthorityIcon(
              instance.subject,
              1,
            );
          });
          localM1Instances.forEach((instance) => {
            BrowseSubjects.checkResultIsAbsent(instance.subject);
          });

          BrowseSubjects.browse(localM1Instances[0].subject);
          BrowseSubjects.verifyNonExistentSearchResult(localM1Instances[0].subject);

          BrowseSubjects.browse(sharedInstances[0].subject);
          BrowseSubjects.checkSearchResultRecord(sharedInstances[0].subject);

          BrowseSubjects.openInstance({ name: sharedInstances[0].subject });
          InventorySearchAndFilter.verifySearchResult(sharedInstances[0].title);
          InventorySearchAndFilter.checkRowsCount(1);
          ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.central);

          InventorySearchAndFilter.switchToBrowseTab();
          InventorySearchAndFilter.validateBrowseToggleIsSelected();
          BrowseSubjects.checkSearchResultRecord(sharedInstances[0].subject);

          BrowseSubjects.openInstance({ name: sharedInstances[1].subject });
          InventorySearchAndFilter.verifySearchResult(sharedInstances[1].title);
          InventorySearchAndFilter.checkRowsCount(1);
          ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.central);
        },
      );
    });
  });
});
