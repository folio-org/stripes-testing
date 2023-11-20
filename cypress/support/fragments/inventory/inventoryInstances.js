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
  Select,
  TextInput,
  TextArea,
  PaneHeader,
} from '../../../../interactors';
import CheckinActions from '../check-in-actions/checkInActions';
import InventoryHoldings from './holdings/inventoryHoldings';
import InventoryNewInstance from './inventoryNewInstance';
import InventoryInstance from './inventoryInstance';
import InventoryItems from './item/inventoryItems';
import Arrays from '../../utils/arrays';
import { ITEM_STATUS_NAMES, LOCATION_NAMES } from '../../constants';
import getRandomPostfix from '../../utils/stringTools';
import generateUniqueItemBarcodeWithShift from '../../utils/generateUniqueItemBarcodeWithShift';
import { AdvancedSearch, AdvancedSearchRow } from '../../../../interactors/advanced-search';

const rootSection = Section({ id: 'pane-results' });
const inventoriesList = rootSection.find(MultiColumnList({ id: 'list-inventory' }));
const actionsButton = rootSection.find(Button('Actions'));
const singleRecordImportModal = Modal('Single record import');
const inventorySearchInput = TextInput({ id: 'input-inventory-search' });
const searchButton = Button('Search', { type: 'submit' });
const paneHeaderSearch = PaneHeader('Inventory');

const advSearchButton = Button('Advanced search');
const advSearchModal = Modal('Advanced search');
const buttonSearchInAdvSearchModal = advSearchModal.find(
  Button({ ariaLabel: 'Search', disabled: false }),
);
const buttonCancelInAdvSearchModal = advSearchModal.find(
  Button({ ariaLabel: 'Cancel', disabled: false }),
);
const buttonCloseInAdvSearchModal = advSearchModal.find(
  Button({ id: 'advanced-search-modal-close-button' }),
);
const inventorySearchAndFilterInput = Select({ id: 'input-inventory-search-qindex' });
const advSearchOperatorSelect = Select({ label: 'Operator*' });
const advSearchModifierSelect = Select({ label: 'Match option*' });
const advSearchOptionSelect = Select({ label: 'Search options*' });

const advSearchOperators = ['AND', 'OR', 'NOT'];
const advSearchModifiers = ['Exact phrase', 'Contains all', 'Starts with', 'Contains any'];
const advSearchItemModifiers = ['Exact phrase', 'Contains all', 'Starts with'];
const advSearchModifiersValues = ['exactPhrase', 'containsAll', 'startsWith', 'containsAny'];
const searchInstancesOptions = [
  'Keyword (title, contributor, identifier, HRID, UUID)',
  'Contributor',
  'Title (all)',
  'Identifier (all)',
  'ISBN',
  'ISSN',
  'OCLC number, normalized',
  'Instance notes (all)',
  'Instance administrative notes',
  'Subject',
  'Effective call number (item), shelving order',
  'Instance HRID',
  'Instance UUID',
  'Authority UUID',
  'All',
  'Query search',
  'Advanced search',
];
const searchHoldingsOptions = [
  'Keyword (title, contributor, identifier, HRID, UUID)',
  'ISBN',
  'ISSN',
  'Call number, eye readable',
  'Call number, normalized',
  'Holdings notes (all)',
  'Holdings administrative notes',
  'Holdings HRID',
  'Holdings UUID',
  'All',
];
const searchItemsOptions = [
  'Keyword (title, contributor, identifier, HRID, UUID)',
  'Barcode',
  'ISBN',
  'ISSN',
  'Effective call number (item), eye readable',
  'Effective call number (item), normalized',
  'Item notes (all)',
  'Item administrative notes',
  'Circulation notes',
  'Item HRID',
  'Item UUID',
  'All',
];
const searchInstancesOptionsValues = [
  'all',
  'contributor',
  'title',
  'identifier',
  'isbn',
  'issn',
  'oclc',
  'instanceNotes',
  'instanceAdministrativeNotes',
  'subject',
  'callNumber',
  'hrid',
  'id',
  'authorityId',
  'allFields',
  'querySearch',
  'advancedSearch',
];
const searchHoldingsOptionsValues = [
  'keyword',
  'isbn',
  'issn',
  'holdingsFullCallNumbers',
  'holdingsNormalizedCallNumbers',
  'holdingsNotes',
  'holdingsAdministrativeNotes',
  'holdingsHrid',
  'hid',
  'allFields',
];
const searchItemsOptionsValues = [
  'keyword',
  'barcode',
  'isbn',
  'issn',
  'itemFullCallNumbers',
  'itemNormalizedCallNumbers',
  'itemNotes',
  'itemAdministrativeNotes',
  'itemCirculationNotes',
  'itemHrid',
  'iid',
  'allFields',
];
const advSearchInstancesOptions = searchInstancesOptions.filter((option, index) => index <= 14);
const advSearchHoldingsOptions = searchHoldingsOptions.filter((option, index) => index <= 14);
const advSearchItemsOptions = searchItemsOptions.filter((option, index) => index <= 14);
const advSearchInstancesOptionsValues = searchInstancesOptionsValues
  .map((option, index) => (index ? option : 'keyword'))
  .filter((option, index) => index <= 14);
