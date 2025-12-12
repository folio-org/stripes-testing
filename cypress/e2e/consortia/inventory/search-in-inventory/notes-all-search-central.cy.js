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
import InstanceNoteTypes from '../../../../support/fragments/settings/inventory/instance-note-types/instanceNoteTypes';

describe('Inventory', () => {
  describe('Search in Inventory', () => {
    describe('Consortia', () => {
      const randomPostfix = getRandomPostfix();
      const instancePrefix = `AT_C411627_Instance_${randomPostfix}`;
      const notePrefix = `AT_C411627_Note_${randomPostfix}`;
      const notesSearchOption = 'Instance notes (all)';
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

      before('Create user, data', () => {
        cy.resetTenant();
        cy.getAdminToken();
        InventoryInstances.deleteFullInstancesByTitleViaApi('AT_C411627');

        cy.createTempUser([Permissions.uiInventoryViewInstances.gui])
          .then((userProperties) => {
            user = userProperties;

            cy.setTenant(Affiliations.College);
            InventoryInstances.deleteFullInstancesByTitleViaApi('AT_C411627');
          })
          .then(() => {
            cy.resetTenant();
            cy.getInstanceTypes({ limit: 1, query: 'source=rdacontent' }).then((instanceTypes) => {
              InstanceNoteTypes.getInstanceNoteTypesViaApi({
                limit: 1,
                query: 'source="folio"',
              }).then(({ instanceNoteTypes }) => {
                notesData.forEach((noteData, index) => {
                  cy.setTenant(noteData.affiliation);

                  if (noteData.instanceSource === INSTANCE_SOURCE_NAMES.FOLIO) {
                    InventoryInstances.createFolioInstanceViaApi({
                      instance: {
                        instanceTypeId: instanceTypes[0].id,
                        title: `${instanceTitles[index]}`,
                        notes: [
                          {
                            instanceNoteTypeId: instanceNoteTypes[0].id,
                            note: noteData.noteValue,
                            staffOnly: false,
                          },
                        ],
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
                      {
                        tag: '510',
                        content: `$a ${noteData.noteValue}`,
                        indicators: ['3', '\\'],
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
          })
          .then(() => {
            notesData.forEach((noteData) => {
              if (noteData.hasHoldings) {
                cy.setTenant(Affiliations.College);
                InventoryHoldings.getHoldingsFolioSource().then((folioSource) => {
                  InventoryHoldings.createHoldingRecordViaApi({
                    instanceId: noteData.instanceId,
                    permanentLocationId: memberLocation.id,
                    sourceId: folioSource.id,
                  });
                });
              }
            });
          })
          .then(() => {
            cy.resetTenant();
            cy.login(user.username, user.password, {
              path: TopMenu.inventoryPath,
              waiter: InventoryInstances.waitContentLoading,
              authRefresh: true,
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
        'C411627 Search for Shared/Local records by "Instance notes (all)" search option from "Central" tenant (consortia) (spitfire)',
        { tags: ['extendedPathECS', 'spitfire', 'C411627'] },
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
