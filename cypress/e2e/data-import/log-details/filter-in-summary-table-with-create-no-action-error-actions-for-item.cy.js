import getRandomPostfix from '../../../support/utils/stringTools';
import { DevTeams, TestTypes, Permissions } from '../../../support/dictionary';
import {
  LOCATION_NAMES,
  FOLIO_RECORD_TYPE,
  MATERIAL_TYPE_NAMES,
  LOAN_TYPE_NAMES,
  JOB_STATUS_NAMES,
} from '../../../support/constants';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import FieldMappingProfiles from '../../../support/fragments/data_import/mapping_profiles/fieldMappingProfiles';
import NewFieldMappingProfile from '../../../support/fragments/data_import/mapping_profiles/newFieldMappingProfile';
import ActionProfiles from '../../../support/fragments/data_import/action_profiles/actionProfiles';
import NewJobProfile from '../../../support/fragments/data_import/job_profiles/newJobProfile';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import DataImport from '../../../support/fragments/data_import/dataImport';
import TopMenu from '../../../support/fragments/topMenu';
import Logs from '../../../support/fragments/data_import/logs/logs';
import FileDetails from '../../../support/fragments/data_import/logs/fileDetails';
import Users from '../../../support/fragments/users/users';
import FieldMappingProfileView from '../../../support/fragments/data_import/mapping_profiles/fieldMappingProfileView';

describe('data-import', () => {
  describe('Log details', () => {
    let user;
    const quantityOfItems = {
      created: '2',
      noAction: '5',
      error: '5',
    };
    const marcFileName = `C357017 autotestFile.${getRandomPostfix()}.mrc`;
    const filePathForUpload = 'marcBibFileForC357017.mrc';
    const collectionOfMappingAndActionProfiles = [
      {
        mappingProfile: {
          typeValue: FOLIO_RECORD_TYPE.HOLDINGS,
          name: `C357017 autotest holdings mapping profile_${getRandomPostfix()}`,
          permanentLocation: `"${LOCATION_NAMES.ONLINE}"`,
        },
        actionProfile: {
          typeValue: FOLIO_RECORD_TYPE.HOLDINGS,
          name: `C357017 autotest holdings action profile_${getRandomPostfix()}`,
        },
      },
      {
        mappingProfile: {
          name: `C357017 autotest item mapping profile_${getRandomPostfix()}`,
          typeValue: FOLIO_RECORD_TYPE.ITEM,
          materialType: `"${MATERIAL_TYPE_NAMES.ELECTRONIC_RESOURCE}"`,
          permanentLoanType: LOAN_TYPE_NAMES.CAN_CIRCULATE,
          temporaryLoanType: `"${LOAN_TYPE_NAMES.COURSE_RESERVES}"`,
          status: '901$a',
          permanentLocation: `"${LOCATION_NAMES.ANNEX}"`,
        },
        actionProfile: {
          typeValue: FOLIO_RECORD_TYPE.ITEM,
          name: `C357017 autotest item action profile_${getRandomPostfix()}`,
        },
      },
    ];
    const jobProfile = {
      ...NewJobProfile.defaultJobProfile,
      profileName: `C357017 job profile_${getRandomPostfix()}`,
    };

    before(() => {
      cy.createTempUser([
        Permissions.moduleDataImportEnabled.gui,
        Permissions.settingsDataImportEnabled.gui,
      ]).then((userProperties) => {
        user = userProperties;

        cy.login(userProperties.username, userProperties.password, {
          path: SettingsMenu.mappingProfilePath,
          waiter: FieldMappingProfiles.waitLoading,
        });
      });
    });

    after('delete test data', () => {
      cy.getAdminToken().then(() => {
        Users.deleteViaApi(user.userId);
        JobProfiles.deleteJobProfile(jobProfile.profileName);
        collectionOfMappingAndActionProfiles.forEach((profile) => {
          ActionProfiles.deleteActionProfile(profile.actionProfile.name);
          FieldMappingProfileView.deleteViaApi(profile.mappingProfile.name);
        });
      });
    });

    it(
      'C357017 Check the filter in summary table with "create + no action + error" actions for the Item column (folijet) (TaaS)',
      { tags: [TestTypes.extendedPath, DevTeams.folijet] },
      () => {
        // create field mapping profiles
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
        FieldMappingProfiles.checkMappingProfilePresented(
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
          collectionOfMappingAndActionProfiles[1].mappingProfile.status,
        );
        NewFieldMappingProfile.fillTemporaryLoanType(
          collectionOfMappingAndActionProfiles[1].mappingProfile.temporaryLoanType,
        );
        NewFieldMappingProfile.fillPermanentLocation(
          collectionOfMappingAndActionProfiles[1].mappingProfile.permanentLocation,
        );
        NewFieldMappingProfile.save();
        FieldMappingProfileView.closeViewMode(
          collectionOfMappingAndActionProfiles[1].mappingProfile.name,
        );
        FieldMappingProfiles.checkMappingProfilePresented(
          collectionOfMappingAndActionProfiles[1].mappingProfile.name,
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

        // upload a marc file for creating of the new instance, holding and item
        cy.visit(TopMenu.dataImportPath);
        // TODO delete function after fix https://issues.folio.org/browse/MODDATAIMP-691
        DataImport.verifyUploadState();
        DataImport.uploadFile(filePathForUpload, marcFileName);
        JobProfiles.waitFileIsUploaded();
        JobProfiles.search(jobProfile.profileName);
        JobProfiles.runImportFile();
        JobProfiles.waitFileIsImported(marcFileName);
        Logs.checkStatusOfJobProfile(JOB_STATUS_NAMES.COMPLETED_WITH_ERRORS);
        Logs.openFileDetails(marcFileName);

        // check created counter in the Summary table
        FileDetails.checkItemQuantityInSummaryTable(quantityOfItems.created, 0);
        // check No action counter in the Summary table
        FileDetails.checkItemQuantityInSummaryTable(quantityOfItems.noAction, 2);
        // check Error counter in the Summary table
        FileDetails.checkItemQuantityInSummaryTable(quantityOfItems.error, 3);
        FileDetails.filterRecordsWithError(FileDetails.visibleColumnsInSummaryTable.ITEM);
        FileDetails.verifyQuantityOfRecordsWithError(quantityOfItems.error);
        FileDetails.verifyLogSummaryTableIsHidden();
        FileDetails.verifyRecordsSortingOrder();
      },
    );
  });
});
