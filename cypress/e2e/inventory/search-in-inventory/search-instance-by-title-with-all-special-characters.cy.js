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
    const randomDigits = `C368028${randomFourDigitNumber()}`;
    const keywordOption = searchInstancesOptions[0];
    const titleAllOption = searchInstancesOptions[2];

    const titles = [
      `AT_C368028_FolioInstance_${randomDigits} extendettest466 ~ ! @ # % ^ ( ) - _ + = { } [ ] / : ; " ' < > , . ? extendettest466`,
      `AT_C368028_FolioInstance_${randomDigits} 1960 hydrologic data ~ Mekong River ! Basin @ in Thailand # a report % by ^ Harza Engineering ( Company ) prepared - for _ Committee + for = Coordination { of Investigation } of the Lower Mekong [ River Basin ] and the Agency for International / Development : Données ; hydrologiques pour " l'année 1960, basin " [sic] du ' Mékong < en > Thaïlande : rapport / preparé par Harza Engineering Company ; pour le Comité des de coordination , des études sur le bassin du Mékong inférieur et l'Agence des Etats-Unis . pour le développment international ?`,
      `AT_C368028_FolioInstance_${randomDigits} 1960 hydrologic data, Mekong River Basin in Thailand a report by Harza Engineering Company prepared for Committee for Coordination of Investigation of the Lower Mekong River Basin and the Agency for International Development Données hydrologiques pour l'année 1960, basin [sic] du Mékong en Thaïlande rapport preparé par Harza Engineering Company pour le Comité des de coordination des études sur le bassin du Mékong inférieur et l'Agence des Etats-Unis pour le développment international.`,
    ];

    const searchTerms = [
      {
        value: `AT_C368028_FolioInstance_${randomDigits} extendettest466 ~ ! @ # % ^ ( ) - _ + = { } [ ] / : ; " ' < > , . ? extendettest466`,
        expectedInstanceIndexes: [1],
      },
      {
        value: `AT_C368028_FolioInstance_${randomDigits} 1960 hydrologic data ~ Mekong River ! Basin @ in Thailand # a report % by ^ Harza Engineering ( Company ) prepared - for _ Committee + for = Coordination { of Investigation } of the Lower Mekong [ River Basin ] and the Agency for International / Development : Données ; hydrologiques pour " l'année 1960, basin " [sic] du ' Mékong < en > Thaïlande : rapport / preparé par Harza Engineering Company ; pour le Comité des de coordination , des études sur le bassin du Mékong inférieur et l'Agence des Etats-Unis . pour le développment international ?`,
        expectedInstanceIndexes: [2, 3],
      },
      {
        value: `AT_C368028_FolioInstance_${randomDigits} 1960 hydrologic data, Mekong River Basin in Thailand a report by Harza Engineering Company prepared for Committee for Coordination of Investigation of the Lower Mekong River Basin and the Agency for International Development Données hydrologiques pour l'année 1960, basin [sic] du Mékong en Thaïlande rapport preparé par Harza Engineering Company pour le Comité des de coordination des études sur le bassin du Mékong inférieur et l'Agence des Etats-Unis pour le développment international.`,
        expectedInstanceIndexes: [2, 3],
      },
    ];

    const instances = titles.map((title) => ({
      title,
    }));

    let instanceTypeId;
    let user;

    before('Create test data', () => {
      cy.getAdminToken();
      InventoryInstances.deleteInstanceByTitleViaApi('AT_C368028_FolioInstance');

      cy.then(() => {
        // Get required instance metadata
        cy.getInstanceTypes({ limit: 1, query: 'source=rdacontent' }).then((instanceTypes) => {
          instanceTypeId = instanceTypes[0].id;
        });
      }).then(() => {
        // Create all instances
        instances.forEach((instance) => {
          cy.createInstance({
            instance: {
              instanceTypeId,
              title: instance.title,
              languages: ['eng'],
            },
          }).then((instanceId) => {
            instance.id = instanceId;
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
      instances.forEach((instance) => {
        InventoryInstance.deleteInstanceViaApi(instance.id);
      });
    });

    it(
      'C368028 Search for "Instance" by "Title" field with all possible special characters using "Keyword", "Title (all)" search options',
      { tags: ['extendedPath', 'spitfire', 'C368028'] },
      () => {
        // Ensure we're on the Instance tab with Keyword search selected
        InventorySearchAndFilter.instanceTabIsDefault();
        InventorySearchAndFilter.verifyDefaultSearchOptionSelected(keywordOption);

        searchTerms.forEach((term) => {
          if (term.expectedInstanceIndexes.length) {
            InventoryInstances.searchByTitle(term.value);
            InventorySearchAndFilter.checkRowsCount(term.expectedInstanceIndexes.length);
            term.expectedInstanceIndexes.forEach((index) => {
              InventorySearchAndFilter.verifyInstanceDisplayed(instances[index - 1].title);
            });
          } else {
            InventoryInstances.searchByTitle(term.value, false);
            InventorySearchAndFilter.verifyResultPaneEmpty();
          }
          InventorySearchAndFilter.clearSearchInputField();
          InventorySearchAndFilter.verifyResultPaneEmpty();
        });

        InventorySearchAndFilter.selectSearchOption(titleAllOption);

        searchTerms.forEach((term) => {
          if (term.expectedInstanceIndexes.length) {
            InventoryInstances.searchByTitle(term.value);
            InventorySearchAndFilter.checkRowsCount(term.expectedInstanceIndexes.length);
            term.expectedInstanceIndexes.forEach((index) => {
              InventorySearchAndFilter.verifyInstanceDisplayed(instances[index - 1].title);
            });
          } else {
            InventoryInstances.searchByTitle(term.value, false);
            InventorySearchAndFilter.verifyResultPaneEmpty();
          }
          InventorySearchAndFilter.clearSearchInputField();
          InventorySearchAndFilter.verifyResultPaneEmpty();
        });
      },
    );
  });
});
