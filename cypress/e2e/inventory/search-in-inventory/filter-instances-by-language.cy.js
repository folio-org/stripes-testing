import { Permissions } from '../../../support/dictionary';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import Users from '../../../support/fragments/users/users';
import TopMenu from '../../../support/fragments/topMenu';
import getRandomPostfix from '../../../support/utils/stringTools';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';

const LANGUAGES = [
  { code: 'eng', name: 'English' },
  { code: 'ita', name: 'Italian' },
  { code: 'ger', name: 'German' },
  { code: 'fre', name: 'French' },
  { code: 'spa', name: 'Spanish; Castilian' },
  { code: 'rus', name: 'Russian' },
  { code: 'chi', name: 'Chinese' },
  { code: 'jpn', name: 'Japanese' },
  { code: 'ara', name: 'Arabic' },
  { code: 'hin', name: 'Hindi' },
  { code: 'lat', name: 'Latin' },
];

describe('Inventory', () => {
  describe('Search in Inventory', () => {
    describe('Filters', () => {
      const randomPostfix = getRandomPostfix();
      const testData = {
        instancesTitlePrefix: `AT_C476719_FolioInstance_${randomPostfix}`,
        languageAccordionName: 'Language',
        selectedRecordsCount: 0,
        notFullValue: 'Castilian',
      };
      const createdRecordIDs = [];
      let user;

      before('Create user, test data', () => {
        cy.getAdminToken();
        cy.createTempUser([Permissions.inventoryAll.gui])
          .then((createdUserProperties) => {
            user = createdUserProperties;
            cy.getInstanceTypes({ limit: 1 }).then((types) => {
              const instanceTypeId = types[0].id;
              LANGUAGES.forEach((lang, i) => {
                InventoryInstances.createFolioInstanceViaApi({
                  instance: {
                    instanceTypeId,
                    title: `${testData.instancesTitlePrefix}_${lang.code}_${i}`,
                    languages: [lang.code],
                  },
                }).then((instance) => {
                  createdRecordIDs.push(instance.instanceId);
                });
              });
            });
          })
          .then(() => {
            cy.login(user.username, user.password, {
              path: TopMenu.inventoryPath,
              waiter: InventoryInstances.waitContentLoading,
              authRefresh: true,
            });
            InventorySearchAndFilter.instanceTabIsDefault();
          });
      });

      after('Delete user, test data', () => {
        cy.getAdminToken();
        createdRecordIDs.forEach((id) => {
          InventoryInstance.deleteInstanceViaApi(id);
        });
        Users.deleteViaApi(user.userId);
      });

      it(
        'C476719 Filter "Instance" records by "Language" filter/facet (spitfire)',
        { tags: ['criticalPath', 'spitfire', 'C476719'] },
        () => {
          // 1. Expand Language facet, verify options and counters
          cy.ifConsortia(true, () => {
            InventorySearchAndFilter.byShared('No');
          });
          InventorySearchAndFilter.toggleAccordionByName(testData.languageAccordionName);
          InventorySearchAndFilter.checkOptionsWithCountersExistInAccordion(
            testData.languageAccordionName,
          );

          // 2. Select a language, verify result list and counter
          cy.intercept('/search/instances*').as('getInstances1');
          InventorySearchAndFilter.selectMultiSelectFilterOption(
            testData.languageAccordionName,
            LANGUAGES[0].name,
          );
          InventorySearchAndFilter.verifyMultiSelectFilterOptionSelected(
            testData.languageAccordionName,
            LANGUAGES[0].name,
          );
          cy.wait('@getInstances1', { timeout: 10_000 }).then((instances1) => {
            InventorySearchAndFilter.verifyMultiSelectFilterOptionCount(
              testData.languageAccordionName,
              LANGUAGES[0].name,
              instances1.response.body.totalRecords,
            );
            testData.selectedRecordsCount = instances1.response.body.totalRecords;
            const recordsCount = Number(testData.selectedRecordsCount).toLocaleString('en-US'); // Format count for display
            InventoryInstances.checkSearchResultCount(`^${recordsCount} record`);
          });

          // 3. Open an instance, verify language in detail
          InventoryInstances.selectInstance(1);
          InventoryInstance.waitInventoryLoading();
          InventoryInstance.verifyInstanceLanguage(LANGUAGES[0].name);

          // 4. Select another language
          cy.intercept('/search/instances*').as('getInstances2');
          InventorySearchAndFilter.selectMultiSelectFilterOption(
            testData.languageAccordionName,
            LANGUAGES[1].name,
          );
          InventorySearchAndFilter.verifyMultiSelectFilterOptionSelected(
            testData.languageAccordionName,
            LANGUAGES[0].name,
          );
          InventorySearchAndFilter.verifyMultiSelectFilterOptionSelected(
            testData.languageAccordionName,
            LANGUAGES[1].name,
          );
          cy.wait('@getInstances2', { timeout: 10_000 });

          // 5. Open an instance, verify language
          InventoryInstances.selectInstance(1);
          InventoryInstance.waitInventoryLoading();
          InventoryInstance.verifyInstanceLanguage(LANGUAGES[0].name);

          // 6. Remove a language, verify update
          cy.intercept('/search/instances*').as('getInstances3');
          InventorySearchAndFilter.selectMultiSelectFilterOption(
            testData.languageAccordionName,
            LANGUAGES[0].name,
          );
          InventorySearchAndFilter.verifyMultiSelectFilterOptionSelected(
            testData.languageAccordionName,
            LANGUAGES[0].name,
            false,
          );
          InventorySearchAndFilter.verifyMultiSelectFilterOptionSelected(
            testData.languageAccordionName,
            LANGUAGES[1].name,
          );
          cy.wait('@getInstances3', { timeout: 10_000 }).then((instances3) => {
            InventorySearchAndFilter.verifyMultiSelectFilterOptionCount(
              testData.languageAccordionName,
              LANGUAGES[1].name,
              instances3.response.body.totalRecords,
            );
          });

          // 7. Reset filter, verify result list is empty
          InventorySearchAndFilter.clearFilter(testData.languageAccordionName);
          cy.ifConsortia(true, () => {
            InventorySearchAndFilter.clearFilter('Shared');
          });
          InventorySearchAndFilter.verifyResultPaneEmpty();

          // 8. Search all results
          cy.ifConsortia(true, () => {
            InventorySearchAndFilter.toggleAccordionByName('Shared', false);
            InventorySearchAndFilter.byShared('No');
          });
          cy.intercept('/search/instances*').as('getInstancesAll');
          InventoryInstances.searchByTitle(testData.instancesTitlePrefix);
          cy.wait('@getInstancesAll', { timeout: 10_000 });

          // 9. Select a language, verify input and results
          cy.intercept('/search/instances*').as('getInstances4');
          InventorySearchAndFilter.selectMultiSelectFilterOption(
            testData.languageAccordionName,
            LANGUAGES[2].name,
          );
          InventorySearchAndFilter.verifyMultiSelectFilterOptionSelected(
            testData.languageAccordionName,
            LANGUAGES[2].name,
          );
          cy.wait('@getInstances4', { timeout: 10_000 }).then((instances4) => {
            InventorySearchAndFilter.verifyMultiSelectFilterOptionCount(
              testData.languageAccordionName,
              LANGUAGES[2].name,
              instances4.response.body.totalRecords,
            );
          });

          // 10. Open instance, verify language
          cy.wait(1000);
          InventoryInstances.selectInstance();
          InventoryInstance.waitInventoryLoading();
          InventoryInstance.verifyInstanceLanguage(LANGUAGES[2].name);

          // 11. Type in facet, verify search
          InventorySearchAndFilter.typeValueInMultiSelectFilterFieldAndCheck(
            testData.languageAccordionName,
            LANGUAGES[10].name,
            true,
            1,
          );

          // 12. Select found value, clear input, verify results
          InventorySearchAndFilter.selectMultiSelectFilterOption(
            testData.languageAccordionName,
            LANGUAGES[10].name,
          );
          InventorySearchAndFilter.verifyMultiSelectFilterOptionSelected(
            testData.languageAccordionName,
            LANGUAGES[10].name,
          );

          // 13. Use type ahead search for one of the languages
          InventorySearchAndFilter.typeNotFullValueInMultiSelectFilterFieldAndCheck(
            testData.languageAccordionName,
            testData.notFullValue,
            LANGUAGES[4].name,
          );
        },
      );
    });
  });
});
