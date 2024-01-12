import {
  FOLIO_RECORD_TYPE,
  ITEM_STATUS_NAMES,
  JOB_STATUS_NAMES,
  LOAN_TYPE_NAMES,
  LOCATION_NAMES,
  MATERIAL_TYPE_NAMES,
  RECORD_STATUSES,
} from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import {
  JobProfiles as SettingsJobProfiles,
  ActionProfiles as SettingsActionProfiles,
  FieldMappingProfiles as SettingsFieldMappingProfiles,
} from '../../../support/fragments/settings/dataImport';
import ActionProfiles from '../../../support/fragments/data_import/action_profiles/actionProfiles';
import DataImport from '../../../support/fragments/data_import/dataImport';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import NewJobProfile from '../../../support/fragments/data_import/job_profiles/newJobProfile';
import FileDetails from '../../../support/fragments/data_import/logs/fileDetails';
import Logs from '../../../support/fragments/data_import/logs/logs';
import FieldMappingProfileView from '../../../support/fragments/data_import/mapping_profiles/fieldMappingProfileView';
import FieldMappingProfiles from '../../../support/fragments/data_import/mapping_profiles/fieldMappingProfiles';
import NewFieldMappingProfile from '../../../support/fragments/data_import/mapping_profiles/newFieldMappingProfile';
import MatchProfiles from '../../../support/fragments/settings/dataImport/matchProfiles/matchProfiles';
import FileExtensions from '../../../support/fragments/settings/dataImport/fileExtensions/fileExtensions';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('data-import', () => {
  describe('Permissions', () => {
    let firstUser;
    let secondUser;
    const quantityOfItems = '1';
    const nameMarcFile = `C356841autotestFile.${getRandomPostfix()}.mrc`;
    const collectionOfMappingAndActionProfiles = [
      {
        mappingProfile: {
          typeValue: FOLIO_RECORD_TYPE.HOLDINGS,
          name: `C356841 holdings mapping profile ${getRandomPostfix()}}`,
          pernanentLocation: `"${LOCATION_NAMES.ONLINE}"`,
        },
        actionProfile: {
          typeValue: FOLIO_RECORD_TYPE.HOLDINGS,
          name: `C356841 holdings action profile ${getRandomPostfix()}`,
        },
      },
      {
        mappingProfile: {
          typeValue: FOLIO_RECORD_TYPE.ITEM,
          name: `C356841 item mapping profile ${getRandomPostfix()}`,
          permanentLoanType: LOAN_TYPE_NAMES.CAN_CIRCULATE,
          status: ITEM_STATUS_NAMES.AVAILABLE,
          materialType: `"${MATERIAL_TYPE_NAMES.BOOK}"`,
        },
        actionProfile: {
          typeValue: FOLIO_RECORD_TYPE.ITEM,
          name: `C356841 item action profile ${getRandomPostfix()}`,
        },
      },
    ];
    const jobProfile = {
      ...NewJobProfile.defaultJobProfile,
      profileName: `C356841 job profile ${getRandomPostfix()}}`,
    };

    before('create test data', () => {
      cy.createTempUser([
        Permissions.inventoryAll.gui,
        Permissions.moduleDataImportEnabled.gui,
        Permissions.settingsDataImportEnabled.gui,
      ]).then((userProperties) => {
        firstUser = userProperties;
      });

      cy.createTempUser([
        Permissions.moduleDataImportEnabled.gui,
        Permissions.settingsDataImportCanViewOnly.gui,
      ]).then((userProperties) => {
        secondUser = userProperties;
      });
    });

    after('delete test data', () => {
      cy.getAdminToken().then(() => {
        Users.deleteViaApi(firstUser.userId);
        Users.deleteViaApi(secondUser.userId);
        // delete generated profiles
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
      'C356841 Confirm a user with limited Data Import permissions can import a file (folijet)',
      { tags: ['criticalPath', 'folijet', 'nonParallel'] },
      () => {
        cy.login(firstUser.username, firstUser.password, {
          path: SettingsMenu.mappingProfilePath,
          waiter: FieldMappingProfiles.waitLoading,
        });
        // create mapping profiles
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

        FieldMappingProfiles.openNewMappingProfileForm();
        NewFieldMappingProfile.fillSummaryInMappingProfile(
          collectionOfMappingAndActionProfiles[0].mappingProfile,
        );
        NewFieldMappingProfile.fillPermanentLocation(
          collectionOfMappingAndActionProfiles[0].mappingProfile.pernanentLocation,
        );
        NewFieldMappingProfile.save();
        FieldMappingProfileView.closeViewMode(
          collectionOfMappingAndActionProfiles[0].mappingProfile.name,
        );

        // create action profiles
        collectionOfMappingAndActionProfiles.forEach((profile) => {
          cy.visit(SettingsMenu.actionProfilePath);
          ActionProfiles.create(profile.actionProfile, profile.mappingProfile.name);
          ActionProfiles.checkActionProfilePresented(profile.actionProfile.name);
        });

        // create job profile
        cy.visit(SettingsMenu.jobProfilePath);
        JobProfiles.createJobProfile(jobProfile);
        NewJobProfile.linkActionProfileByName('Default - Create instance');
        NewJobProfile.linkActionProfile(collectionOfMappingAndActionProfiles[0].actionProfile);
        NewJobProfile.linkActionProfile(collectionOfMappingAndActionProfiles[1].actionProfile);
        NewJobProfile.saveAndClose();
        JobProfiles.checkJobProfilePresented(jobProfile.profileName);

        cy.logout();
        cy.login(secondUser.username, secondUser.password, {
          path: SettingsMenu.mappingProfilePath,
          waiter: FieldMappingProfiles.waitLoading,
        });
        FieldMappingProfiles.checkListOfExistingProfilesIsDisplayed();
        FieldMappingProfiles.verifyActionMenuAbsent();
        cy.visit(SettingsMenu.actionProfilePath);
        ActionProfiles.checkListOfExistingProfilesIsDisplayed();
        ActionProfiles.verifyActionMenuAbsent();
        cy.visit(SettingsMenu.matchProfilePath);
        MatchProfiles.verifyListOfExistingProfilesIsDisplayed();
        MatchProfiles.verifyActionMenuAbsent();
        cy.visit(SettingsMenu.jobProfilePath);
        JobProfiles.checkListOfExistingProfilesIsDisplayed();
        JobProfiles.verifyActionMenuAbsent();
        cy.visit(SettingsMenu.fileExtensionsPath);
        FileExtensions.verifyListOfExistingFileExtensionsIsDisplayed();
        FileExtensions.verifyActionMenuAbsent();

        cy.visit(TopMenu.dataImportPath);
        // TODO delete function after fix https://issues.folio.org/browse/MODDATAIMP-691
        DataImport.verifyUploadState();
        DataImport.uploadFile('oneMarcBib.mrc', nameMarcFile);
        JobProfiles.waitFileIsUploaded();
        JobProfiles.search(jobProfile.profileName);
        JobProfiles.runImportFile();
        Logs.waitFileIsImported(nameMarcFile);
        Logs.checkStatusOfJobProfile(JOB_STATUS_NAMES.COMPLETED);
        Logs.openFileDetails(nameMarcFile);
        [
          FileDetails.columnNameInResultList.srsMarc,
          FileDetails.columnNameInResultList.instance,
          FileDetails.columnNameInResultList.holdings,
          FileDetails.columnNameInResultList.item,
        ].forEach((columnName) => {
          FileDetails.checkStatusInColumn(RECORD_STATUSES.CREATED, columnName);
        });
        FileDetails.checkItemQuantityInSummaryTable(quantityOfItems);
      },
    );
  });
});
