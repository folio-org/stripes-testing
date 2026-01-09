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
import InventoryActions from '../../../../support/fragments/inventory/inventoryActions';
import BrowseSubjects from '../../../../support/fragments/inventory/search/browseSubjects';

describe('Inventory', () => {
  describe('Search in Inventory', () => {
    describe('Consortia', () => {
      const randomPostfix = getRandomPostfix();
      const instancePrefix = `AT_C402764_Instance_${randomPostfix}`;
      const subjectPrefix = `AT_C402764_Subject_${randomPostfix}`;
      const searchQuery = '*';
      const browseOption = 'Subjects';
      const subjectsData = [
        {
          subjectValue: `${subjectPrefix} 1 Shared Marc`,
          instanceSource: INSTANCE_SOURCE_NAMES.MARC,
          affiliation: Affiliations.Consortia,
        },
        {
          subjectValue: `${subjectPrefix} 2 Shared Folio`,
          instanceSource: INSTANCE_SOURCE_NAMES.FOLIO,
          affiliation: Affiliations.Consortia,
        },
        {
          subjectValue: `${subjectPrefix} 3 Local Folio`,
          instanceSource: INSTANCE_SOURCE_NAMES.FOLIO,
          affiliation: Affiliations.College,
        },
        {
          subjectValue: `${subjectPrefix} 4 Local Marc`,
          instanceSource: INSTANCE_SOURCE_NAMES.MARC,
          affiliation: Affiliations.College,
        },
      ];
      const instanceTitles = Array.from(
        { length: subjectsData.length },
        (_, i) => `${instancePrefix}_${i}`,
      );
      let user;

      before('Create user, data', () => {
        cy.resetTenant();
        cy.getAdminToken();
        InventoryInstances.deleteInstanceByTitleViaApi('AT_C402764');

        cy.createTempUser([
          Permissions.inventoryAll.gui,
          Permissions.inventoryCreateAndDownloadInTransitItemsReport.gui,
        ])
          .then((userProperties) => {
            user = userProperties;
            cy.assignAffiliationToUser(Affiliations.College, user.userId);

            cy.setTenant(Affiliations.College);
            cy.assignPermissionsToExistingUser(user.userId, [
              Permissions.inventoryAll.gui,
              Permissions.inventoryCreateAndDownloadInTransitItemsReport.gui,
            ]);
            InventoryInstances.deleteInstanceByTitleViaApi('AT_C402764');
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
        Users.deleteViaApi(user.userId);
        InventoryInstances.deleteInstanceByTitleViaApi(instancePrefix);

        cy.setTenant(Affiliations.College);
        InventoryInstances.deleteInstanceByTitleViaApi(instancePrefix);
      });

      it(
        'C402764 "New fast add record" and "In transit items report (CSV)" actions are not displayed in "Inventory" app - "Central" tenant (consortia) (spitfire)',
        { tags: ['extendedPathECS', 'spitfire', 'C402764'] },
        () => {
          function checkOptionsShown(areShown) {
            InventoryInstances.clickActionsButton();
            InventoryActions.optionsAreShown(
              [
                InventoryActions.options.newFastAddRecord,
                InventoryActions.options.InTransitItemsReport,
              ],
              areShown,
            );
            InventoryActions.close();
          }

          checkOptionsShown(false);

          InventoryInstances.searchByTitle(searchQuery);
          InventorySearchAndFilter.verifyResultListExists();
          checkOptionsShown(false);

          InventorySearchAndFilter.switchToHoldings();
          InventorySearchAndFilter.holdingsTabIsDefault();
          checkOptionsShown(false);

          InventorySearchAndFilter.switchToItem();
          InventorySearchAndFilter.itemTabIsDefault();
          checkOptionsShown(false);

          InventorySearchAndFilter.switchToBrowseTab();
          InventorySearchAndFilter.validateBrowseToggleIsSelected();
          InventorySearchAndFilter.selectBrowseOption(browseOption);
          InventorySearchAndFilter.checkBrowseOptionSelected(browseOption);

          BrowseSubjects.waitForSubjectToAppear(subjectsData[0].subjectValue);
          BrowseSubjects.browse(subjectsData[0].subjectValue);
          BrowseSubjects.checkValueIsBold(subjectsData[0].subjectValue);
          BrowseSubjects.openInstance({ name: subjectsData[0].subjectValue });
          InventoryInstances.waitLoading();
          checkOptionsShown(false);

          ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
          InventoryInstances.waitContentLoading();
          checkOptionsShown(true);

          InventorySearchAndFilter.switchToHoldings();
          InventorySearchAndFilter.holdingsTabIsDefault();
          InventoryInstances.searchByTitle(searchQuery);
          InventorySearchAndFilter.verifyResultListExists();
          checkOptionsShown(true);

          InventorySearchAndFilter.switchToItem();
          InventorySearchAndFilter.itemTabIsDefault();
          checkOptionsShown(true);
        },
      );
    });
  });
});
