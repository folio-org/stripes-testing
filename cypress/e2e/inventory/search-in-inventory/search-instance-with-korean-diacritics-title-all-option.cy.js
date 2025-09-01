import InventoryInstances, {
  searchInstancesOptions,
} from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import { Permissions } from '../../../support/dictionary';
import { randomFourDigitNumber } from '../../../support/utils/stringTools';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';

describe('Inventory', () => {
  describe('Search in Inventory', () => {
    const randomDigits = `C369043${randomFourDigitNumber()}${randomFourDigitNumber()}`;
    const keywordOption = searchInstancesOptions[0];
    const titleAllOption = searchInstancesOptions[2];

    const koreanTitles = [
      `${randomDigits}Pangk'ok : Kim Ki-ch'ang changp'yŏn sosŏl.`,
      `${randomDigits}Han'guk yŏnghwa 100-sŏn : yŏnghwa hakcha, p'yŏngnon'ga ka ppobŭn Han'guk yŏnghwa taep'yojak : "Ch'ŏngch'un ŭi sipcharo" esŏ "P'iet'a" kkaji / Han'guk Yŏngsang Charyowŏn p'yŏn.`,
      `${randomDigits}Han'guk yŏnghwa 100-yŏn, yŏnghwa kwanggo 100-sŏn / P'yŏnjippu yŏkkŭm.`,
    ];

    const searchTerms = [
      {
        value: `${randomDigits}Pangkok`,
        expectedTitles: [koreanTitles[0]],
      },
      {
        value: `${randomDigits}Pangk ok`,
        expectedTitles: [koreanTitles[0]],
      },
      {
        value: `${randomDigits}Pangk'ok`,
        expectedTitles: [koreanTitles[0]],
      },
      {
        value: `${randomDigits}Pangk'ok : Kim Ki-ch'ang changp'yŏn sosŏl.`,
        expectedTitles: [koreanTitles[0]],
      },
      {
        value: `${randomDigits}Han'guk yŏnghwa 100-sŏn`,
        expectedTitles: [koreanTitles[1], koreanTitles[2]],
      },
      {
        value: `${randomDigits}Hanguk yŏnghwa 100-sŏn`,
        expectedTitles: [koreanTitles[1], koreanTitles[2]],
      },
      {
        value: `${randomDigits}Han guk yŏnghwa 100-sŏn`,
        expectedTitles: [koreanTitles[1], koreanTitles[2]],
      },
      {
        value: `${randomDigits}Han'guk yŏnghwa 100-yŏn, yŏnghwa kwanggo 100-sŏn / P'yŏnjippu yŏkkŭm.`,
        expectedTitles: [koreanTitles[2]],
      },
      {
        value: `${randomDigits}Han'guk yŏnghwa 100-sŏn : yŏnghwa hakcha, p'yŏngnon'ga ka ppobŭn Han'guk yŏnghwa taep'yojak : "Ch'ŏngch'un ŭi sipcharo" esŏ "P'iet'a" kkaji / Han'guk Yŏngsang Charyowŏn p'yŏn.`,
        expectedTitles: [koreanTitles[1]],
      },
    ];

    const instanceIds = [];
    let user;

    before('Create test data', () => {
      cy.getAdminToken();
      InventoryInstances.deleteInstanceByTitleViaApi('C369043');

      // Get required instance metadata
      cy.getInstanceTypes({ limit: 1, query: 'source=rdacontent' }).then((instanceTypeData) => {
        // Create all instances with Korean diacritic titles
        koreanTitles.forEach((title) => {
          cy.createInstance({
            instance: {
              instanceTypeId: instanceTypeData[0].id,
              title,
            },
          }).then((instanceId) => {
            instanceIds.push(instanceId);
          });
        });

        cy.createTempUser([Permissions.inventoryAll.gui]).then((userProperties) => {
          user = userProperties;
          cy.login(user.username, user.password, {
            path: TopMenu.inventoryPath,
            waiter: InventorySearchAndFilter.waitLoading,
          });
        });
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(user.userId);
      instanceIds.forEach((id) => {
        InventoryInstance.deleteInstanceViaApi(id);
      });
    });

    it(
      'C369043 Search for "Instance" with "diacritic - Korean" symbol in the "Resource title" field using "Title (all)" search option (spitfire)',
      { tags: ['extendedPath', 'spitfire', 'C369043'] },
      () => {
        InventorySearchAndFilter.instanceTabIsDefault();
        InventorySearchAndFilter.verifyDefaultSearchOptionSelected(keywordOption);
        InventorySearchAndFilter.selectSearchOptions(keywordOption, searchTerms[0].value);
        InventorySearchAndFilter.checkSearchButtonEnabled();
        InventorySearchAndFilter.selectSearchOption(titleAllOption);
        InventorySearchAndFilter.verifyDefaultSearchOptionSelected(titleAllOption);
        InventorySearchAndFilter.checkSearchQueryText(searchTerms[0].value);
        InventorySearchAndFilter.checkSearchButtonEnabled();

        searchTerms.forEach((term) => {
          InventoryInstances.searchByTitle(term.value);
          InventorySearchAndFilter.checkRowsCount(term.expectedTitles.length);
          term.expectedTitles.forEach((title) => {
            InventorySearchAndFilter.verifyInstanceDisplayed(title);
          });
          InventorySearchAndFilter.clearSearchInputField();
          InventorySearchAndFilter.verifyResultPaneEmpty();
        });
      },
    );
  });
});
