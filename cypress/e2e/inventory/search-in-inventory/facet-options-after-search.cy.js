import { ITEM_STATUS_NAMES, APPLICATION_NAMES } from '../../../support/constants';
import Permissions from '../../../support/dictionary/permissions';
import InventoryHoldings from '../../../support/fragments/inventory/holdings/inventoryHoldings';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';

const randomPostfix = getRandomPostfix();
const testData = {
  instanceTitle: `AT_C515007_FolioInstance_${randomPostfix}`,
  instanceLanguage: 'eng',
  instanceSubject: `AT_C515007_Subject_${randomPostfix}`,
  searchQuery: '*',
  browseQuery: 'a',
};
const facets = {
  EFFECTIVE_LOCATION: 'Effective location (item)',
  LANGUAGE: 'Language',
  SOURCE: 'Source',
  MATERIAL_TYPE: 'Material type',
  SUBJECT_TYPE: 'Subject type',
};
let userId;

describe('Inventory', () => {
  describe('Search in Inventory', () => {
    before('Create data, user', () => {
      cy.createTempUser([Permissions.inventoryAll.gui]).then((userProperties) => {
        userId = userProperties.userId;

        cy.getAdminToken()
          .then(() => {
            cy.getMaterialTypes({ limit: 1, query: 'source="folio"' }).then((res) => {
              testData.materialType = res.id;
            });
            cy.getLocations({ limit: 1, query: 'name<>"AT_*"' }).then((res) => {
              testData.location = res.id;
            });
            cy.getHoldingTypes({ limit: 1 }).then((res) => {
              testData.holdingType = res[0].id;
            });
            InventoryHoldings.getHoldingsFolioSource().then((res) => {
              testData.holdingSource = res.id;
            });
            cy.getInstanceTypes({ limit: 1, query: 'source="rdacontent"' }).then((res) => {
              testData.instanceType = res[0].id;
            });
            cy.getLoanTypes({ limit: 1, query: 'name<>"AT_*"' }).then((res) => {
              testData.loanType = res[0].id;
            });
            cy.getSubjectTypesViaApi({ limit: 1, query: 'source="folio"' }).then((res) => {
              testData.subjectType = res[0].id;
            });
          })
          .then(() => {
            cy.createInstance({
              instance: {
                instanceTypeId: testData.instanceType,
                title: testData.instanceTitle,
                languages: [testData.instanceLanguage],
                subjects: [
                  {
                    value: testData.instanceSubject,
                    typeId: testData.subjectType,
                  },
                ],
              },
              holdings: [
                {
                  holdingsTypeId: testData.holdingType,
                  permanentLocationId: testData.location,
                  sourceId: testData.holdingSource,
                },
              ],
              items: [
                [
                  {
                    status: { name: ITEM_STATUS_NAMES.AVAILABLE },
                    permanentLoanType: { id: testData.loanType },
                    materialType: { id: testData.materialType },
                  },
                ],
              ],
            });

            cy.login(userProperties.username, userProperties.password);
            TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
          });
      });
    });

    after('Delete all data', () => {
      cy.getAdminToken();
      InventoryInstances.deleteFullInstancesByTitleViaApi(testData.instanceTitle);
      Users.deleteViaApi(userId);
    });

    it(
      'C515007 Facet options display in expanded accordions when search has been performed and Instance/Holdings/Item tab is clicked (spitfire)',
      { tags: ['criticalPath', 'spitfire', 'C515007'] },
      () => {
        InventoryInstances.searchByTitle(testData.searchQuery);
        InventorySearchAndFilter.switchToInstance();
        InventorySearchAndFilter.instanceTabIsDefault();
        InventorySearchAndFilter.clickAccordionByName(facets.LANGUAGE);
        InventorySearchAndFilter.verifyAccordionByNameExpanded(facets.LANGUAGE, true);
        InventorySearchAndFilter.checkOptionsWithCountersExistInAccordion(facets.LANGUAGE);
        InventorySearchAndFilter.clickAccordionByName(facets.SOURCE);
        InventorySearchAndFilter.verifyAccordionByNameExpanded(facets.SOURCE, true);
        InventorySearchAndFilter.verifyCheckboxesWithCountersExistInAccordion(facets.SOURCE);

        InventorySearchAndFilter.switchToHoldings();
        InventorySearchAndFilter.holdingsTabIsDefault();
        InventorySearchAndFilter.checkSearchQueryText('');
        InventoryInstances.waitContentLoading();
        InventoryInstances.searchByTitle(testData.searchQuery);
        InventorySearchAndFilter.switchToHoldings();
        InventorySearchAndFilter.holdingsTabIsDefault();
        InventorySearchAndFilter.clickAccordionByName(facets.EFFECTIVE_LOCATION);
        InventorySearchAndFilter.verifyAccordionByNameExpanded(facets.EFFECTIVE_LOCATION, true);
        InventorySearchAndFilter.checkOptionsWithCountersExistInAccordion(
          facets.EFFECTIVE_LOCATION,
        );
        InventorySearchAndFilter.clickAccordionByName(facets.SOURCE);
        InventorySearchAndFilter.verifyAccordionByNameExpanded(facets.SOURCE, true);
        InventorySearchAndFilter.verifyCheckboxesWithCountersExistInAccordion(facets.SOURCE);

        InventorySearchAndFilter.switchToItem();
        InventorySearchAndFilter.itemTabIsDefault();
        InventorySearchAndFilter.checkSearchQueryText('');
        InventoryInstances.waitContentLoading();
        InventoryInstances.searchByTitle(testData.searchQuery);
        InventorySearchAndFilter.switchToItem();
        InventorySearchAndFilter.itemTabIsDefault();
        InventorySearchAndFilter.clickAccordionByName(facets.EFFECTIVE_LOCATION);
        InventorySearchAndFilter.verifyAccordionByNameExpanded(facets.EFFECTIVE_LOCATION, true);
        InventorySearchAndFilter.checkOptionsWithCountersExistInAccordion(
          facets.EFFECTIVE_LOCATION,
        );
        InventorySearchAndFilter.clickAccordionByName(facets.MATERIAL_TYPE);
        InventorySearchAndFilter.verifyAccordionByNameExpanded(facets.MATERIAL_TYPE, true);
        InventorySearchAndFilter.checkOptionsWithCountersExistInAccordion(facets.MATERIAL_TYPE);

        InventorySearchAndFilter.switchToBrowseTab();
        InventorySearchAndFilter.validateBrowseToggleIsSelected();
        InventorySearchAndFilter.verifyBrowseResultsEmptyPane();
        InventorySearchAndFilter.checkBrowseSearchInputFieldContent('');
        InventorySearchAndFilter.selectBrowseSubjects();
        InventorySearchAndFilter.browseSearch(testData.browseQuery);
        InventorySearchAndFilter.verifySubjectsResultsInBrowsePane();
        InventorySearchAndFilter.switchToBrowseTab();
        InventorySearchAndFilter.validateBrowseToggleIsSelected();
        InventorySearchAndFilter.clickAccordionByName(facets.SUBJECT_TYPE);
        InventorySearchAndFilter.verifyAccordionByNameExpanded(facets.SUBJECT_TYPE, true);
        InventorySearchAndFilter.checkOptionsWithCountersExistInAccordion(facets.SUBJECT_TYPE);
      },
    );
  });
});
