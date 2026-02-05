/* eslint-disable cypress/no-unnecessary-waiting */
import { HTML, including, matching } from '@interactors/html';
import { recurse } from 'cypress-recurse';
import uuid from 'uuid';
import {
  AdvancedSearch,
  AdvancedSearchRow,
  Button,
  Callout,
  Checkbox,
  Modal,
  MultiColumnList,
  MultiColumnListCell,
  MultiColumnListHeader,
  MultiColumnListRow,
  MultiSelect,
  MultiSelectMenu,
  MultiSelectOption,
  Pane,
  PaneContent,
  PaneHeader,
  Section,
  Select,
  TextArea,
  TextField,
  TextInput,
  and,
  or,
} from '../../../../interactors';
import { ITEM_STATUS_NAMES, LOCATION_NAMES, REQUEST_METHOD } from '../../constants';
import Arrays from '../../utils/arrays';
import DateTools from '../../utils/dateTools';
import FileManager from '../../utils/fileManager';
import parseMrkFile from '../../utils/parseMrkFile';
import getRandomPostfix from '../../utils/stringTools';
import CheckinActions from '../check-in-actions/checkInActions';
import QuickMarcEditor from '../quickMarcEditor';
import InventoryHoldings from './holdings/inventoryHoldings';
import InventoryInstance from './inventoryInstance';
import InventoryNewInstance from './inventoryNewInstance';
import InventoryItems from './item/inventoryItems';

const rootSection = Section({ id: 'pane-results' });
const resultsPaneHeader = PaneHeader({ id: 'paneHeaderpane-results' });
const inventoriesList = MultiColumnList({ id: or('list-inventory', 'list-plugin-find-records') });
const resultsPaneContent = PaneContent({ id: 'pane-results-content' });
const actionsButton = rootSection.find(Button('Actions'));
const selectAllInstancesCheckbox = MultiColumnListHeader({ id: 'list-column-select' }).find(
  Checkbox({ ariaLabel: 'Select instance' }),
);
const instanceCheckbox = (idx) => inventoriesList
  .find(MultiColumnListRow({ index: idx }))
  .find(Checkbox({ ariaLabel: 'Select instance' }));

const singleRecordImportModal = Modal('Single record import');
const filterSection = Section({ id: 'pane-filter' });
const inventorySearchInput = TextInput({ id: 'input-inventory-search' });
const searchButton = Button({ type: 'submit' });
const paneHeaderSearch = PaneHeader('Inventory');
const newMarcBibButton = Button({ id: 'clickable-newmarcrecord' });

const advSearchButton = Button('Advanced search');
const advSearchModal = Modal('Advanced search');
const buttonSearchInAdvSearchModal = advSearchModal.find(
  Button({ ariaLabel: 'Search', disabled: or(false, true) }),
);
const buttonResetAllInAdvSearchModal = advSearchModal.find(
  Button({ ariaLabel: 'Reset all', disabled: or(false, true) }),
);
const buttonCloseInAdvSearchModal = advSearchModal.find(
  Button({ id: 'advanced-search-modal-close-button' }),
);
const inventorySearchAndFilterInput = Select({ id: 'input-inventory-search-qindex' });
const advSearchOperatorSelect = Select({ id: including('advanced-search-bool-') });
const advSearchModifierSelect = Select({ label: 'Match option*' });
const advSearchOptionSelect = Select({ label: 'Search options*' });

const advSearchOperators = ['AND', 'OR', 'NOT'];
const advSearchModifiers = ['Exact phrase', 'Contains all', 'Starts with', 'Contains any'];
const advSearchItemModifiers = ['Exact phrase', 'Contains all', 'Starts with'];
const advSearchModifiersValues = ['exactPhrase', 'containsAll', 'startsWith', 'containsAny'];
export const searchInstancesOptions = [
  'Keyword (title, contributor, identifier, HRID, UUID)',
  'Contributor',
  'Title (all)',
  'Identifier (all)',
  'Classification, normalized',
  'ISBN',
  'ISSN',
  'LCCN, normalized',
  'OCLC number, normalized',
  'Instance notes (all)',
  'Instance administrative notes',
  'Place of publication',
  'Subject',
  'Instance HRID',
  'Instance UUID',
  'Authority UUID',
  'All',
  'Query search',
  'Advanced search',
];
export const searchHoldingsOptions = [
  'Keyword (title, contributor, identifier, HRID, UUID)',
  'ISBN',
  'ISSN',
  'Call number, not normalized',
  'Call number, normalized',
  'Holdings notes (all)',
  'Holdings administrative notes',
  'Holdings HRID',
  'Holdings UUID',
  'All',
  'Query search',
  'Advanced search',
];
export const searchItemsOptions = [
  'Keyword (title, contributor, identifier, HRID, UUID, barcode)',
  'Barcode',
  'ISBN',
  'ISSN',
  'Effective call number (item), not normalized',
  'Effective call number (item), normalized',
  'Item notes (all)',
  'Item administrative notes',
  'Circulation notes',
  'Item HRID',
  'Item UUID',
  'All',
  'Query search',
  'Advanced search',
];
const searchInstancesOptionsValues = [
  'all',
  'contributor',
  'title',
  'identifier',
  'normalizedClassificationNumber',
  'isbn',
  'issn',
  'lccn',
  'oclc',
  'instanceNotes',
  'instanceAdministrativeNotes',
  'placeOfPublication',
  'subject',
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
  'querySearch',
  'advancedSearch',
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
  'querySearch',
  'advancedSearch',
];
const advSearchInstancesOptions = searchInstancesOptions.filter((option, index) => index <= 16);
advSearchInstancesOptions[0] = 'Keyword (title, contributor, identifier)';
const advSearchHoldingsOptions = searchHoldingsOptions.filter((option, index) => index <= 9);
advSearchHoldingsOptions[0] = 'Keyword (title, contributor, identifier)';
const advSearchItemsOptions = searchItemsOptions.filter((option, index) => index <= 11);
advSearchItemsOptions[0] = 'Keyword (title, contributor, identifier)';
const advSearchInstancesOptionsValues = searchInstancesOptionsValues
  .map((option, index) => (index ? option : 'keyword'))
  .filter((option, index) => index <= 17);
