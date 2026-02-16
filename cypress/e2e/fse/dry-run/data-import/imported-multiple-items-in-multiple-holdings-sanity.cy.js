import {
  ACCEPTED_DATA_TYPE_NAMES,
  APPLICATION_NAMES,
  FOLIO_RECORD_TYPE,
  ITEM_STATUS_NAMES,
  JOB_STATUS_NAMES,
  LOAN_TYPE_NAMES,
  LOCATION_NAMES,
  RECORD_STATUSES,
} from '../../../../support/constants';
import DataImport from '../../../../support/fragments/data_import/dataImport';
import JobProfiles from '../../../../support/fragments/data_import/job_profiles/jobProfiles';
import NewJobProfile from '../../../../support/fragments/data_import/job_profiles/newJobProfile';
import FileDetails from '../../../../support/fragments/data_import/logs/fileDetails';
import Logs from '../../../../support/fragments/data_import/logs/logs';
import InstanceRecordView from '../../../../support/fragments/inventory/instanceRecordView';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import {
  ActionProfiles as SettingsActionProfiles,
  FieldMappingProfiles as SettingsFieldMappingProfiles,
  JobProfiles as SettingsJobProfiles,
} from '../../../../support/fragments/settings/dataImport';
import FieldMappingProfileView from '../../../../support/fragments/settings/dataImport/fieldMappingProfile/fieldMappingProfileView';
import FieldMappingProfiles from '../../../../support/fragments/settings/dataImport/fieldMappingProfile/fieldMappingProfiles';
import NewFieldMappingProfile from '../../../../support/fragments/settings/dataImport/fieldMappingProfile/newFieldMappingProfile';
import SettingsDataImport, {
  SETTINGS_TABS,
} from '../../../../support/fragments/settings/dataImport/settingsDataImport';
import SettingsMenu from '../../../../support/fragments/settingsMenu';
import TopMenuNavigation from '../../../../support/fragments/topMenuNavigation';
import getRandomPostfix from '../../../../support/utils/stringTools';
import { parseSanityParameters } from '../../../../support/utils/users';

const { user, memberTenant } = parseSanityParameters();

