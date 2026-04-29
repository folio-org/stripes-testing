import { ADVANCED_SEARCH_MODIFIERS, ITEM_STATUS_NAMES } from '../../../support/constants';
import CapabilitySets from '../../../support/dictionary/capabilitySets';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import InstanceNoteTypes from '../../../support/fragments/settings/inventory/instance-note-types/instanceNoteTypes';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix, { randomNDigitNumber } from '../../../support/utils/stringTools';

describe('Inventory', () => {
  describe('Advanced search', () => {
    const randomPostfix = getRandomPostfix();
    const randomDigits = randomNDigitNumber(10);
    const testData = {
      advSearchOption: 'Advanced search',
      lccnValue: `nr431323${randomDigits}`,
      noteText: 'Wrap queries test',
      titleSearchValue: 'AT_C1322591_',
      keywordSearchValue: `Test abrahadabra1${randomPostfix}`,
      lccnTypeName: 'LCCN',
      canceledLccnTypeName: 'Canceled LCCN',
      instances: [
        {
          title: `AT_C1322591_FolioInstance_${randomPostfix}_1`,
          lccn: `nr431323${randomDigits}`,
          instanceNote: 'Wrap queries test',
          holdingsNote: 'Wrap queries test',
          itemNote: 'Wrap queries test',
          barcode: `AT_C1322591_${randomPostfix}-1`,
        },
        {
          title: `AT_C1322591_FolioInstance_${randomPostfix}_2`,
          canceledLccn: `nr431323${randomDigits}`,
          instanceAdminNote: 'Wrap queries test',
          holdingsAdminNote: 'Wrap queries test',
          itemAdminNote: 'Wrap queries test',
          barcode: `AT_C1322591_${randomPostfix}-2`,
        },
      ],
    };
    const booleanOperators = {
      and: 'AND',
      or: 'OR',
      not: 'NOT',
    };
    const searchModifiers = {
      exactPhrase: ADVANCED_SEARCH_MODIFIERS.EXACT_PHRASE,
      containsAny: ADVANCED_SEARCH_MODIFIERS.CONTAINS_ANY,
      containsAll: ADVANCED_SEARCH_MODIFIERS.CONTAINS_ALL,
      startsWith: ADVANCED_SEARCH_MODIFIERS.STARTS_WITH,
    };
    const searchOptions = {
      lccnNormalized: 'LCCN, normalized',
      instanceNotesAll: 'Instance notes (all)',
      titleAll: 'Title (all)',
      keyword: 'Keyword (title, contributor, identifier)',
      holdingsNotesAll: 'Holdings notes (all)',
      holdingsAdministrativeNotes: 'Holdings administrative notes',
      itemNotesAll: 'Item notes (all)',
      barcode: 'Barcode',
    };
    const createdInstanceIds = [];
    let instanceNoteTypeId;
    let holdingsNoteTypeId;
    let itemNoteTypeId;
    let lccnIdentifierTypeId;
    let canceledLccnIdentifierTypeId;
    let location;
    let materialType;
    let loanType;
    let user;

    before('Create test data', () => {
      cy.getAdminToken();
      InventoryInstances.deleteFullInstancesByTitleViaApi('C1322591_');

      cy.getInstanceTypes({ limit: 1 })
        .then((instanceTypes) => {
          testData.instanceTypeId = instanceTypes[0].id;
        })
        .then(() => {
          InstanceNoteTypes.getInstanceNoteTypesViaApi({ limit: 1, query: 'source="folio"' }).then(
            ({ instanceNoteTypes }) => {
              instanceNoteTypeId = instanceNoteTypes[0].id;
            },
          );
          InventoryInstances.getHoldingsNotesTypes({ limit: 1, query: 'source="folio"' }).then(
            (noteTypes) => {
              holdingsNoteTypeId = noteTypes[0].id;
            },
          );
          InventoryInstances.getItemNoteTypes({ limit: 1, query: 'source="folio"' }).then(
            (noteTypes) => {
              itemNoteTypeId = noteTypes[0].id;
            },
          );
          InventoryInstances.getIdentifierTypes({ query: `name=="${testData.lccnTypeName}"` }).then(
            (identifier) => {
              lccnIdentifierTypeId = identifier.id;
            },
          );
          InventoryInstances.getIdentifierTypes({
            query: `name=="${testData.canceledLccnTypeName}"`,
          }).then((identifier) => {
            canceledLccnIdentifierTypeId = identifier.id;
          });
          cy.getLocations({
            limit: 1,
            query: '(isActive=true and name<>"AT_*" and name<>"*auto*")',
          }).then((res) => {
            location = res;
          });
          cy.getMaterialTypes({ limit: 1, query: 'source=folio' }).then((res) => {
            materialType = res;
          });
          cy.getLoanTypes({ limit: 1, query: 'name<>"AT_*"' }).then((loanTypes) => {
            loanType = loanTypes[0];
          });
        })
        .then(() => {
          // Create first instance with LCCN, instance note, holdings note, item note
          InventoryInstances.createFolioInstanceViaApi({
            instance: {
              instanceTypeId: testData.instanceTypeId,
              title: testData.instances[0].title,
              identifiers: [
                {
                  identifierTypeId: lccnIdentifierTypeId,
                  value: testData.instances[0].lccn,
                },
              ],
              notes: [
                {
                  instanceNoteTypeId,
                  note: testData.instances[0].instanceNote,
                  staffOnly: false,
                },
              ],
            },
            holdings: [
              {
                permanentLocationId: location.id,
                notes: [
                  {
                    holdingsNoteTypeId,
                    note: testData.instances[0].holdingsNote,
                    staffOnly: false,
                  },
                ],
              },
            ],
            items: [
              {
                barcode: testData.instances[0].barcode,
                status: { name: ITEM_STATUS_NAMES.AVAILABLE },
                permanentLoanType: { id: loanType.id },
                materialType: { id: materialType.id },
                notes: [
                  {
                    itemNoteTypeId,
                    note: testData.instances[0].itemNote,
                    staffOnly: false,
                  },
                ],
              },
            ],
          }).then((specialInstanceIds) => {
            testData.instances[0].instanceId = specialInstanceIds.instanceId;
            testData.instances[0].holdingsId = specialInstanceIds.holdingIds[0].id;
            testData.instances[0].itemId = specialInstanceIds.items[0].id;
            createdInstanceIds.push(specialInstanceIds.instanceId);
          });

          // Create second instance with canceled LCCN, instance admin note, holdings admin note, item admin note
          InventoryInstances.createFolioInstanceViaApi({
            instance: {
              instanceTypeId: testData.instanceTypeId,
              title: testData.instances[1].title,
              identifiers: [
                {
                  identifierTypeId: canceledLccnIdentifierTypeId,
                  value: testData.instances[1].canceledLccn,
                },
              ],
              administrativeNotes: [testData.instances[1].instanceAdminNote],
            },
            holdings: [
              {
                permanentLocationId: location.id,
                administrativeNotes: [testData.instances[1].holdingsAdminNote],
              },
            ],
            items: [
              {
                barcode: testData.instances[1].barcode,
                status: { name: ITEM_STATUS_NAMES.AVAILABLE },
                permanentLoanType: { id: loanType.id },
                materialType: { id: materialType.id },
                administrativeNotes: [testData.instances[1].itemAdminNote],
              },
            ],
          }).then((specialInstanceIds) => {
            testData.instances[1].instanceId = specialInstanceIds.instanceId;
            testData.instances[1].holdingsId = specialInstanceIds.holdingIds[0].id;
            testData.instances[1].itemId = specialInstanceIds.items[0].id;
            createdInstanceIds.push(specialInstanceIds.instanceId);
          });
        })
        .then(() => {
          cy.createTempUser([]).then((userProperties) => {
            user = userProperties;

            cy.assignCapabilitiesToExistingUser(
              user.userId,
              [],
              [CapabilitySets.uiInventoryInstanceView],
            );

            cy.login(user.username, user.password, {
              path: TopMenu.inventoryPath,
              waiter: InventoryInstances.waitContentLoading,
            });
          });
        });
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(user.userId);
      createdInstanceIds.forEach((instanceId) => {
        InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(instanceId);
      });
    });

    it(
      'C1322591 Advanced search | Verify that advanced search query parts are wrapped in parentheses (spitfire)',
      { tags: ['extendedPath', 'spitfire', 'C1322591'] },
      () => {
        // Expected queries
        const expectedQueryStep1 = `(((lccn=="${testData.lccnValue}" or canceledLccn=="${testData.lccnValue}") and (notes.note=="${testData.noteText}" or administrativeNotes=="${testData.noteText}") and (title any "${testData.titleSearchValue}") or (keyword=="${testData.keywordSearchValue}")) and staffSuppress=="false") sortby title`;
        // eslint-disable-next-line no-useless-concat, prefer-template
        const expectedQueryStep2 =
          `(((holdings.notes.note=="${testData.noteText}" or holdings.administrativeNotes=="${testData.noteText}") or (holdings.administrativeNotes all "${testData.noteText}") and (keyword all "${testData.titleSearchValue}*" or keyword all "` +
          '\\"' +
          `${testData.titleSearchValue}*")) and staffSuppress=="false") sortby title`;
        const expectedQueryStep3 = `(((item.notes.note=="${testData.noteText}" or item.administrativeNotes=="${testData.noteText}") and (keyword all "${testData.titleSearchValue}") and (items.barcode="${testData.titleSearchValue}*")) and staffSuppress=="false") sortby title`;
        const expectedQueryStep4 = `(((item.notes.note=="${testData.noteText}" or item.administrativeNotes=="${testData.noteText}") and (keyword all "${testData.titleSearchValue}") and (items.barcode="${testData.titleSearchValue}*") not (items.barcode=="${testData.instances[1].barcode}")) and staffSuppress=="false") sortby title`;

        // Step 1: Configure advanced search query for Instance tab
        InventoryInstances.clickAdvSearchButton();
        InventoryInstances.fillAdvSearchRow(
          0,
          testData.lccnValue,
          searchModifiers.exactPhrase,
          searchOptions.lccnNormalized,
        );
        InventoryInstances.fillAdvSearchRow(
          1,
          testData.noteText,
          searchModifiers.exactPhrase,
          searchOptions.instanceNotesAll,
          booleanOperators.and,
        );
        InventoryInstances.fillAdvSearchRow(
          2,
          testData.titleSearchValue,
          searchModifiers.containsAny,
          searchOptions.titleAll,
          booleanOperators.and,
        );
        InventoryInstances.fillAdvSearchRow(
          3,
          testData.keywordSearchValue,
          searchModifiers.exactPhrase,
          searchOptions.keyword,
          booleanOperators.or,
        );
        cy.intercept('GET', '/search/instances?*').as('getInstances1');
        InventoryInstances.clickSearchBtnInAdvSearchModal();
        cy.wait('@getInstances1').then(({ request }) => {
          const queryParam = request.url.split('query=')[1].split('&')[0];
          const decodedQuery = decodeURIComponent(queryParam);
          expect(decodedQuery).to.equal(expectedQueryStep1);
        });
        InventoryInstances.checkAdvSearchModalAbsence();
        InventoryInstances.verifySelectedSearchOption(testData.advSearchOption);
        testData.instances.forEach((instance) => {
          InventorySearchAndFilter.verifySearchResult(instance.title);
        });

        // Step 2: Configure advanced search query for Holdings tab
        InventorySearchAndFilter.switchToHoldings();
        InventoryInstances.clickAdvSearchButton();
        InventoryInstances.fillAdvSearchRow(
          0,
          testData.noteText,
          searchModifiers.exactPhrase,
          searchOptions.holdingsNotesAll,
        );
        InventoryInstances.fillAdvSearchRow(
          1,
          testData.noteText,
          searchModifiers.containsAll,
          searchOptions.holdingsAdministrativeNotes,
          booleanOperators.or,
        );
        InventoryInstances.fillAdvSearchRow(
          2,
          testData.titleSearchValue,
          searchModifiers.startsWith,
          searchOptions.keyword,
          booleanOperators.and,
        );
        cy.intercept('GET', '/search/instances?*').as('getInstances2');
        InventoryInstances.clickSearchBtnInAdvSearchModal();
        cy.wait('@getInstances2').then(({ request }) => {
          const queryParam = request.url.split('query=')[1].split('&')[0];
          const decodedQuery = decodeURIComponent(queryParam);
          expect(decodedQuery).to.equal(expectedQueryStep2);
        });
        InventoryInstances.checkAdvSearchModalAbsence();
        testData.instances.forEach((instance) => {
          InventorySearchAndFilter.verifySearchResult(instance.title);
        });

        // Step 3: Configure advanced search query for Item tab
        InventorySearchAndFilter.switchToItem();
        InventoryInstances.clickAdvSearchButton();
        InventoryInstances.fillAdvSearchRow(
          0,
          testData.noteText,
          searchModifiers.exactPhrase,
          searchOptions.itemNotesAll,
        );
        InventoryInstances.fillAdvSearchRow(
          1,
          testData.titleSearchValue,
          searchModifiers.containsAll,
          searchOptions.keyword,
          booleanOperators.and,
        );
        InventoryInstances.fillAdvSearchRow(
          2,
          testData.titleSearchValue,
          searchModifiers.startsWith,
          searchOptions.barcode,
          booleanOperators.and,
        );
        cy.intercept('GET', '/search/instances?*').as('getInstances3');
        InventoryInstances.clickSearchBtnInAdvSearchModal();
        cy.wait('@getInstances3').then(({ request }) => {
          const queryParam = request.url.split('query=')[1].split('&')[0];
          const decodedQuery = decodeURIComponent(queryParam);
          expect(decodedQuery).to.equal(expectedQueryStep3);
        });
        InventoryInstances.checkAdvSearchModalAbsence();
        testData.instances.forEach((instance) => {
          InventorySearchAndFilter.verifySearchResult(instance.title);
        });

        // Step 4: Update search with NOT operator
        InventoryInstances.clickAdvSearchButton();
        InventoryInstances.fillAdvSearchRow(
          3,
          testData.instances[1].barcode,
          searchModifiers.exactPhrase,
          searchOptions.barcode,
          booleanOperators.not,
        );
        cy.intercept('GET', '/search/instances?*').as('getInstances4');
        InventoryInstances.clickSearchBtnInAdvSearchModal();
        cy.wait('@getInstances4').then(({ request }) => {
          const queryParam = request.url.split('query=')[1].split('&')[0];
          const decodedQuery = decodeURIComponent(queryParam);
          expect(decodedQuery).to.equal(expectedQueryStep4);
        });
        InventoryInstances.checkAdvSearchModalAbsence();
        // Only first instance should be found
        InventorySearchAndFilter.verifyNumberOfSearchResults(1);
        InventorySearchAndFilter.verifySearchResult(testData.instances[0].title);
      },
    );
  });
});
