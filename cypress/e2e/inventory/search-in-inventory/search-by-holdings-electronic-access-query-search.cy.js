import { Permissions } from '../../../support/dictionary';
import InventoryInstances, {
  searchInstancesOptions,
} from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix, { getRandomLetters } from '../../../support/utils/stringTools';
import UrlRelationship from '../../../support/fragments/settings/inventory/instance-holdings-item/urlRelationship';

describe('Inventory', () => {
  describe('Search in Inventory', () => {
    const randomPostfix = getRandomPostfix();
    const randomLetters = getRandomLetters(10);
    const instanceTitlePrefix = `AT_C740226_FolioInstance_${randomPostfix}`;
    const notePrefix = `AT_C740226_Note_${randomPostfix}`;
    const materialsSpecPrefix = `AT_C740226_MaterialsSpec_${randomPostfix}`;
    const uri = `http://testC740226${randomLetters}.com/`;
    const linkText = `AT_C740226_LinkText_${randomPostfix}`;
    const querySearchOption = searchInstancesOptions.at(-2);
    const electronicAccessData = [
      {
        instanceIndex: 1,
        relationShip: {},
        uri,
        linkText,
        materialsSpecification: `${materialsSpecPrefix} 1`,
        note: `${notePrefix} 1`,
      },
      {
        instanceIndex: 2,
        relationShip: {},
        uri,
        linkText,
        materialsSpecification: `${materialsSpecPrefix} 2`,
        note: `${notePrefix} 2`,
      },
    ];

    const instanceIds = [];
    let instanceTypeId;
    let holdingsTypeId;
    let permanentLocationId;
    let user;

    before('Create test data and login', () => {
      cy.getAdminToken();
      InventoryInstances.deleteFullInstancesByTitleViaApi('AT_C740226_FolioInstance');

      cy.then(() => {
        cy.getInstanceTypes({ limit: 1, query: 'source=rdacontent' }).then((instanceTypes) => {
          instanceTypeId = instanceTypes[0].id;
        });
        UrlRelationship.getViaApi({ query: 'source=="folio"' }).then((relationships) => {
          electronicAccessData[0].relationShip.id = relationships[0].id;
          electronicAccessData[0].relationShip.name = relationships[0].name;
          electronicAccessData[1].relationShip.id = relationships[1].id;
          electronicAccessData[1].relationShip.name = relationships[1].name;
        });
        cy.getHoldingTypes({ limit: 1, query: 'source=folio' }).then((holdingTypes) => {
          holdingsTypeId = holdingTypes[0].id;
        });
        cy.getLocations({
          limit: 1,
          query: '(isActive=true and name<>"AT_*" and name<>"auto*")',
        }).then((res) => {
          permanentLocationId = res.id;
        });
      })
        .then(() => {
          electronicAccessData.forEach((data) => {
            InventoryInstances.createFolioInstanceViaApi({
              instance: {
                title: `${instanceTitlePrefix} ${data.instanceIndex}`,
                instanceTypeId,
              },
              holdings: [
                {
                  holdingsTypeId,
                  permanentLocationId,
                  electronicAccess: [
                    {
                      uri: data.uri,
                      linkText: data.linkText,
                      materialsSpecification: data.materialsSpecification,
                      publicNote: data.note,
                      relationshipId: data.relationShip.id,
                    },
                  ],
                },
              ],
            }).then((instanceData) => {
              instanceIds.push(instanceData.instanceId);
            });
          });
        })
        .then(() => {
          cy.createTempUser([Permissions.uiInventoryViewInstances.gui]).then((userProperties) => {
            user = userProperties;
            cy.login(user.username, user.password, {
              path: TopMenu.inventoryPath,
              waiter: InventoryInstances.waitContentLoading,
              authRefresh: true,
            });
          });
        });
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(user.userId);
      InventoryInstances.deleteFullInstancesByTitleViaApi(instanceTitlePrefix);
    });

    it(
      'C740226 Search for Holdings by "Electronic access" field using "Query search" option (spitfire)',
      { tags: ['extendedPath', 'spitfire', 'C740226'] },
      () => {
        const searchData = [
          { query: `holdings.electronicAccess = "${linkText}"`, foundInstanceIndexes: [1, 2] },
          { query: `holdings.electronicAccess = "${uri}"`, foundInstanceIndexes: [1, 2] },
          {
            query: `holdings.electronicAccess = "${materialsSpecPrefix} 1"`,
            foundInstanceIndexes: [],
          },
          { query: `holdings.electronicAccess = "${notePrefix}"`, foundInstanceIndexes: [1, 2] },
          {
            query: `holdings.electronicAccess = "${electronicAccessData[0].relationShip.name}"`,
            foundInstanceIndexes: [],
          },
          {
            query: `holdings.electronicAccess.uri = "${uri}" and holdings.electronicAccess.relationshipId="${electronicAccessData[0].relationShip.id}"`,
            foundInstanceIndexes: [1],
          },
          {
            query: `holdings.electronicAccess.uri = "${uri}" and holdings.electronicAccess.relationshipId="${electronicAccessData[1].relationShip.id}"`,
            foundInstanceIndexes: [2],
          },
        ];

        InventorySearchAndFilter.switchToHoldings();
        InventorySearchAndFilter.holdingsTabIsDefault();
        InventorySearchAndFilter.validateSearchTabIsDefault();

        searchData.forEach((search) => {
          InventorySearchAndFilter.selectSearchOption(querySearchOption);
          InventoryInstances.verifySelectedSearchOption(querySearchOption);
          InventorySearchAndFilter.executeSearch(search.query);
          search.foundInstanceIndexes.forEach((index) => {
            InventorySearchAndFilter.verifySearchResult(`${instanceTitlePrefix} ${index}`);
            InventorySearchAndFilter.checkRowsCount(search.foundInstanceIndexes.length);
          });
          if (!search.foundInstanceIndexes.length) {
            InventorySearchAndFilter.verifyResultPaneEmpty({
              noResultsFound: true,
              searchQuery: search.query,
            });
          }
          InventorySearchAndFilter.resetAllAndVerifyNoResultsAppear();
        });
      },
    );
  });
});
