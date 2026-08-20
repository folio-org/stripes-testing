import {
  ACCEPTED_DATA_TYPE_NAMES,
  APPLICATION_NAMES,
  FOLIO_RECORD_TYPE,
  JOB_STATUS_NAMES,
  RECORD_STATUSES,
  ITEM_STATUS_NAMES,
} from '../../../../support/constants';
import CapabilitySets from '../../../../support/dictionary/capabilitySets';
import DataImport from '../../../../support/fragments/data_import/dataImport';
import JobProfiles from '../../../../support/fragments/data_import/job_profiles/jobProfiles';
import NewJobProfile from '../../../../support/fragments/data_import/job_profiles/newJobProfile';
import FileDetails from '../../../../support/fragments/data_import/logs/fileDetails';
import Logs from '../../../../support/fragments/data_import/logs/logs';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import {
  ActionProfiles as SettingsActionProfiles,
  FieldMappingProfiles as SettingsFieldMappingProfiles,
  JobProfiles as SettingsJobProfiles,
} from '../../../../support/fragments/settings/dataImport';
import SettingsDataImport, {
  SETTINGS_TABS,
} from '../../../../support/fragments/settings/dataImport/settingsDataImport';
import FieldMappingProfileView from '../../../../support/fragments/settings/dataImport/fieldMappingProfile/fieldMappingProfileView';
import FieldMappingProfiles from '../../../../support/fragments/settings/dataImport/fieldMappingProfile/fieldMappingProfiles';
import NewFieldMappingProfile from '../../../../support/fragments/settings/dataImport/fieldMappingProfile/newFieldMappingProfile';
import SettingsMenu from '../../../../support/fragments/settingsMenu';
import TopMenuNavigation from '../../../../support/fragments/topMenuNavigation';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../support/utils/stringTools';

