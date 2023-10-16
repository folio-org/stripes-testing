import getRandomPostfix from '../../../support/utils/stringTools';
import DateTools from '../../../support/utils/dateTools';
import { DevTeams, TestTypes, Parallelization } from '../../../support/dictionary';
import {
  FOLIO_RECORD_TYPE,
  INSTANCE_STATUS_TERM_NAMES,
  ACCEPTED_DATA_TYPE_NAMES,
  EXISTING_RECORDS_NAMES,
  JOB_STATUS_NAMES,
} from '../../../support/constants';
import TopMenu from '../../../support/fragments/topMenu';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import NewFieldMappingProfile from '../../../support/fragments/data_import/mapping_profiles/newFieldMappingProfile';
import NewJobProfile from '../../../support/fragments/data_import/job_profiles/newJobProfile';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import ActionProfiles from '../../../support/fragments/data_import/action_profiles/actionProfiles';
import FieldMappingProfiles from '../../../support/fragments/data_import/mapping_profiles/fieldMappingProfiles';
import DataImport from '../../../support/fragments/data_import/dataImport';
import Logs from '../../../support/fragments/data_import/logs/logs';
import FileDetails from '../../../support/fragments/data_import/logs/fileDetails';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import MatchProfiles from '../../../support/fragments/data_import/match_profiles/matchProfiles';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InstanceRecordView from '../../../support/fragments/inventory/instanceRecordView';
import FieldMappingProfileView from '../../../support/fragments/data_import/mapping_profiles/fieldMappingProfileView';

