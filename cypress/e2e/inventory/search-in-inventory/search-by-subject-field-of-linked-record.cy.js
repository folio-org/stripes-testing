import { including } from '@interactors/html';
import { DEFAULT_JOB_PROFILE_NAMES, APPLICATION_NAMES } from '../../../support/constants';
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
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';

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
    'Radio "Vaticana". Hrvatski program test',
    'Vatican Council (2nd : 1962-1965 : Basilica di San Pietro in Vaticano)',
    'Marvel comics ComiCon',
    'Speaking Oratory--debating',
    'Clear Creek (Tex.)',
    'Drama Genre',
  ],

  marcFiles: [
    {
      marc: 'marcBibC375259.mrc',
      fileName: `testMarcFileC375259.${randomFourDigitNumber()}.mrc`,
      jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
      numberOfRecords: 7,
      propertyName: 'instance',
    },
    {
      marc: 'marcAuthC375259.mrc',
      fileName: `testMarcFileAuth100C375259.${randomFourDigitNumber()}.mrc`,
      jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
      numberOfRecords: 7,
      propertyName: 'authority',
    },
  ],
};

describe('Inventory', () => {
  describe('Search in Inventory', () => {
    before('Create test data', () => {
      cy.getAdminToken().then(() => {
        testData.instanceRecords.forEach((instanceTitle) => {
          InventoryInstances.deleteInstanceByTitleViaApi(instanceTitle);
        });
        testData.searchAuthorityQueries.forEach((authHeading) => {
          MarcAuthorities.deleteMarcAuthorityByTitleViaAPI(authHeading);
        });

        testData.marcFiles.forEach((marcFile) => {
          DataImport.uploadFileViaApi(
            marcFile.marc,
            marcFile.fileName,
            marcFile.jobProfileToRun,
          ).then((response) => {
            response.forEach((record) => {
              testData.recordIDs.push(record[marcFile.propertyName].id);
            });
          });
        });
      });
      cy.waitForAuthRefresh(() => {
        cy.loginAsAdmin();
        TopMenuNavigation.openAppFromDropdown(APPLICATION_NAMES.INVENTORY);
        InventoryInstances.waitContentLoading();
      }, 20_000);
      for (let i = 0; i < testData.instanceRecords.length; i++) {
        InventoryInstances.searchByTitle(testData.instanceRecords[i]);
        cy.ifConsortia(true, () => {
          InventorySearchAndFilter.verifyResultListExists();
          InventorySearchAndFilter.byShared('No');
        });
        InventoryInstances.selectInstance();
        InventoryInstance.editMarcBibliographicRecord();
        InventoryInstance.verifyAndClickLinkIcon(testData.tags[i]);
        MarcAuthorities.switchToSearch();
        InventoryInstance.verifySelectMarcAuthorityModal();
        InventoryInstance.searchResults(testData.searchAuthorityQueries[i]);
        cy.ifConsortia(true, () => {
          MarcAuthorities.clickAccordionByName('Shared');
          MarcAuthorities.actionsSelectCheckbox('No');
        });
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
      { tags: ['extendedPath', 'spitfire', 'C375259'] },
      () => {
        cy.waitForAuthRefresh(() => {
          cy.login(testData.user.username, testData.user.password, {
            path: TopMenu.inventoryPath,
            waiter: InventoryInstances.waitContentLoading,
          });
        }, 20_000);
        cy.ifConsortia(true, () => {
          InventorySearchAndFilter.byShared('No');
        });
        InventoryInstances.searchInstancesWithOption(
          testData.searchOptions.QUERY_SEARCH,
          testData.searchQueries[0],
        );
        cy.ifConsortia(true, () => {
          InventorySearchAndFilter.verifyResultListExists();
          InventorySearchAndFilter.byShared('No');
        });
        InventorySearchAndFilter.verifyInstanceDisplayed(testData.instanceRecords[0], true);
        InventoryInstances.resetAllFilters();

        InventoryInstances.searchInstancesWithOption(
          testData.searchOptions.QUERY_SEARCH,
          testData.searchQueries[1],
        );
        cy.ifConsortia(true, () => {
          InventorySearchAndFilter.verifyResultListExists();
          InventorySearchAndFilter.byShared('No');
        });
        testData.instanceRecords.forEach((result) => {
          InventorySearchAndFilter.verifyInstanceDisplayed(result, true);
        });
      },
    );
  });
});
