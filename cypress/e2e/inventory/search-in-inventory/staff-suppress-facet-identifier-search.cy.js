import { Permissions } from '../../../support/dictionary';
import InventoryInstances, {
  searchInstancesOptions,
} from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import getRandomPostfix from '../../../support/utils/stringTools';
import QuickMarcEditor from '../../../support/fragments/quickMarcEditor';

describe('Inventory', () => {
  describe('Search in Inventory', () => {
    describe('Filters', () => {
      const randomPostfix = getRandomPostfix();
      const identifier = `AT_C446025_Identifier_${randomPostfix}`;
      const instanceTitlePrefix = `AT_C446025_Instance_${randomPostfix}`;
      const accordionName = 'Staff suppress';
      const searchOption = searchInstancesOptions[3]; // Identifier (all)
      const staffSuppressedInstanceIndexes = [2, 4];
      const notStaffSuppressedInstanceIndexes = [1, 3];
      const instanceIds = [];

      const marcInstanceFields = (instanceTitle) => [
        {
          tag: '008',
          content: QuickMarcEditor.defaultValid008Values,
        },
        {
          tag: '245',
          content: `$a ${instanceTitle}`,
          indicators: ['1', '0'],
        },
        {
          tag: '020',
          content: `$a ${identifier}`,
          indicators: ['\\', '\\'],
        },
      ];
      let user;

      before('Create test data and login', () => {
        cy.getAdminToken();

        cy.then(() => {
          InventoryInstances.getIdentifierTypes({ query: 'name="ISSN"' }).then((identifierType) => {
            cy.getInstanceTypes({ limit: 1, query: 'source=rdacontent' }).then((instanceTypes) => {
              // Create 2 FOLIO instances
              [1, 2].forEach((folioIndex) => {
                const isStaffSuppressed = folioIndex === 2;
                const instance = {
                  title: `${instanceTitlePrefix}_${folioIndex}`,
                  identifiers: [
                    {
                      value: identifier,
                      identifierTypeId: identifierType.id,
                    },
                  ],
                  instanceTypeId: instanceTypes[0].id,
                };
                if (isStaffSuppressed) {
                  instance.staffSuppress = true;
                }
                InventoryInstances.createFolioInstanceViaApi({
                  instance,
                }).then((instanceData) => {
                  instanceIds.push(instanceData.instanceId);
                });
              });

              // Create 2 MARC instances
              [3, 4].forEach((marcIndex) => {
                const isStaffSuppressed = marcIndex === 4;
                cy.createMarcBibliographicViaAPI(
                  QuickMarcEditor.defaultValidLdr,
                  marcInstanceFields(`${instanceTitlePrefix}_${marcIndex}`),
                ).then((instanceId) => {
                  instanceIds.push(instanceId);

                  cy.getInstanceById(instanceId).then((body) => {
                    if (isStaffSuppressed) {
                      body.staffSuppress = true;
                    }
                    cy.updateInstance(body);
                  });
                });
              });
            });
          });
        }).then(() => {
          cy.createTempUser([
            Permissions.enableStaffSuppressFacet.gui,
            Permissions.uiInventoryViewInstances.gui,
          ]).then((userProperties) => {
            user = userProperties;
            cy.waitForAuthRefresh(() => {
              cy.login(user.username, user.password, {
                path: TopMenu.inventoryPath,
                waiter: InventoryInstances.waitContentLoading,
              });
            }, 20_000);
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
        'C446025 Staff suppress facet is off by default when user has permission to use facet (search by "Identifier (all)") (spitfire)',
        { tags: ['extendedPath', 'spitfire', 'C446025'] },
        () => {
          // Verify we're on Instance tab and Search tab by default
          InventorySearchAndFilter.instanceTabIsDefault();
          InventorySearchAndFilter.validateSearchTabIsDefault();
          InventorySearchAndFilter.verifyAccordionExistance(accordionName);

          // Step 1: Expand the "Staff suppress" facet
          InventorySearchAndFilter.expandAccordion(accordionName);
          InventorySearchAndFilter.verifyAccordionByNameExpanded(accordionName, true);
          InventorySearchAndFilter.verifyCheckboxInAccordion(accordionName, 'No', false);
          InventorySearchAndFilter.verifyCheckboxInAccordion(accordionName, 'Yes', false);

          // Step 2: Run search which will return both not suppressed MARC and FOLIO records
          InventorySearchAndFilter.searchByParameter(searchOption, identifier);
          InventorySearchAndFilter.verifyResultListExists();
          InventorySearchAndFilter.checkRowsCount(
            staffSuppressedInstanceIndexes.length + notStaffSuppressedInstanceIndexes.length,
          );
          [...staffSuppressedInstanceIndexes, ...notStaffSuppressedInstanceIndexes].forEach(
            (index) => {
              InventorySearchAndFilter.verifySearchResult(`${instanceTitlePrefix}_${index}`);
            },
          );

          // Step 3: Check "Yes" option in Staff suppress facet
          InventorySearchAndFilter.selectOptionInExpandedFilter(accordionName, 'Yes');
          InventorySearchAndFilter.verifyResultListExists();
          InventorySearchAndFilter.checkRowsCount(staffSuppressedInstanceIndexes.length);
          staffSuppressedInstanceIndexes.forEach((index) => {
            InventorySearchAndFilter.verifySearchResult(`${instanceTitlePrefix}_${index}`);
          });

          // Step 4: Uncheck "Yes" and check "No" option
          InventorySearchAndFilter.selectOptionInExpandedFilter(accordionName, 'Yes', false);
          InventorySearchAndFilter.selectOptionInExpandedFilter(accordionName, 'No');
          InventorySearchAndFilter.verifyResultListExists();
          InventorySearchAndFilter.checkRowsCount(notStaffSuppressedInstanceIndexes.length);
          notStaffSuppressedInstanceIndexes.forEach((index) => {
            InventorySearchAndFilter.verifySearchResult(`${instanceTitlePrefix}_${index}`);
          });
        },
      );
    });
  });
});