const advSearchHoldingsOptionsValues = searchHoldingsOptionsValues
  .map((option, index) => (index ? option : 'keyword'))
  .filter((option, index) => index <= 14);
const advSearchItemsOptionsValues = searchItemsOptionsValues
  .map((option, index) => (index ? option : 'keyword'))
  .filter((option, index) => index <= 14);

const createInstanceViaAPI = (instanceWithSpecifiedNewId) => cy.okapiRequest({
  method: 'POST',
  path: 'inventory/instances',
  body: instanceWithSpecifiedNewId,
});

const waitContentLoading = () => {
  cy.expect(
    rootSection
      .find(HTML(including('Choose a filter or enter a search query to show results.')))
      .exists(),
  );
};

const getCallNumberTypes = (searchParams) => cy
  .okapiRequest({
    path: 'call-number-types',
    searchParams,
    isDefaultSearchParamsRequired: false,
  })
  .then((response) => {
    return response.body.callNumberTypes;
  });

const getHoldingsNotesTypes = (searchParams) => cy
  .okapiRequest({
    path: 'holdings-note-types',
    searchParams,
    isDefaultSearchParamsRequired: false,
  })
  .then((response) => {
    return response.body.holdingsNoteTypes;
  });

const getItemNoteTypes = (searchParams) => cy
  .okapiRequest({
    path: 'item-note-types',
    searchParams,
    isDefaultSearchParamsRequired: false,
  })
  .then((response) => {
    return response.body.itemNoteTypes;
  });

const getIdentifierTypes = (searchParams) => cy
  .okapiRequest({
    path: 'identifier-types',
    searchParams,
    isDefaultSearchParamsRequired: false,
  })
  .then((response) => {
    return response.body.identifierTypes[0];
  });

