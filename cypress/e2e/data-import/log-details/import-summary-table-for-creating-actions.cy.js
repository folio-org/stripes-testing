import {
  APPLICATION_NAMES,
  FOLIO_RECORD_TYPE,
  ITEM_STATUS_NAMES,
  JOB_STATUS_NAMES,
  LOAN_TYPE_NAMES,
  LOCATION_NAMES,
  MATERIAL_TYPE_NAMES,
  RECORD_STATUSES,
} from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import DataImport from '../../../support/fragments/data_import/dataImport';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import NewJobProfile from '../../../support/fragments/data_import/job_profiles/newJobProfile';
import FileDetails from '../../../support/fragments/data_import/logs/fileDetails';
import Logs from '../../../support/fragments/data_import/logs/logs';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import {
  ActionProfiles as SettingsActionProfiles,
  FieldMappingProfiles as SettingsFieldMappingProfiles,
  JobProfiles as SettingsJobProfiles,
} from '../../../support/fragments/settings/dataImport';
import FieldMappingProfileView from '../../../support/fragments/settings/dataImport/fieldMappingProfile/fieldMappingProfileView';
import FieldMappingProfiles from '../../../support/fragments/settings/dataImport/fieldMappingProfile/fieldMappingProfiles';
import NewFieldMappingProfile from '../../../support/fragments/settings/dataImport/fieldMappingProfile/newFieldMappingProfile';
import SettingsDataImport, {
  SETTINGS_TABS,
} from '../../../support/fragments/settings/dataImport/settingsDataImport';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Data Import', () => {
  describe('Log details', () => {
    let user;
    let instanceHrid;
    const quantityOfItems = '11';
    const instanceTitle = 'Protozoological abstracts.';
    const nameMarcFile = `C356801 autotestFile${getRandomPostfix()}.mrc`;
    const collectionOfMappingAndActionProfiles = [
      {
        mappingProfile: {
          typeValue: FOLIO_RECORD_TYPE.INSTANCE,
          name: `C356801 instance mapping profile ${getRandomPostfix()}`,
        },
        actionProfile: {
          typeValue: FOLIO_RECORD_TYPE.INSTANCE,
          name: `C356801 instance action profile ${getRandomPostfix()}`,
        },
      },
      {
        mappingProfile: {
          typeValue: FOLIO_RECORD_TYPE.HOLDINGS,
          name: `C356801 holdings mapping profile ${getRandomPostfix()}`,
          pernanentLocation: `"${LOCATION_NAMES.ONLINE}"`,
          pernanentLocationUI: LOCATION_NAMES.ONLINE_UI,
        },
        actionProfile: {
          typeValue: FOLIO_RECORD_TYPE.HOLDINGS,
          name: `C356801 holdings action profile ${getRandomPostfix()}`,
        },
      },
      {
        mappingProfile: {
          typeValue: FOLIO_RECORD_TYPE.ITEM,
          name: `C356801 item mapping profile ${getRandomPostfix()}`,
          permanentLoanType: LOAN_TYPE_NAMES.CAN_CIRCULATE,
          status: ITEM_STATUS_NAMES.AVAILABLE,
          materialType: MATERIAL_TYPE_NAMES.BOOK,
        },
        actionProfile: {
          typeValue: FOLIO_RECORD_TYPE.ITEM,
          name: `C356801 item action profile ${getRandomPostfix()}`,
        },
      },
    ];
    const jobProfile = {
      ...NewJobProfile.defaultJobProfile,
      profileName: `C356801 job profile ${getRandomPostfix()}`,
    };

    before('Create test user and login', () => {
      cy.createTempUser([
        Permissions.moduleDataImportEnabled.gui,
        Permissions.settingsDataImportEnabled.gui,
        Permissions.uiInventoryViewInstances.gui,
      ]).then((userProperties) => {
        user = userProperties;

        cy.login(user.username, user.password, {
          path: SettingsMenu.mappingProfilePath,
          waiter: FieldMappingProfiles.waitLoading,
        });
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken().then(() => {
        SettingsJobProfiles.deleteJobProfileByNameViaApi(jobProfile.profileName);
        collectionOfMappingAndActionProfiles.forEach((profile) => {
          SettingsActionProfiles.deleteActionProfileByNameViaApi(profile.actionProfile.name);
          SettingsFieldMappingProfiles.deleteMappingProfileByNameViaApi(
            profile.mappingProfile.name,
          );
        });
        Users.deleteViaApi(user.userId);
        cy.getInstance({ limit: 1, expandAll: true, query: `"hrid"=="${instanceHrid}"` }).then(
          (instance) => {
            cy.deleteItemViaApi(instance.items[0].id);
            cy.deleteHoldingRecordViaApi(instance.holdings[0].id);
            InventoryInstance.deleteInstanceViaApi(instance.id);
          },
        );
      });
    });

    it(
      'C356801 Check import summary table with "Created" actions for instance, holding and item (folijet)',
      { tags: ['criticalPath', 'folijet', 'C356801'] },
      () => {
        // create mapping profiles
        FieldMappingProfiles.openNewMappingProfileForm();
        NewFieldMappingProfile.fillSummaryInMappingProfile(
          collectionOfMappingAndActionProfiles[0].mappingProfile,
        );
        NewFieldMappingProfile.save();
        FieldMappingProfileView.closeViewMode(
          collectionOfMappingAndActionProfiles[0].mappingProfile.name,
        );

        FieldMappingProfiles.openNewMappingProfileForm();
        NewFieldMappingProfile.fillSummaryInMappingProfile(
          collectionOfMappingAndActionProfiles[1].mappingProfile,
        );
        NewFieldMappingProfile.fillPermanentLocation(
          collectionOfMappingAndActionProfiles[1].mappingProfile.pernanentLocation,
        );
        NewFieldMappingProfile.save();
        FieldMappingProfileView.closeViewMode(
          collectionOfMappingAndActionProfiles[1].mappingProfile.name,
        );

        FieldMappingProfiles.openNewMappingProfileForm();
        NewFieldMappingProfile.fillSummaryInMappingProfile(
          collectionOfMappingAndActionProfiles[2].mappingProfile,
        );
        NewFieldMappingProfile.fillMaterialType(
          `"${collectionOfMappingAndActionProfiles[2].mappingProfile.materialType}"`,
        );
        NewFieldMappingProfile.fillPermanentLoanType(
          collectionOfMappingAndActionProfiles[2].mappingProfile.permanentLoanType,
        );
        NewFieldMappingProfile.fillStatus(
          `"${collectionOfMappingAndActionProfiles[2].mappingProfile.status}"`,
        );
        NewFieldMappingProfile.save();
        FieldMappingProfileView.closeViewMode(
          collectionOfMappingAndActionProfiles[2].mappingProfile.name,
        );

        // create action profiles
        SettingsDataImport.selectSettingsTab(SETTINGS_TABS.ACTION_PROFILES);
        collectionOfMappingAndActionProfiles.forEach((profile) => {
          SettingsActionProfiles.create(profile.actionProfile, profile.mappingProfile.name);
          SettingsActionProfiles.checkActionProfilePresented(profile.actionProfile.name);
        });

        // create job profile
        SettingsDataImport.selectSettingsTab(SETTINGS_TABS.JOB_PROFILES);
        JobProfiles.createJobProfile(jobProfile);
        NewJobProfile.linkActionProfile(collectionOfMappingAndActionProfiles[0].actionProfile);
        NewJobProfile.linkActionProfile(collectionOfMappingAndActionProfiles[1].actionProfile);
        NewJobProfile.linkActionProfile(collectionOfMappingAndActionProfiles[2].actionProfile);
        NewJobProfile.saveAndClose();
        JobProfiles.checkJobProfilePresented(jobProfile.profileName);

        // upload a marc file for creating of the new instance, holding and item
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.DATA_IMPORT);
        DataImport.verifyUploadState();
        DataImport.uploadFile('marcBibFileForC356801.mrc', nameMarcFile);
        JobProfiles.waitFileIsUploaded();
        JobProfiles.search(jobProfile.profileName);
        JobProfiles.runImportFile();
        Logs.waitFileIsImported(nameMarcFile);
        Logs.checkJobStatus(nameMarcFile, JOB_STATUS_NAMES.COMPLETED);
        Logs.openFileDetails(nameMarcFile);
        // check created instance
        FileDetails.openInstanceInInventory(RECORD_STATUSES.CREATED);
        InventoryInstance.getAssignedHRID().then((initialInstanceHrId) => {
          instanceHrid = initialInstanceHrId;
        });
        InventoryInstance.checkIsInstancePresented(
          instanceTitle,
          collectionOfMappingAndActionProfiles[1].mappingProfile.pernanentLocationUI,
          collectionOfMappingAndActionProfiles[2].mappingProfile.status,
        );
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.DATA_IMPORT);
        FileDetails.close();
        Logs.openFileDetails(nameMarcFile);
        [
          FileDetails.columnNameInResultList.srsMarc,
          FileDetails.columnNameInResultList.instance,
          FileDetails.columnNameInResultList.holdings,
          FileDetails.columnNameInResultList.item,
        ].forEach((columnName) => {
          FileDetails.checkStatusInColumn(RECORD_STATUSES.CREATED, columnName);
        });
        // check Created counter in the Summary table
        FileDetails.checkSrsRecordQuantityInSummaryTable(quantityOfItems);
        FileDetails.checkInstanceQuantityInSummaryTable(quantityOfItems);
        FileDetails.checkHoldingsQuantityInSummaryTable(quantityOfItems);
        FileDetails.checkItemQuantityInSummaryTable(quantityOfItems);
        // check Updated counter in the Summary table
        FileDetails.checkInstanceQuantityInSummaryTable('0', 1);
        FileDetails.checkHoldingsQuantityInSummaryTable('0', 1);
        FileDetails.checkItemQuantityInSummaryTable('0', 1);
        // check No action counter in the Summary table
        FileDetails.checkInstanceQuantityInSummaryTable('0', 2);
        FileDetails.checkHoldingsQuantityInSummaryTable('0', 2);
        FileDetails.checkItemQuantityInSummaryTable('0', 2);
        // check Error counter in the Summary table
        FileDetails.checkInstanceQuantityInSummaryTable('0', 3);
        FileDetails.checkHoldingsQuantityInSummaryTable('0', 3);
        FileDetails.checkItemQuantityInSummaryTable('0', 3);
      },
    );
  });
});