describe('data-import', () => {
  describe('Importing MARC Bib files', () => {
    let instanceHrid;
    const itemsForCreateInstance = {
      catalogedDate: '###TODAY###',
      catalogedDateUi: DateTools.getFormattedDate({ date: new Date() }),
      statusTerm: INSTANCE_STATUS_TERM_NAMES.BATCH_LOADED,
      statisticalCode: 'ARL (Collection stats): books - Book, print (books)',
      statisticalCodeUI: 'Book, print (books)',
    };
    const itemsForUpdateInstance = {
      statusTerm: 'Temporary',
      statisticalCode: 'ARL (Collection stats): maps - Maps, print (maps)',
      statisticalCodeUI: 'Maps, print (maps)',
    };
    const oclcNumber = { type: 'OCLC', value: '(OCoLC)879516309' };
    const quantityOfItems = '1';
    const actionForSuppress = 'Mark for all affected records';
    // unique file names
    const nameMarcFileForCreate = `C11109 autotestFile.${getRandomPostfix()}.mrc`;
    const nameMarcFileForUpdate = `C11109 autotestFile.${getRandomPostfix()}.mrc`;

    const collectionOfMappingAndActionProfiles = [
      {
        mappingProfile: {
          name: `C11109 create mapping profile_${getRandomPostfix()}`,
          typeValue: FOLIO_RECORD_TYPE.INSTANCE,
        },
        actionProfile: {
          typeValue: FOLIO_RECORD_TYPE.INSTANCE,
          name: `C11109 create action profile_${getRandomPostfix()}`,
          action: 'Create (all record types except MARC Authority or MARC Holdings)',
        },
      },
      {
        mappingProfile: {
          name: `C11109 update mapping profile_${getRandomPostfix()}`,
          typeValue: FOLIO_RECORD_TYPE.INSTANCE,
        },
        actionProfile: {
          typeValue: FOLIO_RECORD_TYPE.INSTANCE,
          name: `C11109 update action profile_${getRandomPostfix()}`,
          action: 'Update (all record types except Orders, Invoices, or MARC Holdings)',
        },
      },
    ];

    const matchProfile = {
      profileName: `C11109 match profile_${getRandomPostfix()}`,
      incomingRecordFields: {
        field: '035',
        in1: '*',
        in2: '*',
        subfield: 'a',
      },
      matchCriterion: 'Exactly matches',
      existingRecordType: EXISTING_RECORDS_NAMES.INSTANCE,
      instanceOption: 'Identifier: OCLC',
    };

    const collectionOfJobProfiles = [
      {
        jobProfile: {
          profileName: `C11109 create job profile_${getRandomPostfix()}`,
          acceptedType: ACCEPTED_DATA_TYPE_NAMES.MARC,
        },
      },
      {
        jobProfile: {
          profileName: `C11109 update job profile_${getRandomPostfix()}`,
          acceptedType: ACCEPTED_DATA_TYPE_NAMES.MARC,
        },
      },
    ];

    before('login', () => {
      cy.getAdminToken().then(() => {
        InventorySearchAndFilter.getInstancesByIdentifierViaApi(oclcNumber.value).then(
          (instances) => {
            if (instances) {
              instances.forEach(({ id }) => {
                InventoryInstance.deleteInstanceViaApi(id);
              });
            }
          },
        );
      });
      cy.loginAsAdmin();
    });

    after('delete test data', () => {
      JobProfiles.deleteJobProfile(collectionOfJobProfiles[0].jobProfile.profileName);
      JobProfiles.deleteJobProfile(collectionOfJobProfiles[1].jobProfile.profileName);
      MatchProfiles.deleteMatchProfile(matchProfile.profileName);
      collectionOfMappingAndActionProfiles.forEach((profile) => {
        ActionProfiles.deleteActionProfile(profile.actionProfile.name);
        FieldMappingProfileView.deleteViaApi(profile.mappingProfile.name);
      });
      cy.getInstance({ limit: 1, expandAll: true, query: `"hrid"=="${instanceHrid}"` }).then(
        (instance) => {
          InventoryInstance.deleteInstanceViaApi(instance.id);
        },
      );
    });

    it(
      'C11109 Update an instance based on an OCLC number match (folijet)',
      { tags: [TestTypes.criticalPath, DevTeams.folijet, Parallelization.parallel] },
      () => {
        // create mapping profile for creating instance
        cy.visit(SettingsMenu.mappingProfilePath);
        FieldMappingProfiles.openNewMappingProfileForm();
        NewFieldMappingProfile.fillSummaryInMappingProfile(
          collectionOfMappingAndActionProfiles[0].mappingProfile,
        );
        NewFieldMappingProfile.addStaffSuppress(actionForSuppress);
        NewFieldMappingProfile.addSuppressFromDiscovery(actionForSuppress);
        NewFieldMappingProfile.addPreviouslyHeld(actionForSuppress);
        NewFieldMappingProfile.fillCatalogedDate(itemsForCreateInstance.catalogedDate);
        NewFieldMappingProfile.fillInstanceStatusTerm(itemsForCreateInstance.statusTerm);
        NewFieldMappingProfile.addStatisticalCode(itemsForCreateInstance.statisticalCode, 8);
        NewFieldMappingProfile.addNatureOfContentTerms('bibliography');
        NewFieldMappingProfile.save();
        FieldMappingProfileView.closeViewMode(
          collectionOfMappingAndActionProfiles[0].mappingProfile.name,
        );
        FieldMappingProfiles.checkMappingProfilePresented(
          collectionOfMappingAndActionProfiles[0].mappingProfile.name,
        );

        // create action profile for creating instance
        cy.visit(SettingsMenu.actionProfilePath);
        ActionProfiles.create(
          collectionOfMappingAndActionProfiles[0].actionProfile,
          collectionOfMappingAndActionProfiles[0].mappingProfile.name,
        );
        ActionProfiles.checkActionProfilePresented(
          collectionOfMappingAndActionProfiles[0].actionProfile.name,
        );

        // create job profile for creating instance
        cy.visit(SettingsMenu.jobProfilePath);
        JobProfiles.createJobProfileWithLinkingProfiles(
          collectionOfJobProfiles[0].jobProfile,
          collectionOfMappingAndActionProfiles[0].actionProfile.name,
        );
        JobProfiles.checkJobProfilePresented(collectionOfJobProfiles[0].jobProfile.profileName);

        // upload a marc file for creating of the new instance
        cy.visit(TopMenu.dataImportPath);
        // TODO delete function after fix https://issues.folio.org/browse/MODDATAIMP-691
        DataImport.verifyUploadState();
        DataImport.uploadFile('marcFileForC11109.mrc', nameMarcFileForCreate);
        JobProfiles.search(collectionOfJobProfiles[0].jobProfile.profileName);
        JobProfiles.runImportFile();
        JobProfiles.waitFileIsImported(nameMarcFileForCreate);
        Logs.checkStatusOfJobProfile(JOB_STATUS_NAMES.COMPLETED);
        Logs.openFileDetails(nameMarcFileForCreate);
        [
          FileDetails.columnNameInResultList.srsMarc,
          FileDetails.columnNameInResultList.instance,
        ].forEach((columnName) => {
          FileDetails.checkStatusInColumn(FileDetails.status.created, columnName);
        });
        FileDetails.checkSrsRecordQuantityInSummaryTable(quantityOfItems);
        FileDetails.checkInstanceQuantityInSummaryTable(quantityOfItems);

        // open Instance for getting hrid
        FileDetails.openInstanceInInventory('Created');
        InventoryInstance.getAssignedHRID().then((initialInstanceHrId) => {
          instanceHrid = initialInstanceHrId;

          cy.visit(TopMenu.inventoryPath);
          InventorySearchAndFilter.searchInstanceByHRID(instanceHrid);
          InstanceRecordView.verifyInstancePaneExists();
          InstanceRecordView.verifyCatalogedDate(itemsForCreateInstance.catalogedDateUi);
          InstanceRecordView.verifyInstanceStatusTerm(itemsForCreateInstance.statusTerm);
          InstanceRecordView.verifyStatisticalCode(itemsForCreateInstance.statisticalCodeUI);
          InventoryInstance.verifyResourceIdentifier(oclcNumber.type, oclcNumber.value, 2);

          // create mapping profile for updating instance
          cy.visit(SettingsMenu.mappingProfilePath);
          FieldMappingProfiles.openNewMappingProfileForm();
          NewFieldMappingProfile.fillSummaryInMappingProfile(
            collectionOfMappingAndActionProfiles[1].mappingProfile,
          );
          NewFieldMappingProfile.fillInstanceStatusTerm(itemsForUpdateInstance.statusTerm);
          NewFieldMappingProfile.addStatisticalCode(itemsForUpdateInstance.statisticalCode, 8);
          NewFieldMappingProfile.save();
          FieldMappingProfileView.closeViewMode(
            collectionOfMappingAndActionProfiles[1].mappingProfile.name,
          );
          FieldMappingProfiles.checkMappingProfilePresented(
            collectionOfMappingAndActionProfiles[1].mappingProfile.name,
          );

          // create action profile for updating instance
          cy.visit(SettingsMenu.actionProfilePath);
          ActionProfiles.create(
            collectionOfMappingAndActionProfiles[1].actionProfile,
            collectionOfMappingAndActionProfiles[1].mappingProfile.name,
          );
          ActionProfiles.checkActionProfilePresented(
            collectionOfMappingAndActionProfiles[1].actionProfile.name,
          );

          // craete match profile
          cy.visit(SettingsMenu.matchProfilePath);
          MatchProfiles.createMatchProfile(matchProfile);
          MatchProfiles.checkMatchProfilePresented(matchProfile.profileName);

          // create job profile for updating instance
          cy.visit(SettingsMenu.jobProfilePath);
          JobProfiles.createJobProfile(collectionOfJobProfiles[1].jobProfile);
          NewJobProfile.linkMatchProfile(matchProfile.profileName);
          NewJobProfile.linkActionProfileForMatches(
            collectionOfMappingAndActionProfiles[1].actionProfile.name,
          );
          NewJobProfile.saveAndClose();
          JobProfiles.checkJobProfilePresented(collectionOfJobProfiles[1].jobProfile.profileName);

          // upload a marc file for updating instance
          cy.visit(TopMenu.dataImportPath);
          // TODO delete function after fix https://issues.folio.org/browse/MODDATAIMP-691
          DataImport.verifyUploadState();
          DataImport.uploadFile('marcFileForC11109.mrc', nameMarcFileForUpdate);
          JobProfiles.search(collectionOfJobProfiles[1].jobProfile.profileName);
          JobProfiles.runImportFile();
          JobProfiles.waitFileIsImported(nameMarcFileForUpdate);
          Logs.checkStatusOfJobProfile(JOB_STATUS_NAMES.COMPLETED);
          Logs.openFileDetails(nameMarcFileForUpdate);
          [
            FileDetails.columnNameInResultList.srsMarc,
            FileDetails.columnNameInResultList.instance,
          ].forEach((columnName) => {
            FileDetails.checkStatusInColumn(FileDetails.status.updated, columnName);
          });
          FileDetails.checkSrsRecordQuantityInSummaryTable(quantityOfItems, 1);
          FileDetails.checkInstanceQuantityInSummaryTable(quantityOfItems, 1);

          cy.visit(TopMenu.inventoryPath);
          InventorySearchAndFilter.searchInstanceByHRID(instanceHrid);
          InstanceRecordView.verifyInstancePaneExists();
          InstanceRecordView.verifyMarkAsSuppressedFromDiscoveryAndSuppressed();
          InstanceRecordView.verifyInstanceStatusTerm(itemsForUpdateInstance.statusTerm);
          InstanceRecordView.verifyStatisticalCode(itemsForUpdateInstance.statisticalCodeUI);
          InventoryInstance.verifyResourceIdentifier(oclcNumber.type, oclcNumber.value, 2);
        });
      },
    );
  });
});