export default {
  getHoldingsNotesTypes,
  getCallNumberTypes,
  getIdentifierTypes,
  getItemNoteTypes,
  waitContentLoading,
  waitLoading: () => {
    cy.expect(
      rootSection
        .find(HTML(including('Choose a filter or enter a search query to show results')))
        .absent(),
    );
    cy.expect(rootSection.find(HTML(including('Loading…'))).absent());
    cy.expect(
      or(inventoriesList.exists()),
      rootSection.find(HTML(including('No results found'))).exists(),
    );
  },

  selectInstance: (rowNumber = 0) => {
    cy.intercept('/inventory/instances/*').as('getView');
    cy.do(inventoriesList.focus({ row: rowNumber }));
    cy.do(inventoriesList.click({ row: rowNumber }));
    cy.wait('@getView');
  },

  addNewInventory() {
    cy.do([actionsButton.click(), Button('New').click()]);

    InventoryNewInstance.waitLoading();

    return InventoryNewInstance;
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

  createInstanceViaApi(
    instanceName,
    itemBarcode,
    publisher = null,
    holdingCallNumber = '1',
    itemCallNumber = '2',
    accessionNumber = 'test_number_1',
    holdings = null,
  ) {
    let alternativeTitleTypeId = '';
    let holdingSourceId = '';
    const instanceId = uuid();
    cy.getToken(Cypress.env('diku_login'), Cypress.env('diku_password'))
      .then(() => {
        cy.getLoanTypes({ limit: 1 });
        cy.getMaterialTypes({ limit: 1 });
        cy.getLocations({ limit: 1, query: `name="${LOCATION_NAMES.MAIN_LIBRARY_UI}"` });
        cy.getHoldingTypes({ limit: 1 });
        InventoryHoldings.getHoldingSources({ limit: 1, query: '(name=="FOLIO")' }).then(
          (holdingSources) => {
            holdingSourceId = holdingSources[0].id;
            cy.getInstanceTypes({ limit: 1 });
            cy.getAlternativeTitlesTypes({ limit: 1, query: 'name="Uniform title"' }).then(
              (titleTypes) => {
                alternativeTitleTypeId = titleTypes[0].id;
              },
            );
          },
        );
      })
      .then(() => {
        cy.createInstance({
          instance: {
            instanceTypeId: Cypress.env('instanceTypes')[0].id,
            title: instanceName,
            alternativeTitles: [
              {
                alternativeTitleTypeId,
                alternativeTitle: instanceName,
              },
            ],
            publication: [{ publisher: publisher ?? 'MIT' }],
            instanceId,
          },
          holdings: holdings || [
            {
              holdingsTypeId: Cypress.env('holdingsTypes')[0].id,
              permanentLocationId: Arrays.getRandomElement(Cypress.env('locations')).id,
              temporaryLocationId: Arrays.getRandomElement(Cypress.env('locations')).id,
              sourceId: holdingSourceId,
            },
          ],
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
                accessionNumber,
              },
              {
                barcode: 'secondBarcode_' + itemBarcode,
                missingPieces: '3',
                numberOfMissingPieces: '3',
                status: { name: ITEM_STATUS_NAMES.AVAILABLE },
                permanentLoanType: { id: Cypress.env('loanTypes')[0].id },
                materialType: { id: Cypress.env('materialTypes')[0].id },
                itemLevelCallNumber: itemCallNumber,
                accessionNumber,
              },
            ],
          ],
        });
      })
      .then(() => {
        cy.getHoldings({ limit: 1, query: `"instanceId"="${instanceId}"` }).then(
          (holdingsToProceed) => {
            cy.updateHoldingRecord(holdingsToProceed[0].id, {
              ...holdingsToProceed[0],
              callNumber: holdingCallNumber,
            });
          },
        );
      });
    return instanceId;
  },

  createInstanceMARCSourceViaApi(
    instanceName,
    itemBarcode,
    publisher = null,
    holdingCallNumber = '1',
    itemCallNumber = '2',
    accessionNumber = 'test_number_1',
  ) {
    let alternativeTitleTypeId = '';
    let holdingSourceId = '';
    const instanceId = uuid();
    cy.getAdminToken()
      .then(() => {
        cy.getLoanTypes({ limit: 1 });
        cy.getMaterialTypes({ limit: 1 });
        cy.getLocations({ limit: 1 });
        cy.getHoldingTypes({ limit: 1 });
        InventoryHoldings.getHoldingSources({ limit: 1, query: '(name=="MARC")' }).then(
          (holdingSources) => {
            holdingSourceId = holdingSources[0].id;
            cy.getInstanceTypes({ limit: 1 });
            cy.getAlternativeTitlesTypes({ limit: 1, query: 'name="Uniform title"' }).then(
              (titleTypes) => {
                alternativeTitleTypeId = titleTypes[0].id;
              },
            );
          },
        );
      })
      .then(() => {
        cy.createInstance({
          instance: {
            instanceTypeId: Cypress.env('instanceTypes')[0].id,
            title: instanceName,
            alternativeTitles: [
              {
                alternativeTitleTypeId,
                alternativeTitle: instanceName,
              },
            ],
            publication: [{ publisher: publisher ?? 'MIT' }],
            instanceId,
          },
          holdings: [
            {
              holdingsTypeId: Cypress.env('holdingsTypes')[0].id,
              permanentLocationId: Cypress.env('locations')[0].id,
              sourceId: holdingSourceId,
            },
          ],
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
                accessionNumber,
              },
              {
                barcode: 'secondBarcode_' + itemBarcode,
                missingPieces: '3',
                numberOfMissingPieces: '3',
                status: { name: ITEM_STATUS_NAMES.AVAILABLE },
                permanentLoanType: { id: Cypress.env('loanTypes')[0].id },
                materialType: { id: Cypress.env('materialTypes')[0].id },
                itemLevelCallNumber: itemCallNumber,
                accessionNumber,
              },
            ],
          ],
        });
      })
      .then(() => {
        cy.getHoldings({ limit: 1, query: `"instanceId"="${instanceId}"` }).then((holdings) => {
          cy.updateHoldingRecord(holdings[0].id, {
            ...holdings[0],
            callNumber: holdingCallNumber,
          });
        });
      });
    return instanceId;
  },

  deleteInstanceAndHoldingRecordAndAllItemsViaApi(itemBarcode) {
    cy.getInstance({ limit: 1, expandAll: true, query: `"items.barcode"=="${itemBarcode}"` }).then(
      (instance) => {
        cy.wrap(instance.items).each((item) => cy.deleteItemViaApi(item.id));
        cy.wrap(instance.holdings).each((holding) => cy.deleteHoldingRecordViaApi(holding.id));
        InventoryInstance.deleteInstanceViaApi(instance.id);
      },
    );
  },

  deleteInstanceAndItsHoldingsAndItemsViaApi(instanceId) {
    cy.getInstance({ limit: 1, expandAll: true, query: `"id"=="${instanceId}"` }).then(
      (instance) => {
        instance.items.forEach((item) => cy.deleteItemViaApi(item.id));
        instance.holdings.forEach((holding) => cy.deleteHoldingRecordViaApi(holding.id));
        InventoryInstance.deleteInstanceViaApi(instance.id);
      },
    );
  },

  createLoanType: (loanType) => {
    return cy
      .okapiRequest({
        path: 'loan-types',
        method: 'POST',
        body: loanType,
      })
      .then(({ body }) => {
        return body;
      });
  },

  deleteLoanType: (loanId) => {
    return cy.okapiRequest({
      path: `loan-types/${loanId}`,
      method: 'DELETE',
    });
  },

  getLoanTypes(searchParams = { limit: 1 }) {
    return cy
      .okapiRequest({
        path: 'loan-types',
        searchParams,
      })
      .then(({ body }) => {
        return body.loantypes;
      });
  },
  getMaterialTypes(searchParams = { limit: 1 }) {
    return cy
      .okapiRequest({
        path: 'material-types',
        searchParams,
        isDefaultSearchParamsRequired: false,
      })
      .then(({ body }) => {
        return body.mtypes;
      });
  },
  getLocations(searchParams = { limit: 1 }) {
    return cy
      .okapiRequest({
        path: 'locations',
        searchParams,
        isDefaultSearchParamsRequired: false,
      })
      .then(({ body }) => {
        return body.locations;
      });
  },
  getHoldingTypes(searchParams = { limit: 1 }) {
    return cy
      .okapiRequest({
        path: 'holdings-types',
        searchParams,
      })
      .then(({ body }) => {
        return body.holdingsTypes;
      });
  },
  getInstanceTypes(searchParams = { limit: 1 }) {
    return cy
      .okapiRequest({
        path: 'instance-types',
        searchParams,
      })
      .then(({ body }) => {
        return body.instanceTypes;
      });
  },
  generateFolioInstances({
    count = 1,
    barcodes,
    status = ITEM_STATUS_NAMES.AVAILABLE,
    properties = {},
    callNumbers = [],
  } = {}) {
    return [...Array(count).keys()].map((index) => ({
      instanceId: uuid(),
      instanceTitle: `Instance-${getRandomPostfix()}`,
      barcodes: barcodes || [generateUniqueItemBarcodeWithShift(index)],
      status,
      properties: Array.isArray(properties) ? properties[index] : properties,
      callNumbers,
    }));
  },
  createFolioInstancesViaApi({ folioInstances = [], location = {}, sourceId } = {}) {
    const types = {
      instanceTypeId: '',
      holdingTypeId: '',
      loanTypeId: '',
      materialTypeId: '',
    };

    cy.then(() => {
      this.getInstanceTypes().then((instanceTypes) => {
        types.instanceTypeId = instanceTypes[0].id;
      });
      this.getHoldingTypes().then((holdingTypes) => {
        types.holdingTypeId = holdingTypes[0].id;
      });
      this.getLoanTypes().then((loanTypes) => {
        types.loanTypeId = loanTypes[0].id;
      });
      this.getMaterialTypes().then((materialTypes) => {
        types.materialTypeId = materialTypes[0].id;
      });
    }).then(() => {
      folioInstances.forEach((item, index) => {
        const instance = {
          instance: {
            instanceTypeId: types.instanceTypeId,
            title: item.instanceTitle,
            id: item.instanceId,
          },
          holdings: [
            {
              holdingsTypeId: types.holdingTypeId,
              permanentLocationId: location.id,
              sourceId,
              callNumber: item.callNumbers[index],
            },
          ],
          items: item.barcodes.map((barcode) => ({
            barcode,
            status: { name: item.status },
            permanentLoanType: { id: types.loanTypeId },
            materialType: {
              id: types.materialTypeId,
            },
            ...item.properties,
          })),
        };

        this.createFolioInstanceViaApi(instance).then(({ instanceId, holdingIds }) => {
          folioInstances[index].instanceId = instanceId;
          folioInstances[index].holdingId = holdingIds[0].id;
          folioInstances[index].itemIds = holdingIds[0].itemIds;
        });
      });
    });
  },
  createFolioInstanceViaApi: ({ instance, holdings = [], items = [] }) => {
    InventoryHoldings.getHoldingsFolioSource().then((folioSource) => {
      const instanceWithSpecifiedNewId = {
        ...instance,
        id: instance.id || uuid(),
        title: instance.title || `Instance-${getRandomPostfix()}`,
        source: folioSource.name,
      };
      const ids = {
        instanceId: instanceWithSpecifiedNewId.id,
        holdingIds: [],
      };
      createInstanceViaAPI(instanceWithSpecifiedNewId).then(() => {
        cy.wrap(
          holdings.forEach((holding) => {
            const holdingWithIds = {
              ...holding,
              id: holding.id || uuid(),
              instanceId: instanceWithSpecifiedNewId.id,
              sourceId: folioSource.id,
            };
            InventoryHoldings.createHoldingRecordViaApi(holdingWithIds).then(() => {
              const itemIds = [];
              cy.wrap(
                items.forEach((item) => {
                  const itemWithIds = {
                    ...item,
                    id: item.id || uuid(),
                    holdingsRecordId: holdingWithIds.id,
                  };
                  itemIds.push(itemWithIds.id);
                  InventoryItems.createItemViaApi(itemWithIds);
                }),
              ).then(() => {
                ids.holdingIds.push({ id: holdingWithIds.id, itemIds });
              });
            });
          }),
        ).then(() => {
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
        isDefaultSearchParamsRequired: false,
      })
      .then((res) => {
        return res.body.instances[0].id;
      });
  },
  getInstancesViaApi: (searchParams) => {
    return cy
      .okapiRequest({
        path: 'instance-storage/instances',
        searchParams,
        isDefaultSearchParamsRequired: false,
      })
      .then((res) => {
        return res.body.instances;
      });
  },

  deleteInstanceViaApi({ instance, servicePoint, shouldCheckIn = false }) {
    if (shouldCheckIn) {
      instance.barcodes.forEach((barcode) => {
        CheckinActions.checkinItemViaApi({
          itemBarcode: barcode,
          claimedReturnedResolution: 'Returned by patron',
          servicePointId: servicePoint.id,
        });
      });
    }

    instance.itemIds.forEach((id) => {
      cy.deleteItemViaApi(id);
    });
    cy.deleteHoldingRecordViaApi(instance.holdingId);
    InventoryInstance.deleteInstanceViaApi(instance.instanceId);
  },

  createLocalCallNumberTypeViaApi: (name) => {
    return cy
      .okapiRequest({
        method: 'POST',
        path: 'call-number-types',
        body: {
          id: uuid(),
          name,
          source: 'local',
        },
      })
      .then((res) => {
        return res.body.id;
      });
  },

  deleteLocalCallNumberTypeViaApi: (id) => cy.okapiRequest({
    method: 'DELETE',
    path: `call-number-types/${id}`,
  }),

  searchBySource: (source) => {
    cy.do(Button({ id: 'accordion-toggle-button-source' }).click());
    cy.do(Checkbox(source).click());
  },

  importWithOclc: (oclc) => {
    cy.do(actionsButton.click());
    cy.do(Button({ id: 'dropdown-clickable-import-record' }).click());
    cy.do(
      Select({ name: 'selectedJobProfileId' }).choose(
        'Inventory Single Record - Default Create Instance (Default)',
      ),
    );
    cy.do(singleRecordImportModal.find(TextField({ name: 'externalIdentifier' })).fillIn(oclc));
    cy.do(singleRecordImportModal.find(Button('Import')).click());
  },

  verifyInstanceDetailsView() {
    InventoryInstance.waitInventoryLoading();
  },
  clickAdvSearchButton() {
    cy.do(advSearchButton.click());
    cy.expect([
      AdvancedSearch({ rowCount: 6 }).exists(),
      buttonSearchInAdvSearchModal.exists(),
      buttonCancelInAdvSearchModal.exists(),
    ]);
  },
  closeAdvancedSearchModal() {
    cy.do(advSearchModal.find(Button({ id: 'advanced-search-modal-close-button' })).click());
    this.checkAdvSearchModalAbsence();
  },
  checkAdvSearchInstancesModalFields(rowIndex, searchType = 'Instance') {
    if (rowIndex) {
      cy.expect(AdvancedSearchRow({ index: rowIndex }).find(advSearchOperatorSelect).exists());
      advSearchOperators.forEach((operator) => {
        cy.expect(
          AdvancedSearchRow({ index: rowIndex })
            .find(advSearchOperatorSelect)
            .has({ content: including(operator) }),
        );
      });
    } else {
      cy.expect(AdvancedSearchRow({ index: rowIndex }).has({ text: including('Search for') }));
    }
    cy.expect([
      AdvancedSearchRow({ index: rowIndex }).find(TextArea()).exists(),
      AdvancedSearchRow({ index: rowIndex }).find(advSearchModifierSelect).exists(),
      AdvancedSearchRow({ index: rowIndex }).find(advSearchOptionSelect).exists(),
    ]);
    advSearchModifiers.forEach((modifier) => {
      cy.expect(
        AdvancedSearchRow({ index: rowIndex })
          .find(advSearchModifierSelect)
          .has({ content: including(modifier) }),
      );
    });
    if (searchType === 'Holdings') {
      for (const [key] of Object.entries(advSearchHoldingsOptions)) {
        cy.expect(
          AdvancedSearchRow({ index: rowIndex })
            .find(advSearchOptionSelect)
            .has({ content: including(key) }),
        );
      }
    }
    if (searchType === 'Instance') {
      advSearchInstancesOptions.forEach((option) => {
        cy.expect(
          AdvancedSearchRow({ index: rowIndex })
            .find(advSearchOptionSelect)
            .has({ content: including(option) }),
        );
      });
    }
  },

  checkAdvSearchItemsModalFields(rowIndex) {
    if (rowIndex) {
      cy.expect(AdvancedSearchRow({ index: rowIndex }).find(advSearchOperatorSelect).exists());
      advSearchOperators.forEach((operator) => {
        cy.expect(
          AdvancedSearchRow({ index: rowIndex })
            .find(advSearchOperatorSelect)
            .has({ content: including(operator) }),
        );
      });
    } else {
      cy.expect(AdvancedSearchRow({ index: rowIndex }).has({ text: including('Search for') }));
    }
    cy.expect([
      AdvancedSearchRow({ index: rowIndex }).find(TextArea()).exists(),
      AdvancedSearchRow({ index: rowIndex }).find(advSearchModifierSelect).exists(),
      AdvancedSearchRow({ index: rowIndex }).find(advSearchOptionSelect).exists(),
    ]);
    advSearchItemModifiers.forEach((modifier) => {
      cy.expect(
        AdvancedSearchRow({ index: rowIndex })
          .find(advSearchModifierSelect)
          .has({ content: including(modifier) }),
      );
    });
    advSearchItemsOptions.forEach((option) => {
      cy.expect(
        AdvancedSearchRow({ index: rowIndex })
          .find(advSearchOptionSelect)
          .has({ content: including(option) }),
      );
    });
  },

  checkAdvSearchHoldingsModalFields(rowIndex) {
    if (rowIndex) {
      cy.expect(AdvancedSearchRow({ index: rowIndex }).find(advSearchOperatorSelect).exists());
      advSearchOperators.forEach((operator) => {
        cy.expect(
          AdvancedSearchRow({ index: rowIndex })
            .find(advSearchOperatorSelect)
            .has({ content: including(operator) }),
        );
      });
    } else {
      cy.expect(AdvancedSearchRow({ index: rowIndex }).has({ text: including('Search for') }));
    }
    cy.expect([
      AdvancedSearchRow({ index: rowIndex }).find(TextArea()).exists(),
      AdvancedSearchRow({ index: rowIndex }).find(advSearchModifierSelect).exists(),
      AdvancedSearchRow({ index: rowIndex }).find(advSearchOptionSelect).exists(),
    ]);
    advSearchModifiers.forEach((modifier) => {
      cy.expect(
        AdvancedSearchRow({ index: rowIndex })
          .find(advSearchModifierSelect)
          .has({ content: including(modifier) }),
      );
    });
    advSearchHoldingsOptions.forEach((option) => {
      cy.expect(
        AdvancedSearchRow({ index: rowIndex })
          .find(advSearchOptionSelect)
          .has({ content: including(option) }),
      );
    });
  },

  fillAdvSearchRow(rowIndex, query, modifier, option, operator) {
    cy.do([
      AdvancedSearchRow({ index: rowIndex }).fillQuery(query),
      AdvancedSearchRow({ index: rowIndex }).selectMatchOption(rowIndex, modifier),
      AdvancedSearchRow({ index: rowIndex }).selectSearchOption(rowIndex, option),
    ]);
    if (operator) cy.do(AdvancedSearchRow({ index: rowIndex }).selectBoolean(rowIndex, operator));
  },

  checkAdvSearchModalAbsence() {
    cy.expect(advSearchModal.absent());
  },

  checkAdvSearchModalValues: (rowIndex, query, modifier, option, operator) => {
    cy.expect([
      advSearchModal.exists(),
      AdvancedSearchRow({ index: rowIndex })
        .find(TextArea())
        .has({ value: including(query) }),
      AdvancedSearchRow({ index: rowIndex })
        .find(advSearchModifierSelect)
        .has({ value: advSearchModifiersValues[advSearchModifiers.indexOf(modifier)] }),
      AdvancedSearchRow({ index: rowIndex })
        .find(advSearchOptionSelect)
        .has({
          value:
            advSearchInstancesOptionsValues[advSearchInstancesOptions.indexOf(option)] ||
            advSearchHoldingsOptionsValues[advSearchHoldingsOptions.indexOf(option)] ||
            advSearchItemsOptionsValues[advSearchItemsOptions.indexOf(option)],
        }),
    ]);
    if (operator) {
      cy.expect(
        AdvancedSearchRow({ index: rowIndex })
          .find(advSearchOperatorSelect)
          .has({ value: operator.toLowerCase() }),
      );
    }
  },

  checkAdvSearchModalItemValues: (rowIndex, query, modifier, option, operator) => {
    cy.expect([
      advSearchModal.exists(),
      AdvancedSearchRow({ index: rowIndex })
        .find(TextArea())
        .has({ value: including(query) }),
      AdvancedSearchRow({ index: rowIndex })
        .find(advSearchModifierSelect)
        .has({ value: advSearchModifiersValues[advSearchModifiers.indexOf(modifier)] }),
      AdvancedSearchRow({ index: rowIndex })
        .find(advSearchOptionSelect)
        .has({ value: advSearchItemsOptionsValues[searchItemsOptions.indexOf(option)] }),
    ]);
    if (operator) {
      cy.expect(
        AdvancedSearchRow({ index: rowIndex })
          .find(advSearchOperatorSelect)
          .has({ value: operator.toLowerCase() }),
      );
    }
  },

  clickSearchBtnInAdvSearchModal() {
    cy.do(buttonSearchInAdvSearchModal.click());
  },

  clickCancelBtnInAdvSearchModal() {
    cy.do(buttonCancelInAdvSearchModal.click());
  },
  closeAdvSearchModalUsingESC() {
    cy.get('#advanced-search-modal').type('{esc}');
  },

  clickCloseBtnInAdvSearchModal() {
    cy.do(buttonCloseInAdvSearchModal.click());
  },

  verifySelectedSearchOption(option) {
    cy.expect(
      inventorySearchAndFilterInput.has({
        value: searchInstancesOptionsValues[searchInstancesOptions.indexOf(option)],
      }),
    );
  },

  searchInstancesWithOption(option = searchInstancesOptions[0], value) {
    cy.do([
      inventorySearchAndFilterInput.choose(including(option)),
      inventorySearchInput.fillIn(value),
    ]);
    this.verifySelectedSearchOption(option);
    cy.expect([inventorySearchInput.has({ value }), searchButton.has({ disabled: false })]);
    cy.do(searchButton.click());
  },

  verifyInstanceSearchOptions() {
    searchInstancesOptions.forEach((searchOption) => {
      cy.expect(inventorySearchAndFilterInput.has({ content: including(searchOption) }));
    });
  },

  verifyInventorySearchPaneheader() {
    cy.expect(paneHeaderSearch.find(HTML(including('records found'))));
  },

  checkActionsButtonInSecondPane() {
    cy.expect(actionsButton.exists());
  },

  verifyActionMenuForNonConsortiaTenant() {
    cy.do(actionsButton.click());
    cy.expect([
      Button('New').exists(),
      Button('New local record').absent(),
      Button('New shared record').absent(),
    ]);
  },

  verifyInstanceResultListIsAbsent() {
    cy.expect([
      inventoriesList.absent(),
      rootSection
        .find(HTML(including('Choose a filter or enter a search query to show results')))
        .exists(),
    ]);
  },
};
