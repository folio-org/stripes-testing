import {
  ACCEPTED_DATA_TYPE_NAMES,
  ACTION_NAMES_IN_ACTION_PROFILE,
  APPLICATION_NAMES,
  EXISTING_RECORD_NAMES,
  FOLIO_RECORD_TYPE,
  INSTANCE_STATUS_TERM_NAMES,
  JOB_STATUS_NAMES,
  LOCATION_NAMES,
} from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import DataImport from '../../../support/fragments/data_import/dataImport';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import NewJobProfile from '../../../support/fragments/data_import/job_profiles/newJobProfile';
import Logs from '../../../support/fragments/data_import/logs/logs';
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
import FieldMappingProfileView from '../../../support/fragments/settings/dataImport/fieldMappingProfile/fieldMappingProfileView';
import FieldMappingProfiles from '../../../support/fragments/settings/dataImport/fieldMappingProfile/fieldMappingProfiles';
import NewFieldMappingProfile from '../../../support/fragments/settings/dataImport/fieldMappingProfile/newFieldMappingProfile';
import MatchProfiles from '../../../support/fragments/settings/dataImport/matchProfiles/matchProfiles';
import NewMatchProfile from '../../../support/fragments/settings/dataImport/matchProfiles/newMatchProfile';
import SettingsDataImport, {
  SETTINGS_TABS,
} from '../../../support/fragments/settings/dataImport/settingsDataImport';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import Users from '../../../support/fragments/users/users';
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Data Import', () => {
  describe('Importing MARC Bib files', () => {
    let instanceHrid;
    let holdingsHrId;
    let instanceId;
    let holdingsId;
    let userId;
    const filePathToUpload = 'marcBibFileForC11106.mrc';
    const editedMarcFileName = `C11106 autotestFileName${getRandomPostfix()}.mrc`;
    const marcFileName = `C11106 autotestFileName${getRandomPostfix()}.mrc`;
    const marcFileNameForUpdate = `C11106 autotestFileNameForUpdate${getRandomPostfix()}.mrc`;

    // profiles for creating
    const collectionOfMappingAndActionProfilesForCreate = [
      {
        mappingProfile: {
          typeValue: FOLIO_RECORD_TYPE.INSTANCE,
          name: `C11106 instanceMappingProf${getRandomPostfix()}`,
          suppressFromDiscavery: 'Mark for all affected records',
          staffSuppress: 'Mark for all affected records',
          previouslyHeld: 'Mark for all affected records',
          catalogedDate: '###TODAY###',
          instanceStatus: INSTANCE_STATUS_TERM_NAMES.BATCH_LOADED,
          statisticalCode: 'ARL (Collection stats): books - Book, print (books)',
          statisticalCodeUI: 'Book, print (books)',
          natureOfContent: 'bibliography',
        },
        actionProfile: {
          typeValue: FOLIO_RECORD_TYPE.INSTANCE,
          name: `C11106 instanceActionProf${getRandomPostfix()}`,
        },
      },
      {
        mappingProfile: {
          typeValue: FOLIO_RECORD_TYPE.HOLDINGS,
          name: `C11106 holdingsMappingProf${getRandomPostfix()}`,
          permanentLocation: `"${LOCATION_NAMES.ONLINE}"`,
          formerHoldingsId: `autotestFormerHoldingsId.${getRandomPostfix()}`,
          holdingsStatements: `autotestHoldingsStatements.${getRandomPostfix()}`,
        },
        actionProfile: {
          typeValue: FOLIO_RECORD_TYPE.HOLDINGS,
          name: `C11106 holdingsActionProf${getRandomPostfix()}`,
        },
      },
    ];
    const jobProfileForCreate = {
      ...NewJobProfile.defaultJobProfile,
      profileName: `C11106 jobProf${getRandomPostfix()}`,
    };

    // profiles for updating
    const mappingProfile = {
      typeValue: FOLIO_RECORD_TYPE.HOLDINGS,
      name: `C11106 holdingsMappingProfileForUpdate_${getRandomPostfix()}`,
      permanentLocation: `"${LOCATION_NAMES.ANNEX}"`,
      copyNumber: '1',
    };
    const actionProfile = {
      typeValue: FOLIO_RECORD_TYPE.HOLDINGS,
      name: `C11106 holdingsActionProfileForUpdate_${getRandomPostfix()}`,
      action: ACTION_NAMES_IN_ACTION_PROFILE.UPDATE,
    };
    const matchProfile = {
      profileName: `C11106 match profile${getRandomPostfix()}`,
      incomingRecordFields: {
        field: '911',
        subfield: 'a',
      },
      matchCriterion: 'Exactly matches',
      existingRecordType: EXISTING_RECORD_NAMES.HOLDINGS,
      holdingsOption: NewMatchProfile.optionsList.holdingsHrid,
    };
    const jobProfileForUpdate = {
      ...NewJobProfile.defaultJobProfile,
      profileName: `C11106 jobProfileForUpdate_${getRandomPostfix()}`,
      acceptedType: ACCEPTED_DATA_TYPE_NAMES.MARC,
    };

    before('Create test data and login', () => {
      cy.getAdminToken();
      cy.createTempUser([
        Permissions.moduleDataImportEnabled.gui,
        Permissions.settingsDataImportEnabled.gui,
        Permissions.inventoryAll.gui,
        Permissions.enableStaffSuppressFacet.gui,
      ]).then((userProperties) => {
        userId = userProperties.userId;

        cy.login(userProperties.username, userProperties.password, {
          path: SettingsMenu.mappingProfilePath,
          waiter: FieldMappingProfiles.waitLoading,
        });
      });

      // create mapping profiles
      FieldMappingProfiles.openNewMappingProfileForm();
      NewFieldMappingProfile.fillSummaryInMappingProfile(
        collectionOfMappingAndActionProfilesForCreate[0].mappingProfile,
      );
      NewFieldMappingProfile.addStaffSuppress(
        collectionOfMappingAndActionProfilesForCreate[0].mappingProfile.staffSuppress,
      );
      NewFieldMappingProfile.addSuppressFromDiscovery(
        collectionOfMappingAndActionProfilesForCreate[0].mappingProfile.suppressFromDiscavery,
      );
      NewFieldMappingProfile.addPreviouslyHeld(
        collectionOfMappingAndActionProfilesForCreate[0].mappingProfile.previouslyHeld,
      );
      NewFieldMappingProfile.fillCatalogedDate(
        collectionOfMappingAndActionProfilesForCreate[0].mappingProfile.catalogedDate,
      );
      NewFieldMappingProfile.fillInstanceStatusTerm(
        collectionOfMappingAndActionProfilesForCreate[0].mappingProfile.instanceStatus,
      );
      NewFieldMappingProfile.addStatisticalCode(
        collectionOfMappingAndActionProfilesForCreate[0].mappingProfile.statisticalCode,
        8,
      );
      NewFieldMappingProfile.addNatureOfContentTerms(
        `"${collectionOfMappingAndActionProfilesForCreate[0].mappingProfile.natureOfContent}"`,
      );
      NewFieldMappingProfile.save();
      FieldMappingProfileView.closeViewMode(
        collectionOfMappingAndActionProfilesForCreate[0].mappingProfile.name,
      );
      FieldMappingProfiles.checkMappingProfilePresented(
        collectionOfMappingAndActionProfilesForCreate[0].mappingProfile.name,
      );

      FieldMappingProfiles.openNewMappingProfileForm();
      NewFieldMappingProfile.fillSummaryInMappingProfile(
        collectionOfMappingAndActionProfilesForCreate[1].mappingProfile,
      );
      NewFieldMappingProfile.addFormerHoldings(
        collectionOfMappingAndActionProfilesForCreate[1].mappingProfile.formerHoldingsId,
      );
      NewFieldMappingProfile.fillPermanentLocation(
        collectionOfMappingAndActionProfilesForCreate[1].mappingProfile.permanentLocation,
      );
      NewFieldMappingProfile.addHoldingsStatements(
        collectionOfMappingAndActionProfilesForCreate[1].mappingProfile.holdingsStatements,
      );
      NewFieldMappingProfile.save();
      FieldMappingProfileView.closeViewMode(
        collectionOfMappingAndActionProfilesForCreate[1].mappingProfile.name,
      );
      FieldMappingProfiles.checkMappingProfilePresented(
        collectionOfMappingAndActionProfilesForCreate[1].mappingProfile.name,
      );

      SettingsDataImport.selectSettingsTab(SETTINGS_TABS.ACTION_PROFILES);
      collectionOfMappingAndActionProfilesForCreate.forEach((profile) => {
        SettingsActionProfiles.create(profile.actionProfile, profile.mappingProfile.name);
        SettingsActionProfiles.checkActionProfilePresented(profile.actionProfile.name);
      });

      // create job profile
      SettingsDataImport.selectSettingsTab(SETTINGS_TABS.JOB_PROFILES);
      JobProfiles.createJobProfile(jobProfileForCreate);
      NewJobProfile.linkActionProfile(
        collectionOfMappingAndActionProfilesForCreate[0].actionProfile,
      );
      NewJobProfile.linkActionProfile(
        collectionOfMappingAndActionProfilesForCreate[1].actionProfile,
      );
      NewJobProfile.saveAndClose();
      JobProfiles.checkJobProfilePresented(jobProfileForCreate.profileName);

      // upload a marc file for creating of the new instance, holding and item
      DataImport.uploadFileViaApi(
        filePathToUpload,
        marcFileName,
        jobProfileForCreate.profileName,
      ).then((response) => {
        instanceHrid = response[0].instance.hrid;
        instanceId = response[0].instance.id;
        holdingsHrId = response[0].holding.hrid;
        holdingsId = response[0].holding.id;
      });
    });

    after('Delete test data', () => {
      FileManager.deleteFile(`cypress/fixtures/${editedMarcFileName}`);
      cy.getAdminToken().then(() => {
        Users.deleteViaApi(userId);
        SettingsJobProfiles.deleteJobProfileByNameViaApi(jobProfileForCreate.profileName);
        SettingsJobProfiles.deleteJobProfileByNameViaApi(jobProfileForUpdate.profileName);
        SettingsMatchProfiles.deleteMatchProfileByNameViaApi(matchProfile.profileName);
        collectionOfMappingAndActionProfilesForCreate.forEach((profile) => {
          SettingsActionProfiles.deleteActionProfileByNameViaApi(profile.actionProfile.name);
          SettingsFieldMappingProfiles.deleteMappingProfileByNameViaApi(
            profile.mappingProfile.name,
          );
        });
        SettingsActionProfiles.deleteActionProfileByNameViaApi(actionProfile.name);
        SettingsFieldMappingProfiles.deleteMappingProfileByNameViaApi(mappingProfile.name);
        cy.deleteHoldingRecordViaApi(holdingsId);
        InventoryInstance.deleteInstanceViaApi(instanceId);
      });
    });

    it(
      'C11106 Action and field mapping: Update a holdings (folijet) (TaaS)',
      { tags: ['extendedPath', 'folijet', 'C11106'] },
      () => {
        // change file for adding random barcode and holdings hrid
        DataImport.editMarcFile(
          filePathToUpload,
          editedMarcFileName,
          ['holdingsHrid'],
          [holdingsHrId],
        );

        // create mapping profile
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.SETTINGS, APPLICATION_NAMES.DATA_IMPORT);
        SettingsDataImport.selectSettingsTab(SETTINGS_TABS.FIELD_MAPPING_PROFILES);
        FieldMappingProfiles.openNewMappingProfileForm();
        NewFieldMappingProfile.fillSummaryInMappingProfile(mappingProfile);
        NewFieldMappingProfile.fillPermanentLocation(mappingProfile.permanentLocation);
        NewFieldMappingProfile.fillCopyNumber(`"${mappingProfile.copyNumber}"`);
        NewFieldMappingProfile.save();
        FieldMappingProfileView.closeViewMode(mappingProfile.name);
        FieldMappingProfiles.checkMappingProfilePresented(mappingProfile.name);

        // create action profile
        SettingsDataImport.selectSettingsTab(SETTINGS_TABS.ACTION_PROFILES);
        SettingsActionProfiles.create(actionProfile, mappingProfile.name);
        SettingsActionProfiles.checkActionProfilePresented(actionProfile.name);

        // create match profile
        SettingsDataImport.selectSettingsTab(SETTINGS_TABS.MATCH_PROFILES);
        MatchProfiles.createMatchProfile(matchProfile);
        MatchProfiles.checkMatchProfilePresented(matchProfile.profileName);

        // create job profile
        SettingsDataImport.selectSettingsTab(SETTINGS_TABS.JOB_PROFILES);
        JobProfiles.createJobProfile(jobProfileForUpdate);
        NewJobProfile.linkMatchAndActionProfiles(matchProfile.profileName, actionProfile.name);
        NewJobProfile.saveAndClose();
        JobProfiles.checkJobProfilePresented(jobProfileForUpdate.profileName);

        // upload a marc file for creating of the new instance, holding and item
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.DATA_IMPORT);
        DataImport.verifyUploadState();
        DataImport.uploadFile(editedMarcFileName, marcFileNameForUpdate);
        JobProfiles.waitFileIsUploaded();
        JobProfiles.search(jobProfileForUpdate.profileName);
        JobProfiles.runImportFile();
        Logs.waitFileIsImported(marcFileNameForUpdate);
        Logs.checkJobStatus(marcFileNameForUpdate, JOB_STATUS_NAMES.COMPLETED);

        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
        InventorySearchAndFilter.selectYesfilterStaffSuppress();
        cy.wait(1500);
        InventorySearchAndFilter.searchInstanceByHRID(instanceHrid);
        InstanceRecordView.verifyInstancePaneExists();
        InstanceRecordView.openHoldingView();
        HoldingsRecordView.checkPermanentLocation(LOCATION_NAMES.ANNEX_UI);
        HoldingsRecordView.checkCopyNumber(mappingProfile.copyNumber);
      },
    );
  });
});
