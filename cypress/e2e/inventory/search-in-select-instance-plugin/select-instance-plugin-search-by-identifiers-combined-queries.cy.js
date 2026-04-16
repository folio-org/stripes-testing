import CapabilitySets from '../../../support/dictionary/capabilitySets';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import BrowseContributors from '../../../support/fragments/inventory/search/browseContributors';
import { NewOrder, Orders } from '../../../support/fragments/orders';
import OrderDetails from '../../../support/fragments/orders/orderDetails';
import OrderLineEditForm from '../../../support/fragments/orders/orderLineEditForm';
import SelectInstanceModal from '../../../support/fragments/orders/modals/selectInstanceModal';
import { NewOrganization, Organizations } from '../../../support/fragments/organizations';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import { getRandomLetters, randomNDigitNumber } from '../../../support/utils/stringTools';

describe('Inventory', () => {
  describe('Search in "Select instance" plugin', () => {
    const randomLetters = `conezerofiveonefourfiveone${getRandomLetters(10)}`;
    const randomDigits = `1051451${randomNDigitNumber(10)}`;

    const testData = {
      organization: NewOrganization.getDefaultOrganization(),
      order: {},
      user: {},
      identifierTypeName: 'OCLC',
    };

    const instancesData = [
      {
        title: `Semantic${randomLetters} Web Primer`,
        contributorValue: `Van${randomLetters} Harmelen${randomLetters}, Frank`,
        identifierValue: `ocm${randomDigits}0012345`,
      },
      {
        title: `Amending cis${randomLetters}`,
        contributorValue: null,
        identifierValue: `${randomDigits}2004262156`,
      },
      {
        title: `Cis${randomLetters} Company${randomLetters}`,
        contributorValue: null,
        identifierValue: `cis${randomLetters} ${randomDigits}2004262156`,
      },
    ];

    const searchData = [
      {
        query: `semantic${randomLetters} Van${randomLetters} Harmelen${randomLetters} ocm${randomDigits}0012345`,
        expectedTitles: [],
      },
      {
        query: `semantic${randomLetters} Van${randomLetters} Harmelen${randomLetters}`,
        expectedTitles: [instancesData[0].title],
      },
      {
        query: `cis${randomLetters} ${randomDigits}2004262156`,
        expectedTitles: [instancesData[2].title],
      },
      {
        query: `ocm${randomDigits}0012345`,
        expectedTitles: [instancesData[0].title],
      },
      {
        query: `${randomDigits}2004262156`,
        expectedTitles: [instancesData[1].title, instancesData[2].title],
      },
      {
        query: `Cis${randomLetters} Company${randomLetters}`,
        expectedTitles: [instancesData[2].title],
      },
    ];

    const capabSetsToAssign = [
      CapabilitySets.uiInventoryInstanceView,
      CapabilitySets.uiOrdersOrdersCreate,
    ];

    const instanceIds = [];
    let instanceTypeId;
    let identifierTypeId;
    let contributorNameTypeId;

    before('Create test data', () => {
      cy.getAdminToken();
      InventoryInstances.deleteInstanceByTitleViaApi('*conezerofiveonefourfiveone*');

      Organizations.createOrganizationViaApi(testData.organization).then(() => {
        testData.order = NewOrder.getDefaultOngoingOrder({ vendorId: testData.organization.id });
        Orders.createOrderViaApi(testData.order).then((order) => {
          testData.order = order;
        });
      });

      cy.then(() => {
        cy.getInstanceTypes({ limit: 1, query: 'source=rdacontent' }).then((instanceTypes) => {
          instanceTypeId = instanceTypes[0].id;
        });
        InventoryInstances.getIdentifierTypes({
          query: `name=="${testData.identifierTypeName}"`,
        }).then((identifierType) => {
          identifierTypeId = identifierType.id;
        });
        BrowseContributors.getContributorNameTypes().then((contributorNameTypes) => {
          contributorNameTypeId = contributorNameTypes[0].id;
        });
      })
        .then(() => {
          instancesData.forEach((instance) => {
            const instanceParams = {
              instanceTypeId,
              title: instance.title,
              identifiers: [{ value: instance.identifierValue, identifierTypeId }],
            };
            if (instance.contributorValue) {
              instanceParams.contributors = [
                { name: instance.contributorValue, contributorNameTypeId },
              ];
            }
            InventoryInstances.createFolioInstanceViaApi({ instance: instanceParams }).then(
              (instanceData) => {
                instanceIds.push(instanceData.instanceId);
              },
            );
          });
        })
        .then(() => {
          cy.createTempUser([])
            .then((userProperties) => {
              testData.user = userProperties;
              cy.assignCapabilitiesToExistingUser(testData.user.userId, [], capabSetsToAssign);
            })
            .then(() => {
              cy.login(testData.user.username, testData.user.password, {
                path: TopMenu.ordersPath,
                waiter: Orders.waitLoading,
              });
            });
        });
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      instanceIds.forEach((id) => InventoryInstance.deleteInstanceViaApi(id));
      Orders.deleteOrderViaApi(testData.order.id);
      Organizations.deleteOrganizationViaApi(testData.organization.id);
      Users.deleteViaApi(testData.user.userId);
    });

    it(
      'C1051451 Select instance plugin | Verify keyword search behavior with identifiers using combined search queries (spitfire)',
      { tags: ['extendedPath', 'spitfire', 'C1051451'] },
      () => {
        Orders.selectOrderByPONumber(testData.order.poNumber);
        OrderDetails.selectAddPOLine();
        OrderLineEditForm.clickTitleLookUpButton();
        SelectInstanceModal.waitLoading();
        InventorySearchAndFilter.instanceTabIsDefault();

        function searchAndCheck() {
          searchData.forEach(({ query, expectedTitles }) => {
            SelectInstanceModal.fillInSearchQuery(query);
            SelectInstanceModal.clickSearchButton();

            if (!expectedTitles.length) {
              SelectInstanceModal.checkNoRecordsFound(query);
            } else {
              instancesData.forEach((instance) => {
                const isExpected = expectedTitles.includes(instance.title);
                InventorySearchAndFilter.verifySearchResult(instance.title, isExpected);
              });
            }

            SelectInstanceModal.clickResetAllButton();
            SelectInstanceModal.checkTableContent();
          });
        }

        // Steps 1-6: Instances tab
        searchAndCheck();

        // Step 7: Switch to Holdings tab
        InventorySearchAndFilter.switchToHoldings();
        SelectInstanceModal.checkDefaultSearchOptionSelected();
        SelectInstanceModal.checkSearchInputFieldValue('');
        SelectInstanceModal.checkResultsListEmpty();

        // Step 8: Repeat steps 1-6 on Holdings tab
        searchAndCheck();

        // Step 9: Switch to Item tab
        InventorySearchAndFilter.switchToItem();
        SelectInstanceModal.checkDefaultSearchOptionSelected();
        SelectInstanceModal.checkSearchInputFieldValue('');
        SelectInstanceModal.checkResultsListEmpty();

        // Step 10: Repeat steps 1-6 on Item tab
        searchAndCheck();
      },
    );
  });
});
