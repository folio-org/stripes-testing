import { including } from 'bigtest';
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
  createHoldingRecordViaApi(holdingsRecord) {
    return cy
      .okapiRequest({
        method: 'POST',
        path: 'holdings-storage/holdings',
        body: holdingsRecord,
        isDefaultSearchParamsRequired: false,
      })
      .then(({ body }) => body);
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
  deleteHoldingRecordViaApi(holdingsRecordId) {
    return cy.okapiRequest({
      method: 'DELETE',
      path: `holdings-storage/holdings/${holdingsRecordId}`,
      isDefaultSearchParamsRequired: false,
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
        if (ariaExpanded !== expand.toString()) {
          cy.wrap($accordion.find('button[class^="defaultCollapseButton---"]')).click();
        }
        cy.expect(Accordion({ label: including(`Holdings: ${content}`) }).has({ open: expand }));
      });
  },
};
