import uuid from 'uuid';
import {
  HTML,
  including,
  Section,
  or,
  MultiColumnList,
  Button,
  Pane,
  TextField,
  Checkbox
} from '../../../../interactors';
import NewInventoryInstance from './newInventoryInstance';
import InventorySearch from './inventorySearch';
import InventoryInstance from './inventoryInstance';
import TopMenu from '../topMenu';

const rootSection = Section({ id: 'pane-results' });
const inventoriesList = rootSection.find(MultiColumnList({ id: 'list-inventory' }));
const actionsButton = rootSection.find(Button('Actions'));

export default {
  waitLoading:() => {
    cy.expect(rootSection.find(HTML(including('Choose a filter or enter a search query to show results'))).absent());
    cy.expect(rootSection.find(HTML(including('Loading…'))).absent());
    cy.expect(or(inventoriesList.exists()),
      rootSection.find(HTML(including('No results found'))).exists());
  },
  selectInstance(rowNumber = 0) {
    cy.do(inventoriesList.click({ row: rowNumber }));
  },
  add: (title) => {
    cy.do(actionsButton.click());
    cy.do(Button('New').click());
    NewInventoryInstance.waitLoading();
    NewInventoryInstance.fillRequiredValues(title);
    NewInventoryInstance.save();
  },

  resetAllFilters:() => {
    cy.do(Pane('Search & filter').find(Button('Reset all')).click());
  },

  searchByTag:(tagName) => {
    cy.do(Button({ id:'accordion-toggle-button-instancesTags' }).click());
    // wait for data to be loaded
    cy.intercept('/search/instances/facets?facet=instanceTags**').as('getTags');
    cy.do(Section({ id:'instancesTags' }).find(TextField()).click());
    cy.do(Section({ id:'instancesTags' }).find(TextField()).fillIn(tagName));
    cy.wait('@getTags');
    // TODO: clarify with developers what should be waited
    cy.wait(1000);
    cy.do(Section({ id:'instancesTags' }).find(TextField()).focus());
    cy.do(Section({ id:'instancesTags' }).find(TextField()).click());
    cy.do(Checkbox(tagName).click());
  },

  createInstanceViaApi(instanceName, itemBarcode, publisher = null, holdingCallNumber = '1', itemCallNumber = '2') {
    let alternativeTitleType = '';
    const instanceId = uuid();
    cy.getToken(Cypress.env('diku_login'), Cypress.env('diku_password'))
      .then(() => {
        cy.getLoanTypes({ limit: 1 });
        cy.getMaterialTypes({ limit: 1 });
        cy.getLocations({ limit: 1 });
        cy.getHoldingTypes({ limit: 1 });
        cy.getHoldingSources({ limit: 1 });
        cy.getInstanceTypes({ limit: 1 });
        cy.getAlternativeTitlesTypes({ limit: 1, query: 'name="Uniform title"' }).then(titleTypes => {
          alternativeTitleType = titleTypes[0].id;
        });
      })
      .then(() => {
        cy.createInstance({
          instance: {
            instanceTypeId: Cypress.env('instanceTypes')[0].id,
            title: instanceName,
            alternativeTitles: [{
              alternativeTitleTypeId: alternativeTitleType,
              alternativeTitle: instanceName
            }],
            publication: [{ publisher: publisher ?? 'MIT' }],
            instanceId
          },
          holdings: [{
            holdingsTypeId: Cypress.env('holdingsTypes')[0].id,
            permanentLocationId: Cypress.env('locations')[0].id,
            sourceId: Cypress.env('holdingSources')[0].id,
          }],
          items: [
            [{
              barcode: itemBarcode,
              missingPieces: '3',
              numberOfMissingPieces: '3',
              status: { name: 'Available' },
              permanentLoanType: { id: Cypress.env('loanTypes')[0].id },
              materialType: { id: Cypress.env('materialTypes')[0].id },
              itemLevelCallNumber: itemCallNumber
            }],
          ],
        });
      })
      .then(() => {
        cy.getHoldings({ limit: 1, query: `"instanceId"="${instanceId}"` })
          .then((holdings) => {
            cy.updateHoldingRecord(holdings[0].id, {
              ...holdings[0],
              callNumber: holdingCallNumber
            });
          });
      });
  },

  deleteInstanceViaApi(itemBarcode) {
    cy.getInstance({ limit: 1, expandAll: true, query: `"items.barcode"=="${itemBarcode}"` })
      .then((instance) => {
        cy.deleteItem(instance.items[0].id);
        cy.deleteHoldingRecord(instance.holdings[0].id);
        cy.deleteInstanceApi(instance.id);
      });
  },

  openItem(instanceTitle, itemLocation, userItemBarcode) {
    cy.visit(TopMenu.inventoryPath);
    InventorySearch.searchByParameter('Title (all)', instanceTitle);
    this.selectInstance();
    InventoryInstance.openHoldings(itemLocation);
    InventoryInstance.openItemView(userItemBarcode);
  }
};
