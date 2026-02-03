import { including } from '@interactors/html';
import { Accordion } from '../../../../../interactors';
import InventoryItems from '../item/inventoryItems';

const getHoldingSources = (searchParams) => cy
  .okapiRequest({
    path: 'holdings-sources',
    searchParams,
  })
  .then(({ body }) => body.holdingsRecordsSources);

export default {
  getHoldingSources,

  getHoldingsFolioSource: () => getHoldingSources().then(
    (holdingsSources) => holdingsSources.filter((specialSource) => specialSource.name === 'FOLIO')[0],
  ),
  getHoldingsMarcSource: () => getHoldingSources().then(
    (holdingsSources) => holdingsSources.filter((specialSource) => specialSource.name === 'MARC')[0],
  ),
  createHoldingRecordViaApi(holdingsRecord, ignoreErrors = false) {
    return cy
      .okapiRequest({
        method: 'POST',
        path: 'holdings-storage/holdings',
        body: holdingsRecord,
        isDefaultSearchParamsRequired: false,
        failOnStatusCode: !ignoreErrors,
      })
      .then(({ status, body }) => {
        if (ignoreErrors) return { status, body };
        else return body;
      });
  },
  getHoldingsRecordsViaApi(searchParams) {
    return cy
      .okapiRequest({
        method: 'GET',
        path: 'holdings-storage/holdings',
        searchParams,
      })
      .then(({ body }) => {
        return body.holdingsRecords;
      });
  },
  deleteHoldingRecordByInstanceIdViaApi(instanceId) {
    return this.getHoldingsRecordsViaApi({
      query: `"instanceId"="${instanceId}"`,
    }).then((holdings) => {
      holdings.forEach(({ id }) => this.deleteHoldingRecordViaApi(id));
    });
  },
  deleteHoldingRecordByLocationIdViaApi(locationId) {
    this.getHoldingsRecordsViaApi({ query: `permanentLocationId="${locationId}"` }).then(
      (holdings) => {
        holdings.forEach(({ id: holdingId }) => {
          InventoryItems.getItemViaApi({ query: `holdingsRecordId="${holdingId}"` }).then(
            (items) => {
              items.forEach(({ id: itemId }) => InventoryItems.deleteItemViaApi(itemId));
            },
          );
          this.deleteHoldingRecordViaApi(holdingId);
        });
      },
    );
  },
  deleteHoldingRecordViaApi(holdingsRecordId, ignoreErrors = true) {
    return cy.okapiRequest({
      method: 'DELETE',
      path: `holdings-storage/holdings/${holdingsRecordId}`,
      isDefaultSearchParamsRequired: false,
      failOnStatusCode: !ignoreErrors,
    });
  },
  checkIfExpanded(content, expand) {
    cy.wait(2000);
    cy.get('[class^="accordion---"]')
      .contains(`Holdings: ${content}`)
      .then(($accordion) => {
        const ariaExpanded = $accordion.find('button[aria-expanded]').attr('aria-expanded');
        cy.log('Desired expanded state:', expand);
        cy.log('Current expanded state:', ariaExpanded);
        cy.wait(1000);
        if (ariaExpanded !== expand.toString()) {
          $accordion.find('button[class^="defaultCollapseButton---"]').trigger('click');
          cy.wait(1000);
        }
        cy.expect(Accordion({ label: including(`Holdings: ${content}`) }).has({ open: expand }));
      });
  },
};
