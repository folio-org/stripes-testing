import { including } from '@interactors/html';
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
import { randomFourDigitNumber } from '../../../support/utils/stringTools';

const testData = {
  user: {},
  recordIDs: [],
  tags: ['650'],
  instanceRecords: [
    "Black Panther / writer, Ta-Nehisi Coates ; artist, Brian Stelfreeze ; pencils/layouts, Chris Sprouse ; color artist, Laura Martin ; letterer, VC's Joe Sabino.",
    'Black Panther : the Intergalactic Empire of Wakanda',
  ],
  searchAuthorityQueries: ['Good and evil'],
  browseQueries: ['Good and Evil'],
  subjectHeading: ['Good and evil'],

  marcFiles: [
    {
      marc: 'marcBibC375224.mrc',
      fileName: `testMarcFileC375224.${randomFourDigitNumber()}.mrc`,
      jobProfileToRun: 'Default - Create instance and SRS MARC Bib',
      numberOfRecords: 2,
      propertyName: 'relatedInstanceInfo',
    },
    {
      marc: 'marcAuth_1C375224.mrc',
      fileName: `testMarcFileAuth_1C375224.${randomFourDigitNumber()}.mrc`,
      jobProfileToRun: 'Default - Create SRS MARC Authority',
      numberOfRecords: 1,
      propertyName: 'relatedAuthorityInfo',
    },
    {
      marc: 'marcAuth_2C375224.mrc',
      fileName: `testMarcFileAuth_2C375224.${randomFourDigitNumber()}.mrc`,
      jobProfileToRun: 'Default - Create SRS MARC Authority',
      numberOfRecords: 1,
      propertyName: 'relatedAuthorityInfo',
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
          query: 'title="Black Panther"',
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
        InventoryInstance.verifyAndClickLinkIcon(testData.tags[0]);
        MarcAuthorities.switchToSearch();
        InventoryInstance.verifySelectMarcAuthorityModal();
        InventoryInstance.searchResults(testData.searchAuthorityQueries[0]);
        MarcAuthoritiesSearch.selectExcludeReferencesFilter();
        MarcAuthoritiesSearch.selectAuthorityByIndex(i);
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
      InventoryInstance.deleteInstanceViaApi(testData.recordIDs[0]);
      InventoryInstance.deleteInstanceViaApi(testData.recordIDs[1]);
      MarcAuthority.deleteViaAPI(testData.recordIDs[2]);
      MarcAuthority.deleteViaAPI(testData.recordIDs[3]);
    });

    it(
      'C375224 Browse | Display records with same values in "Subject" field and linked to different "MARC authority" records (spitfire) (TaaS)',
      { tags: ['extendedPath', 'spitfire'] },
      () => {
        cy.login(testData.user.username, testData.user.password, {
          path: TopMenu.inventoryPath,
          waiter: InventoryInstances.waitContentLoading,
        });

        InventorySearchAndFilter.selectBrowseSubjects();
        InventorySearchAndFilter.browseSearch(testData.browseQueries[0]);
        BrowseSubjects.checkAuthorityIconAndValueDisplayedForRow(
          5,
          testData.searchAuthorityQueries[0],
        );
        BrowseSubjects.checkAuthorityIconAndValueDisplayedForRow(
          6,
          testData.searchAuthorityQueries[0],
        );
        BrowseSubjects.verifyNumberOfTitlesForRow(5, 1);
        BrowseSubjects.verifyNumberOfTitlesForRow(6, 1);
      },
    );
  });
});
