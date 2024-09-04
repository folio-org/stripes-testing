import {
  ACCEPTED_DATA_TYPE_NAMES,
  ACTION_NAMES_IN_ACTION_PROFILE,
  EXISTING_RECORD_NAMES,
  FOLIO_RECORD_TYPE,
  JOB_STATUS_NAMES,
  RECORD_STATUSES,
} from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import ExportFile from '../../../support/fragments/data-export/exportFile';
import ActionProfiles from '../../../support/fragments/data_import/action_profiles/actionProfiles';
import NewActionProfile from '../../../support/fragments/data_import/action_profiles/newActionProfile';
import DataImport from '../../../support/fragments/data_import/dataImport';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import NewJobProfile from '../../../support/fragments/data_import/job_profiles/newJobProfile';
import FileDetails from '../../../support/fragments/data_import/logs/fileDetails';
import Logs from '../../../support/fragments/data_import/logs/logs';
import FieldMappingProfileView from '../../../support/fragments/settings/dataImport/fieldMappingProfile/fieldMappingProfileView';
import FieldMappingProfiles from '../../../support/fragments/settings/dataImport/fieldMappingProfile/fieldMappingProfiles';
import NewFieldMappingProfile from '../../../support/fragments/settings/dataImport/fieldMappingProfile/newFieldMappingProfile';
import HoldingsRecordView from '../../../support/fragments/inventory/holdingsRecordView';
import InstanceRecordView from '../../../support/fragments/inventory/instanceRecordView';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import {
  ActionProfiles as SettingsActionProfiles,
  FieldMappingProfiles as SettingsFieldMappingProfiles,
  JobProfiles as SettingsJobProfiles,
  MatchProfiles as SettingsMatchProfiles,
} from '../../../support/fragments/settings/dataImport';
import MatchProfiles from '../../../support/fragments/settings/dataImport/matchProfiles/matchProfiles';
import NewMatchProfile from '../../../support/fragments/settings/dataImport/matchProfiles/newMatchProfile';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import { getLongDelay } from '../../../support/utils/cypressTools';
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Data Import', () => {
  describe('Importing MARC Bib files', () => {
    let preconditionUserId = null;
    let user = null;
    let holdingsHrId = null;
    let instanceHrid = null;
    const mappingProfileIds = [];
    const actionProfileIds = [];
    const holdingsPermanentLocation = 'Online';
    const filePathToUpload = 'oneMarcBib.mrc';
    const marcFileNameForCreate = `C347894 marcBibFileForCreate${getRandomPostfix()}.mrc`;
    const exportedFileName = `C347894 exportedMarcFile${getRandomPostfix()}.mrc`;
    const marcFileNameForUpdate = `C347894 marcBibFileForUpdate${getRandomPostfix()}.mrc`;
    // profiles for creating instance, holdings
    const instanceMappingProfileForCreate = {
      name: `C347894 autotest instance mapping profile for create.${getRandomPostfix()}`,
    };
    const holdingsMappingProfileForCreate = {
      name: `C347894 autotest holdings mapping profile for create.${getRandomPostfix()}`,
      permanentLocation: 'Online',
    };
    const actionProfilesForCreate = [
      {
        actionProfile: {
          name: `C347894 autotest instance mapping profile for create.${getRandomPostfix()}`,
          action: 'CREATE',
          folioRecordType: 'INSTANCE',
        },
      },
      {
        actionProfile: {
          name: `C347894 autotest holdings mapping profile for create.${getRandomPostfix()}`,
          action: 'CREATE',
          folioRecordType: 'HOLDINGS',
        },
      },
    ];
    const jobProfileForCreate = {
      name: `C347894 autotest job profile for create.${getRandomPostfix()}`,
    };
    // profiles for updating item
    const instanceMatchProfile = {
      profileName: `C347894 autotest instance match profile.${getRandomPostfix()}`,
      incomingRecordFields: {
        field: '001',
      },
      matchCriterion: 'Exactly matches',
      existingRecordType: EXISTING_RECORD_NAMES.INSTANCE,
      instanceOption: NewMatchProfile.optionsList.instanceHrid,
    };
    const holdingsMatchProfile = {
      profileName: `C347894 autotest holdings match profile.${getRandomPostfix()}`,
      incomingStaticValue: 'Online',
      incomingStaticRecordValue: 'Text',
      matchCriterion: 'Exactly matches',
      existingRecordType: EXISTING_RECORD_NAMES.HOLDINGS,
      existingRecordOption: NewMatchProfile.optionsList.holdingsPermLoc,
    };
    const collectionOfMappingAndActionProfiles = [
      {
        mappingProfile: {
          typeValue: FOLIO_RECORD_TYPE.INSTANCE,
          name: `C347894 autotest instance mapping profile for update.${getRandomPostfix()}`,
          suppressFromDiscavery: 'Mark for all affected records',
        },
        actionProfile: {
          typeValue: FOLIO_RECORD_TYPE.INSTANCE,
          name: `C347894 autotest instance action profile.${getRandomPostfix()}`,
          action: ACTION_NAMES_IN_ACTION_PROFILE.UPDATE,
        },
      },
      {
        mappingProfile: {
          typeValue: FOLIO_RECORD_TYPE.HOLDINGS,
          name: `C347894 autotest holdings mapping profile for update.${getRandomPostfix()}`,
          suppressFromDiscavery: 'Mark for all affected records',
        },
        actionProfile: {
          typeValue: FOLIO_RECORD_TYPE.HOLDINGS,
          name: `C347894 autotest holdings action profile.${getRandomPostfix()}`,
          action: ACTION_NAMES_IN_ACTION_PROFILE.UPDATE,
        },
      },
    ];
    const jobProfileForUpdate = {
      ...NewJobProfile.defaultJobProfile,
      profileName: `C347894 autotest job profile for update.${getRandomPostfix()}`,
      acceptedType: ACCEPTED_DATA_TYPE_NAMES.MARC,
    };

    before('Create test data and login', () => {
      cy.createTempUser([
        Permissions.moduleDataImportEnabled.gui,
        Permissions.settingsDataImportEnabled.gui,
      ]).then((userProperties) => {
        preconditionUserId = userProperties.userId;

        NewFieldMappingProfile.createInstanceMappingProfileViaApi(
          instanceMappingProfileForCreate,
        ).then((mappingProfileResponse) => {
          mappingProfileIds.push(mappingProfileResponse.body.id);

          NewActionProfile.createActionProfileViaApi(
            actionProfilesForCreate[0].actionProfile,
            mappingProfileResponse.body.id,
          ).then((actionProfileResponse) => {
            actionProfileIds.push(actionProfileResponse.body.id);
          });
        });
        NewFieldMappingProfile.createHoldingsMappingProfileViaApi(holdingsMappingProfileForCreate)
          .then((mappingProfileResponse) => {
            mappingProfileIds.push(mappingProfileResponse.body.id);

            NewActionProfile.createActionProfileViaApi(
              actionProfilesForCreate[1].actionProfile,
              mappingProfileResponse.body.id,
            ).then((actionProfileResponse) => {
              actionProfileIds.push(actionProfileResponse.body.id);
            });
          })
          .then(() => {
            NewJobProfile.createJobProfileWithLinkedTwoActionProfilesViaApi(
              jobProfileForCreate,
              actionProfileIds[0],
              actionProfileIds[1],
            );
          });
        // upload a marc file for creating of the new instance, holding
        DataImport.uploadFileViaApi(
          filePathToUpload,
          marcFileNameForCreate,
          jobProfileForCreate.name,
        ).then((response) => {
          holdingsHrId = response[0].holding.hrid;
        });
      });

      cy.createTempUser([
        Permissions.moduleDataImportEnabled.gui,
        Permissions.inventoryAll.gui,
        Permissions.settingsDataImportEnabled.gui,
        Permissions.dataExportViewAddUpdateProfiles.gui,
        Permissions.dataExportUploadExportDownloadFileViewLogs.gui,
      ]).then((userProperties) => {
        user = userProperties;

        cy.login(userProperties.username, userProperties.password, {
          path: TopMenu.inventoryPath,
          waiter: InventorySearchAndFilter.waitLoading,
        });
      });
    });

    after('Delete test data', () => {
      // delete created files in fixtures
      FileManager.deleteFile(`cypress/fixtures/${exportedFileName}`);
      cy.getAdminToken().then(() => {
        SettingsJobProfiles.deleteJobProfileByNameViaApi(jobProfileForCreate.name);
        SettingsJobProfiles.deleteJobProfileByNameViaApi(jobProfileForUpdate.profileName);
        SettingsMatchProfiles.deleteMatchProfileByNameViaApi(instanceMatchProfile.profileName);
        SettingsMatchProfiles.deleteMatchProfileByNameViaApi(holdingsMatchProfile.profileName);
        collectionOfMappingAndActionProfiles.forEach((profile) => {
          SettingsActionProfiles.deleteActionProfileByNameViaApi(profile.actionProfile.name);
          SettingsFieldMappingProfiles.deleteMappingProfileByNameViaApi(
            profile.mappingProfile.name,
          );
        });
        actionProfileIds.forEach((id) => {
          SettingsActionProfiles.deleteActionProfileViaApi(id);
        });
        mappingProfileIds.forEach((id) => {
          SettingsFieldMappingProfiles.deleteMappingProfileViaApi(id);
        });
        Users.deleteViaApi(preconditionUserId);
        Users.deleteViaApi(user.userId);
        cy.getInstance({ limit: 1, expandAll: true, query: `"hrid"=="${instanceHrid}"` }).then(
          (instance) => {
            cy.deleteHoldingRecordViaApi(instance.holdings[0].id);
            InventoryInstance.deleteInstanceViaApi(instance.id);
          },
        );
      });
    });

    it(
      'C347894 Nest matches under actions in a job profile, and run the job profile successfully (folijet)',
      { tags: ['criticalPath', 'folijet'] },
      () => {
        InventorySearchAndFilter.switchToHoldings();
        cy.pause();
        InventorySearchAndFilter.filterHoldingsByPermanentLocation(holdingsPermanentLocation);
        InventorySearchAndFilter.searchHoldingsByHRID(holdingsHrId);
        InventorySearchAndFilter.selectResultCheckboxes(1);
        FileManager.deleteFolder(Cypress.config('downloadsFolder'));
        InventorySearchAndFilter.exportInstanceAsMarc();
        cy.intercept('/data-export/quick-export').as('getHrid');
        cy.wait('@getHrid', getLongDelay()).then((req) => {
          const expectedRecordHrid = req.response.body.jobExecutionHrId;

          // download exported marc file
          cy.visit(TopMenu.dataExportPath);
          ExportFile.downloadExportedMarcFileWithRecordHrid(expectedRecordHrid, exportedFileName);
          FileManager.deleteFileFromDownloadsByMask('QuickInstanceExport*');
        });
        // create match profiles
        cy.visit(SettingsMenu.matchProfilePath);
        MatchProfiles.createMatchProfile(instanceMatchProfile);
        MatchProfiles.checkMatchProfilePresented(instanceMatchProfile.profileName);
        MatchProfiles.createMatchProfileWithStaticValue(holdingsMatchProfile);
        MatchProfiles.checkMatchProfilePresented(holdingsMatchProfile.profileName);

        // create Field mapping profiles
        cy.visit(SettingsMenu.mappingProfilePath);
        FieldMappingProfiles.openNewMappingProfileForm();
        NewFieldMappingProfile.fillSummaryInMappingProfile(
          collectionOfMappingAndActionProfiles[0].mappingProfile,
        );
        NewFieldMappingProfile.addSuppressFromDiscovery(
          collectionOfMappingAndActionProfiles[0].mappingProfile.suppressFromDiscavery,
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
        NewFieldMappingProfile.addSuppressFromDiscovery(
          collectionOfMappingAndActionProfiles[1].mappingProfile.suppressFromDiscavery,
        );
        NewFieldMappingProfile.save();
        FieldMappingProfileView.closeViewMode(
          collectionOfMappingAndActionProfiles[1].mappingProfile.name,
        );
        FieldMappingProfiles.checkMappingProfilePresented(
          collectionOfMappingAndActionProfiles[1].mappingProfile.name,
        );

        collectionOfMappingAndActionProfiles.forEach((profile) => {
          cy.visit(SettingsMenu.actionProfilePath);
          ActionProfiles.create(profile.actionProfile, profile.mappingProfile.name);
          ActionProfiles.checkActionProfilePresented(profile.actionProfile.name);
        });

        // create Job profile
        cy.visit(SettingsMenu.jobProfilePath);
        JobProfiles.createJobProfile(jobProfileForUpdate);
        NewJobProfile.linkMatchAndActionProfiles(
          instanceMatchProfile.profileName,
          collectionOfMappingAndActionProfiles[0].actionProfile.name,
        );
        NewJobProfile.linkMatchProfileForMatches(holdingsMatchProfile.profileName);
        NewJobProfile.linkActionProfileForMatches(
          collectionOfMappingAndActionProfiles[1].actionProfile.name,
        );
        NewJobProfile.saveAndClose();
        JobProfiles.checkJobProfilePresented(jobProfileForUpdate.profileName);

        // upload the exported marc file
        cy.visit(TopMenu.dataImportPath);
        DataImport.verifyUploadState();
        DataImport.uploadFile(exportedFileName, marcFileNameForUpdate);
        JobProfiles.search(jobProfileForUpdate.profileName);
        JobProfiles.runImportFile();
        Logs.waitFileIsImported(marcFileNameForUpdate);
        Logs.checkJobStatus(marcFileNameForUpdate, JOB_STATUS_NAMES.COMPLETED);
        Logs.openFileDetails(marcFileNameForUpdate);
        [
          FileDetails.columnNameInResultList.srsMarc,
          FileDetails.columnNameInResultList.instance,
          FileDetails.columnNameInResultList.holdings,
        ].forEach((columnName) => {
          FileDetails.checkStatusInColumn(RECORD_STATUSES.UPDATED, columnName);
        });
        FileDetails.checkSrsRecordQuantityInSummaryTable('1', '1');
        FileDetails.checkInstanceQuantityInSummaryTable('1', '1');
        FileDetails.checkHoldingsQuantityInSummaryTable('1', '1');
        FileDetails.openInstanceInInventory(RECORD_STATUSES.UPDATED);
        InstanceRecordView.verifyMarkAsSuppressedFromDiscovery();
        InstanceRecordView.getAssignedHRID().then((initialInstanceHrId) => {
          instanceHrid = initialInstanceHrId;
        });
        cy.visit(TopMenu.dataImportPath);
        Logs.openFileDetails(marcFileNameForUpdate);
        FileDetails.openHoldingsInInventory(RECORD_STATUSES.UPDATED);
        HoldingsRecordView.checkMarkAsSuppressedFromDiscovery();
      },
    );
  });
});