describe('Inventory', () => {
  describe('Item', () => {
    describe('Re-order item records', () => {
      const randomPostfix = getRandomPostfix();
      const filePath = 'marcBibFileForC831984.mrc';
      const uploadedFileName = `C831984 autotestFile${randomPostfix}.mrc`;
      const instanceTitle = 'AT_C831984_MarcBibInstance';
      const itemsCount = 3;
      const holdingsLocation = 'Holdings: ';
      const defaultCreateInstanceAP = 'Default - Create instance';

      const testData = {
        holdingsFmpProfile: {
          name: `C831984 Holdings FMP ${randomPostfix}`,
          typeValue: FOLIO_RECORD_TYPE.HOLDINGS,
        },
        itemsFmpProfile: {
          name: `C831984 Items FMP ${randomPostfix}`,
          typeValue: FOLIO_RECORD_TYPE.ITEM,
        },
        holdingsApProfile: {
          typeValue: FOLIO_RECORD_TYPE.HOLDINGS,
          name: `C831984 Holdings AP ${randomPostfix}`,
        },
        itemsApProfile: {
          typeValue: FOLIO_RECORD_TYPE.ITEM,
          name: `C831984 Items AP ${randomPostfix}`,
        },
        jobProfile: {
          ...NewJobProfile.defaultJobProfile,
          profileName: `C831984 JP ${randomPostfix}`,
          acceptedType: ACCEPTED_DATA_TYPE_NAMES.MARC,
        },
      };
      let testUser;
      let loanType;

      before('Create user and login', () => {
        cy.getAdminToken().then(() => {
          cy.getLoanTypes({ limit: 1, query: 'source<>local' }).then((loanTypes) => {
            loanType = loanTypes[0].name;
          });
        });
        cy.createTempUser([]).then((userProperties) => {
          testUser = userProperties;
          cy.assignCapabilitiesToExistingUser(
            testUser.userId,
            [],
            [
              CapabilitySets.uiInventoryInstanceView,
              CapabilitySets.uiInventoryItemCreate,
              CapabilitySets.uiDataImport,
              CapabilitySets.uiDataImportSettingsManage,
            ],
          );
          cy.login(testUser.username, testUser.password, {
            path: SettingsMenu.mappingProfilePath,
            waiter: FieldMappingProfiles.waitLoading,
          });
        });
      });

      after('Delete test data', () => {
        cy.getAdminToken().then(() => {
          Users.deleteViaApi(testUser.userId);
          SettingsJobProfiles.deleteJobProfileByNameViaApi(testData.jobProfile.profileName);
          SettingsActionProfiles.deleteActionProfileByNameViaApi(testData.holdingsApProfile.name);
          SettingsActionProfiles.deleteActionProfileByNameViaApi(testData.itemsApProfile.name);
          SettingsFieldMappingProfiles.deleteMappingProfileByNameViaApi(
            testData.holdingsFmpProfile.name,
          );
          SettingsFieldMappingProfiles.deleteMappingProfileByNameViaApi(
            testData.itemsFmpProfile.name,
          );
          InventoryInstances.deleteFullInstancesByTitleViaApi(instanceTitle);
        });
      });

      it(
        'C831984 Import multiple items in one holding to check "Order" fields (promin)',
        { tags: ['criticalPath', 'promin', 'C831984'] },
        () => {
          // Step 1-3: Create Holdings field mapping profile
          FieldMappingProfiles.openNewMappingProfileForm();
          NewFieldMappingProfile.fillSummaryInMappingProfile(testData.holdingsFmpProfile);
          NewFieldMappingProfile.fillPermanentLocation('945$h');
          NewFieldMappingProfile.save();
          FieldMappingProfileView.closeViewMode(testData.holdingsFmpProfile.name);

          // Step 4-6: Create Items field mapping profile
          FieldMappingProfiles.openNewMappingProfileForm();
          NewFieldMappingProfile.fillSummaryInMappingProfile(testData.itemsFmpProfile);
          NewFieldMappingProfile.fillMaterialType('945$a');
          NewFieldMappingProfile.fillPermanentLoanType(loanType);
          NewFieldMappingProfile.fillStatus(`"${ITEM_STATUS_NAMES.AVAILABLE}"`);
          NewFieldMappingProfile.save();
          FieldMappingProfileView.closeViewMode(testData.itemsFmpProfile.name);

          // Step 7-9: Create Holdings action profile
          SettingsDataImport.selectSettingsTab(SETTINGS_TABS.ACTION_PROFILES);
          SettingsActionProfiles.create(
            testData.holdingsApProfile,
            testData.holdingsFmpProfile.name,
          );

          // Step 10-12: Create Items action profile
          SettingsActionProfiles.create(testData.itemsApProfile, testData.itemsFmpProfile.name);

          // Step 13-15: Create job profile linking Default instance AP, Holdings AP, Items AP
          SettingsDataImport.selectSettingsTab(SETTINGS_TABS.JOB_PROFILES);
          JobProfiles.createJobProfile(testData.jobProfile);
          NewJobProfile.linkActionProfileByName(defaultCreateInstanceAP);
          NewJobProfile.linkActionProfileByName(testData.holdingsApProfile.name);
          NewJobProfile.linkActionProfileByName(testData.itemsApProfile.name);
          NewJobProfile.saveAndClose();

          // Step 16-17: Upload file and run import with the new job profile
          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.DATA_IMPORT);
          DataImport.verifyUploadState();
          DataImport.uploadFile(filePath, uploadedFileName);
          JobProfiles.waitFileIsUploaded();
          JobProfiles.search(testData.jobProfile.profileName);
          JobProfiles.runImportFile();

          // Step 18: Wait for import completion and open file details
          Logs.waitFileIsImported(uploadedFileName);
          Logs.checkJobStatus(uploadedFileName, JOB_STATUS_NAMES.COMPLETED);
          Logs.openFileDetails(uploadedFileName);

          // Step 19: Verify result counts: 1 SRS, 1 Instance, 1 Holding, N Items
          FileDetails.checkSrsRecordQuantityInSummaryTable('1');
          FileDetails.checkInstanceQuantityInSummaryTable('1');
          FileDetails.checkHoldingsQuantityInSummaryTable('1');
          FileDetails.checkItemQuantityInSummaryTable(`${itemsCount}`);

          // Step 20: Navigate to Instance in Inventory via Created link
          FileDetails.openInstanceInInventory(RECORD_STATUSES.CREATED);
          InventoryInstance.waitLoading();

          // Step 21: Verify each item has sequential Order value starting from 1
          InventoryInstance.openHoldingsAccordion(holdingsLocation);
          for (let i = 0; i < itemsCount; i++) {
            InventoryInstance.checkItemOrderValueInHoldings(holdingsLocation, i, i + 1);
          }
        },
      );
    });
  });
});
