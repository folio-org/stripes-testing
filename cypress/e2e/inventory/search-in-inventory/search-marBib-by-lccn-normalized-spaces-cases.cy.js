import Permissions from '../../../support/dictionary/permissions';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import QuickMarcEditor from '../../../support/fragments/quickMarcEditor';
import getRandomPostfix, { randomFourDigitNumber } from '../../../support/utils/stringTools';

describe('Inventory', () => {
  describe('Search in Inventory', () => {
    const randomPostfix = getRandomPostfix();
    const randomDigits = randomFourDigitNumber();
    const lccnDigits = `442798${randomDigits}${randomDigits}`;
    const lccnPrefix = 'n';
    const lccnSearchOption = 'LCCN, normalized';
    const queries = [
      `${lccnPrefix}${lccnDigits}`,
      `${lccnPrefix.toUpperCase()}${lccnDigits}`,
      `${lccnPrefix} ${lccnDigits}`,
      `${lccnPrefix.toUpperCase()} ${lccnDigits}`,
      `  ${lccnPrefix}  ${lccnDigits}  `,
      `  ${lccnPrefix.toUpperCase()}  ${lccnDigits}  `,
    ];
    const lccnValues = [
      `${lccnPrefix.toUpperCase()} ${lccnDigits}`,
      `${lccnPrefix.toUpperCase()}  ${lccnDigits}`,
      ` ${lccnPrefix.toUpperCase()}${lccnDigits}`,
      `  ${lccnPrefix.toUpperCase()}${lccnDigits}`,
      ` ${lccnPrefix.toUpperCase()}  ${lccnDigits}  `,
      `${lccnPrefix.toUpperCase()}${lccnDigits}`,
      `${lccnPrefix} ${lccnDigits}`,
      `${lccnPrefix}  ${lccnDigits}`,
      ` ${lccnPrefix}${lccnDigits}`,
      `  ${lccnPrefix}${lccnDigits}`,
      ` ${lccnPrefix}  ${lccnDigits}  `,
      `${lccnPrefix}${lccnDigits}`,
    ];
    const tags = {
      tag008: '008',
      tag010: '010',
      tag245: '245',
    };

    const instanceTitlePrefix = `AT_C442798_MarcBibInstance_${randomPostfix}`;
    const createdInstanceIds = [];
    let user;

    before(() => {
      cy.getAdminToken();
      InventoryInstances.deleteInstanceByTitleViaApi('AT_C442798_MarcBibInstance');

      cy.createTempUser([Permissions.inventoryAll.gui]).then((userProperties) => {
        user = userProperties;

        lccnValues.forEach((lccnValue, index) => {
          cy.createMarcBibliographicViaAPI(QuickMarcEditor.defaultValidLdr, [
            {
              tag: tags.tag008,
              content: QuickMarcEditor.defaultValid008Values,
            },
            {
              tag: tags.tag010,
              content: `$a${lccnValue}`,
              indicators: ['\\', '\\'],
            },
            {
              tag: tags.tag245,
              content: `$a ${instanceTitlePrefix}_${index}`,
              indicators: ['1', '1'],
            },
          ]).then((instanceId) => {
            createdInstanceIds.push(instanceId);
          });
        });
      });
    });

    after(() => {
      cy.getAdminToken();
      Users.deleteViaApi(user.userId);
      createdInstanceIds.forEach((instanceId) => {
        InventoryInstance.deleteInstanceViaApi(instanceId);
      });
    });

    it(
      'C442798 Search for "MARC bibliographic" by "LCCN, normalized" option using a query with lower, UPPER case when "LCCN" (010 $a) has (leading, internal, trailing) spaces. (spitfire)',
      { tags: ['extendedPath', 'spitfire', 'C442798'] },
      () => {
        cy.login(user.username, user.password, {
          path: TopMenu.inventoryPath,
          waiter: InventoryInstances.waitContentLoading,
        });
        queries.forEach((query) => {
          InventorySearchAndFilter.selectSearchOption(lccnSearchOption);
          InventorySearchAndFilter.executeSearch(query);

          lccnValues.forEach((_, index) => {
            InventorySearchAndFilter.verifySearchResult(`${instanceTitlePrefix}_${index}`);
          });

          InventorySearchAndFilter.resetAllAndVerifyNoResultsAppear();
        });
      },
    );
  });
});
