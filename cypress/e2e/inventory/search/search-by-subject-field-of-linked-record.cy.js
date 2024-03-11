import { including } from '@interactors/html';
import { Permissions } from '../../../support/dictionary';
import DataImport from '../../../support/fragments/data_import/dataImport';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import MarcAuthorities from '../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthoritiesSearch from '../../../support/fragments/marcAuthority/marcAuthoritiesSearch';
import MarcAuthority from '../../../support/fragments/marcAuthority/marcAuthority';
import QuickMarcEditor from '../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import { randomFourDigitNumber } from '../../../support/utils/stringTools';

const testData = {
  searchQueryBeforeTest:
    'subjects = "Black Panther (Fictitious character)" OR subjects = "Radio in religion--Catholic Church" OR subjects = "Vatican Council 1962-1965" OR subjects = "Comic books, strips, etc.--United States--Catalogs" OR subjects = "Lincoln, Abraham, 1809-1865--Addresses, sermons, etc" OR subjects = "Topographical surveying" OR subjects = "Titanic (Steamship)--Drama"',
  user: {},
  recordIDs: [],
  tags: ['600', '610', '611', '630', '650', '651', '655'],
  searchOptions: {
    QUERY_SEARCH: 'Query search',
  },
  instanceRecords: [
    "Black Panther / writer, Ta-Nehisi Coates ; artist, Brian Stelfreeze ; pencils/layouts, Chris Sprouse ; color artist, Laura Martin ; letterer, VC's Joe Sabino.",
    'Radio Vaticana e ordinamento italiano : atti del seminario di studi, Roma 26 aprile 2004 / a cura di Giuseppe Dalla Torre, Cesare Mirabelli.',
    'An Anglican view of the Vatican Council.',
    'Marvel comics direct distributors meeting / Marvel Comics Group.',
    'Abraham Lincoln, by Lillian Hertz. Prize essay in Alexander Hamilton junior high school P.S. 186, June 24, 1927.',
    'Clear Creek and Clear Lake, Tex. [electronic resource].',
    'Titanic / written and directed by James Cameron.',
  ],
  searchAuthorityQueries: [
    'Black Panther (Fictitious character)',
    'Radio \\"Vaticana\\". Hrvatski program',
    'Vatican Council',
    'Marvel comics ComiCon',
    'Speaking Oratory debating',
    'Clear Creek (Tex.) Place in Texas',
    'Drama Genre',
  ],
  searchQueries: [
    'subjects = "Black Panther (Fictitious character)"',
    'subjects = "Black Panther (Fictitious character)" OR subjects = "Radio Vaticana. Hrvatski program" OR subjects = "Vatican Council 1962-1965" OR subjects = "Marvel comics ComiCon" OR subjects == "Speaking Oratory--debating"  OR subjects == "Clear Creek (Tex.)--Place in Texas" OR subjects = "Drama--Genre"',
  ],
  subjectHeading: [
    'Black Panther (Fictitious character) Wakanda Forever',
    'Radio "Vaticana". Hrvatski program test--Congresses',
    'Vatican Council 1962-1965 : Basilica di San Pietro in Vaticano)',
    'Marvel comics ComiCon--Periodicals.--United States',
    'Speaking Oratory--debating',
    'Clear Creek (Tex.)--Place in Texas--Form',
    'Drama Genre',
  ],

  marcFiles: [
    {
      marc: 'marcBibC375259.mrc',
      fileName: `testMarcFileC375259.${randomFourDigitNumber()}.mrc`,
      jobProfileToRun: 'Default - Create instance and SRS MARC Bib',
      numberOfRecords: 7,
      propertyName: 'relatedInstanceInfo',
    },
    {
      marc: 'marcAuthC375259.mrc',
      fileName: `testMarcFileAuth100C375259.${randomFourDigitNumber()}.mrc`,
      jobProfileToRun: 'Default - Create SRS MARC Authority',
      numberOfRecords: 7,
      propertyName: 'relatedAuthorityInfo',
    },
  ],
};