const advSearchHoldingsOptionsValues = searchHoldingsOptionsValues
  .map((option, index) => (index ? option : 'keyword'))
  .filter((option, index) => index <= 9);
const advSearchItemsOptionsValues = searchItemsOptionsValues
  .map((option, index) => (index ? option : 'keyword'))
  .filter((option, index) => index <= 11);

const actionsSortSelect = Select({ dataTestID: 'sort-by-selection' });
const exportInstanceMarcButton = Button({ id: 'dropdown-clickable-export-marc' });
const importTypeSelect = Select({ name: 'externalIdentifierType' });
const clearFieldIcon = Button({ icon: 'times-circle-solid' });

const defaultField008Values = {
  Alph: '\\',
  Audn: '\\',
  BLvl: 's',
  Biog: '\\',
  Comp: '\\\\',
  Conf: '|',
  Cont: ['\\', '\\', '\\'],
  Ctry: '\\\\\\',
  Date1: '\\\\\\\\',
  Date2: '\\\\\\\\',
  DtSt: '|',
  EntW: '\\',
  FMus: '\\',
  Fest: '\\',
  Form: '\\',
  Freq: '\\',
  GPub: '\\',
  Indx: '\\',
  Lang: '\\\\\\',
  LitF: '\\',
  MRec: '\\',
  Orig: '\\',
  Part: '\\',
  Regl: '|',
  'S/L': '|',
  SrTp: '\\',
  Srce: '\\',
  TrAr: '\\',
  Type: 'a',
};

/**
 * Create instance via API attampting until success
 * to avoid hrID conflict in sequential instance creating operations
 * */
const createInstanceViaAPI = (instanceWithSpecifiedNewId) => {
  return recurse(
    () => cy.okapiRequest({
      method: 'POST',
      path: 'inventory/instances',
      isDefaultSearchParamsRequired: false,
      failOnStatusCode: false,
      body: instanceWithSpecifiedNewId,
    }),
    (response) => response.status === 201,
    {
      limit: 10,
      delay: 1_000,
    },
  );
};

const waitContentLoading = () => {
  cy.expect(
    rootSection
      .find(HTML(including('Choose a filter or enter a search query to show results.')))
      .exists(),
  );
};

const getCallNumberTypes = (searchParams) => {
  return cy
    .okapiRequest({
      path: 'call-number-types',
      searchParams,
      isDefaultSearchParamsRequired: false,
    })
    .then((response) => {
      return response.body.callNumberTypes;
    });
};

const createHoldingsNoteTypeViaApi = (noteTypeName) => {
  return cy
    .okapiRequest({
      method: REQUEST_METHOD.POST,
      path: 'holdings-note-types',
      body: {
        id: uuid(),
        name: noteTypeName,
        source: 'folio',
      },
    })
    .then((response) => response.body.id);
};

const deleteHoldingsNoteTypeViaApi = (noteTypeId) => {
  return cy.okapiRequest({
    method: REQUEST_METHOD.DELETE,
    path: `holdings-note-types/${noteTypeId}`,
    isDefaultSearchParamsRequired: false,
  });
};

const getHoldingsNotesTypes = (searchParams) => {
  return cy
    .okapiRequest({
      path: 'holdings-note-types',
      searchParams,
      isDefaultSearchParamsRequired: false,
    })
    .then((response) => {
      return response.body.holdingsNoteTypes;
    });
};

const getItemNoteTypes = (searchParams) => {
  return cy
    .okapiRequest({
      path: 'item-note-types',
      searchParams,
      isDefaultSearchParamsRequired: false,
    })
    .then((response) => {
      return response.body.itemNoteTypes;
    });
};

