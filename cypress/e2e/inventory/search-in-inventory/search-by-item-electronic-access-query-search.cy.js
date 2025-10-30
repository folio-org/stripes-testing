import { Permissions } from '../../../support/dictionary';
import InventoryInstances, {
  searchInstancesOptions,
} from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix, { getRandomLetters } from '../../../support/utils/stringTools';
import UrlRelationship from '../../../support/fragments/settings/inventory/instance-holdings-item/urlRelationship';
import { ITEM_STATUS_NAMES } from '../../../support/constants';

describe('Inventory', () => {
  describe('Search in Inventory', () => {
    const randomPostfix = getRandomPostfix();
    const randomLetters = getRandomLetters(10);
    const instanceTitlePrefix = `AT_C740227_FolioInstance_${randomPostfix}`;
    const notePrefix = `AT_C740227_Note_${randomPostfix}`;
    const materialsSpecPrefix = `AT_C740227_MaterialsSpec_${randomPostfix}`;
    const uri = `http://testC740227${randomLetters}.com/`;
    const linkText = `AT_C740227_LinkText_${randomPostfix}`;
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
    let loanTypeId;
    let materialTypeId;
    let user;

    before('Create test data and login', () => {
      cy.getAdminToken();
      InventoryInstances.deleteFullInstancesByTitleViaApi('AT_C740227_FolioInstance');

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
        cy.getLoanTypes({ limit: 1, query: 'name<>"AT_*"' }).then((res) => {
          loanTypeId = res[0].id;
        });
        cy.getMaterialTypes({ limit: 1, query: 'source="folio"' }).then((res) => {
          materialTypeId = res.id;
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
                },
              ],
              items: [
                {
                  status: { name: ITEM_STATUS_NAMES.AVAILABLE },
                  permanentLoanType: { id: loanTypeId },
                  materialType: { id: materialTypeId },
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
      'C740227 Search for Items by "Electronic access" field using "Query search" option (spitfire)',
      { tags: ['extendedPath', 'spitfire', 'C740227'] },
      () => {
        const searchData = [
          { query: `item.electronicAccess = "${linkText}"`, foundInstanceIndexes: [1, 2] },
          { query: `item.electronicAccess = "${uri}"`, foundInstanceIndexes: [1, 2] },
          { query: `item.electronicAccess = "${materialsSpecPrefix} 1"`, foundInstanceIndexes: [] },
          { query: `item.electronicAccess = "${notePrefix}"`, foundInstanceIndexes: [1, 2] },
          {
            query: `item.electronicAccess = "${electronicAccessData[0].relationShip.name}"`,
            foundInstanceIndexes: [],
          },
          {
            query: `item.electronicAccess.uri = "${uri}" and item.electronicAccess.relationshipId="${electronicAccessData[0].relationShip.id}"`,
            foundInstanceIndexes: [1],
          },
          {
            query: `item.electronicAccess.uri = "${uri}" and item.electronicAccess.relationshipId="${electronicAccessData[1].relationShip.id}"`,
            foundInstanceIndexes: [2],
          },
        ];

        InventorySearchAndFilter.switchToItem();
        InventorySearchAndFilter.itemTabIsDefault();
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
