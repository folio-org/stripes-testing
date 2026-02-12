import Permissions from '../../../support/dictionary/permissions';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';
import { ADVANCED_SEARCH_MODIFIERS } from '../../../support/constants';

describe('Inventory', () => {
  describe('Advanced search', () => {
    const randomPostfix = getRandomPostfix();
    const instanceTitlePrefix = `AT_C409421_FolioInstance_${randomPostfix}`;
    const advSearchOption = 'Advanced search';
    const keywordAdvSearchOption = 'Keyword (title, contributor, identifier)';
    const subjectAdvSearchOption = 'Subject';
    const resourceTypeAccordionName = 'Resource type';
    const languageAccordionName = 'Language';
    const instanceTitles = [
      `${instanceTitlePrefix}_First_Instance`,
      `${instanceTitlePrefix}_Second_Instance`,
    ];
    const languages = ['jpn', 'eng'];
    const languageNames = ['Japanese', 'English'];
    const subjectValue = `AT_C409421_Subject_${randomPostfix}`;

    const resourceTypes = [];
    const instanceIds = [];
    let user;

    before('Creating data', () => {
      cy.getAdminToken()
        .then(() => {
          InventoryInstances.deleteInstanceByTitleViaApi('C409421');
          cy.getInstanceTypes({ limit: 2, query: 'source=rdacontent' }).then((instanceTypes) => {
            resourceTypes.push(...instanceTypes);
          });
        })
        .then(() => {
          // create the first instance
          InventoryInstances.createFolioInstanceViaApi({
            instance: {
              instanceTypeId: resourceTypes[0].id,
              title: instanceTitles[0],
              languages: [languages[0]],
            },
          }).then((createdInstance) => {
            instanceIds.push(createdInstance.instanceId);
          });
          // create the second instance
          InventoryInstances.createFolioInstanceViaApi({
            instance: {
              instanceTypeId: resourceTypes[1].id,
              title: instanceTitles[1],
              languages: [languages[1]],
              subjects: [{ value: subjectValue }],
            },
          }).then((createdInstance) => {
            instanceIds.push(createdInstance.instanceId);
          });
        });

      cy.createTempUser([Permissions.inventoryAll.gui]).then((userProperties) => {
        user = userProperties;
        cy.login(user.username, user.password, {
          path: TopMenu.inventoryPath,
          waiter: InventoryInstances.waitContentLoading,
        });
      });
    });

    after('Deleting data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(user.userId);
      instanceIds.forEach((id) => {
        InventoryInstance.deleteInstanceViaApi(id);
      });
    });

    it(
      'C409421 Search Instances using advanced search in combination with search facets (spitfire)',
      { tags: ['extendedPath', 'spitfire', 'C409421'] },
      () => {
        InventoryInstances.clickAdvSearchButton();
        InventoryInstances.fillAdvSearchRow(
          0,
          `${instanceTitlePrefix}_First`,
          ADVANCED_SEARCH_MODIFIERS.STARTS_WITH,
          keywordAdvSearchOption,
        );
        InventoryInstances.checkAdvSearchModalValues(
          0,
          `${instanceTitlePrefix}_First`,
          ADVANCED_SEARCH_MODIFIERS.STARTS_WITH,
          keywordAdvSearchOption,
        );
        InventoryInstances.fillAdvSearchRow(
          1,
          subjectValue,
          ADVANCED_SEARCH_MODIFIERS.EXACT_PHRASE,
          subjectAdvSearchOption,
          'OR',
        );
        InventoryInstances.checkAdvSearchModalValues(
          1,
          subjectValue,
          ADVANCED_SEARCH_MODIFIERS.EXACT_PHRASE,
          subjectAdvSearchOption,
          'OR',
        );
        InventoryInstances.clickSearchBtnInAdvSearchModal();
        InventoryInstances.checkAdvSearchModalAbsence();
        cy.ifConsortia(true, () => {
          InventorySearchAndFilter.byShared('No');
        });
        InventoryInstances.verifySelectedSearchOption(advSearchOption);
        instanceTitles.forEach((title) => {
          InventorySearchAndFilter.verifySearchResult(title);
        });
        InventorySearchAndFilter.verifyNumberOfSearchResults(instanceTitles.length);

        InventorySearchAndFilter.toggleAccordionByName(resourceTypeAccordionName);
        resourceTypes.forEach((type) => {
          InventorySearchAndFilter.verifyOptionAvailableMultiselect(
            resourceTypeAccordionName,
            type.name,
          );
        });
        InventorySearchAndFilter.selectMultiSelectFilterOption(
          resourceTypeAccordionName,
          resourceTypes[1].name,
        );
        InventorySearchAndFilter.verifyNumberOfSearchResults(1);
        InventorySearchAndFilter.verifySearchResult(instanceTitles[1]);

        InventorySearchAndFilter.selectMultiSelectFilterOption(
          resourceTypeAccordionName,
          resourceTypes[0].name,
        );
        InventorySearchAndFilter.verifyNumberOfSearchResults(instanceTitles.length);
        instanceTitles.forEach((title) => {
          InventorySearchAndFilter.verifySearchResult(title);
        });

        InventorySearchAndFilter.toggleAccordionByName(languageAccordionName);
        InventorySearchAndFilter.selectMultiSelectFilterOption(
          languageAccordionName,
          languageNames[0],
        );
        InventorySearchAndFilter.verifyNumberOfSearchResults(1);
        InventorySearchAndFilter.verifySearchResult(instanceTitles[0]);
      },
    );
  });
});
