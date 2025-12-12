import Permissions from '../../../../support/dictionary/permissions';
import Affiliations, { tenantNames } from '../../../../support/dictionary/affiliations';
import Users from '../../../../support/fragments/users/users';
import TopMenu from '../../../../support/fragments/topMenu';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import ConsortiumManager from '../../../../support/fragments/settings/consortium-manager/consortium-manager';
import getRandomPostfix from '../../../../support/utils/stringTools';
import InventorySearchAndFilter from '../../../../support/fragments/inventory/inventorySearchAndFilter';
import { INSTANCE_SOURCE_NAMES } from '../../../../support/constants';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import InventoryHoldings from '../../../../support/fragments/inventory/holdings/inventoryHoldings';
import NewLocation from '../../../../support/fragments/settings/tenant/locations/newLocation';
import ServicePoints from '../../../../support/fragments/settings/tenant/servicePoints/servicePoints';

describe('Inventory', () => {
  describe('Search in Inventory', () => {
    describe('Consortia', () => {
      const randomPostfix = getRandomPostfix();
      const instancePrefix = `AT_C411669_Instance_${randomPostfix}`;
      const publisherPrefix = `AT_C411669_Publisher_${randomPostfix}`;
      const querySearchOption = 'Query search';
      const searchQuery = `publisher=${publisherPrefix}`;
      const instancesData = [
        {
          instanceSource: INSTANCE_SOURCE_NAMES.MARC,
          affiliation: Affiliations.Consortia,
          hasHoldings: false,
        },
        {
          instanceSource: INSTANCE_SOURCE_NAMES.MARC,
          affiliation: Affiliations.Consortia,
          hasHoldings: true,
        },
        {
          instanceSource: INSTANCE_SOURCE_NAMES.FOLIO,
          affiliation: Affiliations.Consortia,
          hasHoldings: false,
        },
        {
          instanceSource: INSTANCE_SOURCE_NAMES.FOLIO,
          affiliation: Affiliations.Consortia,
          hasHoldings: true,
        },
        {
          instanceSource: INSTANCE_SOURCE_NAMES.FOLIO,
          affiliation: Affiliations.College,
          hasHoldings: true,
        },
        {
          instanceSource: INSTANCE_SOURCE_NAMES.MARC,
          affiliation: Affiliations.College,
          hasHoldings: true,
        },
      ];
      const instanceTitles = Array.from(
        { length: instancesData.length },
        (_, i) => `${instancePrefix}_${i}`,
      );
      const publisherValues = Array.from(
        { length: instancesData.length },
        (_, i) => `${publisherPrefix} ${i}`,
      );
      const sharedInstanceIndexes = instancesData
        .map((item, index) => ({ item, index }))
        .filter(({ item }) => item.affiliation === Affiliations.Consortia)
        .map(({ index }) => index);
      let user;
      let memberLocation;
      let hodingsSourceId;

      before('Create user, data', () => {
        cy.resetTenant();
        cy.getAdminToken();
        InventoryInstances.deleteFullInstancesByTitleViaApi('AT_C411669');

        cy.createTempUser([Permissions.uiInventoryViewInstances.gui])
          .then((userProperties) => {
            user = userProperties;

            cy.setTenant(Affiliations.College);
            InventoryInstances.deleteFullInstancesByTitleViaApi('AT_C411669');
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
                      publication: [
                        {
                          publisher: publisherValues[index],
                          role: '',
                          place: '',
                          dateOfPublication: '',
                        },
                      ],
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
                    {
                      tag: '264',
                      content: `$b ${publisherValues[index]}`,
                      indicators: ['\\', '1'],
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
            ServicePoints.getViaApi().then((servicePoint) => {
              NewLocation.createViaApi(NewLocation.getDefaultLocation(servicePoint[0].id)).then(
                (res) => {
                  memberLocation = res;
                },
              );
            });
            InventoryHoldings.getHoldingsFolioSource().then((folioSource) => {
              hodingsSourceId = folioSource.id;
            });
          })
          .then(() => {
            instancesData.forEach((instanceData) => {
              if (instanceData.hasHoldings) {
                InventoryHoldings.createHoldingRecordViaApi({
                  instanceId: instanceData.instanceId,
                  permanentLocationId: memberLocation.id,
                  sourceId: hodingsSourceId,
                });
              }
            });
          })
          .then(() => {
            cy.resetTenant();
            cy.login(user.username, user.password, {
              path: TopMenu.inventoryPath,
              waiter: InventoryInstances.waitContentLoading,
            });
            ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.central);
            InventorySearchAndFilter.selectSearchOption(querySearchOption);
          });
      });

      after('Delete user, data', () => {
        cy.resetTenant();
        cy.getAdminToken();
        cy.setTenant(Affiliations.College);
        InventoryInstances.deleteFullInstancesByTitleViaApi(instancePrefix);

        cy.resetTenant();
        Users.deleteViaApi(user.userId);
        InventoryInstances.deleteFullInstancesByTitleViaApi(instancePrefix);

        cy.wait(1000);
        cy.setTenant(Affiliations.College);
        NewLocation.deleteInstitutionCampusLibraryLocationViaApi(
          memberLocation.institutionId,
          memberLocation.campusId,
          memberLocation.libraryId,
          memberLocation.id,
        );
      });

      it(
        'C411669 Search for Shared/Local records by "Query search" search option from "Central" tenant (publisher field) (consortia) (spitfire)',
        { tags: ['extendedPathECS', 'spitfire', 'C411669'] },
        () => {
          InventorySearchAndFilter.fillInSearchQuery(searchQuery);
          InventorySearchAndFilter.clickSearch();
          sharedInstanceIndexes.forEach((instanceIndex) => {
            InventorySearchAndFilter.verifySearchResult(instanceTitles[instanceIndex]);
          });
          InventorySearchAndFilter.verifyNumberOfSearchResults(sharedInstanceIndexes.length);
        },
      );
    });
  });
});
