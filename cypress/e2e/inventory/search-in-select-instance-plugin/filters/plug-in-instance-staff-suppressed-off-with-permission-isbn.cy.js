import Permissions from '../../../../support/dictionary/permissions';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../../support/fragments/inventory/inventorySearchAndFilter';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../support/utils/stringTools';
import { NewOrder, Orders } from '../../../../support/fragments/orders';
import { NewOrganization, Organizations } from '../../../../support/fragments/organizations';
import OrderLineEditForm from '../../../../support/fragments/orders/orderLineEditForm';
import OrderDetails from '../../../../support/fragments/orders/orderDetails';
import SelectInstanceModal from '../../../../support/fragments/orders/modals/selectInstanceModal';
import { INSTANCE_SOURCE_NAMES } from '../../../../support/constants';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';

describe('Inventory', () => {
  describe('Search in "Select instance" plugin', () => {
    describe('Filters', () => {
      const randomPostfix = getRandomPostfix();
      const instanceTitlePrefix = `AT_C446105_Instance_${randomPostfix}`;
      const identifierValue = `AT_C446105_Identifier_${randomPostfix}`;
      const organization = NewOrganization.getDefaultOrganization();
      organization.name = `AT_C446105_Org_${randomPostfix}`;
      const identifierSearchOption = 'ISBN';
      const staffSuppressAccordionName = 'Staff suppress';
      const identifierTypeName = 'ISBN';
      const instancesData = [
        { source: INSTANCE_SOURCE_NAMES.FOLIO, isStaffSuppressed: false },
        { source: INSTANCE_SOURCE_NAMES.MARC, isStaffSuppressed: false },
        { source: INSTANCE_SOURCE_NAMES.FOLIO, isStaffSuppressed: true },
        { source: INSTANCE_SOURCE_NAMES.MARC, isStaffSuppressed: true },
      ];
      const instanceTitles = Array.from(
        { length: instancesData.length },
        (_, i) => `${instanceTitlePrefix}_${i}`,
      );
      const suppressedInstanceTitles = instanceTitles.filter(
        (_, index) => instancesData[index].isStaffSuppressed,
      );
      const notSuppressedInstanceTitles = instanceTitles.filter(
        (_, index) => !instancesData[index].isStaffSuppressed,
      );

      let instanceTypeId;
      let identifierTypeId;
      let order;
      let user;

      before('Create users, data', () => {
        cy.getAdminToken();

        cy.then(() => {
          InventoryInstances.deleteInstanceByTitleViaApi('AT_C446105');

          cy.getInstanceTypes({ limit: 1, query: 'source=rdacontent' }).then((instanceTypes) => {
            instanceTypeId = instanceTypes[0].id;
          });
          InventoryInstances.getIdentifierTypes({ query: `name="${identifierTypeName}"` }).then(
            (identifier) => {
              identifierTypeId = identifier.id;
            },
          );
          Organizations.createOrganizationViaApi(organization).then(() => {
            const orderData = NewOrder.getDefaultOngoingOrder({
              vendorId: organization.id,
            });
            Orders.createOrderViaApi(orderData).then((createdOrder) => {
              order = createdOrder;
            });
          });
        })
          .then(() => {
            instancesData.forEach((data, index) => {
              if (data.source === INSTANCE_SOURCE_NAMES.FOLIO) {
                InventoryInstances.createFolioInstanceViaApi({
                  instance: {
                    instanceTypeId,
                    title: instanceTitles[index],
                    identifiers: [
                      {
                        value: identifierValue,
                        identifierTypeId,
                      },
                    ],
                    staffSuppress: data.isStaffSuppressed,
                  },
                });
              } else {
                cy.createMarcBibliographicViaAPI(QuickMarcEditor.defaultValidLdr, [
                  {
                    tag: '008',
                    content: QuickMarcEditor.defaultValid008Values,
                  },
                  {
                    tag: '020',
                    content: `$a ${identifierValue}`,
                    indicators: ['\\', '\\'],
                  },
                  {
                    tag: '245',
                    content: `$a ${instanceTitles[index]}`,
                    indicators: ['1', '1'],
                  },
                ]).then((instanceId) => {
                  cy.getInstanceById(instanceId).then((body) => {
                    body.staffSuppress = data.isStaffSuppressed;
                    cy.updateInstance(body);
                  });
                });
              }
            });
          })
          .then(() => {
            cy.createTempUser([
              Permissions.uiInventoryViewInstances.gui,
              Permissions.uiOrdersCreate.gui,
              Permissions.enableStaffSuppressFacet.gui,
            ]).then((userProperties) => {
              user = userProperties;

              cy.login(user.username, user.password, {
                path: TopMenu.ordersPath,
                waiter: Orders.waitLoading,
              });
              Orders.selectOrderByPONumber(order.poNumber);
              OrderDetails.selectAddPOLine();
              OrderLineEditForm.clickTitleLookUpButton();
              SelectInstanceModal.verifyModalView();
              SelectInstanceModal.chooseSearchOption(identifierSearchOption);
              SelectInstanceModal.checkSearchOptionSelected(identifierSearchOption);
            });
          });
      });

      after('Delete test data', () => {
        cy.getAdminToken();
        InventoryInstances.deleteInstanceByTitleViaApi(instanceTitlePrefix);
        Users.deleteViaApi(user.userId);
        Organizations.deleteOrganizationViaApi(organization.id);
        Orders.deleteOrderViaApi(order.id);
      });

      it(
        'C446105 Find Instance plugin | Staff suppress facet is off by default when user has permission to use facet (search by "ISBN") (spitfire)',
        { tags: ['extendedPath', 'spitfire', 'C446105'] },
        () => {
          InventorySearchAndFilter.toggleAccordionByName(staffSuppressAccordionName);
          InventorySearchAndFilter.verifyCheckboxInAccordion(
            staffSuppressAccordionName,
            'No',
            false,
          );
          InventorySearchAndFilter.verifyCheckboxInAccordion(
            staffSuppressAccordionName,
            'Yes',
            false,
          );

          SelectInstanceModal.searchByName(identifierValue);
          InventorySearchAndFilter.verifyResultListExists();
          InventorySearchAndFilter.verifyNumberOfSearchResults(instanceTitles.length);
          instanceTitles.forEach((title) => {
            InventorySearchAndFilter.verifySearchResult(title);
          });

          InventorySearchAndFilter.selectOptionInExpandedFilter(staffSuppressAccordionName, 'Yes');
          InventorySearchAndFilter.verifyResultListExists();
          InventorySearchAndFilter.verifyNumberOfSearchResults(suppressedInstanceTitles.length);
          suppressedInstanceTitles.forEach((title) => {
            InventorySearchAndFilter.verifySearchResult(title);
          });

          InventorySearchAndFilter.selectOptionInExpandedFilter(
            staffSuppressAccordionName,
            'Yes',
            false,
          );
          InventorySearchAndFilter.selectOptionInExpandedFilter(staffSuppressAccordionName, 'No');
          InventorySearchAndFilter.verifyResultListExists();
          InventorySearchAndFilter.verifyNumberOfSearchResults(notSuppressedInstanceTitles.length);
          notSuppressedInstanceTitles.forEach((title) => {
            InventorySearchAndFilter.verifySearchResult(title);
          });
        },
      );
    });
  });
});
