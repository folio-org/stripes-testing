import {
  ACCEPTED_DATA_TYPE_NAMES,
  APPLICATION_NAMES,
  FOLIO_RECORD_TYPE,
  ITEM_STATUS_NAMES,
  JOB_STATUS_NAMES,
  RECORD_STATUSES,
} from '../../../../support/constants';
import DataImport from '../../../../support/fragments/data_import/dataImport';
import JobProfiles from '../../../../support/fragments/data_import/job_profiles/jobProfiles';
import NewJobProfile from '../../../../support/fragments/data_import/job_profiles/newJobProfile';
import FileDetails from '../../../../support/fragments/data_import/logs/fileDetails';
import Logs from '../../../../support/fragments/data_import/logs/logs';
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
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../support/utils/stringTools';
import { parseSanityParameters } from '../../../../support/utils/users';

const { user, memberTenant } = parseSanityParameters();

describe('Data Import', () => {
  describe('End to end scenarios', () => {
    const fileName = `C343334 autotestFile${getRandomPostfix()}.mrc`;
    const location = {};
    const materialType = {};
    const loanType = {};

    const collectionOfProfiles = [
      {
        mappingProfile: {
          typeValue: FOLIO_RECORD_TYPE.INSTANCE,
          name: `autotestMappingInstance${getRandomPostfix()}`,
        },
        actionProfile: {
          typeValue: FOLIO_RECORD_TYPE.INSTANCE,
          name: `autotestActionInstance${getRandomPostfix()}`,
        },
      },
      {
        mappingProfile: {
          typeValue: FOLIO_RECORD_TYPE.HOLDINGS,
          name: `autotestMappingHoldings${getRandomPostfix()}`,
          permanentLocation: '',
        },
        actionProfile: {
          typeValue: FOLIO_RECORD_TYPE.HOLDINGS,
          name: `autotestActionHoldings${getRandomPostfix()}`,
        },
      },
      {
        mappingProfile: {
          typeValue: FOLIO_RECORD_TYPE.ITEM,
          name: `autotestMappingItem${getRandomPostfix()}`,
          materialType: '',
          permanentLoanType: '',
          status: ITEM_STATUS_NAMES.AVAILABLE,
        },
        actionProfile: {
          typeValue: FOLIO_RECORD_TYPE.ITEM,
          name: `autotestActionItem${getRandomPostfix()}`,
        },
      },
    ];

    const specialJobProfile = {
      ...NewJobProfile.defaultJobProfile,
      profileName: `autotestJobProf${getRandomPostfix()}`,
      acceptedType: ACCEPTED_DATA_TYPE_NAMES.MARC,
    };

    before('Create test user and login', () => {
      cy.setTenant(memberTenant.id);
      cy.getUserToken(user.username, user.password, { log: false });
      cy.getLocations({ limit: 1 }).then((locationResponse) => {
        Object.assign(location, locationResponse);
      });
      cy.getMaterialTypes({ limit: 1 }).then((materialTypeResponse) => {
        Object.assign(materialType, materialTypeResponse);
      });
      cy.getLoanTypes({ limit: 1 }).then((loanTypeResponse) => {
        Object.assign(loanType, loanTypeResponse[0]);
      });

      cy.allure().logCommandSteps(false);
      cy.login(user.username, user.password, {
        path: SettingsMenu.mappingProfilePath,
        waiter: FieldMappingProfiles.waitLoading,
      });
      cy.allure().logCommandSteps(true);
    });

    const createInstanceMappingProfile = (instanceMappingProfile) => {
      FieldMappingProfiles.openNewMappingProfileForm();
      NewFieldMappingProfile.fillSummaryInMappingProfile(instanceMappingProfile);
      NewFieldMappingProfile.save();
      FieldMappingProfileView.closeViewMode(instanceMappingProfile.name);
    };

    const createHoldingsMappingProfile = (holdingsMappingProfile) => {
      FieldMappingProfiles.openNewMappingProfileForm();
      NewFieldMappingProfile.fillSummaryInMappingProfile(holdingsMappingProfile);
      NewFieldMappingProfile.fillPermanentLocation(`"${location.name} (${location.code})"`);
      NewFieldMappingProfile.save();
      FieldMappingProfileView.closeViewMode(holdingsMappingProfile.name);
    };

    const createItemMappingProfile = (itemMappingProfile) => {
      FieldMappingProfiles.openNewMappingProfileForm();
      NewFieldMappingProfile.fillSummaryInMappingProfile(itemMappingProfile);
      NewFieldMappingProfile.fillMaterialType(`"${materialType.name}"`);
      NewFieldMappingProfile.fillPermanentLoanType(loanType.name);
      NewFieldMappingProfile.fillStatus(`"${itemMappingProfile.status}"`);
      NewFieldMappingProfile.save();
      FieldMappingProfileView.closeViewMode(itemMappingProfile.name);
    };

    after('Delete test data', () => {
      cy.setTenant(memberTenant.id);
      cy.getUserToken(user.username, user.password, { log: false }).then(() => {
        Users.deleteViaApi(user.userId);
        // delete generated profiles
        SettingsJobProfiles.deleteJobProfileByNameViaApi(specialJobProfile.profileName);
        collectionOfProfiles.forEach((profile) => {
          SettingsActionProfiles.deleteActionProfileByNameViaApi(profile.actionProfile.name);
          SettingsFieldMappingProfiles.deleteMappingProfileByNameViaApi(
            profile.mappingProfile.name,
          );
        });
      });
    });

    it(
      'C343334 MARC file import with creating a new mapping profiles, action profiles and job profile (folijet)',
      { tags: ['dryRun', 'folijet', 'C343334'] },
      () => {
        // create mapping profiles
        createInstanceMappingProfile(collectionOfProfiles[0].mappingProfile);
        FieldMappingProfiles.checkMappingProfilePresented(
          collectionOfProfiles[0].mappingProfile.name,
        );
        createHoldingsMappingProfile(collectionOfProfiles[1].mappingProfile);
        FieldMappingProfiles.checkMappingProfilePresented(
          collectionOfProfiles[1].mappingProfile.name,
        );
        createItemMappingProfile(collectionOfProfiles[2].mappingProfile);
        FieldMappingProfiles.checkMappingProfilePresented(
          collectionOfProfiles[2].mappingProfile.name,
        );

        SettingsDataImport.selectSettingsTab(SETTINGS_TABS.ACTION_PROFILES);
        collectionOfProfiles.forEach((profile) => {
          SettingsActionProfiles.create(profile.actionProfile, profile.mappingProfile.name);
          SettingsActionProfiles.checkActionProfilePresented(profile.actionProfile.name);
        });

        SettingsDataImport.selectSettingsTab(SETTINGS_TABS.JOB_PROFILES);
        JobProfiles.createJobProfile(specialJobProfile);
        collectionOfProfiles.forEach((profile) => {
          NewJobProfile.linkActionProfile(profile.actionProfile);
        });
        NewJobProfile.saveAndClose();
        JobProfiles.checkJobProfilePresented(specialJobProfile.profileName);

        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.DATA_IMPORT);
        DataImport.verifyUploadState();
        DataImport.uploadFile('oneMarcBib.mrc', fileName);
        JobProfiles.waitFileIsUploaded();
        JobProfiles.search(specialJobProfile.profileName);
        JobProfiles.runImportFile();
        Logs.waitFileIsImported(fileName);
        Logs.checkJobStatus(fileName, JOB_STATUS_NAMES.COMPLETED);
        Logs.checkImportFile(specialJobProfile.profileName);
        Logs.openFileDetails(fileName);
        [
          FileDetails.columnNameInResultList.srsMarc,
          FileDetails.columnNameInResultList.instance,
          FileDetails.columnNameInResultList.holdings,
          FileDetails.columnNameInResultList.item,
        ].forEach((columnName) => {
          FileDetails.checkStatusInColumn(RECORD_STATUSES.CREATED, columnName);
        });
        FileDetails.checkItemsQuantityInSummaryTable(0, '1');
      },
    );
  });
});