describe('Data Import', () => {
  describe('Log details', () => {
    const holdingsData = [
      { permanentLocation: LOCATION_NAMES.MAIN_LIBRARY_UI, itemsQuqntity: 3 },
      { permanentLocation: LOCATION_NAMES.ANNEX_UI, itemsQuqntity: 2 },
      { permanentLocation: LOCATION_NAMES.ONLINE_UI, itemsQuqntity: 1 },
    ];
    const fileWioutErrorsPathForUpload = 'marcBibFileForMultipleWithoutErrors.mrc';
    const collectionOfMappingAndActionProfiles = [
      {
        mappingProfile: {
          typeValue: FOLIO_RECORD_TYPE.HOLDINGS,
          name: `Test multiple holdings.${getRandomPostfix()}`,
          permanentLocation: '945$h',
        },
        actionProfile: {
          typeValue: FOLIO_RECORD_TYPE.HOLDINGS,
          name: `Test multiple holdings.${getRandomPostfix()}`,
        },
      },
      {
        mappingProfile: {
          typeValue: FOLIO_RECORD_TYPE.ITEM,
          name: `Test multiple items.${getRandomPostfix()}`,
          materialType: '945$a',
          permanentLoanType: LOAN_TYPE_NAMES.CAN_CIRCULATE,
          status: ITEM_STATUS_NAMES.AVAILABLE,
        },
        actionProfile: {
          typeValue: FOLIO_RECORD_TYPE.ITEM,
          name: `Test multiple items.${getRandomPostfix()}`,
        },
      },
    ];
    const jobProfile = {
      ...NewJobProfile.defaultJobProfile,
      profileName: `Test multiple items.${getRandomPostfix()}`,
      acceptedType: ACCEPTED_DATA_TYPE_NAMES.MARC,
    };

    before('Create test data', () => {
      cy.setTenant(memberTenant.id);
      cy.getUserToken(user.username, user.password, { log: false });

      cy.allure().logCommandSteps(false);
      cy.login(user.username, user.password, {
        path: SettingsMenu.mappingProfilePath,
        waiter: FieldMappingProfiles.waitLoading,
      });
      cy.allure().logCommandSteps(true);

      // create mapping profiles
      FieldMappingProfiles.openNewMappingProfileForm();
      NewFieldMappingProfile.fillSummaryInMappingProfile(
        collectionOfMappingAndActionProfiles[0].mappingProfile,
      );
      NewFieldMappingProfile.fillPermanentLocation(
        collectionOfMappingAndActionProfiles[0].mappingProfile.permanentLocation,
      );
      NewFieldMappingProfile.save();
      FieldMappingProfileView.closeViewMode(
        collectionOfMappingAndActionProfiles[0].mappingProfile.name,
      );

      FieldMappingProfiles.openNewMappingProfileForm();
      NewFieldMappingProfile.fillSummaryInMappingProfile(
        collectionOfMappingAndActionProfiles[1].mappingProfile,
      );
      NewFieldMappingProfile.fillMaterialType(
        collectionOfMappingAndActionProfiles[1].mappingProfile.materialType,
      );
      NewFieldMappingProfile.fillPermanentLoanType(
        collectionOfMappingAndActionProfiles[1].mappingProfile.permanentLoanType,
      );
      NewFieldMappingProfile.fillStatus(
        `"${collectionOfMappingAndActionProfiles[1].mappingProfile.status}"`,
      );
      NewFieldMappingProfile.save();
      FieldMappingProfileView.closeViewMode(
        collectionOfMappingAndActionProfiles[1].mappingProfile.name,
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
      NewJobProfile.linkActionProfileByName('Default - Create instance');
      NewJobProfile.linkActionProfile(collectionOfMappingAndActionProfiles[0].actionProfile);
      NewJobProfile.linkActionProfile(collectionOfMappingAndActionProfiles[1].actionProfile);
      NewJobProfile.saveAndClose();
      JobProfiles.checkJobProfilePresented(jobProfile.profileName);
    });

    after('Delete test data', () => {
      cy.setTenant(memberTenant.id);
      cy.getUserToken(user.username, user.password, { log: false }).then(() => {
        SettingsJobProfiles.deleteJobProfileByNameViaApi(jobProfile.profileName);
        collectionOfMappingAndActionProfiles.forEach((profile) => {
          SettingsActionProfiles.deleteActionProfileByNameViaApi(profile.actionProfile.name);
          SettingsFieldMappingProfiles.deleteMappingProfileByNameViaApi(
            profile.mappingProfile.name,
          );
        });
      });
    });

    it(
      'C388505 Check the log result table for imported multiple items in multiple holdings (folijet)',
      { tags: ['dryRun', 'folijet'] },
      () => {
        const arrayOfHoldingsStatuses = [
          'Created (KU/CC/DI/M)',
          'Created (KU/CC/DI/A)',
          'Created (E)',
        ];
        const quantityOfCreatedItems = 6;
        const quantityOfCreatedHoldings = 3;
        const marcFileName = `C388505 autotestFileName${getRandomPostfix()}.mrc`;

        // upload .mrc file
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.DATA_IMPORT);
        DataImport.verifyUploadState();
        DataImport.uploadFile(fileWioutErrorsPathForUpload, marcFileName);
        JobProfiles.waitFileIsUploaded();
        JobProfiles.search(jobProfile.profileName);
        JobProfiles.runImportFile();
        Logs.waitFileIsImported(marcFileName);
        Logs.checkJobStatus(marcFileName, JOB_STATUS_NAMES.COMPLETED);
        Logs.openFileDetails(marcFileName);
        [
          FileDetails.columnNameInResultList.srsMarc,
          FileDetails.columnNameInResultList.instance,
        ].forEach((columnName) => {
          FileDetails.checkStatusInColumn(RECORD_STATUSES.CREATED, columnName);
        });
        FileDetails.verifyMultipleHoldingsStatus(
          arrayOfHoldingsStatuses,
          quantityOfCreatedHoldings,
        );
        FileDetails.verifyMultipleItemsStatus(quantityOfCreatedItems);

        FileDetails.openInstanceInInventory(RECORD_STATUSES.CREATED);
        InventoryInstance.getAssignedHRID().then((initialInstanceHrId) => {
          const instanceHRID = initialInstanceHrId;

          holdingsData.forEach((holdings) => {
            InventoryInstance.checkIsHoldingsCreated([`${holdings.permanentLocation} >`]);
            InventoryInstance.openHoldingsAccordion(`${holdings.permanentLocation} >`);
            InstanceRecordView.verifyQuantityOfItemsRelatedtoHoldings(
              holdings.permanentLocation,
              holdings.itemsQuqntity,
            );
          });

          cy.getInstance({ limit: 1, expandAll: true, query: `"hrid"=="${instanceHRID}"` }).then(
            (instance) => {
              instance.items.forEach((item) => cy.deleteItemViaApi(item.id));
              instance.holdings.forEach((holding) => cy.deleteHoldingRecordViaApi(holding.id));
              InventoryInstance.deleteInstanceViaApi(instance.id);
            },
          );
        });
      },
    );
  });
});
