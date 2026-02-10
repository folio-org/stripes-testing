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
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';

describe('Inventory', () => {
  describe('Search in "Select instance" plugin', () => {
    describe('Filters', () => {
      const randomPostfix = getRandomPostfix();
      const instanceTitlePrefix = `AT_C446110_Instance_${randomPostfix}`;
      const organization = NewOrganization.getDefaultOrganization();
      organization.name = `AT_C446110_Org_${randomPostfix}`;
      const staffSuppressAccordionName = 'Staff suppress';
      const uuidSearchOption = 'Instance UUID';
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

      let order;
      let user;

      before('Create users, data', () => {
        cy.getAdminToken();

        cy.then(() => {
          InventoryInstances.deleteInstanceByTitleViaApi('AT_C446110');

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
                InventoryInstance.createInstanceViaApi({
                  instanceTitle: instanceTitles[index],
                  staffSuppress: data.isStaffSuppressed,
                }).then(({ instanceData }) => {
                  data.uuid = instanceData.instanceId;
                  cy.getInstanceById(instanceData.instanceId).then((body) => {
                    body.staffSuppress = data.isStaffSuppressed;
                    cy.updateInstance(body);
                  });
                });
              } else {
                cy.createSimpleMarcBibViaAPI(instanceTitles[index]).then((instanceId) => {
                  data.uuid = instanceId;
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
              SelectInstanceModal.chooseSearchOption(uuidSearchOption);
              SelectInstanceModal.checkSearchOptionSelected(uuidSearchOption);
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
        'C446110 Find Instance plugin | Staff suppress facet is off by default when user has permission to use facet (search by "Instance UUID") (spitfire)',
        { tags: ['extendedPath', 'spitfire', 'C446110'] },
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

          instancesData.forEach((data, index) => {
            SelectInstanceModal.searchByName(data.uuid);
            InventorySearchAndFilter.verifyNumberOfSearchResults(1);
            InventorySearchAndFilter.verifySearchResult(instanceTitles[index]);
          });

          cy.intercept('GET', '/search/instances*').as('getInstances');
          InventorySearchAndFilter.selectOptionInExpandedFilter(staffSuppressAccordionName, 'Yes');
          cy.wait('@getInstances').its('response.statusCode').should('eq', 200);
          InventorySearchAndFilter.verifyNumberOfSearchResults(1);
          InventorySearchAndFilter.verifySearchResult(instanceTitles.at(-1));
        },
      );
    });
  });
});
