import getRandomPostfix from '../../../support/utils/stringTools';
import { DevTeams, TestTypes } from '../../../support/dictionary';
import {
  FOLIO_RECORD_TYPE,
  LOCATION_NAMES,
  JOB_STATUS_NAMES,
  INSTANCE_STATUS_TERM_NAMES,
  EXISTING_RECORDS_NAMES,
  ACCEPTED_DATA_TYPE_NAMES,
} from '../../../support/constants';
import TopMenu from '../../../support/fragments/topMenu';
import DataImport from '../../../support/fragments/data_import/dataImport';
import FileDetails from '../../../support/fragments/data_import/logs/fileDetails';
import Logs from '../../../support/fragments/data_import/logs/logs';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import NewFieldMappingProfile from '../../../support/fragments/data_import/mapping_profiles/newFieldMappingProfile';
import FieldMappingProfiles from '../../../support/fragments/data_import/mapping_profiles/fieldMappingProfiles';
import NewJobProfile from '../../../support/fragments/data_import/job_profiles/newJobProfile';
import ActionProfiles from '../../../support/fragments/data_import/action_profiles/actionProfiles';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InstanceRecordView from '../../../support/fragments/inventory/instanceRecordView';
import FieldMappingProfileView from '../../../support/fragments/data_import/mapping_profiles/fieldMappingProfileView';
import HoldingsRecordView from '../../../support/fragments/inventory/holdingsRecordView';
import NewMatchProfile from '../../../support/fragments/data_import/match_profiles/newMatchProfile';
import MatchProfiles from '../../../support/fragments/data_import/match_profiles/matchProfiles';
import FileManager from '../../../support/utils/fileManager';

