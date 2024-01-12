import { JOB_STATUS_NAMES } from '../../support/constants';
import Permissions from '../../support/dictionary/permissions';
import DataImport from '../../support/fragments/data_import/dataImport';
import JobProfiles from '../../support/fragments/data_import/job_profiles/jobProfiles';
import Logs from '../../support/fragments/data_import/logs/logs';
import InventoryInstance from '../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import getRandomPostfix from '../../support/utils/stringTools';
import InventorySearchAndFilter from '../../support/fragments/inventory/inventorySearchAndFilter';
import InteractorsTools from '../../support/utils/interactorsTools';
import EHoldingsPackagesSearch from '../../support/fragments/eholdings/eHoldingsPackagesSearch';
import EHoldingSearch from '../../support/fragments/eholdings/eHoldingsSearch';

describe('eHoldings', () => {
  const testData = {
    tag: `Instance_1_${getRandomPostfix()}`,
    successCallout: 'New tag created',
  };

  const marcFiles = [
    {
      marc: 'marcBibFileForC376614.mrc',
      fileName: `testMarcFileC376614${getRandomPostfix()}.mrc`,
      jobProfileToRun: 'Default - Create instance and SRS MARC Bib',
    },
  ];

  const createdRecordIDs = [];

  before('Creating user', () => {
    cy.createTempUser([
      Permissions.inventoryAll.gui,
      Permissions.moduleeHoldingsEnabled.gui,
      Permissions.uiTagsPermissionAll.gui,
    ]).then((createdUserProperties) => {
      testData.userProperties = createdUserProperties;

      marcFiles.forEach((marcFile) => {
        cy.loginAsAdmin({ path: TopMenu.dataImportPath, waiter: DataImport.waitLoading }).then(
          () => {
            DataImport.verifyUploadState();
            DataImport.uploadFile(marcFile.marc, marcFile.fileName);
            JobProfiles.waitLoadingList();
            JobProfiles.search(marcFile.jobProfileToRun);
            JobProfiles.runImportFile();
            Logs.waitFileIsImported(marcFile.fileName);
            Logs.checkStatusOfJobProfile(JOB_STATUS_NAMES.COMPLETED);
            Logs.openFileDetails(marcFile.fileName);
            Logs.getCreatedItemsID().then((link) => {
              createdRecordIDs.push(link.split('/')[5]);
            });
          },
        );
      });
    });
  });

  beforeEach('Login to the application', () => {
    cy.login(testData.userProperties.username, testData.userProperties.password, {
      path: TopMenu.inventoryPath,
      waiter: InventoryInstances.waitContentLoading,
    });
  });

  after('Deleting created user', () => {
    cy.getAdminToken();
    Users.deleteViaApi(testData.userProperties.userId);
    InventoryInstance.deleteInstanceViaApi(createdRecordIDs[0]);
  });

  it(
    'C376614 Tags from another application are not shown in search filter for Packages, Titles, Providers (spitfire) (TaaS)',
    { tags: ['extendedPath', 'spitfire'] },
    () => {
      InventoryInstances.searchByTitle(createdRecordIDs[0]);
      InventoryInstances.selectInstance();
      InventorySearchAndFilter.verifyInstanceDetailsView();
      InventorySearchAndFilter.openTagsField();
      InventorySearchAndFilter.verifyTagsView();
      InventorySearchAndFilter.verifyTagCount();
      InventorySearchAndFilter.addTag(testData.tag);
      InteractorsTools.checkCalloutMessage(testData.successCallout);

      cy.visit(TopMenu.eholdingsPath);
      EHoldingsPackagesSearch.verifyTagAbsent(testData.tag);
      EHoldingSearch.switchToPackages();
      EHoldingsPackagesSearch.verifyTagAbsent(testData.tag);
      EHoldingSearch.switchToTitles();
      EHoldingsPackagesSearch.verifyTagAbsent(testData.tag);
    },
  );
});
