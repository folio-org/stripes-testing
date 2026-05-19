import { Section, KeyValue } from '../../../../interactors';
import dateTools from '../../utils/dateTools';

export default {
  mainLibraryLocation: 'Main Library',
  onlineLibraryLocation: 'Online',

  verifyOrderDateOpened: () => {
    cy.do(
      Section({ id: 'purchaseOrder' })
        .find(KeyValue('Date opened'))
        .perform((element) => {
          const rawDate = element.innerText;
          const parsedDate = Date.parse(
            rawDate.match(/\d{1,2}\/\d{1,2}\/\d{4},\s\d{1,2}:\d{1,2}\s\w{2}/gm)[0],
          );
          // For local run it needs to add 18000000
          // The time on the server and the time on the yuai differ by 3 hours. It was experimentally found that it is necessary to add 18000000 sec
          dateTools.verifyDate(parsedDate, 18000000);
        }),
    );
  },

  /* Request interceptors */

  interceptGetOrders() {
    cy.intercept('GET', '/orders/composite-orders*').as('waiterForOrdersQueryCompleted');
  },
  waitForOrdersQueryCompleted() {
    cy.wait('@waiterForOrdersQueryCompleted');
  },

  interceptGetOrderLines() {
    cy.intercept('GET', '/orders/order-lines*').as('waiterForOrderLinesQueryCompleted');
  },
  waitForOrderLinesQueryCompleted() {
    cy.wait('@waiterForOrderLinesQueryCompleted');
  },

  interceptCustomFields() {
    cy.intercept('GET', '/custom-fields*').as('waiterForCustomFieldsQueryCompleted');
  },
  waitForCustomFieldsQueryCompleted() {
    cy.wait('@waiterForCustomFieldsQueryCompleted');
  },

  interceptGetAcquisitionUnits() {
    cy.intercept('GET', '/acquisition-units/units*').as('waiterForAcquisitionUnitsQueryCompleted');
  },
  waitForAcquisitionUnitsQueryCompleted() {
    cy.wait('@waiterForAcquisitionUnitsQueryCompleted');
  },

  interceptGetOrganizations() {
    cy.intercept('GET', '/organizations/organizations*').as('waiterForOrganizationsQueryCompleted');
  },
  waitForOrganizationsQueryCompleted() {
    cy.wait('@waiterForOrganizationsQueryCompleted');
  },

  interceptGetPrefixes() {
    cy.intercept('GET', '/orders/configuration/prefixes*').as('waiterForPrefixesQueryCompleted');
  },
  waitForPrefixesQueryCompleted() {
    cy.wait('@waiterForPrefixesQueryCompleted');
  },

  interceptGetSuffixes() {
    cy.intercept('GET', '/orders/configuration/suffixes*').as('waiterForSuffixesQueryCompleted');
  },
  waitForSuffixesQueryCompleted() {
    cy.wait('@waiterForSuffixesQueryCompleted');
  },

  interceptGetReasonsForClosure() {
    cy.intercept('GET', '/orders/configuration/reasons-for-closure*').as(
      'waiterForReasonsForClosureQueryCompleted',
    );
  },
  waitForReasonsForClosureQueryCompleted() {
    cy.wait('@waiterForReasonsForClosureQueryCompleted');
  },

  interceptGetTenantAddresses() {
    cy.intercept('GET', '/tenant-addresses*').as('waiterForTenantAddressesQueryCompleted');
  },
  waitForTenantAddressesQueryCompleted() {
    cy.wait('@waiterForTenantAddressesQueryCompleted');
  },

  interceptGetSettingsEntries() {
    cy.intercept('GET', '/settings/entries*').as('waiterForSettingsEntriesQueryCompleted');
  },
  waitForSettingsEntriesQueryCompleted() {
    cy.wait('@waiterForSettingsEntriesQueryCompleted');
  },

  interceptGetTags() {
    cy.intercept('GET', '/tags*').as('waiterForTagsQueryCompleted');
  },
  waitForTagsQueryCompleted() {
    cy.wait('@waiterForTagsQueryCompleted');
  },

  interceptGetAcquisitionMethods() {
    cy.intercept('GET', '/orders/acquisition-methods*').as(
      'waiterForAcquisitionMethodsQueryCompleted',
    );
  },
  waitForAcquisitionMethodsQueryCompleted() {
    cy.wait('@waiterForAcquisitionMethodsQueryCompleted');
  },

  interceptGetMaterialTypes() {
    cy.intercept('GET', '/material-types*').as('waiterForMaterialTypesQueryCompleted');
  },
  waitForMaterialTypesQueryCompleted() {
    cy.wait('@waiterForMaterialTypesQueryCompleted');
  },

  interceptGetOrdersStorageSettings() {
    cy.intercept('GET', '/orders-storage/settings*').as(
      'waiterForOrdersStorageSettingsQueryCompleted',
    );
  },
  waitForOrdersStorageSettingsQueryCompleted() {
    cy.wait('@waiterForOrdersStorageSettingsQueryCompleted');
  },
};
