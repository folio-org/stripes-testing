import {
  EXISTING_RECORD_NAMES,
  FOLIO_RECORD_TYPE,
  INCOMING_RECORD_NAMES,
  JOB_STATUS_NAMES,
  RECORD_STATUSES,
} from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import DataImport from '../../../support/fragments/data_import/dataImport';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import NewJobProfile from '../../../support/fragments/data_import/job_profiles/newJobProfile';
import FileDetails from '../../../support/fragments/data_import/logs/fileDetails';
import JsonScreenView from '../../../support/fragments/data_import/logs/jsonScreenView';
import Logs from '../../../support/fragments/data_import/logs/logs';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import {
  ActionProfiles as SettingsActionProfiles,
  FieldMappingProfiles as SettingsFieldMappingProfiles,
  JobProfiles as SettingsJobProfiles,
} from '../../../support/fragments/settings/dataImport';
import NewActionProfile from '../../../support/fragments/settings/dataImport/actionProfiles/newActionProfile';
import FieldMappingProfiles from '../../../support/fragments/settings/dataImport/fieldMappingProfile/fieldMappingProfiles';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import FileManager from '../../../support/utils/fileManager';
import InteractorsTools from '../../../support/utils/interactorsTools';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Data Import', () => {
  describe('Log details', () => {
    const randomPostfix = getRandomPostfix();
    const instanceTitle = `AT_C343274_MarcBibInstance_${randomPostfix}`;
    const marcFileName = `AT_C343274_MarcFile_${randomPostfix}.mrc`;
    const uploadedFileName = `AT_C343274_autotestFile_${randomPostfix}.mrc`;
    const mappingProfiles = {
      instance: { name: `AT_C343274_FMP_Instance_${randomPostfix}` },
      // No permanent location - the holdings can not be created
      holdings: { name: `AT_C343274_FMP_Holdings_${randomPostfix}` },
    };
    const actionProfiles = {
      instance: {
        name: `AT_C343274_AP_Instance_${randomPostfix}`,
        action: 'CREATE',
        folioRecordType: 'INSTANCE',
      },
      holdings: {
        name: `AT_C343274_AP_Holdings_${randomPostfix}`,
        action: 'CREATE',
        folioRecordType: 'HOLDINGS',
      },
    };
    const jobProfile = { name: `AT_C343274_JP_${randomPostfix}` };
    const errorMessagePart = '"error"';
    let instanceActionProfileId;
    let holdingsActionProfileId;
    let user;

    before('Create profiles, MARC file and user', () => {
      cy.getAdminToken();
      InventoryInstances.deleteFullInstancesByTitleViaApi('C343274_');

      // Steps 1-2: Instance and Holdings (without permanent location) profiles
      FieldMappingProfiles.createMappingProfileViaApi({
        profile: {
          name: mappingProfiles.instance.name,
          incomingRecordType: INCOMING_RECORD_NAMES.MARC_BIBLIOGRAPHIC,
          existingRecordType: EXISTING_RECORD_NAMES.INSTANCE,
        },
        addedRelations: [],
        deletedRelations: [],
      }).then(({ body }) => {
        NewActionProfile.createActionProfileViaApi(actionProfiles.instance, body.id).then(
          (actionProfileResponse) => {
            instanceActionProfileId = actionProfileResponse.body.id;
          },
        );
      });
      FieldMappingProfiles.createMappingProfileViaApi({
        profile: {
          name: mappingProfiles.holdings.name,
          incomingRecordType: INCOMING_RECORD_NAMES.MARC_BIBLIOGRAPHIC,
          existingRecordType: EXISTING_RECORD_NAMES.HOLDINGS,
          mappingDetails: {
            name: FOLIO_RECORD_TYPE.HOLDINGS.toLowerCase(),
            recordType: EXISTING_RECORD_NAMES.HOLDINGS,
            mappingFields: [
              {
                name: 'callNumber',
                enabled: true,
                path: 'holdings.callNumber',
                value: '"AT_C343274_CN"',
                subfields: [],
              },
            ],
          },
        },
        addedRelations: [],
        deletedRelations: [],
      })
        .then(({ body }) => {
          NewActionProfile.createActionProfileViaApi(actionProfiles.holdings, body.id).then(
            (actionProfileResponse) => {
              holdingsActionProfileId = actionProfileResponse.body.id;
            },
          );
        })
        .then(() => {
          NewJobProfile.createJobProfileWithLinkedTwoActionProfilesViaApi(
            jobProfile,
            instanceActionProfileId,
            holdingsActionProfileId,
          );
        });

      DataImport.createMarcFile({
        fileName: marcFileName,
        fields: [{ tag: '245', indicators: ['0', '0'], content: `$a ${instanceTitle}` }],
      });

      cy.createTempUser([
        Permissions.moduleDataImportEnabled.gui,
        Permissions.settingsDataImportEnabled.gui,
        Permissions.uiInventoryViewInstances.gui,
      ]).then((userProperties) => {
        user = userProperties;

        cy.login(user.username, user.password, {
          path: TopMenu.dataImportPath,
          waiter: DataImport.waitLoading,
        });
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken(false);
      Users.deleteViaApi(user.userId);
      SettingsJobProfiles.deleteJobProfileByNameViaApi(jobProfile.name);
      Object.values(actionProfiles).forEach(({ name }) => {
        SettingsActionProfiles.deleteActionProfileByNameViaApi(name);
      });
      Object.values(mappingProfiles).forEach(({ name }) => {
        SettingsFieldMappingProfiles.deleteMappingProfileByNameViaApi(name);
      });
      InventoryInstances.deleteFullInstancesByTitleViaApi(instanceTitle);
      FileManager.deleteFile(`cypress/fixtures/${marcFileName}`);
    });

    it(
      'C343274 Bugfix: Error popup displays when trying to view log when there is an error (promin)',
      { tags: ['extendedPath', 'promin', 'C343274'] },
      () => {
        // Step 3: Upload the MARC file and run the import - "Completed with errors"
        DataImport.verifyUploadState();
        DataImport.uploadFile(marcFileName, uploadedFileName);
        JobProfiles.waitFileIsUploaded();
        JobProfiles.search(jobProfile.name);
        JobProfiles.runImportFile();
        Logs.waitFileIsImported(uploadedFileName);
        Logs.checkJobStatus(uploadedFileName, JOB_STATUS_NAMES.COMPLETED_WITH_ERRORS);

        // Step 4: Open the completed job from the landing page - the list of imported records
        Logs.openFileDetails(uploadedFileName);
        FileDetails.checkStatusInColumn(
          RECORD_STATUSES.CREATED,
          FileDetails.columnNameInResultList.instance,
        );
        FileDetails.checkStatusInColumn(
          RECORD_STATUSES.NO_ACTION,
          FileDetails.columnNameInResultList.holdings,
        );

        // Step 5: Open the record title - JSON of SRS, Instance and Holdings is displayed,
        // the "Failed to get" error popup does not appear
        FileDetails.openJsonScreen(instanceTitle);
        JsonScreenView.verifyJsonScreenIsOpened();
        InteractorsTools.checkNoErrorCallouts();
        JsonScreenView.openMarcSrsTab();
        JsonScreenView.verifyContentInTab(instanceTitle);
        JsonScreenView.openInstanceTab();
        JsonScreenView.verifyContentInTab(instanceTitle);
        JsonScreenView.openHoldingsTab();
        JsonScreenView.verifyContentInTab(errorMessagePart);
        // The popup used to appear repeatedly, so check again after a while
        InteractorsTools.checkNoErrorCallouts();
        InteractorsTools.checkNoErrorCallouts();
      },
    );
  });
});
