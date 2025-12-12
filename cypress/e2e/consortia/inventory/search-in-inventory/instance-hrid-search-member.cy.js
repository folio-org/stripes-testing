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
      const instancePrefix = `AT_C411638_Instance_${randomPostfix}`;
      const hridSearchOption = 'Instance HRID';
      const helbyAccordionName = 'Held by';
      const instancesData = [
        {
          instanceSource: INSTANCE_SOURCE_NAMES.MARC,
          affiliation: Affiliations.Consortia,
          holdingsAffiliation: null,
        },
        {
          instanceSource: INSTANCE_SOURCE_NAMES.MARC,
          affiliation: Affiliations.Consortia,
          holdingsAffiliation: Affiliations.College,
        },
        {
          instanceSource: INSTANCE_SOURCE_NAMES.MARC,
          affiliation: Affiliations.Consortia,
          holdingsAffiliation: Affiliations.University,
        },
        {
          instanceSource: INSTANCE_SOURCE_NAMES.FOLIO,
          affiliation: Affiliations.Consortia,
          holdingsAffiliation: null,
        },
        {
          instanceSource: INSTANCE_SOURCE_NAMES.FOLIO,
          affiliation: Affiliations.Consortia,
          holdingsAffiliation: Affiliations.College,
        },
        {
          instanceSource: INSTANCE_SOURCE_NAMES.FOLIO,
          affiliation: Affiliations.Consortia,
          holdingsAffiliation: Affiliations.University,
        },
        {
          instanceSource: INSTANCE_SOURCE_NAMES.FOLIO,
          affiliation: Affiliations.College,
          holdingsAffiliation: Affiliations.College,
        },
        {
          instanceSource: INSTANCE_SOURCE_NAMES.MARC,
          affiliation: Affiliations.College,
          holdingsAffiliation: Affiliations.College,
        },
        {
          instanceSource: INSTANCE_SOURCE_NAMES.FOLIO,
          affiliation: Affiliations.University,
          holdingsAffiliation: Affiliations.University,
        },
        {
          instanceSource: INSTANCE_SOURCE_NAMES.MARC,
          affiliation: Affiliations.University,
          holdingsAffiliation: Affiliations.University,
        },
      ];
      const instanceTitles = Array.from(
        { length: instancesData.length },
        (_, i) => `${instancePrefix}_${i}`,
      );
      const expectedInstanceIndexes = instancesData
        .map((item, index) => ({ item, index }))
        .filter(({ item }) => item.affiliation !== Affiliations.University)
        .map(({ index }) => index);
      const notExpectedInstanceIndexes = instancesData
        .map((item, index) => ({ item, index }))
        .filter(({ item }) => item.affiliation === Affiliations.University)
        .map(({ index }) => index);
      let user;
      let member1Location;
      let member2Location;

      before('Create user, data', () => {
        cy.resetTenant();
        cy.getAdminToken();
        InventoryInstances.deleteFullInstancesByTitleViaApi('AT_C411638');
        cy.setTenant(Affiliations.College);
        InventoryInstances.deleteFullInstancesByTitleViaApi('AT_C411638');

        cy.createTempUser([Permissions.uiInventoryViewInstances.gui])
          .then((userProperties) => {
            user = userProperties;

            ServicePoints.getViaApi().then((servicePoint1) => {
              NewLocation.createViaApi(NewLocation.getDefaultLocation(servicePoint1[0].id)).then(
                (res1) => {
                  member1Location = res1;

                  cy.setTenant(Affiliations.University);
                  InventoryInstances.deleteFullInstancesByTitleViaApi('AT_C411638');

                  ServicePoints.getViaApi().then((servicePoint2) => {
                    NewLocation.createViaApi(
                      NewLocation.getDefaultLocation(servicePoint2[0].id),
                    ).then((res2) => {
                      member2Location = res2;
                    });
                  });
                },
              );
            });
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
            instancesData.forEach((instanceData) => {
              cy.setTenant(instanceData.affiliation);
              cy.getInstanceById(instanceData.instanceId).then((instance) => {
                instanceData.instanceHrid = instance.hrid;

                if (instanceData.hasHoldings) {
                  cy.setTenant(instanceData.holdingsAffiliation);
                  const location =
                    instanceData.holdingsAffiliation === Affiliations.College
                      ? member1Location
                      : member2Location;
                  InventoryHoldings.getHoldingsFolioSource().then((folioSource) => {
                    InventoryHoldings.createHoldingRecordViaApi({
                      instanceId: instanceData.instanceId,
                      permanentLocationId: location.id,
                      sourceId: folioSource.id,
                    });
                  });
                }
              });
            });
          })
          .then(() => {
            cy.setTenant(Affiliations.College);
            cy.login(user.username, user.password, {
              path: TopMenu.inventoryPath,
              waiter: InventoryInstances.waitContentLoading,
            });
            ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.college);
            InventorySearchAndFilter.selectSearchOption(hridSearchOption);
          });
      });

      after('Delete user, data', () => {
        cy.resetTenant();
        cy.getAdminToken();
        cy.setTenant(Affiliations.College);
        Users.deleteViaApi(user.userId);
        InventoryInstances.deleteFullInstancesByTitleViaApi(instancePrefix);

        cy.setTenant(Affiliations.University);
        InventoryInstances.deleteFullInstancesByTitleViaApi(instancePrefix);

        cy.resetTenant();
        InventoryInstances.deleteFullInstancesByTitleViaApi(instancePrefix);

        cy.setTenant(Affiliations.College);
        NewLocation.deleteInstitutionCampusLibraryLocationViaApi(
          member1Location.institutionId,
          member1Location.campusId,
          member1Location.libraryId,
          member1Location.id,
        );

        cy.setTenant(Affiliations.University);
        NewLocation.deleteInstitutionCampusLibraryLocationViaApi(
          member2Location.institutionId,
          member2Location.campusId,
          member2Location.libraryId,
          member2Location.id,
        );
      });

      it(
        'C411638 Search for Shared/Local records by "Instance HRID" search option from "Member" tenant (consortia) (spitfire)',
        { tags: ['extendedPathECS', 'spitfire', 'C411638'] },
        () => {
          InventorySearchAndFilter.clearDefaultFilter(helbyAccordionName);

          expectedInstanceIndexes.forEach((instanceIndex) => {
            InventorySearchAndFilter.fillInSearchQuery(instancesData[instanceIndex].instanceHrid);
            InventorySearchAndFilter.clickSearch();

            InventorySearchAndFilter.verifySearchResult(instanceTitles[instanceIndex]);
            InventorySearchAndFilter.checkRowsCount(1);
          });

          notExpectedInstanceIndexes.forEach((instanceIndex) => {
            InventorySearchAndFilter.fillInSearchQuery(instancesData[instanceIndex].instanceHrid);
            InventorySearchAndFilter.clickSearch();

            InventorySearchAndFilter.verifyResultPaneEmpty({
              noResultsFound: true,
              searchQuery: instancesData[instanceIndex].instanceHrid,
            });
          });
        },
      );
    });
  });
});