describe('data-import', () => {
  describe('Importing MARC Bib files', () => {
    let instanceHrid;
    let holdingsHrId;
    const filePathToUpload = 'marcBibFileForC11106.mrc';
    const editedMarcFileName = `C11106 autotestFileName_${getRandomPostfix()}`;
    const marcFileName = `C11106 autotestFileName_${getRandomPostfix()}`;
    const marcFileNameForUpdate = `C11106 autotestFileNameForUpdate_${getRandomPostfix()}`;

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
      action: 'Update (all record types except Orders, Invoices, or MARC Holdings)',
    };
    const matchProfile = {
      profileName: `C11106 match profile${getRandomPostfix()}`,
      incomingRecordFields: {
        field: '911',
        subfield: 'a',
      },
      matchCriterion: 'Exactly matches',
      existingRecordType: EXISTING_RECORDS_NAMES.HOLDINGS,
      holdingsOption: NewMatchProfile.optionsList.holdingsHrid,
    };
    const jobProfileForUpdate = {
      ...NewJobProfile.defaultJobProfile,
      profileName: `C11106 jobProfileForUpdate_${getRandomPostfix()}`,
      acceptedType: ACCEPTED_DATA_TYPE_NAMES.MARC,
    };

    before('login', () => {
      cy.getAdminToken();
      cy.loginAsAdmin({
        path: SettingsMenu.mappingProfilePath,
        waiter: FieldMappingProfiles.waitLoading,
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
        collectionOfMappingAndActionProfilesForCreate[0].mappingProfile.natureOfContent,
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

      collectionOfMappingAndActionProfilesForCreate.forEach((profile) => {
        cy.visit(SettingsMenu.actionProfilePath);
        ActionProfiles.create(profile.actionProfile, profile.mappingProfile.name);
        ActionProfiles.checkActionProfilePresented(profile.actionProfile.name);
      });

      // create job profile
      cy.visit(SettingsMenu.jobProfilePath);
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
      cy.visit(TopMenu.dataImportPath);
      // TODO delete function after fix https://issues.folio.org/browse/MODDATAIMP-691
      DataImport.verifyUploadState();
      DataImport.uploadFile(filePathToUpload, marcFileName);
      JobProfiles.search(jobProfileForCreate.profileName);
      JobProfiles.runImportFile();
      JobProfiles.waitFileIsImported(marcFileName);
      Logs.checkStatusOfJobProfile(JOB_STATUS_NAMES.COMPLETED);
      Logs.openFileDetails(marcFileName);
      FileDetails.openInstanceInInventory('Created');
      InventoryInstance.getAssignedHRID().then((initialInstanceHrId) => {
        instanceHrid = initialInstanceHrId;

        InstanceRecordView.openHoldingView();
        HoldingsRecordView.getHoldingsHrId().then((initialHrId) => {
          holdingsHrId = initialHrId;
        });
      });
    });

    after('delete test data', () => {
      JobProfiles.deleteJobProfile(jobProfileForCreate.profileName);
      JobProfiles.deleteJobProfile(jobProfileForUpdate.profileName);
      MatchProfiles.deleteMatchProfile(matchProfile.profileName);
      collectionOfMappingAndActionProfilesForCreate.forEach((profile) => {
        ActionProfiles.deleteActionProfile(profile.actionProfile.name);
        FieldMappingProfileView.deleteViaApi(profile.mappingProfile.name);
      });
      ActionProfiles.deleteActionProfile(actionProfile.name);
      FieldMappingProfileView.deleteViaApi(mappingProfile.name);
      cy.getInstance({ limit: 1, expandAll: true, query: `"hrid"=="${instanceHrid}"` }).then(
        (instance) => {
          cy.deleteHoldingRecordViaApi(instance.holdings[0].id);
          InventoryInstance.deleteInstanceViaApi(instance.id);
        },
      );
      FileManager.deleteFile(`cypress/fixtures/${editedMarcFileName}`);
    });

    it(
      'C11106 Action and field mapping: Update a holdings (folijet) (TaaS)',
      { tags: [TestTypes.extendedPath, DevTeams.folijet] },
      () => {
        // change file for adding random barcode and holdings hrid
        DataImport.editMarcFile(
          filePathToUpload,
          editedMarcFileName,
          ['holdingsHrid'],
          [holdingsHrId],
        );

        // create mapping profile
        cy.visit(SettingsMenu.mappingProfilePath);
        FieldMappingProfiles.openNewMappingProfileForm();
        NewFieldMappingProfile.fillSummaryInMappingProfile(mappingProfile);
        NewFieldMappingProfile.fillPermanentLocation(mappingProfile.permanentLocation);
        NewFieldMappingProfile.fillCopyNumber(`"${mappingProfile.copyNumber}"`);
        NewFieldMappingProfile.save();
        FieldMappingProfileView.closeViewMode(mappingProfile.name);
        FieldMappingProfiles.checkMappingProfilePresented(mappingProfile.name);

        // create action profile
        cy.visit(SettingsMenu.actionProfilePath);
        ActionProfiles.create(actionProfile, mappingProfile.name);
        ActionProfiles.checkActionProfilePresented(actionProfile.name);

        // create match profile
        cy.visit(SettingsMenu.matchProfilePath);
        MatchProfiles.createMatchProfile(matchProfile);
        MatchProfiles.checkMatchProfilePresented(matchProfile.profileName);

        // create job profile
        cy.visit(SettingsMenu.jobProfilePath);
        JobProfiles.createJobProfile(jobProfileForUpdate);
        NewJobProfile.linkMatchAndActionProfiles(matchProfile.profileName, actionProfile.name);
        NewJobProfile.saveAndClose();
        JobProfiles.checkJobProfilePresented(jobProfileForUpdate.profileName);

        // upload a marc file for creating of the new instance, holding and item
        cy.visit(TopMenu.dataImportPath);
        // TODO delete function after fix https://issues.folio.org/browse/MODDATAIMP-691
        DataImport.verifyUploadState();
        DataImport.uploadFile(editedMarcFileName, marcFileNameForUpdate);
        JobProfiles.search(jobProfileForUpdate.profileName);
        JobProfiles.runImportFile();
        JobProfiles.waitFileIsImported(marcFileNameForUpdate);
        Logs.checkStatusOfJobProfile(JOB_STATUS_NAMES.COMPLETED);

        cy.visit(TopMenu.inventoryPath);
        InventorySearchAndFilter.searchInstanceByHRID(instanceHrid);
        InstanceRecordView.verifyInstancePaneExists();
        InstanceRecordView.openHoldingView();
        HoldingsRecordView.checkPermanentLocation(LOCATION_NAMES.ANNEX_UI);
        HoldingsRecordView.checkCopyNumber(mappingProfile.copyNumber);
      },
    );
  });
});
