import { Permissions } from '../../../support/dictionary';
import InventoryInstances, {
  searchInstancesOptions,
} from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import getRandomPostfix, { getRandomLetters } from '../../../support/utils/stringTools';
import UrlRelationship from '../../../support/fragments/settings/inventory/instance-holdings-item/urlRelationship';

describe('Inventory', () => {
  describe('Search in Inventory', () => {
    const randomPostfix = getRandomPostfix();
    const randomLetters = getRandomLetters(10);
    const instanceTitlePrefix = `AT_C740223_FolioInstance_${randomPostfix}`;
    const notePrefix = `AT_C740223_Note_${randomPostfix}`;
    const materialsSpecPrefix = `AT_C740223_MaterialsSpec_${randomPostfix}`;
    const uri = `http://testC740223${randomLetters}.com/`;
    const linkText = `AT_C740223_LinkText_${randomPostfix}`;
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
    let user;

    before('Create test data and login', () => {
      cy.getAdminToken();
      InventoryInstances.deleteInstanceByTitleViaApi('AT_C740223_FolioInstance');

      cy.then(() => {
        cy.getInstanceTypes({ limit: 1, query: 'source=rdacontent' }).then((instanceTypes) => {
          UrlRelationship.getViaApi({ query: 'source=="folio"' }).then((relationships) => {
            electronicAccessData[0].relationShip.id = relationships[0].id;
            electronicAccessData[0].relationShip.name = relationships[0].name;
            electronicAccessData[1].relationShip.id = relationships[1].id;
            electronicAccessData[1].relationShip.name = relationships[1].name;

            electronicAccessData.forEach((data) => {
              InventoryInstances.createFolioInstanceViaApi({
                instance: {
                  title: `${instanceTitlePrefix} ${data.instanceIndex}`,
                  instanceTypeId: instanceTypes[0].id,
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
              }).then((instanceData) => {
                instanceIds.push(instanceData.instanceId);
              });
            });
          });
        });
      }).then(() => {
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
      instanceIds.forEach((id) => {
        InventoryInstance.deleteInstanceViaApi(id);
      });
    });

    it(
      'C740223 Search for Instances by "Electronic access" field using "Query search" option (spitfire)',
      { tags: ['extendedPath', 'spitfire', 'C740223'] },
      () => {
        const searchData = [
          { query: `electronicAccess = "${linkText}"`, foundInstanceIndexes: [1, 2] },
          { query: `electronicAccess = "${uri}"`, foundInstanceIndexes: [1, 2] },
          { query: `electronicAccess = "${materialsSpecPrefix} 1"`, foundInstanceIndexes: [] },
          { query: `electronicAccess = "${notePrefix}"`, foundInstanceIndexes: [1, 2] },
          {
            query: `electronicAccess = "${electronicAccessData[0].relationShip.name}"`,
            foundInstanceIndexes: [],
          },
          {
            query: `electronicAccess.uri = "${uri}" and electronicAccess.relationshipId="${electronicAccessData[0].relationShip.id}"`,
            foundInstanceIndexes: [1],
          },
          {
            query: `electronicAccess.uri = "${uri}" and electronicAccess.relationshipId="${electronicAccessData[1].relationShip.id}"`,
            foundInstanceIndexes: [2],
          },
        ];

        InventorySearchAndFilter.instanceTabIsDefault();
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
