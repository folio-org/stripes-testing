/* eslint-disable cypress/no-unnecessary-waiting */
import {
  CALL_NUMBER_TYPE_NAMES,
  EXISTING_RECORDS_NAMES,
  FOLIO_RECORD_TYPE,
  JOB_STATUS_NAMES,
  LOCATION_NAMES,
  RECORD_STATUSES,
} from '../../../support/constants';
import ActionProfiles from '../../../support/fragments/data_import/action_profiles/actionProfiles';
import DataImport from '../../../support/fragments/data_import/dataImport';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import NewJobProfile from '../../../support/fragments/data_import/job_profiles/newJobProfile';
import FileDetails from '../../../support/fragments/data_import/logs/fileDetails';
import Logs from '../../../support/fragments/data_import/logs/logs';
import FieldMappingProfileView from '../../../support/fragments/data_import/mapping_profiles/fieldMappingProfileView';
import FieldMappingProfiles from '../../../support/fragments/data_import/mapping_profiles/fieldMappingProfiles';
import NewFieldMappingProfile from '../../../support/fragments/data_import/mapping_profiles/newFieldMappingProfile';
import MatchProfiles from '../../../support/fragments/data_import/match_profiles/matchProfiles';
import NewMatchProfile from '../../../support/fragments/data_import/match_profiles/newMatchProfile';
import HoldingsRecordView from '../../../support/fragments/inventory/holdingsRecordView';
import InstanceRecordView from '../../../support/fragments/inventory/instanceRecordView';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import TopMenu from '../../../support/fragments/topMenu';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('data-import', () => {
  describe('End to end scenarios', () => {
    let instanceHRID = null;
    const nameForCreateMarcFile = `C17025 createFile${getRandomPostfix()}.mrc`;
    const nameForUpdateCreateMarcFile = `C17025 updateFile${getRandomPostfix()}.mrc`;
    const collectionOfMappingAndActionProfiles = [
      {
        mappingProfile: {
          typeValue: FOLIO_RECORD_TYPE.INSTANCE,
          name: `C17025 createInstanceMappingProf${getRandomPostfix()}`,
        },
        actionProfile: {
          typeValue: FOLIO_RECORD_TYPE.INSTANCE,
          name: `C17025 createInstanceActionProf${getRandomPostfix()}`,
        },
      },
      {
        mappingProfile: {
          typeValue: FOLIO_RECORD_TYPE.HOLDINGS,
          name: `C17025 createEHoldingsMappingProf${getRandomPostfix()}`,
          permanentLocation: `"${LOCATION_NAMES.ONLINE}"`,
        },
        actionProfile: {
          typeValue: FOLIO_RECORD_TYPE.HOLDINGS,
          name: `C17025 createEHoldingsActionProf${getRandomPostfix()}`,
        },
      },
      {
        mappingProfile: {
          typeValue: FOLIO_RECORD_TYPE.HOLDINGS,
          name: `C17025 updateEHoldingsMappingProf${getRandomPostfix()}`,
          callNumberType: `"${CALL_NUMBER_TYPE_NAMES.OTHER_SCHEME}"`,
        },
        actionProfile: {
          typeValue: FOLIO_RECORD_TYPE.HOLDINGS,
          name: `C17025 updateEHoldingsActionProf${getRandomPostfix()}`,
          action: 'Update (all record types except Orders, Invoices, or MARC Holdings)',
        },
      },
    ];

    const matchProfile = {
      profileName: `C17025 autotestMatchProf${getRandomPostfix()}`,
      incomingRecordFields: {
        field: '856',
        in1: '4',
        in2: '0',
        subfield: 'u',
      },
      matchCriterion: 'Exactly matches',
      existingRecordType: EXISTING_RECORDS_NAMES.HOLDINGS,
      holdingsOption: NewMatchProfile.optionsList.uri,
    };

    const createInstanceAndEHoldingsJobProfile = {
      ...NewJobProfile.defaultJobProfile,
      profileName: `C17025 createInstanceAndEHoldingsJobProf${getRandomPostfix()}`,
    };
    const updateEHoldingsJobProfile = {
      ...NewJobProfile.defaultJobProfile,
      profileName: `C17025 updateEHoldingsJobProf${getRandomPostfix()}`,
    };

    before('login', () => {
      cy.loginAsAdmin({
        path: SettingsMenu.mappingProfilePath,
        waiter: FieldMappingProfiles.waitLoading,
      });
    });

    after('delete test data', () => {
      cy.getAdminToken().then(() => {
        JobProfiles.deleteJobProfile(createInstanceAndEHoldingsJobProfile.profileName);
        JobProfiles.deleteJobProfile(updateEHoldingsJobProfile.profileName);
        MatchProfiles.deleteMatchProfile(matchProfile.profileName);
        collectionOfMappingAndActionProfiles.forEach((profile) => {
          ActionProfiles.deleteActionProfile(profile.actionProfile.name);
          FieldMappingProfileView.deleteViaApi(profile.mappingProfile.name);
        });
        cy.getInstance({ limit: 1, expandAll: true, query: `"hrid"=="${instanceHRID}"` }).then(
          (instance) => {
            cy.deleteHoldingRecordViaApi(instance.holdings[0].id);
            InventoryInstance.deleteInstanceViaApi(instance.id);
          },
        );
      });
    });

    const createInstanceMappingProfile = (profile) => {
      FieldMappingProfiles.openNewMappingProfileForm();
      NewFieldMappingProfile.fillSummaryInMappingProfile(profile);
      NewFieldMappingProfile.fillCatalogedDate('###TODAY###');
      NewFieldMappingProfile.save();
      FieldMappingProfileView.closeViewMode(profile.name);
    };

    const createHoldingsMappingProfile = (profile) => {
      FieldMappingProfiles.openNewMappingProfileForm();
      NewFieldMappingProfile.fillSummaryInMappingProfile(profile);
      NewFieldMappingProfile.fillPermanentLocation(profile.permanentLocation);
      NewFieldMappingProfile.addElectronicAccess(profile.typeValue, '"Resource"', '856$u', '856$z');
      NewFieldMappingProfile.save();
      FieldMappingProfileView.closeViewMode(profile.name);
    };

    const updateHoldingsMappingProfile = (profile) => {
      FieldMappingProfiles.openNewMappingProfileForm();
      NewFieldMappingProfile.fillSummaryInMappingProfile(profile);
      NewFieldMappingProfile.addSuppressFromDiscovery('Mark for all affected records');
      NewFieldMappingProfile.fillCallNumberType(profile.callNumberType);
      NewFieldMappingProfile.fillCallNumber('"ONLINE"');
      NewFieldMappingProfile.save();
      FieldMappingProfileView.closeViewMode(profile.name);
    };

    it(
      'C17025 Match on Holdings 856 $u (folijet)',
      { tags: ['criticalPath', 'folijet', 'nonParallel'] },
      () => {
        createInstanceMappingProfile(collectionOfMappingAndActionProfiles[0].mappingProfile);
        FieldMappingProfiles.checkMappingProfilePresented(
          collectionOfMappingAndActionProfiles[0].mappingProfile.name,
        );
        createHoldingsMappingProfile(collectionOfMappingAndActionProfiles[1].mappingProfile);
        FieldMappingProfiles.checkMappingProfilePresented(
          collectionOfMappingAndActionProfiles[1].mappingProfile.name,
        );
        updateHoldingsMappingProfile(collectionOfMappingAndActionProfiles[2].mappingProfile);
        FieldMappingProfiles.checkMappingProfilePresented(
          collectionOfMappingAndActionProfiles[2].mappingProfile.name,
        );

        collectionOfMappingAndActionProfiles.forEach((profile) => {
          cy.visit(SettingsMenu.actionProfilePath);
          ActionProfiles.create(profile.actionProfile, profile.mappingProfile.name);
          ActionProfiles.checkActionProfilePresented(profile.actionProfile.name);
        });

        cy.visit(SettingsMenu.matchProfilePath);
        MatchProfiles.createMatchProfile(matchProfile);

        cy.visit(SettingsMenu.jobProfilePath);
        JobProfiles.createJobProfile(createInstanceAndEHoldingsJobProfile);
        NewJobProfile.linkActionProfile(collectionOfMappingAndActionProfiles[0].actionProfile);
        NewJobProfile.linkActionProfile(collectionOfMappingAndActionProfiles[1].actionProfile);
        NewJobProfile.saveAndClose();
        JobProfiles.checkJobProfilePresented(createInstanceAndEHoldingsJobProfile.profileName);

        // need to wait until the first job profile will be created
        cy.wait(2500);
        JobProfiles.createJobProfile(updateEHoldingsJobProfile);
        NewJobProfile.linkMatchProfile(matchProfile.profileName);
        NewJobProfile.linkActionProfileForMatches(
          collectionOfMappingAndActionProfiles[2].actionProfile.name,
        );
        NewJobProfile.saveAndClose();
        JobProfiles.checkJobProfilePresented(updateEHoldingsJobProfile.profileName);

        cy.visit(TopMenu.dataImportPath);
        // TODO delete function after fix https://issues.folio.org/browse/MODDATAIMP-691
        DataImport.verifyUploadState();
        DataImport.uploadFile('marcFileForC17025.mrc', nameForCreateMarcFile);
        JobProfiles.waitFileIsUploaded();
        JobProfiles.search(createInstanceAndEHoldingsJobProfile.profileName);
        JobProfiles.runImportFile();
        JobProfiles.waitFileIsImported(nameForCreateMarcFile);
        Logs.checkStatusOfJobProfile(JOB_STATUS_NAMES.COMPLETED);
        Logs.openFileDetails(nameForCreateMarcFile);
        FileDetails.openInstanceInInventory(RECORD_STATUSES.CREATED);
        InventoryInstance.getAssignedHRID().then((initialInstanceHrId) => {
          instanceHRID = initialInstanceHrId;

          InventoryInstance.openHoldingView();
          HoldingsRecordView.checkURIIsNotEmpty();

          cy.visit(TopMenu.dataImportPath);
          // TODO delete function after fix https://issues.folio.org/browse/MODDATAIMP-691
          DataImport.verifyUploadState();
          DataImport.uploadFile('marcFileForC17025.mrc', nameForUpdateCreateMarcFile);
          JobProfiles.waitFileIsUploaded();
          JobProfiles.search(updateEHoldingsJobProfile.profileName);
          JobProfiles.runImportFile();
          JobProfiles.waitFileIsImported(nameForUpdateCreateMarcFile);
          Logs.checkStatusOfJobProfile();

          cy.visit(TopMenu.inventoryPath);
          InventorySearchAndFilter.searchInstanceByHRID(instanceHRID);
          InstanceRecordView.verifyInstancePaneExists();
          InstanceRecordView.openHoldingView();
          HoldingsRecordView.checkCallNumber('ONLINE');
        });
      },
    );
  });
});
