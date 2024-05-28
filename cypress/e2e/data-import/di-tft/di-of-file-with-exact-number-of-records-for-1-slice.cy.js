import { JOB_STATUS_NAMES, RECORD_STATUSES } from '../../../support/constants';
import Permissions from '../../../support/dictionary/permissions';
import NewActionProfile from '../../../support/fragments/data_import/action_profiles/newActionProfile';
import DataImport from '../../../support/fragments/data_import/dataImport';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import NewJobProfile from '../../../support/fragments/data_import/job_profiles/newJobProfile';
import FileDetails from '../../../support/fragments/data_import/logs/fileDetails';
import Logs from '../../../support/fragments/data_import/logs/logs';
import NewFieldMappingProfile from '../../../support/fragments/data_import/mapping_profiles/newFieldMappingProfile';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import {
  ActionProfiles as SettingsActionProfiles,
  FieldMappingProfiles as SettingsFieldMappingProfiles,
  JobProfiles as SettingsJobProfiles,
} from '../../../support/fragments/settings/dataImport';
import TopMenu from '../../../support/fragments/topMenu';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Data Import', () => {
  describe('Importing MARC Bib files', () => {
    let user;
    let instanceId;
    const marcFilePath = 'oneThousandMarcBib.mrc';
    const marcFileName = `C404412 autotestFile${getRandomPostfix()}.mrc`;
    const collectionOfProfiles = [
      {
        mappingProfile: {
          name: `C404412 autotest_instance_mapping_profile_${getRandomPostfix()}`,
        },
        actionProfile: {
          name: `C404412 autotest_instance_action_profile_${getRandomPostfix()}`,
          action: 'CREATE',
          folioRecordType: 'INSTANCE',
        },
      },
      {
        mappingProfile: {
          name: `C404412 autotest_holdings_mapping_profile_${getRandomPostfix()}`,
          permanentLocation: 'Main Library (KU/CC/DI/M)',
        },
        actionProfile: {
          name: `C404412 autotest_holdings_action_profile_${getRandomPostfix()}`,
          action: 'CREATE',
          folioRecordType: 'HOLDINGS',
        },
      },
      {
        mappingProfile: {
          name: `C404412 autotest_item_mapping_profile_${getRandomPostfix()}`,
          materialType: 'book',
          permanentLoanType: 'Can circulate',
          status: 'Available',
        },
        actionProfile: {
          name: `C404412 autotest_item_action_profile_${getRandomPostfix()}`,
          action: 'CREATE',
          folioRecordType: 'ITEM',
        },
      },
    ];
    const jobProfile = {
      name: `C404412 autotest_job_profile_${getRandomPostfix()}`,
    };

    before('Create test data and login', () => {
      cy.getAdminToken();
      NewFieldMappingProfile.createInstanceMappingProfileViaApi(
        collectionOfProfiles[0].mappingProfile,
      ).then((mappingProfileResponse) => {
        collectionOfProfiles[0].mappingProfile.id = mappingProfileResponse.body.id;

        NewActionProfile.createActionProfileViaApi(
          collectionOfProfiles[0].actionProfile,
          mappingProfileResponse.body.id,
        ).then((actionProfileResponse) => {
          collectionOfProfiles[0].actionProfile.id = actionProfileResponse.body.id;
        });
      });
      NewFieldMappingProfile.createHoldingsMappingProfileViaApi(
        collectionOfProfiles[1].mappingProfile,
      ).then((mappingProfileResponse) => {
        collectionOfProfiles[1].mappingProfile = mappingProfileResponse.body.id;

        NewActionProfile.createActionProfileViaApi(
          collectionOfProfiles[1].actionProfile,
          mappingProfileResponse.body.id,
        ).then((actionProfileResponse) => {
          collectionOfProfiles[1].actionProfile.id = actionProfileResponse.body.id;
        });
      });
      NewFieldMappingProfile.createItemMappingProfileViaApi(collectionOfProfiles[2].mappingProfile)
        .then((mappingProfileResponse) => {
          collectionOfProfiles[2].mappingProfile.id = mappingProfileResponse.body.id;

          NewActionProfile.createActionProfileViaApi(
            collectionOfProfiles[2].actionProfile,
            mappingProfileResponse.body.id,
          ).then((actionProfileResponse) => {
            collectionOfProfiles[2].actionProfile.id = actionProfileResponse.body.id;
          });
        })
        .then(() => {
          NewJobProfile.createJobProfileWithLinkedThreeActionProfilesViaApi(
            jobProfile.name,
            collectionOfProfiles[0].actionProfile.id,
            collectionOfProfiles[1].actionProfile.id,
            collectionOfProfiles[2].actionProfile.id,
          );
        });

      cy.createTempUser([
        Permissions.moduleDataImportEnabled.gui,
        Permissions.inventoryAll.gui,
        Permissions.settingsDataImportEnabled.gui,
      ]).then((userProperties) => {
        user = userProperties;

        cy.login(user.username, user.password, {
          path: TopMenu.dataImportPath,
          waiter: DataImport.waitLoading,
        });
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken().then(() => {
        SettingsJobProfiles.deleteJobProfileByNameViaApi(jobProfile.name);
        collectionOfProfiles.forEach((profile) => {
          SettingsActionProfiles.deleteActionProfileByNameViaApi(profile.actionProfile.name);
          SettingsFieldMappingProfiles.deleteMappingProfileByNameViaApi(
            profile.mappingProfile.name,
          );
        });
        InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(instanceId);
      });
    });

    it(
      'C404412 Data-Slicing: Data import of a file with exact number of records for 1 slice (folijet)',
      { tags: ['criticalPath', 'folijet'] },
      () => {
        DataImport.verifyUploadState();
        DataImport.uploadFile(marcFilePath, marcFileName);
        JobProfiles.waitFileIsUploaded();
        JobProfiles.search(jobProfile.profileName);
        JobProfiles.runImportFile();
        Logs.waitFileIsImported(marcFileName);
        Logs.checkStatusOfJobProfile(JOB_STATUS_NAMES.COMPLETED);
        Logs.openFileDetails(marcFileName);
        Logs.getCreatedItemsID().then((link) => {
          instanceId = link.split('/')[5];
        });
        [
          FileDetails.columnNameInResultList.srsMarc,
          FileDetails.columnNameInResultList.instance,
          FileDetails.columnNameInResultList.holdings,
          FileDetails.columnNameInResultList.item,
        ].forEach((columnName) => {
          FileDetails.checkStatusInColumn(RECORD_STATUSES.CREATED, columnName);
        });
      },
    );
  });
});
