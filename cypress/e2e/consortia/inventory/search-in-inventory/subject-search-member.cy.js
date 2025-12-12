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
      const instancePrefix = `AT_C411634_Instance_${randomPostfix}`;
      const subjectPrefix = `AT_C411634_Subject_${randomPostfix}`;
      const subjectSearchOption = 'Subject';
      const helbyAccordionName = 'Held by';
      const subjectsData = [
        {
          subjectValue: `${subjectPrefix} 1 Shared Marc`,
          instanceSource: INSTANCE_SOURCE_NAMES.MARC,
          affiliation: Affiliations.Consortia,
          holdingsAffiliation: null,
        },
        {
          subjectValue: `${subjectPrefix} 2 Shared Marc`,
          instanceSource: INSTANCE_SOURCE_NAMES.MARC,
          affiliation: Affiliations.Consortia,
          holdingsAffiliation: Affiliations.College,
        },
        {
          subjectValue: `${subjectPrefix} 3 Shared Marc`,
          instanceSource: INSTANCE_SOURCE_NAMES.MARC,
          affiliation: Affiliations.Consortia,
          holdingsAffiliation: Affiliations.University,
        },
        {
          subjectValue: `${subjectPrefix} 4 Shared Folio`,
          instanceSource: INSTANCE_SOURCE_NAMES.FOLIO,
          affiliation: Affiliations.Consortia,
          holdingsAffiliation: null,
        },
        {
          subjectValue: `${subjectPrefix} 5 Shared Folio`,
          instanceSource: INSTANCE_SOURCE_NAMES.FOLIO,
          affiliation: Affiliations.Consortia,
          holdingsAffiliation: Affiliations.College,
        },
        {
          subjectValue: `${subjectPrefix} 6 Shared Folio`,
          instanceSource: INSTANCE_SOURCE_NAMES.FOLIO,
          affiliation: Affiliations.Consortia,
          holdingsAffiliation: Affiliations.University,
        },
        {
          subjectValue: `${subjectPrefix} 7 Local Folio`,
          instanceSource: INSTANCE_SOURCE_NAMES.FOLIO,
          affiliation: Affiliations.College,
          holdingsAffiliation: Affiliations.College,
        },
        {
          subjectValue: `${subjectPrefix} 8 Local Marc`,
          instanceSource: INSTANCE_SOURCE_NAMES.MARC,
          affiliation: Affiliations.College,
          holdingsAffiliation: Affiliations.College,
        },
        {
          subjectValue: `${subjectPrefix} 9 Local Folio`,
          instanceSource: INSTANCE_SOURCE_NAMES.FOLIO,
          affiliation: Affiliations.University,
          holdingsAffiliation: Affiliations.University,
        },
        {
          subjectValue: `${subjectPrefix} 10 Local Marc`,
          instanceSource: INSTANCE_SOURCE_NAMES.MARC,
          affiliation: Affiliations.University,
          holdingsAffiliation: Affiliations.University,
        },
      ];
      const instanceTitles = Array.from(
        { length: subjectsData.length },
        (_, i) => `${instancePrefix}_${i}`,
      );
      const expectedInstanceIndexes = subjectsData
        .map((item, index) => ({ item, index }))
        .filter(({ item }) => item.affiliation !== Affiliations.University)
        .map(({ index }) => index);
      let user;
      let member1Location;
      let member2Location;

      before('Create user, data', () => {
        cy.resetTenant();
        cy.getAdminToken();
        InventoryInstances.deleteFullInstancesByTitleViaApi('AT_C411634');
        cy.setTenant(Affiliations.College);
        InventoryInstances.deleteFullInstancesByTitleViaApi('AT_C411634');

        cy.createTempUser([Permissions.uiInventoryViewInstances.gui])
          .then((userProperties) => {
            user = userProperties;

            ServicePoints.getViaApi().then((servicePoint1) => {
              NewLocation.createViaApi(NewLocation.getDefaultLocation(servicePoint1[0].id)).then(
                (res1) => {
                  member1Location = res1;

                  cy.setTenant(Affiliations.University);
                  InventoryInstances.deleteFullInstancesByTitleViaApi('AT_C411634');

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
              subjectsData.forEach((subjectData, index) => {
                cy.setTenant(subjectData.affiliation);

                if (subjectData.instanceSource === INSTANCE_SOURCE_NAMES.FOLIO) {
                  InventoryInstances.createFolioInstanceViaApi({
                    instance: {
                      instanceTypeId: instanceTypes[0].id,
                      title: `${instanceTitles[index]}`,
                      subjects: [{ value: subjectData.subjectValue }],
                    },
                  }).then((createdInstanceData) => {
                    subjectData.instanceId = createdInstanceData.instanceId;
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
                      tag: '600',
                      content: `$a ${subjectData.subjectValue}`,
                      indicators: ['\\', '\\'],
                    },
                  ];

                  cy.createMarcBibliographicViaAPI(
                    QuickMarcEditor.defaultValidLdr,
                    marcInstanceFields,
                  ).then((instanceId) => {
                    subjectData.instanceId = instanceId;
                  });
                }
              });
            });
          })
          .then(() => {
            subjectsData.forEach((subjectData) => {
              if (subjectData.hasHoldings) {
                cy.setTenant(subjectData.holdingsAffiliation);
                const location =
                  subjectData.holdingsAffiliation === Affiliations.College
                    ? member1Location
                    : member2Location;
                InventoryHoldings.getHoldingsFolioSource().then((folioSource) => {
                  InventoryHoldings.createHoldingRecordViaApi({
                    instanceId: subjectData.instanceId,
                    permanentLocationId: location.id,
                    sourceId: folioSource.id,
                  });
                });
              }
            });
          })
          .then(() => {
            cy.setTenant(Affiliations.College);
            cy.login(user.username, user.password, {
              path: TopMenu.inventoryPath,
              waiter: InventoryInstances.waitContentLoading,
            });
            ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.college);
            InventorySearchAndFilter.selectSearchOption(subjectSearchOption);
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
        'C411634 Search for Shared/Local records by "Subject" search option from "Member" tenant (consortia) (spitfire)',
        { tags: ['extendedPathECS', 'spitfire', 'C411634'] },
        () => {
          InventorySearchAndFilter.clearDefaultFilter(helbyAccordionName);

          InventorySearchAndFilter.fillInSearchQuery(`${subjectPrefix}*`);
          InventorySearchAndFilter.clickSearch();
          expectedInstanceIndexes.forEach((instanceIndex) => {
            InventorySearchAndFilter.verifySearchResult(instanceTitles[instanceIndex]);
          });
          InventorySearchAndFilter.checkRowsCount(expectedInstanceIndexes.length);
        },
      );
    });
  });
});
