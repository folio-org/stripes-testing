import { including, matching } from '@interactors/html';
import { JOB_STATUS_NAMES } from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import DataImport from '../../../support/fragments/data_import/dataImport';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import Logs from '../../../support/fragments/data_import/logs/logs';
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

const testData = {
  user: {},
  instanceIDs: [],
  authorityIDs: [],
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
      jobProfileToRun: 'Default - Create instance and SRS MARC Bib',
      numberOfRecords: 3,
    },
    {
      marc: 'marcAuthC375222.mrc',
      fileName: `testMarcFileAuthC375228.${randomFourDigitNumber()}.mrc`,
      jobProfileToRun: 'Default - Create SRS MARC Authority',
      numberOfRecords: 1,
    },
  ],
};

describe('inventory', () => {
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
          DataImport.verifyUploadState();
          DataImport.uploadFileAndRetry(marcFile.marc, marcFile.fileName);
          JobProfiles.search(marcFile.jobProfileToRun);
          JobProfiles.runImportFile();
          JobProfiles.waitFileIsImported(marcFile.fileName);
          Logs.checkStatusOfJobProfile(JOB_STATUS_NAMES.COMPLETED);
          Logs.openFileDetails(marcFile.fileName);
          for (let i = 0; i < marcFile.numberOfRecords; i++) {
            Logs.getCreatedItemsID(i).then((link) => {
              if (marcFile.jobProfileToRun === 'Default - Create instance and SRS MARC Bib') {
                testData.instanceIDs.push(link.split('/')[5]);
              } else {
                testData.authorityIDs.push(link.split('/')[5]);
              }
            });
          }
          cy.visit(TopMenu.dataImportPath);
        });
      });
      cy.visit(TopMenu.inventoryPath);
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

        InventoryInstance.verifySubjectHeading(including(testData.subjectHeading[0]));
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
      testData.instanceIDs.forEach((id) => {
        InventoryInstance.deleteInstanceViaApi(id);
      });
      testData.authorityIDs.forEach((id) => {
        MarcAuthority.deleteViaAPI(id);
      });
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
