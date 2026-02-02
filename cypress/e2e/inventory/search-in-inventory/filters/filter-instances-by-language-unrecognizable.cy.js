import { Permissions } from '../../../../support/dictionary';
import InventorySearchAndFilter from '../../../../support/fragments/inventory/inventorySearchAndFilter';
import Users from '../../../../support/fragments/users/users';
import TopMenu from '../../../../support/fragments/topMenu';
import getRandomPostfix from '../../../../support/utils/stringTools';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';

describe('Inventory', () => {
  describe('Search in Inventory', () => {
    describe('Filters', () => {
      const randomPostfix = getRandomPostfix();
      const testData = {
        instancesTitlePrefix: `AT_C813007_FolioInstance_${randomPostfix}`,
        languageAccordionName: 'Language',
        emptyLanguageCode: '',
        nonExistentLanguageCode: 'absolutely not an existing language',
        undeterminedLanguageOption: 'Undetermined',
      };
      const languageCodes = [testData.emptyLanguageCode, testData.nonExistentLanguageCode];
      const instanceTitles = Array.from(
        { length: languageCodes.length },
        (_, i) => `${testData.instancesTitlePrefix}_${i}`,
      );
      const createdRecordIDs = [];
      let user;

      before('Create user, test data', () => {
        cy.getAdminToken();
        cy.createTempUser([Permissions.inventoryAll.gui])
          .then((createdUserProperties) => {
            user = createdUserProperties;
            cy.getInstanceTypes({ limit: 1 }).then((types) => {
              const instanceTypeId = types[0].id;
              languageCodes.forEach((code, i) => {
                InventoryInstances.createFolioInstanceViaApi({
                  instance: {
                    instanceTypeId,
                    title: instanceTitles[i],
                    languages: [code],
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
        'C813007 Filter "Instance" records which has an empty or unrecognizable "language" field by "Language" filter/facet (spitfire)',
        { tags: ['extendedPath', 'spitfire', 'C813007'] },
        () => {
          InventorySearchAndFilter.executeSearch(testData.instancesTitlePrefix);
          InventorySearchAndFilter.verifyResultListExists();

          InventorySearchAndFilter.toggleAccordionByName(testData.languageAccordionName);
          InventorySearchAndFilter.verifyOptionAvailableMultiselect(
            testData.languageAccordionName,
            testData.undeterminedLanguageOption,
          );
          InventorySearchAndFilter.verifyMultiSelectFilterNumberOfOptions(
            testData.languageAccordionName,
            2,
          );

          languageCodes.forEach((_, i) => {
            InventorySearchAndFilter.verifySearchResult(instanceTitles[i]);
          });
          InventorySearchAndFilter.verifyNumberOfSearchResults(languageCodes.length);

          InventorySearchAndFilter.selectMultiSelectFilterOptionByIndex(
            testData.languageAccordionName,
            0,
          );
          InventorySearchAndFilter.verifyNumberOfSearchResults(1);
          InventoryInstance.waitLoading();
          InventoryInstance.verifyInstanceLanguage(testData.undeterminedLanguageOption);
          InventorySearchAndFilter.closeInstanceDetailPane();

          InventorySearchAndFilter.selectMultiSelectFilterOptionByIndex(
            testData.languageAccordionName,
            0,
          );
          InventorySearchAndFilter.verifyNumberOfSearchResults(2);
          InventorySearchAndFilter.selectMultiSelectFilterOptionByIndex(
            testData.languageAccordionName,
            1,
          );
          InventorySearchAndFilter.verifyNumberOfSearchResults(1);
          InventoryInstance.waitLoading();
          InventoryInstance.verifyInstanceLanguage(testData.undeterminedLanguageOption);
        },
      );
    });
  });
});
