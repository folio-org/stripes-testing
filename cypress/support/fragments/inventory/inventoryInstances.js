/* eslint-disable cypress/no-unnecessary-waiting */
import uuid from 'uuid';
import { HTML, including } from '@interactors/html';
import {
  Section,
  or,
  MultiColumnList,
  Button,
  Pane,
  TextField,
  Checkbox,
  Modal,
  Select
} from '../../../../interactors';
import InventoryHoldings from './holdings/inventoryHoldings';
import inventoryNewInstance from './inventoryNewInstance';
import InventoryInstance from './inventoryInstance';
import Arrays from '../../utils/arrays';
import { ITEM_STATUS_NAMES } from '../../constants';

const rootSection = Section({ id: 'pane-results' });
const inventoriesList = rootSection.find(MultiColumnList({ id: 'list-inventory' }));
const actionsButton = rootSection.find(Button('Actions'));
const singleRecordImportModal = Modal('Single record import');

const createInstanceViaAPI = (instanceWithSpecifiedNewId) => cy.okapiRequest({
  method: 'POST',
  path: 'inventory/instances',
  body: instanceWithSpecifiedNewId
});

const createHoldingViaAPI = (holdingWithIds) => cy.okapiRequest({
  method: 'POST',
  path: 'holdings-storage/holdings',
  body: holdingWithIds
});

const createItemViaAPI = (itemWithIds) => cy.okapiRequest({
  method: 'POST',
  path: 'inventory/items',
  body: itemWithIds
});
const waitContentLoading = () => {
  cy.expect(rootSection.find(HTML(including('Choose a filter or enter a search query to show results.'))).exists());
};