describe('inventory', () => {
  describe('Search in Inventory', () => {
    before('Create test data', () => {
      cy.getAdminToken();
      cy.loginAsAdmin({ path: TopMenu.dataImportPath, waiter: DataImport.waitLoading }).then(() => {
        InventoryInstances.getInstancesViaApi({
          limit: 100,
          query: testData.searchQueryBeforeTest,
        }).then((instances) => {
          if (instances) {
            instances.forEach(({ id }) => {
              InventoryInstance.deleteInstanceViaApi(id);
            });
          }
        });
        testData.searchAuthorityQueries.forEach((query) => {
          MarcAuthorities.getMarcAuthoritiesViaApi({
            limit: 100,
            query: `keyword="${query}" and (authRefType==("Authorized" or "Auth/Ref"))`,
          }).then((authorities) => {
            if (authorities) {
              authorities.forEach(({ id }) => {
                MarcAuthority.deleteViaAPI(id);
              });
            }
          });
        });
        testData.marcFiles.forEach((marcFile) => {
          DataImport.uploadFileViaApi(
            marcFile.marc,
            marcFile.fileName,
            marcFile.jobProfileToRun,
          ).then((response) => {
            response.entries.forEach((record) => {
              testData.recordIDs.push(record[marcFile.propertyName].idList[0]);
            });
          });
        });
      });
      cy.visit(TopMenu.inventoryPath);
      for (let i = 0; i < testData.instanceRecords.length; i++) {
        InventoryInstances.searchByTitle(testData.instanceRecords[i]);
        InventoryInstances.selectInstance();
        InventoryInstance.editMarcBibliographicRecord();
        InventoryInstance.verifyAndClickLinkIcon(testData.tags[i]);
        MarcAuthorities.switchToSearch();
        InventoryInstance.verifySelectMarcAuthorityModal();
        InventoryInstance.searchResults(testData.searchAuthorityQueries[i]);
        MarcAuthoritiesSearch.selectExcludeReferencesFilter();
        InventoryInstance.clickLinkButton();
        QuickMarcEditor.verifyAfterLinkingAuthority(testData.tags[i]);
        QuickMarcEditor.pressSaveAndClose();
        InventoryInstance.verifySubjectHeading(including(testData.subjectHeading[i]));
        InventoryInstances.resetAllFilters();
      }
      cy.createTempUser([Permissions.inventoryAll.gui]).then((userProperties) => {
        testData.user = userProperties;
      });
      cy.logout();
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(testData.user.userId);
      for (let i = 0; i < 7; i++) {
        InventoryInstance.deleteInstanceViaApi(testData.recordIDs[i]);
      }
      for (let i = 7; i < 14; i++) {
        MarcAuthority.deleteViaAPI(testData.recordIDs[i]);
      }
    });

    it(
      'C375259 Query search | Search by "Subject" field of linked "MARC Bib" record (spitfire) (TaaS)',
      { tags: ['extendedPath', 'spitfire'] },
      () => {
        cy.login(testData.user.username, testData.user.password, {
          path: TopMenu.inventoryPath,
          waiter: InventoryInstances.waitContentLoading,
        });
        InventoryInstances.searchInstancesWithOption(
          testData.searchOptions.QUERY_SEARCH,
          testData.searchQueries[0],
        );
        InventorySearchAndFilter.checkRowsCount(1);
        InventorySearchAndFilter.verifyInstanceDisplayed(testData.instanceRecords[0], true);
        InventoryInstances.resetAllFilters();

        InventoryInstances.searchInstancesWithOption(
          testData.searchOptions.QUERY_SEARCH,
          testData.searchQueries[1],
        );
        InventorySearchAndFilter.checkRowsCount(7);
        testData.instanceRecords.forEach((result) => {
          InventorySearchAndFilter.verifyInstanceDisplayed(result, true);
        });
      },
    );
  });
});
