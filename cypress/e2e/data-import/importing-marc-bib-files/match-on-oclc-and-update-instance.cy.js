import getRandomPostfix from '../../../support/utils/stringTools';
import DateTools from '../../../support/utils/dateTools';
import TestTypes from '../../../support/dictionary/testTypes';
import DevTeams from '../../../support/dictionary/devTeams';
import TopMenu from '../../../support/fragments/topMenu';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import NewFieldMappingProfile from '../../../support/fragments/data_import/mapping_profiles/newFieldMappingProfile';
import NewActionProfile from '../../../support/fragments/data_import/action_profiles/newActionProfile';
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

describe('ui-data-import:', () => {
  let instanceHrid;
  const itemsForCreateInstance = {
    catalogedDate: '###TODAY###',
    catalogedDateUi: DateTools.getFormattedDate({ date: new Date() }),
    statusTerm: 'Batch Loaded',
    statisticalCode: 'ARL (Collection stats): books - Book, print (books)',
    statisticalCodeUI: 'Book, print (books)'
  };
  const itemsForUpdateInstance = {
    statusTerm: 'Temporary',
    statisticalCode: 'ARL (Collection stats): maps - Maps, print (maps)',
    statisticalCodeUI: 'Maps, print (maps)'
  };
  const oclcNumber = { type: 'OCLC', value: '(OCoLC)879516309' };
  const quantityOfItems = '1';

  // profile names for creating
  const instanceCreateMapProfileName = `C11109 create mapping profile_${getRandomPostfix()}`;
  const instanceCreateActionProfileName = `C11109 create action profile_${getRandomPostfix()}`;
  const jobProfileForCreateName = `C11109 create job profile_${getRandomPostfix()}`;
  // profile names for updating
  const instanceUpdateMapProfileName = `C11109 update mapping profile_${getRandomPostfix()}`;
  const instanceUpdateActionProfileName = `C11109 update action profile_${getRandomPostfix()}`;
  const matchProfileName = `C11109 match profile_${getRandomPostfix()}`;
  const jobProfileForUpdateName = `C11109 update job profile_${getRandomPostfix()}`;

  // unique file names
  const nameMarcFileForCreate = `C11109 autotestFile.${getRandomPostfix()}.mrc`;
  const nameMarcFileForUpdate = `C11109 autotestFile.${getRandomPostfix()}.mrc`;

  const collectionOfMappingAndActionProfiles = [
    {
      mappingProfile: { name: instanceCreateMapProfileName,
        typeValue : NewFieldMappingProfile.folioRecordTypeValue.instance },
      actionProfile: { typeValue: NewActionProfile.folioRecordTypeValue.instance,
        name: instanceCreateActionProfileName,
        action: 'Create (all record types except MARC Authority or MARC Holdings)' }
    },
    {
      mappingProfile: { name: instanceUpdateMapProfileName,
        typeValue : NewFieldMappingProfile.folioRecordTypeValue.instance },
      actionProfile: { typeValue: NewActionProfile.folioRecordTypeValue.instance,
        name: instanceUpdateActionProfileName,
        action: 'Update (all record types except Orders, Invoices, or MARC Holdings)' }
    }
  ];

  const matchProfile = {
    profileName: matchProfileName,
    incomingRecordFields: {
      field: '035',
      in1: '*',
      in2: '*',
      subfield: 'a'
    },
    matchCriterion: 'Exactly matches',
    existingRecordType: 'INSTANCE',
    instanceOption: 'Identifier: OCLC',
  };

  const collectionOfJobProfiles = [
    { jobProfile: {
      profileName: jobProfileForCreateName,
      acceptedType: NewJobProfile.acceptedDataType.marc
    } },
    { jobProfile: {
      profileName: jobProfileForUpdateName,
      acceptedType: NewJobProfile.acceptedDataType.marc
    } }
  ];

  before('login', () => {
    cy.getAdminToken()
      .then(() => {
        InventorySearchAndFilter.getInstancesByIdentifierViaApi(oclcNumber.value)
          .then(instances => {
            if (instances) {
              instances.forEach(({ id }) => {
                InventoryInstance.deleteInstanceViaApi(id);
              });
            }
          });
      });
    cy.loginAsAdmin();
  });

  after('delete test data', () => {
    cy.getInstance({ limit: 1, expandAll: true, query: `"hrid"=="${instanceHrid}"` })
      .then((instance) => {
        InventoryInstance.deleteInstanceViaApi(instance.id);
      });
    JobProfiles.deleteJobProfile(jobProfileForCreateName);
    JobProfiles.deleteJobProfile(jobProfileForUpdateName);
    MatchProfiles.deleteMatchProfile(matchProfileName);
    collectionOfMappingAndActionProfiles.forEach(profile => {
      ActionProfiles.deleteActionProfile(profile.actionProfile.name);
      FieldMappingProfiles.deleteFieldMappingProfile(profile.mappingProfile.name);
    });
  });

  it('C11109 Update an instance based on an OCLC number match (folijet)',
    { tags: [TestTypes.smoke, DevTeams.folijet] }, () => {
      // create mapping profile for creating instance
      cy.visit(SettingsMenu.mappingProfilePath);
      FieldMappingProfiles.openNewMappingProfileForm();
      NewFieldMappingProfile.fillSummaryInMappingProfile(collectionOfMappingAndActionProfiles[0].mappingProfile);
      NewFieldMappingProfile.addSuppressFromDiscovery();
      NewFieldMappingProfile.fillCatalogedDate(itemsForCreateInstance.catalogedDate);
      NewFieldMappingProfile.fillInstanceStatusTerm(itemsForCreateInstance.statusTerm);
      NewFieldMappingProfile.addStatisticalCode(itemsForCreateInstance.statisticalCode, 8);
      NewFieldMappingProfile.addNatureOfContentTerms();
      FieldMappingProfiles.saveProfile();
      FieldMappingProfiles.closeViewModeForMappingProfile(instanceCreateMapProfileName);
      FieldMappingProfiles.checkMappingProfilePresented(instanceCreateMapProfileName);

      // create action profile for creating instance
      cy.visit(SettingsMenu.actionProfilePath);
      ActionProfiles.create(collectionOfMappingAndActionProfiles[0].actionProfile, instanceCreateMapProfileName);
      ActionProfiles.checkActionProfilePresented(instanceCreateActionProfileName);

      // create job profile for creating instance
      cy.visit(SettingsMenu.jobProfilePath);
      JobProfiles.createJobProfileWithLinkingProfiles(collectionOfJobProfiles[0].jobProfile, instanceCreateActionProfileName);
      JobProfiles.checkJobProfilePresented(jobProfileForCreateName);

      // upload a marc file for creating of the new instance
      cy.visit(TopMenu.dataImportPath);
      DataImport.uploadFile('marcFileForC11109.mrc', nameMarcFileForCreate);
      JobProfiles.searchJobProfileForImport(jobProfileForCreateName);
      JobProfiles.runImportFile();
      JobProfiles.waitFileIsImported(nameMarcFileForCreate);
      Logs.checkStatusOfJobProfile('Completed');
      Logs.openFileDetails(nameMarcFileForCreate);
      [FileDetails.columnName.srsMarc,
        FileDetails.columnName.instance,
      ].forEach(columnName => {
        FileDetails.checkStatusInColumn(FileDetails.status.created, columnName);
      });
      FileDetails.checkSrsRecordQuantityInSummaryTable(quantityOfItems);
      FileDetails.checkInstanceQuantityInSummaryTable(quantityOfItems);

      // get Instance HRID through API
      InventorySearchAndFilter.getInstanceHRID()
        .then(hrId => {
          instanceHrid = hrId[0];

          cy.visit(TopMenu.inventoryPath);
          InventorySearchAndFilter.searchInstanceByHRID(instanceHrid);
          InstanceRecordView.verifyCatalogedDate(itemsForCreateInstance.catalogedDateUi);
          InstanceRecordView.verifyInstanceStatusTerm(itemsForCreateInstance.statusTerm);
          InstanceRecordView.verifyStatisticalCode(itemsForCreateInstance.statisticalCodeUI);
          InventoryInstance.verifyResourceIdentifier(oclcNumber.type, oclcNumber.value, 2);

          // create mapping profile for updating instance
          cy.visit(SettingsMenu.mappingProfilePath);
          FieldMappingProfiles.openNewMappingProfileForm();
          NewFieldMappingProfile.fillSummaryInMappingProfile(collectionOfMappingAndActionProfiles[1].mappingProfile);
          NewFieldMappingProfile.fillInstanceStatusTerm(itemsForUpdateInstance.statusTerm);
          NewFieldMappingProfile.addStatisticalCode(itemsForUpdateInstance.statisticalCode, 8);
          FieldMappingProfiles.saveProfile();
          FieldMappingProfiles.closeViewModeForMappingProfile(instanceUpdateMapProfileName);
          FieldMappingProfiles.checkMappingProfilePresented(instanceUpdateMapProfileName);

          // create action profile for updating instance
          cy.visit(SettingsMenu.actionProfilePath);
          ActionProfiles.create(collectionOfMappingAndActionProfiles[1].actionProfile, instanceUpdateMapProfileName);
          ActionProfiles.checkActionProfilePresented(instanceUpdateActionProfileName);

          // craete match profile
          cy.visit(SettingsMenu.matchProfilePath);
          MatchProfiles.createMatchProfile(matchProfile);
          MatchProfiles.checkMatchProfilePresented(matchProfileName);

          // create job profile for updating instance
          cy.visit(SettingsMenu.jobProfilePath);
          JobProfiles.createJobProfile(collectionOfJobProfiles[1].jobProfile);
          NewJobProfile.linkMatchProfile(matchProfileName);
          NewJobProfile.linkActionProfileForMatches(instanceUpdateActionProfileName);
          NewJobProfile.saveAndClose();
          JobProfiles.checkJobProfilePresented(jobProfileForUpdateName);

          // upload a marc file for updating instance
          cy.visit(TopMenu.dataImportPath);
          DataImport.uploadFile('marcFileForC11109.mrc', nameMarcFileForUpdate);
          JobProfiles.searchJobProfileForImport(jobProfileForUpdateName);
          JobProfiles.runImportFile();
          JobProfiles.waitFileIsImported(nameMarcFileForUpdate);
          Logs.checkStatusOfJobProfile('Completed');
          Logs.openFileDetails(nameMarcFileForUpdate);
          FileDetails.checkStatusInColumn(FileDetails.status.created, FileDetails.columnName.srsMarc);
          FileDetails.checkStatusInColumn(FileDetails.status.updated, FileDetails.columnName.instance);
          FileDetails.checkSrsRecordQuantityInSummaryTable(quantityOfItems);
          FileDetails.checkInstanceQuantityInSummaryTable(quantityOfItems, 1);

          cy.visit(TopMenu.inventoryPath);
          InventorySearchAndFilter.searchInstanceByHRID(instanceHrid);
          InstanceRecordView.verifyInstanceStatusTerm(itemsForUpdateInstance.statusTerm);
          InstanceRecordView.verifyStatisticalCode(itemsForUpdateInstance.statisticalCodeUI);
          InventoryInstance.verifyResourceIdentifier(oclcNumber.type, oclcNumber.value, 2);
        });
    });
});
