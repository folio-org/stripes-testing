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
      const instancePrefix = `AT_C411631_Instance_${randomPostfix}`;
      const notePrefix = `AT_C411631_AdminNote_${randomPostfix}`;
      const notesSearchOption = 'Instance administrative notes';
      const notesData = [
        {
          noteValue: `${notePrefix} 1 Shared Marc`,
          instanceSource: INSTANCE_SOURCE_NAMES.MARC,
          affiliation: Affiliations.Consortia,
          hasHoldings: false,
        },
        {
          noteValue: `${notePrefix} 2 Shared Marc`,
          instanceSource: INSTANCE_SOURCE_NAMES.MARC,
          affiliation: Affiliations.Consortia,
          hasHoldings: true,
        },
        {
          noteValue: `${notePrefix} 3 Shared Folio`,
          instanceSource: INSTANCE_SOURCE_NAMES.FOLIO,
          affiliation: Affiliations.Consortia,
          hasHoldings: false,
        },
        {
          noteValue: `${notePrefix} 4 Shared Folio`,
          instanceSource: INSTANCE_SOURCE_NAMES.FOLIO,
          affiliation: Affiliations.Consortia,
          hasHoldings: true,
        },
        {
          noteValue: `${notePrefix} 5 Local Folio`,
          instanceSource: INSTANCE_SOURCE_NAMES.FOLIO,
          affiliation: Affiliations.College,
          hasHoldings: true,
        },
        {
          noteValue: `${notePrefix} 6 Local Marc`,
          instanceSource: INSTANCE_SOURCE_NAMES.MARC,
          affiliation: Affiliations.College,
          hasHoldings: true,
        },
      ];
      const instanceTitles = Array.from(
        { length: notesData.length },
        (_, i) => `${instancePrefix}_${i}`,
      );
      const sharedInstanceIndexes = notesData
        .map((item, index) => ({ item, index }))
        .filter(({ item }) => item.affiliation === Affiliations.Consortia)
        .map(({ index }) => index);
      let user;
      let memberLocation;
      let holdingsSourceId;

      before('Create user, data', () => {
        cy.resetTenant();
        cy.getAdminToken();
        InventoryInstances.deleteFullInstancesByTitleViaApi('AT_C411631');

        cy.createTempUser([Permissions.uiInventoryViewInstances.gui])
          .then((userProperties) => {
            user = userProperties;

            cy.setTenant(Affiliations.College);
            InventoryInstances.deleteFullInstancesByTitleViaApi('AT_C411631');
          })
          .then(() => {
            cy.resetTenant();
            cy.getInstanceTypes({ limit: 1, query: 'source=rdacontent' }).then((instanceTypes) => {
              notesData.forEach((noteData, index) => {
                cy.setTenant(noteData.affiliation);

                if (noteData.instanceSource === INSTANCE_SOURCE_NAMES.FOLIO) {
                  InventoryInstances.createFolioInstanceViaApi({
                    instance: {
                      instanceTypeId: instanceTypes[0].id,
                      title: `${instanceTitles[index]}`,
                      administrativeNotes: [noteData.noteValue],
                    },
                  }).then((createdInstanceData) => {
                    noteData.instanceId = createdInstanceData.instanceId;
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
                    noteData.instanceId = instanceId;
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
            notesData.forEach((noteData) => {
              if (noteData.instanceSource === INSTANCE_SOURCE_NAMES.MARC) {
                cy.setTenant(noteData.affiliation);
                cy.getInstanceById(noteData.instanceId).then((body) => {
                  body.administrativeNotes = [noteData.noteValue];
                  cy.updateInstance(body);
                });
              }
            });
            cy.resetTenant();
            InventoryHoldings.getHoldingsFolioSource().then((folioSource) => {
              holdingsSourceId = folioSource.id;
            });
          })
          .then(() => {
            notesData.forEach((noteData) => {
              if (noteData.hasHoldings) {
                cy.setTenant(Affiliations.College);
                InventoryHoldings.createHoldingRecordViaApi({
                  instanceId: noteData.instanceId,
                  permanentLocationId: memberLocation.id,
                  sourceId: holdingsSourceId,
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
            InventorySearchAndFilter.selectSearchOption(notesSearchOption);
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

        cy.setTenant(Affiliations.College);
        NewLocation.deleteInstitutionCampusLibraryLocationViaApi(
          memberLocation.institutionId,
          memberLocation.campusId,
          memberLocation.libraryId,
          memberLocation.id,
        );
      });

      it(
        'C411631 Search for Shared/Local records by "Instance administrative notes" search option from "Central" tenant (consortia) (spitfire)',
        { tags: ['extendedPathECS', 'spitfire', 'C411631'] },
        () => {
          InventorySearchAndFilter.fillInSearchQuery(notePrefix);
          InventorySearchAndFilter.clickSearch();

          sharedInstanceIndexes.forEach((instanceIndex) => {
            InventorySearchAndFilter.verifySearchResult(instanceTitles[instanceIndex]);
          });
          InventorySearchAndFilter.checkRowsCount(sharedInstanceIndexes.length);
        },
      );
    });
  });
});
