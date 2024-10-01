import { including, matching } from '@interactors/html';
import { DEFAULT_JOB_PROFILE_NAMES, APPLICATION_NAMES } from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import DataImport from '../../../support/fragments/data_import/dataImport';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import BrowseSubjects from '../../../support/fragments/inventory/search/browseSubjects';
import MarcAuthorities from '../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthoritiesSearch from '../../../support/fragments/marcAuthority/marcAuthoritiesSearch';
import MarcAuthority from '../../../support/fragments/marcAuthority/marcAuthority';
import QuickMarcEditor from '../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import { escapeRegex, randomFourDigitNumber } from '../../../support/utils/stringTools';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';

const testData = {
  user: {},
  createdRecordIDs: [],
  tags: ['600'],
  instanceRecords: [
    "Black Tiger / writer, Ta-Nehisi Coates ; artist, Brian Stelfreeze ; pencils/layouts, Chris Sprouse ; color artist, Laura Martin ; letterer, VC's Joe Sabino.",
    'Empire of Wakanda',
    'Black Tiger : the fearless warrior of Wakanda',
  ],
  searchAuthorityQueries: ['Black Tiger (Fictitious character)'],
  browseQueries: ['Black Tiger (Fictitious character', 'Black Tiger (Fictitious character)'],
  subjectHeading: ['Black Tiger (Fictitious character)'],
  searchResults: [
    "Black Tiger / writer, Ta-Nehisi Coates ; artist, Brian Stelfreeze ; pencils/layouts, Chris Sprouse ; color artist, Laura Martin ; letterer, VC's Joe Sabino.",
    "Black Tiger : the fearless warrior of Wakanda / Ta-Nehisi Coates, writer ; Daniel Acuña, Jen Bartel, artists ; Triona Farrell, color artist ; VC's Joe Sabino, letterer.",
    "Black Tiger : the Intergalactic Empire of Wakanda / Ta-Nehisi Coates, writer ; Daniel Acuña, Jen Bartel, artists ; Triona Farrell, color artist ; VC's Joe Sabino, letterer.",
  ],
  marcFiles: [
    {
      marc: 'marcBibC375222.mrc',
      fileName: `testMarcFileC375222.${randomFourDigitNumber()}.mrc`,
      jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
      numberOfRecords: 3,
      propertyName: 'instance',
    },
    {
      marc: 'marcAuthC375222.mrc',
      fileName: `testMarcFileAuthC375228.${randomFourDigitNumber()}.mrc`,
      jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
      numberOfRecords: 1,
      propertyName: 'authority',
    },
  ],
};

describe('Inventory', () => {
  describe('Subject Browse', () => {
    before('Create test data', () => {
      cy.getAdminToken();
      cy.loginAsAdmin({ path: TopMenu.dataImportPath, waiter: DataImport.waitLoading }).then(() => {
        InventoryInstances.getInstancesViaApi({
          limit: 100,
          query: 'title="Black Tiger"',
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
            response.forEach((record) => {
              testData.createdRecordIDs.push(record[marcFile.propertyName].id);
            });
          });
        });
      });
      TopMenuNavigation.openAppFromDropdown(APPLICATION_NAMES.INVENTORY);
      for (let i = 0; i < testData.instanceRecords.length - 1; i++) {
        InventoryInstances.searchByTitle(testData.instanceRecords[i]);
        InventoryInstances.selectInstance();
        InventoryInstance.editMarcBibliographicRecord();
        InventoryInstance.verifyAndClickLinkIcon(testData.tags[0]);
        MarcAuthorities.switchToSearch();
        InventoryInstance.verifySelectMarcAuthorityModal();
        InventoryInstance.searchResults(testData.searchAuthorityQueries[0]);
        MarcAuthoritiesSearch.selectExcludeReferencesFilter();
        InventoryInstance.clickLinkButton();
        QuickMarcEditor.verifyAfterLinkingAuthority(testData.tags[0]);
        QuickMarcEditor.pressSaveAndClose();
        cy.wait(1500);
        QuickMarcEditor.pressSaveAndClose();

        InventoryInstance.verifySubjectHeading(including(testData.subjectHeading[0]));
        InventoryInstances.resetAllFilters();
      }
      cy.createTempUser([Permissions.inventoryAll.gui]).then((userProperties) => {
        testData.user = userProperties;
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(testData.user.userId);
      for (let i = 0; i < 3; i++) {
        InventoryInstance.deleteInstanceViaApi(testData.createdRecordIDs[i]);
      }
      MarcAuthority.deleteViaAPI(testData.createdRecordIDs[3]);
    });

    // Test is failing because of an Issue:
    // https://issues.folio.org/browse/UIIN-2369
    // TODO: remove comment once issue is fixed
    it(
      'C375222 Browse | Display records with same values in "Subject" field and linked to the same "MARC authority" record (spitfire) (TaaS)',
      { tags: ['criticalPath', 'spitfire'] },
      () => {
        cy.login(testData.user.username, testData.user.password, {
          path: TopMenu.inventoryPath,
          waiter: InventoryInstances.waitContentLoading,
        });

        testData.browseQueries.forEach((query) => {
          InventorySearchAndFilter.selectBrowseSubjects();
          InventorySearchAndFilter.browseSearch(query);
          BrowseSubjects.checkRowWithValueAndNoAuthorityIconExists(
            testData.searchAuthorityQueries[0],
          );
          BrowseSubjects.checkRowWithValueAndAuthorityIconExists(
            testData.searchAuthorityQueries[0],
          );
          BrowseSubjects.verifyNumberOfTitlesForRowWithValueAndAuthorityIcon(
            testData.searchAuthorityQueries[0],
            2,
          );
          BrowseSubjects.verifyNumberOfTitlesForRowWithValueAndNoAuthorityIcon(
            testData.searchAuthorityQueries[0],
            1,
          );
        });
        BrowseSubjects.selectRecordByTitle(
          including(`Linked to MARC authority${testData.searchAuthorityQueries[0]}`),
        );
        InventorySearchAndFilter.checkRowsCount(2);
        InventorySearchAndFilter.verifyInstanceDisplayed(testData.searchResults[0], true);
        InventorySearchAndFilter.verifyInstanceDisplayed(testData.searchResults[1], true);

        InventorySearchAndFilter.selectBrowseSubjects();
        InventorySearchAndFilter.browseSearch(testData.browseQueries[1]);
        BrowseSubjects.selectRecordByTitle(
          matching(new RegExp('^' + escapeRegex(testData.searchAuthorityQueries[0]))),
        );
        // Expected row count: 1, Actual row count 3
        // TODO: remove comment once issue is fixed
        InventorySearchAndFilter.checkRowsCount(1);
        InventorySearchAndFilter.verifyInstanceDisplayed(testData.searchResults[2], true);
      },
    );
  });
});
