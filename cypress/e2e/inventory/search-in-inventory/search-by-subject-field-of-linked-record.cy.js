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
  user: {},
  recordIDs: [],
  tags: ['600', '610', '611', '630', '650', '651', '655'],
  searchOptions: {
    QUERY_SEARCH: 'Query search',
  },
  instanceRecords: [
    "C375259 Black Panther / writer, Ta-Nehisi Coates ; artist, Brian Stelfreeze ; pencils/layouts, Chris Sprouse ; color artist, Laura Martin ; letterer, VC's Joe Sabino.",
    'C375259 Radio Vaticana e ordinamento italiano : atti del seminario di studi, Roma 26 aprile 2004 / a cura di Giuseppe Dalla Torre, Cesare Mirabelli.',
    'C375259 An Anglican view of the Vatican Council.',
    'C375259 Marvel comics direct distributors meeting / Marvel Comics Group.',
    'C375259 Abraham Lincoln, by Lillian Hertz. Prize essay in Alexander Hamilton junior high school P.S. 186, June 24, 1927.',
    'C375259 Clear Creek and Clear Lake, Tex. [electronic resource].',
    'C375259 Titanic / written and directed by James Cameron.',
  ],
  searchAuthorityQueries: [
    'C375259 Black Panther (Fictitious character)',
    'C375259 Radio \\"Vaticana\\". Hrvatski program',
    'C375259 Vatican Council',
    'C375259 Marvel comics ComiCon',
    'C375259 Speaking Oratory debating',
    'C375259 Clear Creek (Tex.) Place in Texas',
    'C375259 Drama Genre',
  ],
  searchQueries: [
    'subjects = "C375259 Black Panther (Fictitious character)"',
    'subjects = "C375259 Black Panther (Fictitious character)" OR subjects = "C375259 Radio Vaticana. Hrvatski program" OR subjects = "C375259 Vatican Council 1962-1965" OR subjects = "C375259 Marvel comics ComiCon" OR subjects == "C375259 Speaking Oratory--debating"  OR subjects == "C375259 Clear Creek (Tex.)--Place in Texas" OR subjects = "C375259 Drama--Genre"',
  ],
  subjectHeading: [
    'C375259 Black Panther (Fictitious character) Wakanda Forever',
    'C375259 Radio "Vaticana". Hrvatski program test',
    'C375259 Vatican Council (2nd : 1962-1965 : Basilica di San Pietro in Vaticano)',
    'C375259 Marvel comics ComiCon',
    'C375259 Speaking Oratory--debating',
    'C375259 Clear Creek (Tex.)',
    'C375259 Drama Genre',
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
        InventoryInstances.deleteInstanceByTitleViaApi('C375259');
        MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('C375259');

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
