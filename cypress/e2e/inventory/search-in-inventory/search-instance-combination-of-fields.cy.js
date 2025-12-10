import Permissions from '../../../support/dictionary/permissions';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import QuickMarcEditor from '../../../support/fragments/quickMarcEditor';
import getRandomPostfix, { randomFourDigitNumber } from '../../../support/utils/stringTools';
import { including } from '../../../../interactors';

describe('Inventory', () => {
  describe('Search in Inventory', () => {
    describe('Case-insensitive checks', () => {
      const randomPostfix = getRandomPostfix();
      const randomDigits = randomFourDigitNumber();
      const randomDigitPostfix = `369044${randomDigits}${randomDigits}`;
      const queries = [
        `Of wilderness and wolves${randomDigitPostfix}`,
        `wolves${randomDigitPostfix} Foxes${randomDigitPostfix} Bur${randomDigitPostfix} oak book Sivils${randomDigitPostfix}, Matthew`,
      ];
      const instanceTitlePrefix = `AT_C369044_MarcBibInstance_${randomPostfix}`;
      let createdInstanceId;
      let user;

      before(() => {
        cy.getAdminToken();
        InventoryInstances.deleteInstanceByTitleViaApi('AT_C369044');

        cy.createTempUser([Permissions.inventoryAll.gui]).then((userProperties) => {
          user = userProperties;

          cy.createMarcBibliographicViaAPI(QuickMarcEditor.defaultValidLdr, [
            {
              tag: '008',
              content: QuickMarcEditor.defaultValid008Values,
            },
            {
              tag: '100',
              content: `$a Errington${randomDigitPostfix}, Paul L. $q (Paul Lester), $d 1902-1962, $e author.`,
              indicators: ['1', '\\'],
            },
            {
              tag: '245',
              content: `$a ${instanceTitlePrefix} Of wilderness and wolves${randomDigitPostfix} / $c by Paul L. Errington${randomDigitPostfix} ; edited and with an introduction by Matthew Wynn Sivils${randomDigitPostfix} ; illustrations by Charles W. Schwartz${randomDigitPostfix}.`,
              indicators: ['1', '1'],
            },
            {
              tag: '246',
              content: `$a Wolves${randomDigitPostfix} and Foxes${randomDigitPostfix}`,
              indicators: ['\\', '\\'],
            },
            {
              tag: '700',
              content: `$a Sivils${randomDigitPostfix}, Matthew Wynn, $d 1971- $e editor.`,
              indicators: ['1', '\\'],
            },
            {
              tag: '700',
              content: `$a Schwartz${randomDigitPostfix}, Charles Walsh, $e illustrator.`,
              indicators: ['1', '\\'],
            },
            {
              tag: '800',
              content: `$a Bur${randomDigitPostfix} oak book.`,
              indicators: ['\\', '\\'],
            },
          ]).then((instanceId) => {
            createdInstanceId = instanceId;

            cy.login(user.username, user.password, {
              path: TopMenu.inventoryPath,
              waiter: InventoryInstances.waitContentLoading,
            });
            InventorySearchAndFilter.instanceTabIsDefault();
          });
        });
      });

      after(() => {
        cy.getAdminToken();
        Users.deleteViaApi(user.userId);
        InventoryInstance.deleteInstanceViaApi(createdInstanceId);
      });

      it(
        'C369044 Search for "Instance" using combined search by fields: "Resource title", "Alternative title", "Index title", "Series statement", "Resource identifier", "Contributor name" (spitfire)',
        { tags: ['extendedPath', 'spitfire', 'C369044'] },
        () => {
          queries.forEach((query, index) => {
            if (index) InventorySearchAndFilter.resetAllAndVerifyNoResultsAppear();
            InventoryInstances.searchByTitle(query);
            InventorySearchAndFilter.verifySearchResult(including(instanceTitlePrefix));
          });
        },
      );
    });
  });
});