export default {
  waitContentLoading,
  waitLoading: () => {
    cy.expect(rootSection.find(HTML(including('Choose a filter or enter a search query to show results'))).absent());
    cy.expect(rootSection.find(HTML(including('Loading…'))).absent());
    cy.expect(or(inventoriesList.exists()),
      rootSection.find(HTML(including('No results found'))).exists());
    // need to wait until list to be formed
    cy.wait(2500);
  },

  selectInstance: (rowNumber = 0) => {
    cy.intercept('/inventory/instances/*').as('getView');
    cy.do(inventoriesList.focus({ row: rowNumber }));
    cy.do(inventoriesList.click({ row: rowNumber }));
    cy.wait('@getView');
  },

  add: (title) => {
    cy.do(actionsButton.click());
    cy.do(Button('New').click());
    inventoryNewInstance.waitLoading();
    inventoryNewInstance.fillRequiredValues(title);
    inventoryNewInstance.save();
  },

  resetAllFilters: () => {
    cy.do(Pane('Search & filter').find(Button('Reset all')).click());
  },

  searchByTag: (tagName) => {
    cy.do(Button({ id: 'accordion-toggle-button-instancesTags' }).click());
    // wait for data to be loaded
    cy.intercept('/search/instances/facets?facet=instanceTags**').as('getTags');
    cy.do(Section({ id: 'instancesTags' }).find(TextField()).click());
    cy.do(Section({ id: 'instancesTags' }).find(TextField()).fillIn(tagName));
    cy.wait('@getTags');
    // TODO: clarify with developers what should be waited
    cy.wait(1000);
    cy.do(Section({ id: 'instancesTags' }).find(TextField()).focus());
    cy.do(Section({ id: 'instancesTags' }).find(TextField()).click());
    cy.do(Checkbox(tagName).click());
  },

  createInstanceViaApi(instanceName, itemBarcode, publisher = null, holdingCallNumber = '1', itemCallNumber = '2', accessionNumber = 'test_number_1', holdings = null) {
    let alternativeTitleTypeId = '';
    let holdingSourceId = '';
    const instanceId = uuid();
    cy.getToken(Cypress.env('diku_login'), Cypress.env('diku_password'))
      .then(() => {
        cy.getLoanTypes({ limit: 1 });
        cy.getMaterialTypes({ limit: 1 });
        cy.getLocations({ limit: 50 });
        cy.getHoldingTypes({ limit: 1 });
        InventoryHoldings.getHoldingSources({ limit: 1, query: '(name=="FOLIO")' }).then(holdingSources => {
          holdingSourceId = holdingSources[0].id;
          cy.getInstanceTypes({ limit: 1 });
          cy.getAlternativeTitlesTypes({ limit: 1, query: 'name="Uniform title"' }).then(titleTypes => {
            alternativeTitleTypeId = titleTypes[0].id;
          });
        });
      })
      .then(() => {
        cy.createInstance({
          instance: {
            instanceTypeId: Cypress.env('instanceTypes')[0].id,
            title: instanceName,
            alternativeTitles: [{
              alternativeTitleTypeId,
              alternativeTitle: instanceName
            }],
            publication: [{ publisher: publisher ?? 'MIT' }],
            instanceId
          },
          holdings: holdings || [{
            holdingsTypeId: Cypress.env('holdingsTypes')[0].id,
            permanentLocationId: Arrays.getRandomElement(Cypress.env('locations')).id,
            temporaryLocationId: Arrays.getRandomElement(Cypress.env('locations')).id,
            sourceId: holdingSourceId,
          }],
          items: [
            [
              {
                barcode: itemBarcode,
                missingPieces: '3',
                numberOfMissingPieces: '3',
                status: { name: ITEM_STATUS_NAMES.AVAILABLE },
                permanentLoanType: { id: Cypress.env('loanTypes')[0].id },
                materialType: { id: Cypress.env('materialTypes')[0].id },
                itemLevelCallNumber: itemCallNumber,
                accessionNumber
              },
              {
                barcode: 'secondBarcode_' + itemBarcode,
                missingPieces: '3',
                numberOfMissingPieces: '3',
                status: { name: ITEM_STATUS_NAMES.AVAILABLE },
                permanentLoanType: { id: Cypress.env('loanTypes')[0].id },
                materialType: { id: Cypress.env('materialTypes')[0].id },
                itemLevelCallNumber: itemCallNumber,
                accessionNumber
              }
            ],
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
    return instanceId;
  },

  createInstanceMARCSourceViaApi(instanceName, itemBarcode, publisher = null, holdingCallNumber = '1', itemCallNumber = '2', accessionNumber = 'test_number_1') {
    let alternativeTitleTypeId = '';
    let holdingSourceId = '';
    const instanceId = uuid();
    cy.getToken(Cypress.env('diku_login'), Cypress.env('diku_password'))
      .then(() => {
        cy.getLoanTypes({ limit: 1 });
        cy.getMaterialTypes({ limit: 1 });
        cy.getLocations({ limit: 1 });
        cy.getHoldingTypes({ limit: 1 });
        InventoryHoldings.getHoldingSources({ limit: 1, query: '(name=="MARC")' }).then(holdingSources => {
          holdingSourceId = holdingSources[0].id;
          cy.getInstanceTypes({ limit: 1 });
          cy.getAlternativeTitlesTypes({ limit: 1, query: 'name="Uniform title"' }).then(titleTypes => {
            alternativeTitleTypeId = titleTypes[0].id;
          });
        });
      })
      .then(() => {
        cy.createInstance({
          instance: {
            instanceTypeId: Cypress.env('instanceTypes')[0].id,
            title: instanceName,
            alternativeTitles: [{
              alternativeTitleTypeId,
              alternativeTitle: instanceName
            }],
            publication: [{ publisher: publisher ?? 'MIT' }],
            instanceId
          },
          holdings: [{
            holdingsTypeId: Cypress.env('holdingsTypes')[0].id,
            permanentLocationId: Cypress.env('locations')[0].id,
            sourceId: holdingSourceId,
          }],
          items: [
            [
              {
                barcode: itemBarcode,
                missingPieces: '3',
                numberOfMissingPieces: '3',
                status: { name: ITEM_STATUS_NAMES.AVAILABLE },
                permanentLoanType: { id: Cypress.env('loanTypes')[0].id },
                materialType: { id: Cypress.env('materialTypes')[0].id },
                itemLevelCallNumber: itemCallNumber,
                accessionNumber
              },
              {
                barcode: 'secondBarcode_' + itemBarcode,
                missingPieces: '3',
                numberOfMissingPieces: '3',
                status: { name: ITEM_STATUS_NAMES.AVAILABLE },
                permanentLoanType: { id: Cypress.env('loanTypes')[0].id },
                materialType: { id: Cypress.env('materialTypes')[0].id },
                itemLevelCallNumber: itemCallNumber,
                accessionNumber
              }
            ],
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
    return instanceId;
  },

  deleteInstanceAndHoldingRecordAndAllItemsViaApi(itemBarcode) {
    cy.getInstance({ limit: 1, expandAll: true, query: `"items.barcode"=="${itemBarcode}"` })
      .then((instance) => {
        cy.wrap(instance.items).each((item) => cy.deleteItemViaApi(item.id));
        cy.wrap(instance.holdings).each((holding) => cy.deleteHoldingRecordViaApi(holding.id));
        InventoryInstance.deleteInstanceViaApi(instance.id);
      });
  },

  createFolioInstanceViaApi: ({ instance, holdings = [], items = [] }) => {
    InventoryHoldings.getHoldingsFolioSource()
      .then(folioSource => {
        const ids = {};
        const instanceWithSpecifiedNewId = { ...instance, id: uuid(), source: folioSource.name };
        ids.instanceId = instanceWithSpecifiedNewId.id;
        createInstanceViaAPI(instanceWithSpecifiedNewId).then(() => {
          ids.holdingIds = [];
          cy.wrap(holdings.forEach(holding => {
            const holdingWithIds = { ...holding, id: uuid(), instanceId: instanceWithSpecifiedNewId.id, sourceId: folioSource.id };
            createHoldingViaAPI(holdingWithIds).then(() => {
              const itemIds = [];
              cy.wrap(items.forEach(item => {
                const itemWithIds = { ...item, id: uuid(), holdingsRecordId: holdingWithIds.id };
                itemIds.push(itemWithIds.id);
                createItemViaAPI(itemWithIds);
              })).then(() => {
                ids.holdingIds.push({ id: holdingWithIds.id, itemIds });
              });
            });
          })).then(() => {
            cy.wrap(ids).as('ids');
          });
        });
      });
    return cy.get('@ids');
  },

  getInstanceIdApi: (searchParams) => {
    return cy
      .okapiRequest({
        path: 'instance-storage/instances',
        searchParams,
        isDefaultSearchParamsRequired: false
      })
      .then((res) => {
        return res.body.instances[0].id;
      });
  },

  searchBySource: (source) => {
    cy.do(Button({ id: 'accordion-toggle-button-source' }).click());
    cy.do(Checkbox(source).click());
  },

  importWithOclc: (oclc) => {
    cy.do(actionsButton.click());
    cy.do(Button({ id: 'dropdown-clickable-import-record' }).click());
    cy.do(Select({ name:'selectedJobProfileId' }).choose('Inventory Single Record - Default Create Instance (Default)'));
    cy.do(singleRecordImportModal.find(TextField({ name:'externalIdentifier' })).fillIn(oclc));
    cy.do(singleRecordImportModal.find(Button('Import')).click());
  },

  verifyInstanceDetailsView:() => cy.expect(Section({ id: 'pane-instancedetails' }).exists())
};
