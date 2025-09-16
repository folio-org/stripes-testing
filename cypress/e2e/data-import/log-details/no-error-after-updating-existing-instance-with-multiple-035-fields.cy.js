import {
  EXISTING_RECORD_NAMES,
  INSTANCE_STATUS_TERM_NAMES,
  JOB_STATUS_NAMES,
  RECORD_STATUSES,
} from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import NewActionProfile from '../../../support/fragments/settings/dataImport/actionProfiles/newActionProfile';
import DataImport from '../../../support/fragments/data_import/dataImport';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import NewJobProfile from '../../../support/fragments/data_import/job_profiles/newJobProfile';
import FileDetails from '../../../support/fragments/data_import/logs/fileDetails';
import Logs from '../../../support/fragments/data_import/logs/logs';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import {
  ActionProfiles as SettingsActionProfiles,
  FieldMappingProfiles as SettingsFieldMappingProfiles,
  JobProfiles as SettingsJobProfiles,
  MatchProfiles as SettingsMatchProfiles,
} from '../../../support/fragments/settings/dataImport';
import ActionProfile from '../../../support/fragments/settings/dataImport/actionProfiles/actionProfiles';
import NewFieldMappingProfile from '../../../support/fragments/settings/dataImport/fieldMappingProfile/newFieldMappingProfile';
import NewMatchProfile from '../../../support/fragments/settings/dataImport/matchProfiles/newMatchProfile';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Data Import', () => {
  describe('Log details', () => {
    let user;
    const resourceIdentifiers = [
      '9780231556873',
      '9780231556446',
      '9781501770630',
      '9781501770296',
      '9781501769986',
    ];
    const filePath = 'marcBibFileForC503097.mrc';
    const marcFileNameForCreate = `C503097 createAutotestFile${getRandomPostfix()}.mrc`;
    const marcFileNameForUpdate = `C503097 updateAutotestFile${getRandomPostfix()}.mrc`;
    const mappingProfile = {
      name: `C503097 Update instance with 035 match.${getRandomPostfix()}`,
      catalogedDate: '###TODAY###',
      statusTerm: INSTANCE_STATUS_TERM_NAMES.BATCH_LOADED,
      administrativeNote: 'Updated',
    };
    const actionProfile = {
      name: `C503097 Update instance with 035 match.${getRandomPostfix()}`,
      action: 'UPDATE',
      folioRecordType: 'INSTANCE',
    };
    const matchProfile = {
      profileName: `C503097 0359/$a match.${getRandomPostfix()}`,
      incomingRecordFields: {
        field: '035',
        in1: '9',
        in2: '*',
        subfield: 'a',
      },
      recordType: EXISTING_RECORD_NAMES.MARC_BIBLIOGRAPHIC,
      existingRecordType: EXISTING_RECORD_NAMES.INSTANCE,
      instanceOption: NewMatchProfile.optionsList.systemControlNumber,
      identifierTypeId: '7e591197-f335-4afb-bc6d-a6d76ca3bace',
    };
    const jobProfile = {
      profileName: `C503097 job profile ${getRandomPostfix()}`,
    };

    before('Create test user and login', () => {
      cy.getAdminToken();
      NewFieldMappingProfile.createInstanceMappingProfileForUpdateViaApi(mappingProfile).then(
        (mappingProfileResponse) => {
          NewActionProfile.createActionProfileViaApi(
            actionProfile,
            mappingProfileResponse.body.id,
          ).then((actionProfileResponse) => {
            actionProfile.id = actionProfileResponse.body.id;
          });
        },
      );
      NewMatchProfile.createMatchProfileWithIncomingAndExistingOCLCMatchExpressionViaApi(
        matchProfile,
      ).then((matchProfileResponse) => {
        ActionProfile.getActionProfilesViaApi({
          query: 'name="Default - Create instance"',
        }).then(({ actionProfiles }) => {
          NewJobProfile.createJobProfileWithLinkedMatchAndActionProfileAndNonMatchActionProfileViaApi(
            jobProfile.profileName,
            matchProfileResponse.body.id,
            actionProfile.id,
            actionProfiles[0].id,
          );
        });
      });
      // need to delete instanses with same 035 fields
      resourceIdentifiers.forEach((identifier) => {
        InventorySearchAndFilter.getInstancesByIdentifierViaApi(identifier).then((response) => {
          if (response.totalRecords !== 0) {
            response.instances.forEach(({ id }) => {
              InventoryInstance.deleteInstanceViaApi(id);
            });
          }
        });
      });

      cy.createTempUser([
        Permissions.settingsDataImportEnabled.gui,
        Permissions.moduleDataImportEnabled.gui,
        Permissions.uiInventoryViewInstances.gui,
      ]).then((userProperties) => {
        user = userProperties;

        cy.login(userProperties.username, userProperties.password, {
          path: TopMenu.dataImportPath,
          waiter: DataImport.waitLoading,
        });
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken().then(() => {
        Users.deleteViaApi(user.userId);
        SettingsJobProfiles.deleteJobProfileByNameViaApi(jobProfile.profileName);
        SettingsMatchProfiles.deleteMatchProfileByNameViaApi(matchProfile.profileName);
        SettingsActionProfiles.deleteActionProfileByNameViaApi(actionProfile.name);
        SettingsFieldMappingProfiles.deleteMappingProfileByNameViaApi(mappingProfile.name);
        resourceIdentifiers.forEach((identifier) => {
          InventorySearchAndFilter.getInstancesByIdentifierViaApi(identifier).then((response) => {
            if (response.totalRecords !== 0) {
              response.instances.forEach(({ id }) => {
                InventoryInstance.deleteInstanceViaApi(id);
              });
            }
          });
        });
      });
    });

    it(
      'C503097 No error after updating existing instance with multiple 035 fields (folijet)',
      { tags: ['criticalPath', 'folijet', 'C503097'] },
      () => {
        DataImport.verifyUploadState();
        DataImport.uploadFile(filePath, marcFileNameForCreate);
        JobProfiles.waitFileIsUploaded();
        JobProfiles.search(jobProfile.profileName);
        JobProfiles.runImportFile();
        Logs.waitFileIsImported(marcFileNameForCreate);
        Logs.checkJobStatus(marcFileNameForCreate, JOB_STATUS_NAMES.COMPLETED);
        Logs.openFileDetails(marcFileNameForCreate);
        [0, 1, 2, 3, 4].forEach((rowNumber) => {
          FileDetails.checkStatusInColumn(
            RECORD_STATUSES.CREATED,
            FileDetails.columnNameInResultList.instance,
            rowNumber,
          );
        });

        FileDetails.close();
        DataImport.verifyUploadState();
        DataImport.uploadFile(filePath, marcFileNameForUpdate);
        JobProfiles.waitFileIsUploaded();
        JobProfiles.search(jobProfile.profileName);
        JobProfiles.runImportFile();
        Logs.waitFileIsImported(marcFileNameForUpdate);
        Logs.checkJobStatus(marcFileNameForUpdate, JOB_STATUS_NAMES.COMPLETED);
        Logs.openFileDetails(marcFileNameForUpdate);
        [0, 1, 2, 3, 4].forEach((rowNumber) => {
          FileDetails.checkStatusInColumn(
            RECORD_STATUSES.UPDATED,
            FileDetails.columnNameInResultList.instance,
            rowNumber,
          );
        });
      },
    );
  });
});
