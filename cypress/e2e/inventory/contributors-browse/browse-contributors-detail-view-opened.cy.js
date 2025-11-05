import { Permissions } from '../../../support/dictionary';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import BrowseContributors from '../../../support/fragments/inventory/search/browseContributors';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';
import InstanceRecordView, {
  actionsMenuOptions,
} from '../../../support/fragments/inventory/instanceRecordView';
import QuickMarcEditor from '../../../support/fragments/quickMarcEditor';
import { INSTANCE_SOURCE_NAMES } from '../../../support/constants';
import InventoryHoldings from '../../../support/fragments/inventory/holdings/inventoryHoldings';

describe('Inventory', () => {
  describe('Contributors Browse', () => {
    const randomPostfix = getRandomPostfix();
    const instanceTitlePrefix = `AT_C411506_Instance_${randomPostfix}`;
    const instanceTitles = [`${instanceTitlePrefix}_Folio`, `${instanceTitlePrefix}_Marc`];
    const contributorValuePrefix = `AT_C411506_Contributor_${randomPostfix}`;
    const contributorValues = {
      folioOnly: `${contributorValuePrefix}_FolioOnly`,
      marcOnly: `${contributorValuePrefix}_MarcOnly`,
      both: `${contributorValuePrefix}_Both`,
    };
    const tags = {
      tag008: '008',
      tag245: '245',
      tag700: '700',
      tag710: '710',
    };

    const marcBibFields = [
      {
        tag: tags.tag008,
        content: QuickMarcEditor.defaultValid008Values,
      },
      {
        tag: tags.tag245,
        content: `$a ${instanceTitles[1]}`,
        indicators: ['1', '1'],
      },
      {
        tag: tags.tag700,
        content: `$a ${contributorValues.marcOnly}`,
        indicators: ['1', '\\'],
      },
      {
        tag: tags.tag700,
        content: `$a ${contributorValues.both}`,
        indicators: ['1', '\\'],
      },
    ];

    const createdInstanceIds = [];
    let user;
    let contributorNameTypeId;
    let locationId;
    let holdingsSourceId;

    before('Creating user and test data', () => {
      cy.createTempUser([Permissions.inventoryAll.gui, Permissions.uiInventoryMoveItems.gui]).then(
        (createdUserProperties) => {
          user = createdUserProperties;

          InventoryInstances.deleteFullInstancesByTitleViaApi('AT_C411506_Instance');

          cy.then(() => {
            BrowseContributors.getContributorNameTypes({
              searchParams: { limit: 1, query: 'name="Personal name"' },
            }).then((nameTypes) => {
              contributorNameTypeId = nameTypes[0].id;
            });
            cy.getLocations({ limit: 1, query: '(isActive=true and name<>"AT_*")' }).then((res) => {
              locationId = res.id;
            });
            InventoryHoldings.getHoldingsFolioSource().then((folioSource) => {
              holdingsSourceId = folioSource.id;
            });
          })
            .then(() => {
              InventoryInstance.createInstanceViaApi({
                instanceTitle: instanceTitles[0],
              }).then(({ instanceData }) => {
                createdInstanceIds.push(instanceData.instanceId);
                cy.getInstanceById(instanceData.instanceId).then((body) => {
                  const requestBody = body;
                  requestBody.contributors = [
                    {
                      name: contributorValues.folioOnly,
                      contributorNameTypeId,
                      contributorTypeText: '',
                      primary: false,
                    },
                    {
                      name: contributorValues.both,
                      contributorNameTypeId,
                      contributorTypeText: '',
                      primary: false,
                    },
                  ];
                  cy.updateInstance(requestBody);
                });

                cy.createMarcBibliographicViaAPI(
                  QuickMarcEditor.defaultValidLdr,
                  marcBibFields,
                ).then((instanceId) => {
                  createdInstanceIds.push(instanceId);

                  createdInstanceIds.forEach((id) => {
                    InventoryHoldings.createHoldingRecordViaApi({
                      instanceId: id,
                      permanentLocationId: locationId,
                      sourceId: holdingsSourceId,
                    });
                  });
                });
              });
            })
            .then(() => {
              cy.login(user.username, user.password, {
                path: TopMenu.inventoryPath,
                waiter: InventoryInstances.waitContentLoading,
                authRefresh: true,
              });
            });
        },
      );
    });

    after('Deleting created user and test data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(user.userId);
      InventoryInstances.deleteFullInstancesByTitleViaApi(instanceTitlePrefix);
    });

    it(
      'C411506 Browse (contributor): Show instance result in third pane when Number of titles = 1 (spitfire)',
      { tags: ['extendedPath', 'spitfire', 'C411506'] },
      () => {
        Object.values(contributorValues).forEach((value) => {
          BrowseContributors.waitForContributorToAppear(value);
        });
        InventorySearchAndFilter.selectBrowseContributors();
        BrowseContributors.browse(contributorValuePrefix);
        BrowseContributors.checkSearchResultsTable();

        BrowseContributors.openRecord(contributorValues.marcOnly);
        InventorySearchAndFilter.validateSearchTabIsDefault();
        InventorySearchAndFilter.instanceTabIsDefault();
        InventorySearchAndFilter.checkRowsCount(1);
        InventoryInstance.verifyInstanceTitle(instanceTitles[1]);
        InventoryInstance.verifySourceInAdministrativeData(INSTANCE_SOURCE_NAMES.MARC);
        InstanceRecordView.validateOptionInActionsMenu(
          actionsMenuOptions.moveHoldingsItemsToAnotherInstance,
          true,
        );
        InstanceRecordView.clickActionsButton();
        InstanceRecordView.validateOptionInActionsMenu(
          actionsMenuOptions.moveItemsWithinAnInstance,
          true,
        );

        InventorySearchAndFilter.selectBrowseContributors();
        BrowseContributors.checkSearchResultsTable();

        BrowseContributors.openRecord(contributorValues.folioOnly);
        InventorySearchAndFilter.validateSearchTabIsDefault();
        InventorySearchAndFilter.instanceTabIsDefault();
        InventorySearchAndFilter.checkRowsCount(1);
        InventoryInstance.verifyInstanceTitle(instanceTitles[0]);
        InventoryInstance.verifySourceInAdministrativeData(INSTANCE_SOURCE_NAMES.FOLIO);
        InstanceRecordView.validateOptionInActionsMenu(
          actionsMenuOptions.moveHoldingsItemsToAnotherInstance,
          true,
        );
        InstanceRecordView.clickActionsButton();
        InstanceRecordView.validateOptionInActionsMenu(
          actionsMenuOptions.moveItemsWithinAnInstance,
          true,
        );

        InventorySearchAndFilter.selectBrowseContributors();
        BrowseContributors.checkSearchResultsTable();

        BrowseContributors.openRecord(contributorValues.both);
        InventorySearchAndFilter.validateSearchTabIsDefault();
        InventorySearchAndFilter.instanceTabIsDefault();
        InventorySearchAndFilter.checkRowsCount(2);
        instanceTitles.forEach((title) => {
          InventorySearchAndFilter.verifySearchResult(title);
        });
      },
    );
  });
});