const getIdentifierTypes = (searchParams) => {
  return cy
    .okapiRequest({
      path: 'identifier-types',
      searchParams,
      isDefaultSearchParamsRequired: false,
    })
    .then((response) => {
      return response.body.identifierTypes[0];
    });
};

export default {
  createHoldingsNoteTypeViaApi,
  deleteHoldingsNoteTypeViaApi,
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
    cy.do([inventoriesList.focus({ row: rowNumber }), inventoriesList.click({ row: rowNumber })]);
    InventoryInstance.waitInventoryLoading();
  },

  selectInstanceById(specialInternalId) {
    cy.do(inventoriesList.find(Button({ href: including(specialInternalId) })).click());
  },

  selectInstanceByTitle(title) {
    cy.do(inventoriesList.find(Button(title)).click());
  },

  addNewInventory() {
    cy.do([actionsButton.click(), Button({ id: 'clickable-newinventory' }).click()]);

    InventoryNewInstance.waitLoading();

    return InventoryNewInstance;
  },

  createNewMarcBibRecord() {
    cy.do([actionsButton.click(), newMarcBibButton.click()]);
    QuickMarcEditor.waitLoading();
  },

  exportInstanceMarc() {
    cy.do([actionsButton.click(), exportInstanceMarcButton.click()]);
  },

  exportInstanceMarcButtonAbsent() {
    cy.do(actionsButton.click());
    cy.expect(exportInstanceMarcButton.absent());
  },

  selectInTransitItemsReportCsvOption() {
    cy.do(Button({ id: 'dropdown-clickable-get-report' }).click());
  },

  verifyToastNotificationAfterExportInstanceMarc(recordHrid) {
    const currentDate = DateTools.getFormattedDate({ date: new Date() });

    cy.expect(
      Callout({
        textContent: and(
          including(`The export is complete. The downloaded QuickInstanceExport${currentDate}`),
          including(
            `.csv contains selected record's UUID. To retrieve the quick-export-${recordHrid}.mrc file, please go to the Data export app.`,
          ),
        ),
      }).exists(),
    );
  },

  resetAllFilters: () => {
    cy.do(Pane('Search & filter').find(Button('Reset all')).click());
  },

  searchByTitle(title, result = true) {
    cy.wait(2000);
    cy.do([
      filterSection.find(inventorySearchInput).fillIn(title),
      filterSection.find(searchButton).click(),
    ]);
    if (result) {
      cy.expect(MultiColumnListRow({ index: 0 }).exists());
    }
  },
  searchByTag: (tagName) => {
    cy.intercept('/search/instances/facets?facet=instanceTags**').as('getTags');
    cy.do(Button({ id: 'accordion-toggle-button-instancesTags' }).click());
    cy.wait('@getTags');
    cy.do(MultiSelect({ id: 'instancesTags-multiselect' }).fillIn(tagName));
    cy.expect(MultiSelectOption(including(tagName)).exists());
    cy.do(
      MultiSelectMenu()
        .find(MultiSelectOption(including(tagName)))
        .click(),
    );
  },

  searchAndVerify(value) {
    cy.do(filterSection.find(inventorySearchInput).fillIn(value));
    cy.expect([
      filterSection.find(inventorySearchInput).has({ value }),
      filterSection.find(searchButton).has({ disabled: false }),
    ]);
    cy.do(filterSection.find(searchButton).click());
    cy.expect([
      inventoriesList.exists(),
      inventoriesList.find(Button({ text: including(value) })).exists(),
    ]);
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
        cy.getDefaultMaterialType();
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
        cy.getDefaultMaterialType();
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
        instance.items?.forEach((item) => cy.deleteItemViaApi(item.id));
        instance.holdings?.forEach((holding) => cy.deleteHoldingRecordViaApi(holding.id));
        InventoryInstance.deleteInstanceViaApi(instance.id);
      },
    );
  },

  deleteFullInstancesByTitleViaApi(instanceTitle) {
    return cy
      .okapiRequest({
        path: `search/instances?query=title="${instanceTitle}"`,
        isDefaultSearchParamsRequired: false,
      })
      .then(({ body: { instances } }) => {
        instances?.forEach((instance) => {
          cy.okapiRequest({
            path: `holdings-storage/holdings?query=instanceId==${instance.id}`,
            isDefaultSearchParamsRequired: false,
          })
            .then(({ body: { holdingsRecords } }) => {
              holdingsRecords.forEach((holding) => {
                cy.okapiRequest({
                  path: `inventory/items-by-holdings-id?query=holdingsRecordId==${holding.id}`,
                  isDefaultSearchParamsRequired: false,
                })
                  .then(({ body: { items } }) => {
                    items.forEach((item) => {
                      cy.deleteItemViaApi(item.id);
                    });
                  })
                  .then(() => {
                    cy.deleteHoldingRecordViaApi(holding.id);
                  });
              });
            })
            .then(() => {
              InventoryInstance.deleteInstanceViaApi(instance.id);
            });
        });
      });
  },

  deleteFullInstancesWithCallNumber({ type, value }) {
    return cy
      .okapiRequest({
        method: 'GET',
        path: `browse/call-numbers/${type}/instances`,
        searchParams: {
          query: `(fullCallNumber>="${value}")`,
        },
        isDefaultSearchParamsRequired: false,
      })
      .then((response) => response.body.items)
      .then((items) => {
        items
          .filter((item) => item.fullCallNumber === value)
          .forEach((item) => {
            return cy
              .okapiRequest({
                path: `search/instances?query=itemFullCallNumbers="${item.fullCallNumber}"`,
                isDefaultSearchParamsRequired: false,
              })
              .then(({ body: { instances } }) => {
                instances.forEach((instance) => {
                  this.deleteFullInstancesByTitleViaApi(instance.title);
                });
              });
          });
      });
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
    holdingsCount,
    itemsCount,
    status = ITEM_STATUS_NAMES.AVAILABLE,
    holdings,
    items,
    itemsProperties = {},
    instanceTitlePrefix,
  } = {}) {
    return [...Array(count).keys()].map((index) => {
      const gHoldings =
        holdings ||
        [...Array(holdingsCount ?? 1).keys()].map(() => ({
          id: uuid(),
        }));
      const gItems =
        items ||
        gHoldings.reduce((acc, it) => {
          const holdingItems = [...Array(itemsCount ?? 1).keys()].map(() => {
            const properties = Array.isArray(itemsProperties)
              ? itemsProperties[index]
              : itemsProperties;

            return {
              id: uuid(),
              barcode: uuid(),
              holdingsRecordId: it.id,
              status: { name: status },
              ...properties,
            };
          });

          return [...acc, ...holdingItems];
        }, []);

      return {
        instanceId: uuid(),
        instanceTitle: instanceTitlePrefix || `autotest_instance_${getRandomPostfix()}`,
        holdings: gHoldings,
        items: gItems,
        // should not be used, left for support of old tests
        barcodes: gItems.map(({ barcode }) => barcode),
        properties: Array.isArray(itemsProperties) ? itemsProperties[index] : itemsProperties,
      };
    });
  },
  createFolioInstancesViaApi({ folioInstances = [], location = {}, sourceId } = {}) {
    const types = {
      instanceTypeId: '',
      holdingTypeId: '',
      loanTypeId: '',
      materialTypeId: '',
    };

    return cy
      .then(() => {
        this.getInstanceTypes().then((instanceTypes) => {
          types.instanceTypeId = instanceTypes[0].id;
        });
        this.getHoldingTypes().then((holdingTypes) => {
          types.holdingTypeId = holdingTypes[0].id;
        });
        this.getLoanTypes().then((loanTypes) => {
          types.loanTypeId = loanTypes[0].id;
        });
        cy.getDefaultMaterialType().then((mt) => {
          types.materialTypeId = mt.id;
        });
      })
      .then(() => {
        const instances = folioInstances.map((instance) => {
          return {
            instance: {
              instanceTypeId: types.instanceTypeId,
              title: instance.instanceTitle,
              id: instance.instanceId,
            },
            holdings: instance.holdings.map((holding) => ({
              ...holding,
              holdingsTypeId: types.holdingTypeId,
              permanentLocationId: holding.permanentLocationId || location.id,
              sourceId,
            })),
            items: instance.items.map((item) => ({
              ...item,
              permanentLoanType: {
                id: item.permanentLoanType?.id || types.loanTypeId,
              },
              materialType: {
                id: item.materialType?.id || types.materialTypeId,
              },
            })),
          };
        });

        instances.forEach((instance, index) => {
          this.createFolioInstanceViaApi(instance).then(
            ({ instanceId, holdingIds, holdings, items }) => {
              folioInstances[index].instanceId = instanceId;
              folioInstances[index].holdings = holdings;
              folioInstances[index].items = items;

              // should not be used, left for support of old tests
              folioInstances[index].holdingId = holdingIds[0]?.id;
              folioInstances[index].itemIds = holdingIds[0]?.itemIds;
              folioInstances[index].barcodes = items.map(({ barcode }) => barcode);
            },
          );
        });
      });
  },
  createMarcInstancesViaApi({ marcInstances = [], location = {}, sourceId } = {}) {
    const types = {
      instanceTypeId: '',
      holdingTypeId: '',
      loanTypeId: '',
      materialTypeId: '',
    };

    return cy
      .then(() => {
        this.getInstanceTypes().then((instanceTypes) => {
          types.instanceTypeId = instanceTypes[0].id;
        });
        this.getHoldingTypes().then((holdingTypes) => {
          types.holdingTypeId = holdingTypes[0].id;
        });
        this.getLoanTypes().then((loanTypes) => {
          types.loanTypeId = loanTypes[0].id;
        });
        cy.getDefaultMaterialType().then((materialType) => {
          types.materialTypeId = materialType.id;
        });
      })
      .then(() => {
        const instances = marcInstances.map((marcInstance) => {
          return {
            instance: {
              instanceTypeId: types.instanceTypeId,
              title: marcInstance.instanceTitle,
              id: marcInstance.instanceId,
            },
            holdings: marcInstance.holdings.map((holding) => ({
              ...holding,
              holdingsTypeId: types.holdingTypeId,
              permanentLocationId: holding.permanentLocationId || location.id,
              sourceId,
            })),
            items: marcInstance.items.map((item) => ({
              ...item,
              permanentLoanType: {
                id: item.permanentLoanType?.id || types.loanTypeId,
              },
              materialType: {
                id: item.materialType?.id || types.materialTypeId,
              },
            })),
          };
        });

        instances.forEach((instance, index) => {
          this.createMarcInstanceViaApi(instance).then(
            ({ instanceId, holdingIds, holdings, items }) => {
              marcInstances[index].instanceId = instanceId;
              marcInstances[index].holdings = holdings;
              marcInstances[index].items = items;

              // should not be used, left for support of old tests
              marcInstances[index].holdingId = holdingIds[0].id;
              marcInstances[index].itemIds = holdingIds[0].itemIds;
              marcInstances[index].barcodes = items.map(({ barcode }) => barcode);
            },
          );
        });
      });
  },
  createFolioInstanceViaApi({ instance, holdings = [], items = [] }) {
    InventoryHoldings.getHoldingsFolioSource().then((folioSource) => {
      const instanceWithSpecifiedNewId = {
        ...instance,
        id: instance.id || uuid(),
        title: instance.title || `autotest_instance_${getRandomPostfix()}`,
        source: folioSource.name,
      };
      const instanceData = {
        instanceId: instanceWithSpecifiedNewId.id,
        holdingIds: [],
        holdings: [],
        items: [],
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
              const holdingItems = items.filter((item) => {
                return item.holdingsRecordId ? item.holdingsRecordId === holdingWithIds.id : true;
              });

              cy.wrap(
                holdingItems.forEach((item) => {
                  const itemWithIds = {
                    ...item,
                    id: item.id || uuid(),
                    holdingsRecordId: item.holdingsRecordId || holdingWithIds.id,
                  };
                  itemIds.push(itemWithIds.id);
                  InventoryItems.createItemViaApi(itemWithIds).then((createdItem) => {
                    itemWithIds.hrid = createdItem.hrid;
                    instanceData.items.push(itemWithIds);
                  });
                }),
              ).then(() => {
                instanceData.holdingIds.push({ id: holdingWithIds.id, itemIds });
                instanceData.holdings.push(holdingWithIds);
              });
            });
          }),
        ).then(() => {
          cy.wrap(instanceData).as('instanceData');
        });
      });
    });
    return cy.get('@instanceData');
  },
  createMarcInstanceViaApi({ instance, holdings = [], items = [] }) {
    InventoryHoldings.getHoldingsMarcSource().then((marcSource) => {
      const instanceWithSpecifiedNewId = {
        ...instance,
        id: instance.id || uuid(),
        title: instance.title || `autotest_instance_${getRandomPostfix()}`,
        source: marcSource.name,
      };
      const instanceData = {
        instanceId: instanceWithSpecifiedNewId.id,
        holdingIds: [],
        holdings: [],
        items: [],
      };
      createInstanceViaAPI(instanceWithSpecifiedNewId).then(() => {
        cy.wrap(
          holdings.forEach((holding) => {
            const holdingWithIds = {
              ...holding,
              id: holding.id || uuid(),
              instanceId: instanceWithSpecifiedNewId.id,
              sourceId: marcSource.id,
            };
            InventoryHoldings.createHoldingRecordViaApi(holdingWithIds).then(() => {
              const itemIds = [];
              const holdingItems = items.filter((holdingItem) => {
                return holdingItem.holdingsRecordId
                  ? holdingItem.holdingsRecordId === holdingWithIds.id
                  : true;
              });

              cy.wrap(
                holdingItems.forEach((holdingItem) => {
                  const itemWithIds = {
                    ...holdingItem,
                    id: holdingItem.id || uuid(),
                    holdingsRecordId: holdingItem.holdingsRecordId || holdingWithIds.id,
                  };
                  itemIds.push(itemWithIds.id);
                  InventoryItems.createItemViaApi(itemWithIds).then(() => {
                    instanceData.items.push(itemWithIds);
                  });
                }),
              ).then(() => {
                instanceData.holdingIds.push({ id: holdingWithIds.id, itemIds });
                instanceData.holdings.push(holdingWithIds);
              });
            });
          }),
        ).then(() => {
          cy.wrap(instanceData).as('instanceData');
        });
      });
    });
    return cy.get('@instanceData');
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

  deleteInstanceViaApi({
    instance,
    servicePoint,
    shouldDeleteItems = true,
    shouldDeleteHoldings = true,
    shouldCheckIn = false,
  }) {
    if (shouldDeleteItems) {
      instance.items.forEach(({ id: itemId, barcode }) => {
        if (shouldCheckIn) {
          CheckinActions.checkinItemViaApi({
            itemBarcode: barcode,
            claimedReturnedResolution: 'Returned by patron',
            servicePointId: servicePoint.id,
          });
        }
        InventoryItems.deleteItemViaApi(itemId);
      });
    }

    if (shouldDeleteHoldings) {
      instance.holdings.forEach(({ id: holdingId }) => {
        InventoryHoldings.deleteHoldingRecordViaApi(holdingId);
      });
    }

    InventoryInstance.deleteInstanceViaApi(instance.instanceId);
  },

  deleteInstanceByTitleViaApi(instanceTitle) {
    return cy
      .okapiRequest({
        path: 'search/instances',
        searchParams: {
          limit: 100,
          query: `title="${instanceTitle}"`,
        },
        isDefaultSearchParamsRequired: false,
      })
      .then((res) => {
        return res.body.instances;
      })
      .then((instances) => {
        if (instances && instances.length) {
          instances.forEach((instance) => {
            if (instance.id) InventoryInstance.deleteInstanceViaApi(instance.id);
          });
        }
      });
  },

  createMarcBibliographicRecordViaApiByReadingFromMrkFile(
    mrkFileName,
    field008Values = defaultField008Values,
    additionalFields = [],
  ) {
    return new Promise((resolve) => {
      FileManager.readFile(`cypress/fixtures/${mrkFileName}`).then((fileContent) => {
        const parsedFromMrkFileFields = parseMrkFile(fileContent);
        const tag008 = {
          // default 008 field values
          tag: '008',
          content: field008Values,
        };
        // add to the fields array default 008 field values
        parsedFromMrkFileFields.fields.unshift(tag008);

        // add additional fields to the fields array which wasn't parsed in the parseMrkFile() method, e.g. '006', '007'
        parsedFromMrkFileFields.fields.push(...additionalFields);

        cy.createMarcBibliographicViaAPI(
          parsedFromMrkFileFields.leader,
          parsedFromMrkFileFields.fields,
        ).then((createdMarcBibliographicId) => {
          resolve(createdMarcBibliographicId);
        });
      });
    });
  },

  searchBySource: (source) => {
    cy.do(Button({ id: 'accordion-toggle-button-source' }).click());
    cy.do(Checkbox(source).click());
  },

  importWithOclcViaApi: (oclcNumber) => {
    return cy.okapiRequest({
      method: 'POST',
      path: 'copycat/imports',
      body: {
        externalIdentifier: oclcNumber,
        profileId: 'f26df83c-aa25-40b6-876e-96852c3d4fd4',
        selectedJobProfileId: 'd0ebb7b0-2f0f-11eb-adc1-0242ac120002',
      },
      isDefaultSearchParamsRequired: false,
    });
  },

  importWithOclc: (
    oclc,
    profile = 'Inventory Single Record - Default Create Instance (Default)',
  ) => {
    cy.do(actionsButton.click());
    cy.wait(1500);
    cy.do(Button({ id: 'dropdown-clickable-import-record' }).click());
    cy.expect(singleRecordImportModal.exists());
    cy.getSingleImportProfilesViaAPI().then((importProfiles) => {
      if (importProfiles.filter((importProfile) => importProfile.enabled === true).length > 1) {
        cy.do(importTypeSelect.choose('OCLC WorldCat'));
      }
      cy.do(Select({ name: 'selectedJobProfileId' }).choose(profile));
      cy.wait(1500);
      cy.do(singleRecordImportModal.find(TextField({ name: 'externalIdentifier' })).fillIn(oclc));
      cy.wait(1500);
      cy.do(singleRecordImportModal.find(Button('Import')).click());
      cy.wait(1500);
    });
  },

  verifyInstanceDetailsView() {
    InventoryInstance.waitInventoryLoading();
  },
  clickAdvSearchButton() {
    cy.do(advSearchButton.click());
    cy.expect([
      AdvancedSearch({ rowCount: 6 }).exists(),
      buttonSearchInAdvSearchModal.exists(),
      buttonResetAllInAdvSearchModal.exists(),
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
      advSearchHoldingsOptions.forEach((option) => {
        cy.expect(
          AdvancedSearchRow({ index: rowIndex })
            .find(advSearchOptionSelect)
            .has({ content: including(option) }),
        );
      });
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
        .has({
          value: advSearchItemsOptionsValues[advSearchItemsOptions.indexOf(option)],
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

  focusOnAdvancedSearchField(rowIndex) {
    cy.do(AdvancedSearchRow({ index: rowIndex }).find(TextArea()).focus());
  },

  verifyClearIconInAdvancedSearchField(rowIndex, shouldExist = true) {
    const targetIcon = AdvancedSearchRow({ index: rowIndex }).find(clearFieldIcon);
    if (shouldExist) cy.expect(targetIcon.exists());
    else cy.expect(targetIcon.absent());
  },

  clickClearIconInAdvancedSearchField(rowIndex) {
    cy.do(AdvancedSearchRow({ index: rowIndex }).find(clearFieldIcon).click());
  },

  clickSearchBtnInAdvSearchModal() {
    cy.do(buttonSearchInAdvSearchModal.click());
  },

  clickResetAllBtnInAdvSearchModal() {
    cy.do(buttonResetAllInAdvSearchModal.click());
  },

  checkResetAllButtonInAdvSearchModalEnabled(enabled = true) {
    cy.expect(buttonResetAllInAdvSearchModal.has({ disabled: !enabled }));
  },

  closeAdvSearchModalUsingESC() {
    cy.get('#advanced-search-modal').type('{esc}');
  },

  clickCloseBtnInAdvSearchModal() {
    cy.do(buttonCloseInAdvSearchModal.click());
  },

  verifySelectedSearchOption(option) {
    cy.expect(inventorySearchAndFilterInput.has({ checkedOptionText: option }));
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

  verifyInstanceSearchOptionsInOrder() {
    cy.wrap(inventorySearchAndFilterInput.allOptionsText()).should((arrayOfOptions) => {
      expect(arrayOfOptions).to.deep.equal(Object.values(searchInstancesOptions));
    });
  },

  verifyHoldingsSearchOptionsInOrder() {
    cy.wrap(inventorySearchAndFilterInput.allOptionsText()).should((arrayOfOptions) => {
      expect(arrayOfOptions).to.deep.equal(Object.values(searchHoldingsOptions));
    });
  },

  verifyItemSearchOptionsInOrder() {
    cy.wrap(inventorySearchAndFilterInput.allOptionsText()).should((arrayOfOptions) => {
      expect(arrayOfOptions).to.deep.equal(Object.values(searchItemsOptions));
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

  verifyInstanceResultListIsAbsent(isAbsent = true) {
    if (isAbsent) {
      cy.expect([
        inventoriesList.absent(),
        rootSection
          .find(HTML(including('Choose a filter or enter a search query to show results')))
          .exists(),
      ]);
    } else {
      cy.expect([inventoriesList.exists, inventoriesList.has({ rowCount: 1 })]);
    }
  },

  clickSelectAllInstancesCheckbox() {
    cy.do(selectAllInstancesCheckbox.click());
    cy.get(Checkbox({ ariaLabel: 'Select instance' })).each((checkbox) => {
      cy.expect(checkbox.checked);
    });
  },

  verifySelectAllInstancesCheckbox(selected = false) {
    cy.expect([
      selectAllInstancesCheckbox.exists(),
      selectAllInstancesCheckbox.has({ checked: selected }),
    ]);
  },

  selectInstanceCheckboxByIndex(index) {
    cy.do([instanceCheckbox(index).click()]);
  },

  checkSearchResultCount(text) {
    cy.expect(resultsPaneHeader.find(HTML(new RegExp(text))).exists());
  },

  verifyInventoryLabelText(textLabel) {
    cy.wrap(Pane({ id: 'pane-results' }).subtitle()).then((element) => {
      cy.expect(element).contains(textLabel);
    });
  },

  verifyAllCheckboxesAreChecked(state) {
    cy.get(Checkbox({ ariaLabel: 'Select instance' })).each((checkbox) => {
      const expectedState = state ? checkbox.checked : !checkbox.checked;
      cy.expect(expectedState);
    });
  },

  checkColumnHeaderSort(headerName, isAscending = true) {
    const sort = isAscending ? 'ascending' : 'descending';
    cy.expect(inventoriesList.find(MultiColumnListHeader(headerName, { sort })).exists());
  },

  getResultsListByColumn(columnIndex) {
    const cells = [];

    cy.wait(2000);
    return cy
      .get('div[class^="mclRowContainer--"]')
      .find('[data-row-index]')
      .each(($row) => {
        cy.get(`[class*="mclCell-"]:nth-child(${columnIndex + 1})`, { withinSubject: $row })
          .invoke('text')
          .then((cellValue) => {
            cells.push(cellValue);
          });
      })
      .then(() => cells);
  },

  checkResultListSortedByColumn(columnIndex, isAscending = true) {
    this.getResultsListByColumn(columnIndex).then((cells) => {
      if (isAscending) {
        cy.expect(cells).to.deep.equal(cells.sort((a, b) => a - b));
      } else {
        cy.expect(cells).to.deep.equal(cells.sort((a, b) => b - a));
      }
    });
  },

  clickActionsButton() {
    cy.do(actionsButton.click());
    cy.expect(actionsSortSelect.exists());
  },

  actionsSortBy(value) {
    cy.do(actionsSortSelect.choose(value));
    // need to wait until content will be sorted
    // eslint-disable-next-line cypress/no-unnecessary-waiting
    cy.wait(1000);
    cy.expect(actionsSortSelect.absent());
  },

  verifyActionsSortedBy(value) {
    cy.expect(actionsSortSelect.has({ checkedOptionText: value }));
  },

  clickColumnHeader(headerName) {
    cy.do([
      inventoriesList.find(MultiColumnListHeader(headerName)).click(),
      // wait for sort to apply
      cy.wait(2000),
    ]);
  },

  checkResultsPaneContainsRecordWithContributor(contributorName) {
    cy.expect(
      resultsPaneContent
        .find(MultiColumnListRow({ index: 0 }))
        .has({ text: including(contributorName) }),
    );
  },

  checkResultsCellContainsAnyOfValues(valuesArray, columnIndex = 0, rowIndex = 0) {
    const regEx = new RegExp(`.*(${valuesArray.join('|')}).*`, 'm');
    cy.expect(
      resultsPaneContent
        .find(MultiColumnListCell({ row: rowIndex, columnIndex }))
        .has({ text: matching(regEx) }),
    );
  },

  verifySearchResultIncludingValue: (value) => {
    cy.expect([
      inventoriesList.exists(),
      inventoriesList.find(MultiColumnListRow({ index: 0 })).has({ text: including(value) }),
    ]);
  },

  createMarcBibViaApi(body) {
    cy.okapiRequest({
      method: 'POST',
      path: 'records-editor/records',
      body,
      isDefaultSearchParamsRequired: false,
    });
  },

  verifyRecordsMatchingViaApi() {
    cy.wait(3000);
    cy.okapiRequest({
      method: 'POST',
      path: 'source-storage/records/matching',
      body: {
        logicalOperator: 'AND',
        filters: [
          {
            values: ['64758', '(OCoLC)64758'],
            field: '035',
            indicator1: '',
            indicator2: '',
            subfield: 'a',
            matchType: 'EXACTLY_MATCHES',
            qualifier: 'ENDS_WITH',
            qualifierValue: '758',
          },
        ],
        recordType: 'MARC_BIB',
        limit: 1000,
        offset: 0,
        returnTotalRecordsCount: true,
      },
      isDefaultSearchParamsRequired: false,
    })
      .its('status')
      .should('equal', 200);
  },

  verifyValueInColumnForTitle(title, columnName, expectedValue) {
    cy.expect(
      MultiColumnListRow({
        isContainer: true,
        content: including(title),
      })
        .find(MultiColumnListCell({ column: columnName }))
        .has({ content: expectedValue.toString() }),
    );
  },

  verifyValueInColumnForRow(rowIndex, columnName, expectedValue) {
    cy.expect(
      MultiColumnListRow({
        isContainer: false,
        index: rowIndex,
      })
        .find(MultiColumnListCell({ column: columnName }))
        .has({ content: expectedValue.toString() }),
    );
  },

  validateOptionInActionsMenu(optionName, shouldExist = true) {
    cy.do(actionsButton.click());
    if (shouldExist) {
      cy.expect(Button(optionName).exists());
    } else {
      cy.expect(Button(optionName).absent());
    }
  },

  toggleMarcBibLccnValidationRule({ enable = true }) {
    cy.getSpecificationIds({ family: 'MARC' }).then((specs) => {
      const marcBibSpecId = specs.find((spec) => spec.profile === 'bibliographic').id;
      cy.getSpecificationRules(marcBibSpecId).then(({ body }) => {
        const lccnRuleId = body.rules.find(
          (rule) => rule.name === 'Invalid LCCN Subfield Value',
        ).id;
        cy.updateSpecificationRule(marcBibSpecId, lccnRuleId, {
          enabled: enable,
        });
      });
    });
  },

  verifyColumnHeaderSortableButNotSorted(headerName, isSortable = true) {
    const targetHeader = inventoriesList.find(MultiColumnListHeader(headerName));
    cy.expect(targetHeader.has({ sortable: isSortable }));
  },

  checkIfInstanceHasHoldingsApi(instanceId, hasHoldings = true) {
    cy.getHoldings({ query: `instanceId==${instanceId}` }).then((holdings) => {
      if (hasHoldings) {
        cy.expect(holdings.length).to.be.greaterThan(0);
      } else {
        cy.expect(holdings.length).to.equal(0);
      }
    });
  },

  checkAllFoundInstancesHaveHoldings(haveHoldings = true) {
    cy.get('a[id^="record-title-"]').each(($instanceLink) => {
      const instanceId = $instanceLink.attr('id').replace('record-title-', '');
      this.checkIfInstanceHasHoldingsApi(instanceId, haveHoldings);
    });
  },
};
