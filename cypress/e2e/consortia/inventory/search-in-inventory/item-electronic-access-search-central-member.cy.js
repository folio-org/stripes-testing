import Permissions from '../../../../support/dictionary/permissions';
import Affiliations, { tenantNames } from '../../../../support/dictionary/affiliations';
import Users from '../../../../support/fragments/users/users';
import TopMenu from '../../../../support/fragments/topMenu';
import InventoryInstances, {
  searchItemsOptions,
} from '../../../../support/fragments/inventory/inventoryInstances';
import ConsortiumManager from '../../../../support/fragments/settings/consortium-manager/consortium-manager';
import getRandomPostfix from '../../../../support/utils/stringTools';
import InventorySearchAndFilter from '../../../../support/fragments/inventory/inventorySearchAndFilter';
import { INSTANCE_SOURCE_NAMES, ITEM_STATUS_NAMES } from '../../../../support/constants';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import InventoryHoldings from '../../../../support/fragments/inventory/holdings/inventoryHoldings';
import InventoryItems from '../../../../support/fragments/inventory/item/inventoryItems';

describe('Inventory', () => {
  describe('Search in Inventory', () => {
    describe('Consortia', () => {
      const randomPostfix = getRandomPostfix();
      const instancePrefix = `AT_C411788_Instance_${randomPostfix}`;
      const linkTextPrefix = `AT_C411788_LinkText_${randomPostfix}`;
      const querySearchOption = searchItemsOptions.at(-2);
      const searchQuery = `item.electronicAccess=${linkTextPrefix}`;
      const helbyAccordionName = 'Held by';
      const instancesData = [
        {
          instanceSource: INSTANCE_SOURCE_NAMES.MARC,
          affiliation: Affiliations.Consortia,
          holdingsAffiliations: [Affiliations.College],
        },
        {
          instanceSource: INSTANCE_SOURCE_NAMES.MARC,
          affiliation: Affiliations.Consortia,
          holdingsAffiliations: [Affiliations.University],
        },
        {
          instanceSource: INSTANCE_SOURCE_NAMES.MARC,
          affiliation: Affiliations.Consortia,
          holdingsAffiliations: [Affiliations.College, Affiliations.University],
        },
        {
          instanceSource: INSTANCE_SOURCE_NAMES.FOLIO,
          affiliation: Affiliations.Consortia,
          holdingsAffiliations: [Affiliations.College],
        },
        {
          instanceSource: INSTANCE_SOURCE_NAMES.FOLIO,
          affiliation: Affiliations.Consortia,
          holdingsAffiliations: [Affiliations.University],
        },
        {
          instanceSource: INSTANCE_SOURCE_NAMES.FOLIO,
          affiliation: Affiliations.Consortia,
          holdingsAffiliations: [Affiliations.College, Affiliations.University],
        },
        {
          instanceSource: INSTANCE_SOURCE_NAMES.FOLIO,
          affiliation: Affiliations.College,
          holdingsAffiliations: [Affiliations.College],
        },
        {
          instanceSource: INSTANCE_SOURCE_NAMES.MARC,
          affiliation: Affiliations.College,
          holdingsAffiliations: [Affiliations.College],
        },
        {
          instanceSource: INSTANCE_SOURCE_NAMES.FOLIO,
          affiliation: Affiliations.University,
          holdingsAffiliations: [Affiliations.University],
        },
        {
          instanceSource: INSTANCE_SOURCE_NAMES.MARC,
          affiliation: Affiliations.University,
          holdingsAffiliations: [Affiliations.University],
        },
      ];
      const instanceTitles = Array.from(
        { length: instancesData.length },
        (_, i) => `${instancePrefix}_${i}`,
      );
      const expectedInstanceIndexesCentral = instancesData
        .map((item, index) => ({ item, index }))
        .filter(({ item }) => item.affiliation === Affiliations.Consortia)
        .map(({ index }) => index);
      const expectedInstanceIndexesMember = instancesData
        .map((item, index) => ({ item, index }))
        .filter(({ item }) => item.affiliation !== Affiliations.University)
        .map(({ index }) => index);
      let user;
      const locations = {
        [Affiliations.College]: null,
        [Affiliations.University]: null,
      };
      let holdingsSourceId;
      let loanTypeId;
      let materialTypeId;

      before('Create user, data', () => {
        cy.resetTenant();
        cy.getAdminToken();
        InventoryInstances.deleteFullInstancesByTitleViaApi('AT_C411788');

        cy.createTempUser([Permissions.uiInventoryViewInstances.gui])
          .then((userProperties) => {
            user = userProperties;
            cy.assignAffiliationToUser(Affiliations.College, user.userId);

            cy.setTenant(Affiliations.College);
            cy.assignPermissionsToExistingUser(user.userId, [
              Permissions.uiInventoryViewInstances.gui,
            ]);
            InventoryInstances.deleteFullInstancesByTitleViaApi('AT_C411788');

            cy.setTenant(Affiliations.University);
            InventoryInstances.deleteFullInstancesByTitleViaApi('AT_C411788');
          })
          .then(() => {
            cy.resetTenant();
            cy.getInstanceTypes({ limit: 1, query: 'source=rdacontent' }).then((instanceTypes) => {
              instancesData.forEach((instanceData, index) => {
                cy.setTenant(instanceData.affiliation);

                if (instanceData.instanceSource === INSTANCE_SOURCE_NAMES.FOLIO) {
                  InventoryInstances.createFolioInstanceViaApi({
                    instance: {
                      instanceTypeId: instanceTypes[0].id,
                      title: `${instanceTitles[index]}`,
                    },
                  }).then((createdInstanceData) => {
                    instanceData.instanceId = createdInstanceData.instanceId;
                  });
                } else {
                  const marcInstanceFields = [
                    {
                      tag: '008',
                      content: QuickMarcEditor.defaultValid008Values,
                    },
                    {
                      tag: '245',
                      content: `$a ${instanceTitles[index]}`,
                      indicators: ['1', '1'],
                    },
                  ];

                  cy.createMarcBibliographicViaAPI(
                    QuickMarcEditor.defaultValidLdr,
                    marcInstanceFields,
                  ).then((instanceId) => {
                    instanceData.instanceId = instanceId;
                  });
                }
              });
            });
          })
          .then(() => {
            cy.setTenant(Affiliations.College);
            cy.getLocations({
              limit: 1,
              query: '(isActive=true and name<>"AT_*" and name<>"auto*")',
            }).then((res) => {
              locations[Affiliations.College] = res;
            });
            InventoryHoldings.getHoldingsFolioSource().then((folioSource) => {
              holdingsSourceId = folioSource.id;
            });
            cy.getLoanTypes({ limit: 1, query: 'name<>"AT_*"' }).then((loanTypes) => {
              loanTypeId = loanTypes[0].id;
            });
            cy.getMaterialTypes({ limit: 1, query: 'source=folio' }).then((res) => {
              materialTypeId = res.id;
            });
            cy.setTenant(Affiliations.University);
            cy.getLocations({
              limit: 1,
              query: '(isActive=true and name<>"AT_*" and name<>"auto*")',
            }).then((res) => {
              locations[Affiliations.University] = res;
            });
          })
          .then(() => {
            instancesData.forEach((instanceData, instanceIndex) => {
              instanceData.holdingsAffiliations.forEach((holdingsAffiliation, holdingsIndex) => {
                cy.setTenant(holdingsAffiliation);
                InventoryHoldings.createHoldingRecordViaApi({
                  instanceId: instanceData.instanceId,
                  permanentLocationId: locations[holdingsAffiliation].id,
                  sourceId: holdingsSourceId,
                }).then((holding) => {
                  InventoryItems.createItemViaApi({
                    holdingsRecordId: holding.id,
                    materialType: { id: materialTypeId },
                    permanentLoanType: { id: loanTypeId },
                    status: { name: ITEM_STATUS_NAMES.AVAILABLE },
                    electronicAccess: [
                      {
                        linkText: `${linkTextPrefix}_${instanceIndex}-${holdingsIndex}`,
                        uri: '',
                      },
                    ],
                  });
                });
              });
            });
          })
          .then(() => {
            cy.resetTenant();
            cy.login(user.username, user.password, {
              path: TopMenu.inventoryPath,
              waiter: InventoryInstances.waitContentLoading,
            });
            ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.central);
          });
      });

      after('Delete user, data', () => {
        cy.resetTenant();
        cy.getAdminToken();
        cy.setTenant(Affiliations.College);
        InventoryInstances.deleteFullInstancesByTitleViaApi(instancePrefix);

        cy.setTenant(Affiliations.University);
        InventoryInstances.deleteFullInstancesByTitleViaApi(instancePrefix);

        cy.resetTenant();
        Users.deleteViaApi(user.userId);
        InventoryInstances.deleteFullInstancesByTitleViaApi(instancePrefix);
      });

      it(
        'C411788 Search for Shared/Local records by "Query search" search options from "Item" tab" in "Central" and "Member 1" tenant (Electronic access) (consortia) (spitfire)',
        { tags: ['extendedPathECS', 'spitfire', 'C411788'] },
        () => {
          function searchAndVerify(query, expectedIndexes) {
            InventorySearchAndFilter.fillInSearchQuery(query);
            InventorySearchAndFilter.clickSearch();
            expectedIndexes.forEach((instanceIndex) => {
              InventorySearchAndFilter.verifySearchResult(instanceTitles[instanceIndex]);
            });
            InventorySearchAndFilter.verifyNumberOfSearchResults(expectedIndexes.length);
          }

          InventorySearchAndFilter.switchToItem();
          InventorySearchAndFilter.itemTabIsDefault();
          InventorySearchAndFilter.selectSearchOption(querySearchOption);

          searchAndVerify(searchQuery, expectedInstanceIndexesCentral);

          ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
          InventoryInstances.waitContentLoading();

          InventorySearchAndFilter.switchToItem();
          InventorySearchAndFilter.itemTabIsDefault();
          InventorySearchAndFilter.clearDefaultFilter(helbyAccordionName);
          InventorySearchAndFilter.selectSearchOption(querySearchOption);

          searchAndVerify(searchQuery, expectedInstanceIndexesMember);
        },
      );
    });
  });
});
